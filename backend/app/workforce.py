"""Workforce Intelligence persistence.

Org-scoped storage for the engineering resource-planning module. The browser
holds the canonical shape of the dataset and parses CSV / Microsoft Project XML
locally; this module gives that dataset a durable, multi-tenant home so imports
and manually-created records survive reloads and are shared across everyone in
the organization.

Design: the frontend reads the whole dataset on load (`GET /data`) and writes
it back transactionally whenever it changes from a real edit (`PUT /data`).
Reads are available to any member; writes require an org admin. Public visitors
never authenticate and so use the in-browser demo without touching these
endpoints. The in-browser "sample demo data" is a local preview and is never
persisted.
"""

from __future__ import annotations

from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from . import db

router = APIRouter(prefix="/api/workforce", tags=["workforce"])

# current_user lives in main.py; importing it there would be circular, so it is
# injected at include time (see wire_auth, called from main.py).
_current_user = None


def wire_auth(current_user_dep) -> None:
    global _current_user
    _current_user = current_user_dep


async def _user(request: Request) -> dict:
    if _current_user is None:  # pragma: no cover - wiring guard
        raise HTTPException(500, "Workforce auth not wired")
    return await _current_user(request)


def _is_admin(user: dict) -> bool:
    return user.get("role") in ("org_admin", "superadmin")


def _require_admin(user: dict) -> None:
    if not _is_admin(user):
        raise HTTPException(403, "Only an org admin can change workforce data")


async def _log(con, org_id, who, detail) -> None:
    try:
        await con.execute(
            "INSERT INTO activity_events (org_id, type, detail, by_user) VALUES ($1,'workforce.save',$2,$3)",
            org_id, str(detail)[:300], who)
    except Exception:  # activity log is best-effort
        pass


# --------------------------------------------------------------------------- #
# Wire models — permissive; unknown keys from the client are ignored.          #
# --------------------------------------------------------------------------- #
class Person(BaseModel):
    id: str
    name: str
    disc: str = "SW"
    loc: str = "REM"
    seniority: int = 2
    rate: Optional[float] = None
    active: bool = True


class Project(BaseModel):
    id: str
    code: str = ""
    name: str
    manager: str = ""
    lead: str = ""
    phase: str = ""
    customer: str = ""
    required: Dict[str, float] = Field(default_factory=dict)


class Allocation(BaseModel):
    id: str
    personId: str
    projectId: str
    pcts: Dict[str, float] = Field(default_factory=dict)
    source: str = ""


class ResourceRequest(BaseModel):
    id: str
    projectId: str
    disc: str = "SW"
    ask: Dict[str, float] = Field(default_factory=dict)   # per-month percentage map
    seniority: int = 2
    need: str = ""
    note: str = ""
    status: str = "Open"


class Baseline(BaseModel):
    source: str = ""
    planned: Dict[str, float] = Field(default_factory=dict)


class Dataset(BaseModel):
    people: List[Person] = Field(default_factory=list)
    projects: List[Project] = Field(default_factory=list)
    allocations: List[Allocation] = Field(default_factory=list)
    requests: List[ResourceRequest] = Field(default_factory=list)
    baselines: Dict[str, Baseline] = Field(default_factory=dict)  # projectId -> baseline


# --------------------------------------------------------------------------- #
# Row mappers                                                                  #
# --------------------------------------------------------------------------- #
def _person_out(r) -> dict:
    return {"id": r["id"], "name": r["name"], "disc": r["discipline"], "loc": r["location"],
            "seniority": r["seniority"], "rate": float(r["rate"]) if r["rate"] is not None else None,
            "active": r["active"]}


def _project_out(r) -> dict:
    return {"id": r["id"], "code": r["code"], "name": r["name"], "manager": r["manager"],
            "lead": r["lead"], "phase": r["phase"], "customer": r["customer"],
            "required": r["required"] or {}}


def _alloc_out(r) -> dict:
    return {"id": r["id"], "personId": r["person_id"], "projectId": r["project_id"],
            "pcts": r["pcts"] or {}, "source": r["source"] or ""}


def _request_out(r) -> dict:
    return {"id": r["id"], "projectId": r["project_id"], "disc": r["discipline"], "ask": r["ask"] or {},
            "seniority": r["seniority"], "need": r["need"], "note": r["note"], "status": r["status"]}


async def _load(con, org_id) -> dict:
    people = await con.fetch("SELECT * FROM wf_people WHERE org_id=$1 ORDER BY id", org_id)
    projects = await con.fetch("SELECT * FROM wf_projects WHERE org_id=$1 ORDER BY id", org_id)
    allocs = await con.fetch("SELECT * FROM wf_allocations WHERE org_id=$1 ORDER BY id", org_id)
    reqs = await con.fetch("SELECT * FROM wf_requests WHERE org_id=$1 ORDER BY id", org_id)
    bases = await con.fetch("SELECT * FROM wf_baselines WHERE org_id=$1", org_id)
    return {
        "people": [_person_out(r) for r in people],
        "projects": [_project_out(r) for r in projects],
        "allocations": [_alloc_out(r) for r in allocs],
        "requests": [_request_out(r) for r in reqs],
        "baselines": {r["project_id"]: {"source": r["source"], "planned": r["planned"] or {}} for r in bases},
    }


# --------------------------------------------------------------------------- #
# Endpoints                                                                    #
# --------------------------------------------------------------------------- #
@router.get("/data")
async def get_data(request: Request):
    user = await _user(request)
    async with db.pool().acquire() as con:
        data = await _load(con, user["org_id"])
    counts = {"people": len(data["people"]), "projects": len(data["projects"]),
              "allocations": len(data["allocations"]), "requests": len(data["requests"]),
              "baselines": len(data["baselines"])}
    return {**data, "counts": counts, "canWrite": _is_admin(user)}


@router.put("/data")
async def put_data(body: Dataset, request: Request):
    """Replace the org's entire workforce dataset in one transaction."""
    user = await _user(request)
    _require_admin(user)
    who = user.get("full_name") or user["email"]
    org = user["org_id"]
    async with db.pool().acquire() as con:
        async with con.transaction():
            for t in ("wf_allocations", "wf_requests", "wf_people", "wf_projects", "wf_baselines"):
                await con.execute(f"DELETE FROM {t} WHERE org_id=$1", org)
            if body.people:
                await con.executemany(
                    "INSERT INTO wf_people (org_id,id,name,discipline,location,seniority,rate,active) "
                    "VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
                    [(org, p.id, p.name, p.disc, p.loc, int(p.seniority), p.rate, bool(p.active))
                     for p in body.people])
            if body.projects:
                await con.executemany(
                    "INSERT INTO wf_projects (org_id,id,code,name,manager,lead,phase,customer,required) "
                    "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
                    [(org, p.id, p.code, p.name, p.manager, p.lead, p.phase, p.customer, dict(p.required))
                     for p in body.projects])
            if body.allocations:
                await con.executemany(
                    "INSERT INTO wf_allocations (org_id,id,person_id,project_id,pcts,source) "
                    "VALUES ($1,$2,$3,$4,$5,$6)",
                    [(org, a.id, a.personId, a.projectId, dict(a.pcts), a.source) for a in body.allocations])
            if body.requests:
                await con.executemany(
                    "INSERT INTO wf_requests (org_id,id,project_id,discipline,ask,seniority,need,note,status) "
                    "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
                    [(org, r.id, r.projectId, r.disc, dict(r.ask), int(r.seniority), r.need, r.note, r.status)
                     for r in body.requests])
            if body.baselines:
                await con.executemany(
                    "INSERT INTO wf_baselines (org_id,project_id,source,planned) VALUES ($1,$2,$3,$4)",
                    [(org, pid, b.source, dict(b.planned)) for pid, b in body.baselines.items()])
            await _log(con, org, who,
                       f"{len(body.people)} people · {len(body.projects)} projects · "
                       f"{len(body.allocations)} allocations · {len(body.requests)} requests · "
                       f"{len(body.baselines)} baselines")
    return {"ok": True, "counts": {
        "people": len(body.people), "projects": len(body.projects),
        "allocations": len(body.allocations), "requests": len(body.requests),
        "baselines": len(body.baselines)}}


@router.post("/clear")
async def clear_data(request: Request):
    user = await _user(request)
    _require_admin(user)
    who = user.get("full_name") or user["email"]
    org = user["org_id"]
    async with db.pool().acquire() as con:
        async with con.transaction():
            for t in ("wf_allocations", "wf_requests", "wf_people", "wf_projects", "wf_baselines"):
                await con.execute(f"DELETE FROM {t} WHERE org_id=$1", org)
            await _log(con, org, who, "cleared all workforce data")
    return {"ok": True}

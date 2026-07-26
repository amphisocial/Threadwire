"""Workforce Intelligence persistence and role-scoped allocation.

Workforce roster records are org-scoped operational data. They are not login
accounts and do not consume Threadwire license seats.

Any licensed member may read the workforce dataset. Org admins can administer
the complete dataset. A licensed member with workforce_role
"discipline_manager" may fill resource requests with named people through the
dedicated allocation endpoint, optionally scoped to one discipline.
"""

from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Optional
import uuid

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from . import db, ontology

router = APIRouter(prefix="/api/workforce", tags=["workforce"])
router.include_router(ontology.router)

_current_user = None
WORKFORCE_ALLOCATION_CEILING = 110


def wire_auth(current_user_dep) -> None:
    global _current_user
    _current_user = current_user_dep
    ontology.wire_auth(current_user_dep)


async def _user(request: Request) -> dict:
    if _current_user is None:  # pragma: no cover
        raise HTTPException(500, "Workforce auth not wired")
    return await _current_user(request)


def _is_admin(user: dict) -> bool:
    return user.get("role") in ("org_admin", "superadmin")


def _can_allocate(user: dict) -> bool:
    return _is_admin(user) or user.get("workforce_role") == "discipline_manager"


def _discipline_scope(user: dict) -> Optional[str]:
    if _is_admin(user):
        return None
    value = (user.get("workforce_discipline") or "").strip().upper()
    return value or None


def _permissions(user: dict) -> dict:
    return {
        "canAdminister": _is_admin(user),
        "canAllocate": _can_allocate(user),
        "workforceRole": user.get("workforce_role") or "viewer",
        "discipline": _discipline_scope(user),
        "allocationCeiling": WORKFORCE_ALLOCATION_CEILING,
    }


def _require_admin(user: dict) -> None:
    if not _is_admin(user):
        raise HTTPException(403, "Only an org admin can administer workforce data")


def _require_allocator(user: dict) -> None:
    if not _can_allocate(user):
        raise HTTPException(403, "A Discipline Manager role is required to fill requests")


async def _log(con, org_id, who, detail, event_type="workforce.save") -> None:
    try:
        await con.execute(
            "INSERT INTO activity_events (org_id, type, detail, by_user) VALUES ($1,$2,$3,$4)",
            org_id, event_type, str(detail)[:300], who,
        )
    except Exception:
        pass


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
    ask: Dict[str, float] = Field(default_factory=dict)
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
    baselines: Dict[str, Baseline] = Field(default_factory=dict)


class RequestAllocationIn(BaseModel):
    personId: str = Field(min_length=1, max_length=120)
    pcts: Dict[str, float] = Field(default_factory=dict)


def _person_out(r) -> dict:
    return {
        "id": r["id"], "name": r["name"], "disc": r["discipline"],
        "loc": r["location"], "seniority": r["seniority"],
        "rate": float(r["rate"]) if r["rate"] is not None else None,
        "active": r["active"],
    }


def _project_out(r) -> dict:
    return {
        "id": r["id"], "code": r["code"], "name": r["name"],
        "manager": r["manager"], "lead": r["lead"], "phase": r["phase"],
        "customer": r["customer"], "required": r["required"] or {},
    }


def _alloc_out(r) -> dict:
    return {
        "id": r["id"], "personId": r["person_id"],
        "projectId": r["project_id"], "pcts": r["pcts"] or {},
        "source": r["source"] or "",
    }


def _request_out(r) -> dict:
    return {
        "id": r["id"], "projectId": r["project_id"],
        "disc": r["discipline"], "ask": r["ask"] or {},
        "seniority": r["seniority"], "need": r["need"],
        "note": r["note"], "status": r["status"],
    }


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
        "baselines": {
            r["project_id"]: {"source": r["source"], "planned": r["planned"] or {}}
            for r in bases
        },
    }


def _counts(data: dict) -> dict:
    return {
        "people": len(data["people"]),
        "projects": len(data["projects"]),
        "allocations": len(data["allocations"]),
        "requests": len(data["requests"]),
        "baselines": len(data["baselines"]),
    }


def _response(data: dict, user: dict) -> dict:
    perms = _permissions(user)
    return {
        **data,
        "counts": _counts(data),
        "canWrite": perms["canAdminister"],  # backward compatibility
        "permissions": perms,
    }


def _number(value, label: str) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        raise HTTPException(400, f"{label} must be numeric")


def _valid_month(month: str) -> bool:
    try:
        datetime.strptime(month, "%Y-%m")
        return len(month) == 7
    except (TypeError, ValueError):
        return False


@router.get("/data")
async def get_data(request: Request):
    user = await _user(request)
    async with db.pool().acquire() as con:
        data = await _load(con, user["org_id"])
    return _response(data, user)


@router.post("/requests/{request_id}/allocate")
async def allocate_request(request_id: str, body: RequestAllocationIn, request: Request):
    """Fill part or all of a request with a named workforce person.

    This is intentionally narrower than PUT /data. A Discipline Manager can
    allocate only within their assigned discipline and cannot exceed either the
    remaining request or the organization allocation ceiling.
    """
    user = await _user(request)
    _require_allocator(user)
    org = user["org_id"]
    who = user.get("full_name") or user["email"]

    clean = {}
    for month, raw in (body.pcts or {}).items():
        if not _valid_month(month):
            raise HTTPException(400, f"Invalid allocation month: {month}")
        value = _number(raw, f"Allocation for {month}")
        if value < 0 or value > WORKFORCE_ALLOCATION_CEILING:
            raise HTTPException(
                400,
                f"Allocation for {month} must be between 0 and "
                f"{WORKFORCE_ALLOCATION_CEILING}%",
            )
        if value > 0:
            clean[month] = value
    if not clean:
        raise HTTPException(400, "Allocate at least one month")

    async with db.pool().acquire() as con:
        async with con.transaction():
            req = await con.fetchrow(
                "SELECT * FROM wf_requests WHERE org_id=$1 AND id=$2",
                org, request_id,
            )
            if not req:
                raise HTTPException(404, "Resource request not found")
            if (req["status"] or "").lower() == "declined":
                raise HTTPException(409, "A declined request cannot be filled")

            person = await con.fetchrow(
                "SELECT * FROM wf_people WHERE org_id=$1 AND id=$2",
                org, body.personId,
            )
            if not person:
                raise HTTPException(404, "Workforce person not found")
            if not person["active"]:
                raise HTTPException(409, "This workforce person is inactive")
            if person["discipline"] != req["discipline"]:
                raise HTTPException(
                    409,
                    "The selected person is not in the request discipline",
                )

            scope = _discipline_scope(user)
            if scope and scope != req["discipline"]:
                raise HTTPException(
                    403,
                    f"This Discipline Manager is scoped to {scope}, "
                    f"not {req['discipline']}",
                )

            request_allocs = await con.fetch(
                "SELECT pcts FROM wf_allocations "
                "WHERE org_id=$1 AND source=$2",
                org, request_id,
            )
            person_allocs = await con.fetch(
                "SELECT pcts FROM wf_allocations "
                "WHERE org_id=$1 AND person_id=$2",
                org, body.personId,
            )
            ask = req["ask"] or {}

            for month, value in clean.items():
                ask_value = _number(ask.get(month), f"Request ask for {month}")
                covered = sum(
                    _number((row["pcts"] or {}).get(month), "Existing request coverage")
                    for row in request_allocs
                )
                outstanding = max(0.0, ask_value - covered)
                if ask_value <= 0:
                    raise HTTPException(
                        409,
                        f"{month} is not part of this request",
                    )
                if value > outstanding + 0.0001:
                    raise HTTPException(
                        409,
                        f"{month} has only {outstanding:g}% outstanding",
                    )

                current_load = sum(
                    _number((row["pcts"] or {}).get(month), "Existing person load")
                    for row in person_allocs
                )
                if current_load + value > WORKFORCE_ALLOCATION_CEILING + 0.0001:
                    room = max(0.0, WORKFORCE_ALLOCATION_CEILING - current_load)
                    raise HTTPException(
                        409,
                        f"{person['name']} has only {room:g}% capacity in {month}",
                    )

            alloc_id = "A-" + uuid.uuid4().hex[:12]
            await con.execute(
                "INSERT INTO wf_allocations "
                "(org_id,id,person_id,project_id,pcts,source) "
                "VALUES ($1,$2,$3,$4,$5,$6)",
                org, alloc_id, body.personId, req["project_id"], clean, request_id,
            )
            await _log(
                con,
                org,
                who,
                f"{request_id} -> {person['name']} ({body.personId}) {clean}",
                "workforce.request_fill",
            )
            data = await _load(con, org)

    return _response(data, user)


@router.put("/data")
async def put_data(body: Dataset, request: Request):
    """Replace the org's entire workforce dataset in one transaction."""
    user = await _user(request)
    _require_admin(user)
    who = user.get("full_name") or user["email"]
    org = user["org_id"]
    async with db.pool().acquire() as con:
        async with con.transaction():
            for table in (
                "wf_allocations", "wf_requests", "wf_people",
                "wf_projects", "wf_baselines",
            ):
                await con.execute(f"DELETE FROM {table} WHERE org_id=$1", org)
            if body.people:
                await con.executemany(
                    "INSERT INTO wf_people "
                    "(org_id,id,name,discipline,location,seniority,rate,active) "
                    "VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
                    [
                        (
                            org, p.id, p.name, p.disc, p.loc,
                            int(p.seniority), p.rate, bool(p.active),
                        )
                        for p in body.people
                    ],
                )
            if body.projects:
                await con.executemany(
                    "INSERT INTO wf_projects "
                    "(org_id,id,code,name,manager,lead,phase,customer,required) "
                    "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
                    [
                        (
                            org, p.id, p.code, p.name, p.manager, p.lead,
                            p.phase, p.customer, dict(p.required),
                        )
                        for p in body.projects
                    ],
                )
            if body.allocations:
                await con.executemany(
                    "INSERT INTO wf_allocations "
                    "(org_id,id,person_id,project_id,pcts,source) "
                    "VALUES ($1,$2,$3,$4,$5,$6)",
                    [
                        (
                            org, a.id, a.personId, a.projectId,
                            dict(a.pcts), a.source,
                        )
                        for a in body.allocations
                    ],
                )
            if body.requests:
                await con.executemany(
                    "INSERT INTO wf_requests "
                    "(org_id,id,project_id,discipline,ask,seniority,need,note,status) "
                    "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
                    [
                        (
                            org, r.id, r.projectId, r.disc, dict(r.ask),
                            int(r.seniority), r.need, r.note, r.status,
                        )
                        for r in body.requests
                    ],
                )
            if body.baselines:
                await con.executemany(
                    "INSERT INTO wf_baselines "
                    "(org_id,project_id,source,planned) VALUES ($1,$2,$3,$4)",
                    [
                        (org, pid, baseline.source, dict(baseline.planned))
                        for pid, baseline in body.baselines.items()
                    ],
                )
            await _log(
                con,
                org,
                who,
                f"{len(body.people)} people · {len(body.projects)} projects · "
                f"{len(body.allocations)} allocations · "
                f"{len(body.requests)} requests · "
                f"{len(body.baselines)} baselines",
            )
    return {"ok": True, "counts": {
        "people": len(body.people),
        "projects": len(body.projects),
        "allocations": len(body.allocations),
        "requests": len(body.requests),
        "baselines": len(body.baselines),
    }}


@router.post("/clear")
async def clear_data(request: Request):
    user = await _user(request)
    _require_admin(user)
    who = user.get("full_name") or user["email"]
    org = user["org_id"]
    async with db.pool().acquire() as con:
        async with con.transaction():
            for table in (
                "wf_allocations", "wf_requests", "wf_people",
                "wf_projects", "wf_baselines",
            ):
                await con.execute(f"DELETE FROM {table} WHERE org_id=$1", org)
            await _log(con, org, who, "cleared all workforce data")
    return {"ok": True}

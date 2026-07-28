"""AI Studio — Agent Builder.

This module is deliberately additive. Users compose no-code agents in the AI
Studio as a graph of nodes and ThreadWire runs them against the org's own data:
uploaded documents, ontology entities they've created, and the core operational
tables. Agents can branch on if/else conditions, query the external web to merge
in data, make AI decision points, and put a human in the loop by assigning
activities / blockers / approvals / reviews to people in the org.

Every execution is audited in agent_runs. Human-in-the-loop items land in
agent_inbox and, for approvals, resolving the item resumes the parked run.

Node types (config lives on each node):
  trigger    { mode: 'manual'|'schedule' }
  source     { sourceType: 'document'|'entity'|'table'|'web', ref, limit, outputKey }
  condition  { left, op, right }                       -> branch 'true' / 'false'
  web        { url, outputKey }                         -> fetch + merge
  ai         { prompt, outputKey }                      -> AI decision point
  assign     { assignee, kind, title, detail, pause }   -> human-in-the-loop
  output     { template }                               -> final summary

Runnable standalone for cron:  python -m app.agents
"""
from __future__ import annotations

import ipaddress
import json
import re
import socket
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from . import db
from .ai import ai_complete
from .config import settings

router = APIRouter(prefix="/api/agents", tags=["agents"])

_current_user = None

# Core operational tables an agent may read as a data source. Kept explicit so a
# graph can never point a query at an arbitrary/sensitive table.
CORE_TABLES: Dict[str, dict] = {
    "sales_orders": {"label": "Sales Order Lines", "order": "so_number"},
    "parts": {"label": "Parts", "order": "part_number"},
    "work_orders": {"label": "Work Orders", "order": "wo_number"},
    "boms": {"label": "BOM Lines", "order": "parent_part_number"},
    "customers": {"label": "Customers", "order": "customer_code"},
    "vendors": {"label": "Suppliers", "order": "vendor_code"},
    "blockers": {"label": "Blockers", "order": "id"},
}

MAX_STEPS = 60            # hard ceiling so a mis-wired graph can never loop forever
MAX_ROWS = 1000          # cap rows pulled per source node (filters keep the real set small)

DATE_DTYPES = ("date", "timestamp without time zone", "timestamp with time zone")

# operator -> (sql builder, value kind). Column names are validated against the
# table's real columns before being placed in SQL; all values are parameterized.
FILTER_OPS = {
    "is":               (lambda col, i: f"{col} = ${i}", "text"),
    "is_not":           (lambda col, i: f"{col} <> ${i}", "text"),
    "before":           (lambda col, i: f"{col} < ${i}::timestamptz", "text"),
    "after":            (lambda col, i: f"{col} > ${i}::timestamptz", "text"),
    "on_or_before":     (lambda col, i: f"{col} <= ${i}::timestamptz", "text"),
    "on_or_after":      (lambda col, i: f"{col} >= ${i}::timestamptz", "text"),
    "older_than_days":  (lambda col, i: f"{col} < now() - make_interval(days => ${i}::int)", "int"),
    "within_last_days": (lambda col, i: f"{col} >= now() - make_interval(days => ${i}::int)", "int"),
}


async def _filter_columns(con, tbl: str) -> List[dict]:
    """Columns on a core table that are simple + safe to filter on: status + dates."""
    if tbl not in CORE_TABLES:
        return []
    try:
        cols = await con.fetch(
            "SELECT column_name, data_type FROM information_schema.columns "
            "WHERE table_schema='public' AND table_name=$1", tbl)
    except Exception:
        return []
    out: List[dict] = []
    for c in cols:
        name, dt = c["column_name"], c["data_type"]
        if name == "org_id":
            continue
        if name == "status" or name.endswith("_status"):
            out.append({"name": name, "kind": "status"})
        elif dt in DATE_DTYPES:
            out.append({"name": name, "kind": "date"})
    return out


def _build_filter_sql(filters, join, allowed, start_idx):
    """(sql_fragment | None, params). Cols validated against `allowed` names."""
    allowed_names = {c["name"] for c in (allowed or [])}
    conds, params, idx = [], [], start_idx
    for f in (filters or []):
        col, op, val = f.get("col"), f.get("op"), f.get("val")
        if col not in allowed_names or op not in FILTER_OPS:
            continue
        builder, vkind = FILTER_OPS[op]
        if vkind == "int":
            try:
                pv = int(val)
            except (TypeError, ValueError):
                continue
        else:
            if val in (None, ""):
                continue
            pv = str(val)
        conds.append(builder(col, idx))
        params.append(pv)
        idx += 1
    if not conds:
        return None, []
    glue = " OR " if str(join).lower() == "or" else " AND "
    return "(" + glue.join(conds) + ")", params
WEB_TIMEOUT = 10.0
WEB_MAX_BYTES = 200_000


# --------------------------------------------------------------------------- #
# auth wiring (mirrors workforce/ontology)
# --------------------------------------------------------------------------- #
def wire_auth(current_user_dep) -> None:
    global _current_user
    _current_user = current_user_dep


async def _user(request: Request) -> dict:
    if _current_user is None:  # pragma: no cover
        raise HTTPException(500, "Agents auth not wired")
    return await _current_user(request)


def _is_admin(user: dict) -> bool:
    return user.get("role") in ("org_admin", "superadmin")


def _who(user: dict) -> str:
    return user.get("full_name") or user.get("email") or "user"


def _out(value: Any) -> Any:
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, dict):
        return {k: _out(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_out(v) for v in value]
    return value


async def _log(con, org_id, who, detail, event_type="agent.run") -> None:
    try:
        await con.execute(
            "INSERT INTO activity_events (org_id, type, detail, by_user) VALUES ($1,$2,$3,$4)",
            org_id, event_type, str(detail)[:300], who,
        )
    except Exception:
        pass


# --------------------------------------------------------------------------- #
# models
# --------------------------------------------------------------------------- #
class Graph(BaseModel):
    nodes: List[dict] = Field(default_factory=list)
    edges: List[dict] = Field(default_factory=list)


class AgentIn(BaseModel):
    name: str = Field(default="Untitled agent", max_length=120)
    description: str = Field(default="", max_length=2000)
    graph: Graph = Field(default_factory=Graph)
    schedule: str = "manual"
    status: str = "draft"


class ResolveIn(BaseModel):
    status: str = "done"                # done | dismissed
    decision: str = Field(default="", max_length=2000)


# --------------------------------------------------------------------------- #
# serialisation
# --------------------------------------------------------------------------- #
def _agent_out(r, last: Optional[dict] = None) -> dict:
    return {
        "id": r["id"], "name": r["name"], "description": r["description"],
        "graph": r["graph"] or {"nodes": [], "edges": []},
        "schedule": r["schedule"], "status": r["status"],
        "createdBy": r["created_by"],
        "createdAt": _out(r["created_at"]), "updatedAt": _out(r["updated_at"]),
        "lastRunAt": _out(r["last_run_at"]),
        "lastRun": last,
    }


def _run_out(r, full: bool = False) -> dict:
    base = {
        "id": _out(r["id"]), "agentId": r["agent_id"], "status": r["status"],
        "trigger": r["trigger"], "summary": r["summary"],
        "startedAt": _out(r["started_at"]), "finishedAt": _out(r["finished_at"]),
        "createdBy": r["created_by"],
    }
    if full:
        base["log"] = r["log"] or []
    return base


def _inbox_out(r) -> dict:
    return {
        "id": _out(r["id"]), "agentId": r["agent_id"], "runId": _out(r["run_id"]),
        "assignee": r["assignee"], "kind": r["kind"], "title": r["title"],
        "detail": r["detail"], "payload": r["payload"] or {}, "status": r["status"],
        "decision": r["decision"], "createdAt": _out(r["created_at"]),
        "resolvedAt": _out(r["resolved_at"]), "resolvedBy": r["resolved_by"],
    }


async def _last_run(con, org_id, agent_id) -> Optional[dict]:
    r = await con.fetchrow(
        "SELECT * FROM agent_runs WHERE org_id=$1 AND agent_id=$2 "
        "ORDER BY started_at DESC LIMIT 1", org_id, agent_id)
    return _run_out(r) if r else None


# --------------------------------------------------------------------------- #
# data catalog — what a builder can point a source node at
# --------------------------------------------------------------------------- #
@router.get("/catalog")
async def catalog(request: Request):
    """Everything the visual builder offers as a data source or an assignee."""
    user = await _user(request)
    org = user["org_id"]
    async with db.pool().acquire() as con:
        docs = await con.fetch(
            "SELECT id, COALESCE(NULLIF(title,''), filename) AS title, doc_type "
            "FROM documents WHERE org_id=$1 ORDER BY uploaded_at DESC LIMIT 100", org)
        try:
            ents = await con.fetch(
                "SELECT entity_key, label, source_kind FROM ontology_entity_types "
                "WHERE org_id=$1 ORDER BY label", org)
        except Exception:
            ents = []
        tables = []
        for tbl, meta in CORE_TABLES.items():
            try:
                n = await con.fetchval(f"SELECT count(*) FROM {tbl} WHERE org_id=$1", org)
            except Exception:
                n = 0
            fcols = await _filter_columns(con, tbl)
            for fc in fcols:
                if fc["name"] == "status":
                    try:
                        vals = await con.fetch(
                            f"SELECT DISTINCT status FROM {tbl} WHERE org_id=$1 AND status IS NOT NULL LIMIT 25", org)
                        fc["values"] = sorted(v["status"] for v in vals if v["status"])
                    except Exception:
                        fc["values"] = []
            tables.append({"table": tbl, "label": meta["label"], "rows": int(n or 0), "columns": fcols})
        people = await con.fetch(
            "SELECT email, full_name FROM users WHERE org_id=$1 AND is_active ORDER BY full_name", org)
    return {
        "documents": [{"id": _out(d["id"]), "title": d["title"], "docType": d["doc_type"]} for d in docs],
        "entities": [{"key": e["entity_key"], "label": e["label"], "sourceKind": e["source_kind"]} for e in ents],
        "tables": tables,
        "people": [{"email": p["email"], "name": p["full_name"] or p["email"]} for p in people],
    }


# --------------------------------------------------------------------------- #
# CRUD
# --------------------------------------------------------------------------- #
@router.get("")
async def list_agents(request: Request):
    user = await _user(request)
    org = user["org_id"]
    async with db.pool().acquire() as con:
        rows = await con.fetch("SELECT * FROM agents WHERE org_id=$1 ORDER BY updated_at DESC", org)
        out = []
        for r in rows:
            out.append(_agent_out(r, await _last_run(con, org, r["id"])))
    return {"agents": out, "canWrite": True}


@router.post("")
async def create_agent(body: AgentIn, request: Request):
    user = await _user(request)
    org = user["org_id"]
    aid = "AGT-" + uuid.uuid4().hex[:6]
    async with db.pool().acquire() as con:
        while await con.fetchval("SELECT 1 FROM agents WHERE org_id=$1 AND id=$2", org, aid):
            aid = "AGT-" + uuid.uuid4().hex[:6]
        await con.execute(
            "INSERT INTO agents (org_id,id,name,description,graph,schedule,status,created_by) "
            "VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
            org, aid, body.name, body.description, body.graph.model_dump(),
            body.schedule, body.status, _who(user))
        await _log(con, org, _who(user), f"created agent {aid} · {body.name}", "agent.create")
        r = await con.fetchrow("SELECT * FROM agents WHERE org_id=$1 AND id=$2", org, aid)
    return _agent_out(r, None)


@router.get("/{agent_id}")
async def get_agent(agent_id: str, request: Request):
    user = await _user(request)
    org = user["org_id"]
    async with db.pool().acquire() as con:
        r = await con.fetchrow("SELECT * FROM agents WHERE org_id=$1 AND id=$2", org, agent_id)
        if not r:
            raise HTTPException(404, "Agent not found")
        return _agent_out(r, await _last_run(con, org, agent_id))


@router.put("/{agent_id}")
async def update_agent(agent_id: str, body: AgentIn, request: Request):
    user = await _user(request)
    org = user["org_id"]
    async with db.pool().acquire() as con:
        exists = await con.fetchval("SELECT 1 FROM agents WHERE org_id=$1 AND id=$2", org, agent_id)
        if not exists:
            raise HTTPException(404, "Agent not found")
        await con.execute(
            "UPDATE agents SET name=$3, description=$4, graph=$5, schedule=$6, status=$7, "
            "updated_at=now() WHERE org_id=$1 AND id=$2",
            org, agent_id, body.name, body.description, body.graph.model_dump(),
            body.schedule, body.status)
        await _log(con, org, _who(user), f"saved agent {agent_id}", "agent.save")
        r = await con.fetchrow("SELECT * FROM agents WHERE org_id=$1 AND id=$2", org, agent_id)
        return _agent_out(r, await _last_run(con, org, agent_id))


@router.delete("/{agent_id}")
async def delete_agent(agent_id: str, request: Request):
    user = await _user(request)
    org = user["org_id"]
    async with db.pool().acquire() as con:
        exists = await con.fetchval("SELECT 1 FROM agents WHERE org_id=$1 AND id=$2", org, agent_id)
        if not exists:
            raise HTTPException(404, "Agent not found")
        await con.execute("DELETE FROM agents WHERE org_id=$1 AND id=$2", org, agent_id)
        await _log(con, org, _who(user), f"deleted agent {agent_id}", "agent.delete")
    return {"ok": True}


@router.post("/{agent_id}/status")
async def set_status(agent_id: str, request: Request):
    """Toggle scheduling on/off. Body: { status: active|paused }."""
    user = await _user(request)
    org = user["org_id"]
    body = await request.json()
    status = (body or {}).get("status", "paused")
    if status not in ("active", "paused", "draft"):
        raise HTTPException(400, "status must be active, paused or draft")
    async with db.pool().acquire() as con:
        exists = await con.fetchval("SELECT 1 FROM agents WHERE org_id=$1 AND id=$2", org, agent_id)
        if not exists:
            raise HTTPException(404, "Agent not found")
        await con.execute("UPDATE agents SET status=$3, updated_at=now() WHERE org_id=$1 AND id=$2",
                          org, agent_id, status)
        await _log(con, org, _who(user), f"{agent_id} -> {status}", "agent.status")
    return {"ok": True, "status": status}


# --------------------------------------------------------------------------- #
# runs (audit)
# --------------------------------------------------------------------------- #
@router.get("/{agent_id}/runs")
async def list_runs(agent_id: str, request: Request):
    user = await _user(request)
    org = user["org_id"]
    async with db.pool().acquire() as con:
        rows = await con.fetch(
            "SELECT * FROM agent_runs WHERE org_id=$1 AND agent_id=$2 "
            "ORDER BY started_at DESC LIMIT 100", org, agent_id)
    return {"runs": [_run_out(r) for r in rows]}


@router.get("/runs/{run_id}")
async def get_run(run_id: str, request: Request):
    user = await _user(request)
    org = user["org_id"]
    async with db.pool().acquire() as con:
        r = await con.fetchrow("SELECT * FROM agent_runs WHERE org_id=$1 AND id=$2", org, run_id)
        if not r:
            raise HTTPException(404, "Run not found")
    return _run_out(r, full=True)


@router.post("/runs/{run_id}/stop")
async def stop_run(run_id: str, request: Request):
    """Stop a run that is in progress or parked waiting on a human."""
    user = await _user(request)
    org = user["org_id"]
    async with db.pool().acquire() as con:
        r = await con.fetchrow("SELECT * FROM agent_runs WHERE org_id=$1 AND id=$2", org, run_id)
        if not r:
            raise HTTPException(404, "Run not found")
        if r["status"] not in ("running", "needs_input"):
            raise HTTPException(409, "Only an active or parked run can be stopped")
        await con.execute(
            "UPDATE agent_runs SET status='stopped', finished_at=now(), "
            "summary=COALESCE(NULLIF(summary,''),'Stopped by ')||$3 WHERE org_id=$1 AND id=$2",
            org, run_id, _who(user))
        await con.execute(
            "UPDATE agent_inbox SET status='dismissed', resolved_at=now(), resolved_by=$3 "
            "WHERE org_id=$1 AND run_id=$2 AND status='open'", org, run_id, _who(user))
        await _log(con, org, _who(user), f"stopped run {run_id}", "agent.stop")
    return {"ok": True}


@router.post("/{agent_id}/run")
async def run_now(agent_id: str, request: Request):
    """Execute the agent once, now."""
    user = await _user(request)
    org = user["org_id"]
    who = _who(user)
    async with db.pool().acquire() as con:
        agent = await con.fetchrow("SELECT * FROM agents WHERE org_id=$1 AND id=$2", org, agent_id)
        if not agent:
            raise HTTPException(404, "Agent not found")
        run = await execute_agent(con, org, dict(agent), trigger="manual", who=who)
    return run


# --------------------------------------------------------------------------- #
# inbox (human-in-the-loop)
# --------------------------------------------------------------------------- #
@router.get("/inbox/items")
async def list_inbox(request: Request):
    """Items for the signed-in user; org admins additionally see the whole queue."""
    user = await _user(request)
    org = user["org_id"]
    email = user.get("email") or ""
    async with db.pool().acquire() as con:
        if _is_admin(user):
            rows = await con.fetch(
                "SELECT * FROM agent_inbox WHERE org_id=$1 ORDER BY "
                "(status='open') DESC, created_at DESC LIMIT 200", org)
        else:
            rows = await con.fetch(
                "SELECT * FROM agent_inbox WHERE org_id=$1 AND (assignee=$2 OR assignee='') "
                "ORDER BY (status='open') DESC, created_at DESC LIMIT 200", org, email)
    items = [_inbox_out(r) for r in rows]
    return {"items": items, "openCount": sum(1 for i in items if i["status"] == "open")}


@router.post("/inbox/{item_id}/resolve")
async def resolve_inbox(item_id: str, body: ResolveIn, request: Request):
    """Resolve an item. For a parked approval, an 'approve' decision resumes the
    run; anything else finishes the run as stopped."""
    user = await _user(request)
    org = user["org_id"]
    who = _who(user)
    if body.status not in ("done", "dismissed"):
        raise HTTPException(400, "status must be done or dismissed")
    async with db.pool().acquire() as con:
        item = await con.fetchrow("SELECT * FROM agent_inbox WHERE org_id=$1 AND id=$2", org, item_id)
        if not item:
            raise HTTPException(404, "Inbox item not found")
        if item["status"] != "open":
            raise HTTPException(409, "This item is already resolved")
        await con.execute(
            "UPDATE agent_inbox SET status=$3, decision=$4, resolved_at=now(), resolved_by=$5 "
            "WHERE org_id=$1 AND id=$2", org, item_id, body.status, body.decision, who)
        await _log(con, org, who, f"resolved {item['kind']} '{item['title']}' -> {body.decision or body.status}",
                   "agent.inbox_resolve")
        resumed = None
        if item["run_id"]:
            run = await con.fetchrow("SELECT * FROM agent_runs WHERE org_id=$1 AND id=$2", org, item["run_id"])
            if run and run["status"] == "needs_input":
                approved = body.status == "done" and body.decision.strip().lower() in ("", "approve", "approved", "yes")
                agent = await con.fetchrow("SELECT * FROM agents WHERE org_id=$1 AND id=$2", org, run["agent_id"])
                resumed = await resume_run(con, org, dict(run), dict(agent) if agent else None,
                                           approved, item, who)
    return {"ok": True, "resumed": resumed}


# --------------------------------------------------------------------------- #
# execution engine
# --------------------------------------------------------------------------- #
def _index(graph: dict):
    nodes = {n["id"]: n for n in graph.get("nodes", [])}
    out_edges: Dict[str, List[dict]] = {}
    in_count: Dict[str, int] = {n_id: 0 for n_id in nodes}
    for e in graph.get("edges", []):
        out_edges.setdefault(e["from"], []).append(e)
        if e["to"] in in_count:
            in_count[e["to"]] += 1
    return nodes, out_edges, in_count


def _start_node(nodes: dict, in_count: dict) -> Optional[str]:
    for n_id, n in nodes.items():
        if n.get("type") == "trigger":
            return n_id
    for n_id in nodes:
        if in_count.get(n_id, 0) == 0:
            return n_id
    return next(iter(nodes), None)


_PLACEHOLDER = re.compile(r"\{\{\s*([\w.]+)\s*\}\}")


def _resolve_path(vars: dict, path: str) -> Any:
    cur: Any = vars
    for part in path.split("."):
        if isinstance(cur, list):
            cur = cur[0] if cur else None
        if isinstance(cur, dict):
            cur = cur.get(part)
        else:
            return None
    return cur


def _interpolate(text: str, vars: dict) -> str:
    def repl(m):
        val = _resolve_path(vars, m.group(1))
        if isinstance(val, (dict, list)):
            return json.dumps(_out(val))[:2000]
        return "" if val is None else str(_out(val))
    return _PLACEHOLDER.sub(repl, text or "")


def _compare(left: Any, op: str, right: Any) -> bool:
    def num(x):
        try:
            return float(x)
        except (TypeError, ValueError):
            return None
    ls, rs = (str(left) if left is not None else ""), (str(right) if right is not None else "")
    if op in (">", "<", ">=", "<="):
        a, b = num(left), num(right)
        if a is None or b is None:
            a, b = len(ls), len(rs)
        return {">": a > b, "<": a < b, ">=": a >= b, "<=": a <= b}[op]
    if op == "=":
        return ls.strip().lower() == rs.strip().lower()
    if op == "!=":
        return ls.strip().lower() != rs.strip().lower()
    if op == "contains":
        return rs.strip().lower() in ls.lower()
    if op == "empty":
        return left in (None, "", [], {})
    if op == "not_empty":
        return left not in (None, "", [], {})
    return False


def _is_public_url(url: str) -> Optional[str]:
    """Return an error string if the URL isn't a safe public http(s) target."""
    try:
        p = urlparse(url)
    except Exception:
        return "Malformed URL"
    if p.scheme not in ("http", "https"):
        return "Only http/https URLs are allowed"
    host = p.hostname
    if not host:
        return "URL has no host"
    try:
        infos = socket.getaddrinfo(host, None)
    except Exception:
        return "Could not resolve host"
    for info in infos:
        ip = info[4][0]
        try:
            addr = ipaddress.ip_address(ip)
        except ValueError:
            continue
        if addr.is_private or addr.is_loopback or addr.is_link_local or addr.is_reserved:
            return "Refusing to fetch a private/internal address"
    return None


async def _load_source(con, org, node) -> Any:
    cfg = node.get("config", {})
    kind = cfg.get("sourceType", "table")
    limit = min(int(cfg.get("limit") or 25), MAX_ROWS)
    if kind == "table":
        tbl = cfg.get("ref")
        if tbl not in CORE_TABLES:
            raise ValueError(f"Unknown table '{tbl}'")
        order = CORE_TABLES[tbl]["order"]
        allowed = await _filter_columns(con, tbl)
        frag, fparams = _build_filter_sql(cfg.get("filters"), cfg.get("filterJoin", "and"), allowed, 2)
        where = "org_id=$1" + (f" AND {frag}" if frag else "")
        limit_idx = 2 + len(fparams)
        sql = f"SELECT * FROM {tbl} WHERE {where} ORDER BY {order} LIMIT ${limit_idx}"
        rows = await con.fetch(sql, org, *fparams, limit)
        return {"rows": [_out(dict(r)) for r in rows], "count": len(rows), "filtered": bool(frag)}
    if kind == "document":
        d = await con.fetchrow(
            "SELECT COALESCE(NULLIF(title,''),filename) AS title, content_text, doc_type "
            "FROM documents WHERE org_id=$1 AND id=$2", org, cfg.get("ref"))
        if not d:
            return {"title": None, "text": "", "count": 0}
        return {"title": d["title"], "docType": d["doc_type"],
                "text": (d["content_text"] or "")[:8000], "count": 1}
    if kind == "entity":
        rows = await con.fetch(
            "SELECT object_key, properties FROM ontology_custom_objects "
            "WHERE org_id=$1 AND entity_key=$2 ORDER BY updated_at DESC LIMIT $3",
            org, cfg.get("ref"), limit)
        return {"rows": [{"key": r["object_key"], **(r["properties"] or {})} for r in rows],
                "count": len(rows)}
    if kind == "web":
        return await _fetch_web(cfg.get("ref") or cfg.get("url"))
    raise ValueError(f"Unknown source type '{kind}'")


async def _fetch_web(url: str) -> dict:
    if not url:
        return {"ok": False, "error": "No URL", "text": ""}
    err = _is_public_url(url)
    if err:
        return {"ok": False, "error": err, "text": ""}
    try:
        async with httpx.AsyncClient(timeout=WEB_TIMEOUT, follow_redirects=True) as client:
            r = await client.get(url, headers={"User-Agent": "ThreadWire-Agent/1.0"})
        body = r.text[:WEB_MAX_BYTES]
        ctype = r.headers.get("content-type", "")
        parsed = None
        if "application/json" in ctype:
            try:
                parsed = r.json()
            except Exception:
                parsed = None
        else:
            body = re.sub(r"<script.*?</script>|<style.*?</style>", " ", body, flags=re.S | re.I)
            body = re.sub(r"<[^>]+>", " ", body)
            body = re.sub(r"\s+", " ", body).strip()[:6000]
        return {"ok": r.status_code < 400, "status": r.status_code, "url": url,
                "json": _out(parsed) if parsed is not None else None, "text": body}
    except Exception as e:
        return {"ok": False, "error": str(e)[:200], "text": ""}


async def _ai_decision(prompt: str, vars: dict) -> str:
    filled = _interpolate(prompt, vars)
    context = json.dumps(_out(vars))[:12000]
    system = ("You are an operations agent inside ThreadWire. Use ONLY the rows present in DATA — "
              "never invent IDs, dates, records, or statuses, and never mention an item that is not "
              "in DATA. Treat DATA as the complete, already-filtered set: do not assume other rows "
              "exist. Prefer filtering done upstream over reasoning about dates yourself. Follow the "
              "INSTRUCTION, be concise and decisive; if asked to choose, reply with just the choice; "
              "if nothing in DATA matches, reply exactly 'none'.")
    msg = f"DATA:\n{context}\n\nINSTRUCTION:\n{filled}"
    out = await ai_complete(system, [{"role": "user", "content": msg}])
    return (out or "").strip() or "(no response from the model)"


def _step(node_id, node, status, detail) -> dict:
    return {"node": node_id, "type": node.get("type"), "label": node.get("config", {}).get("label", ""),
            "status": status, "detail": str(detail)[:1000], "at": datetime.now(timezone.utc).isoformat()}


async def _walk(con, org, agent_id, run_id, nodes, out_edges, start, vars, log, who) -> dict:
    """Walk the graph. Returns { outcome, next_node?, pending_inbox? }.

    outcome is 'success' or 'parked' (a human-in-the-loop assign with pause=True).
    """
    current = start
    steps = 0
    while current and steps < MAX_STEPS:
        steps += 1
        node = nodes[current]
        ntype = node.get("type")
        cfg = node.get("config", {})
        branch = None
        try:
            if ntype == "trigger":
                log.append(_step(current, node, "ok", "Triggered"))
            elif ntype == "source":
                data = await _load_source(con, org, node)
                key = cfg.get("outputKey") or current
                vars[key] = data
                summary = data.get("count", "")
                log.append(_step(current, node, "ok", f"Loaded {cfg.get('sourceType')} -> {key} ({summary} record(s))"))
            elif ntype == "web":
                data = await _fetch_web(_interpolate(cfg.get("url", ""), vars))
                key = cfg.get("outputKey") or current
                vars[key] = data
                log.append(_step(current, node, "ok" if data.get("ok") else "warn",
                                  data.get("error") or f"Fetched {cfg.get('url')} -> {key}"))
            elif ntype == "condition":
                left_expr = cfg.get("left", "")
                if "{{" in left_expr:
                    left = _interpolate(left_expr, vars)
                else:
                    resolved = _resolve_path(vars, left_expr)
                    left = resolved if resolved is not None else left_expr
                right = _interpolate(str(cfg.get("right", "")), vars)
                result = _compare(left, cfg.get("op", "="), right)
                branch = "true" if result else "false"
                log.append(_step(current, node, "ok",
                                 f"{cfg.get('left')} {cfg.get('op')} {cfg.get('right')} → {branch}"))
            elif ntype == "ai":
                answer = await _ai_decision(cfg.get("prompt", ""), vars)
                key = cfg.get("outputKey") or current
                vars[key] = answer
                log.append(_step(current, node, "ok", f"AI → {answer[:300]}"))
            elif ntype == "assign":
                assignee = _interpolate(cfg.get("assignee", ""), vars)
                title = _interpolate(cfg.get("title", "Action required"), vars)
                detail = _interpolate(cfg.get("detail", ""), vars)
                kind = cfg.get("kind", "action")
                item_id = await con.fetchval(
                    "INSERT INTO agent_inbox (org_id,agent_id,run_id,assignee,kind,title,detail,payload) "
                    "VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id",
                    org, agent_id, run_id, assignee, kind, title[:300], detail[:2000],
                    {"vars": _out({k: vars[k] for k in list(vars)[:20]})})
                log.append(_step(current, node, "ok",
                                 f"Assigned {kind} '{title}' to {assignee or 'unassigned'}"))
                if cfg.get("pause"):
                    return {"outcome": "parked", "next_node": current, "inbox_id": str(item_id)}
            elif ntype == "output":
                text = _interpolate(cfg.get("template", ""), vars)
                vars["__output__"] = text
                log.append(_step(current, node, "ok", text[:500] or "Done"))
            else:
                log.append(_step(current, node, "skip", f"Unknown node type '{ntype}'"))
        except Exception as e:
            log.append(_step(current, node, "error", str(e)[:400]))
            raise

        # pick the next edge
        edges = out_edges.get(current, [])
        nxt = None
        if branch is not None:
            for e in edges:
                if e.get("branch") == branch:
                    nxt = e["to"]; break
            if nxt is None:
                for e in edges:
                    if not e.get("branch"):
                        nxt = e["to"]; break
        else:
            nxt = edges[0]["to"] if edges else None
        current = nxt
    return {"outcome": "success"}


async def execute_agent(con, org, agent, trigger, who) -> dict:
    graph = agent.get("graph") or {"nodes": [], "edges": []}
    nodes, out_edges, in_count = _index(graph)
    run_id = await con.fetchval(
        "INSERT INTO agent_runs (org_id,agent_id,status,trigger,created_by) "
        "VALUES ($1,$2,'running',$3,$4) RETURNING id", org, agent["id"], trigger, who)
    log: List[dict] = []
    vars: Dict[str, Any] = {}
    if not nodes:
        await con.execute(
            "UPDATE agent_runs SET status='failed', finished_at=now(), summary=$3, log=$4 "
            "WHERE org_id=$1 AND id=$2", org, run_id, "Agent has no nodes yet", _out(log))
        await con.execute("UPDATE agents SET last_run_at=now() WHERE org_id=$1 AND id=$2", org, agent["id"])
        r = await con.fetchrow("SELECT * FROM agent_runs WHERE org_id=$1 AND id=$2", org, run_id)
        return _run_out(r, full=True)

    start = _start_node(nodes, in_count)
    try:
        res = await _walk(con, org, agent["id"], run_id, nodes, out_edges, start, vars, log, who)
        if res.get("outcome") == "parked":
            summary = "Waiting on a person to respond"
            await con.execute(
                "UPDATE agent_runs SET status='needs_input', summary=$3, log=$4 "
                "WHERE org_id=$1 AND id=$2", org, run_id, summary, _out(log))
        else:
            summary = vars.get("__output__") or f"Completed {len(log)} step(s)"
            await con.execute(
                "UPDATE agent_runs SET status='success', finished_at=now(), summary=$3, log=$4 "
                "WHERE org_id=$1 AND id=$2", org, run_id, str(summary)[:1000], _out(log))
        await _log(con, org, who, f"ran agent {agent['id']} ({trigger}) → {log and log[-1]['status']}", "agent.run")
    except Exception as e:
        await con.execute(
            "UPDATE agent_runs SET status='failed', finished_at=now(), summary=$3, log=$4 "
            "WHERE org_id=$1 AND id=$2", org, run_id, str(e)[:1000], _out(log))
    await con.execute("UPDATE agents SET last_run_at=now() WHERE org_id=$1 AND id=$2", org, agent["id"])
    r = await con.fetchrow("SELECT * FROM agent_runs WHERE org_id=$1 AND id=$2", org, run_id)
    return _run_out(r, full=True)


async def resume_run(con, org, run, agent, approved, item, who) -> Optional[dict]:
    """Continue a parked run after its blocking inbox item is resolved."""
    log = list(run.get("log") or [])
    if not agent or not approved:
        log.append({"node": "resume", "type": "assign", "status": "stopped",
                    "detail": f"{who} did not approve — run stopped", "at": datetime.now(timezone.utc).isoformat()})
        await con.execute(
            "UPDATE agent_runs SET status='stopped', finished_at=now(), summary=$3, log=$4 "
            "WHERE org_id=$1 AND id=$2", org, run["id"],
            f"Stopped: {who} chose '{item['decision'] or 'reject'}'", _out(log))
        return {"status": "stopped"}

    graph = agent.get("graph") or {}
    nodes, out_edges, in_count = _index(graph)
    log.append({"node": "resume", "type": "assign", "status": "ok",
                "detail": f"{who} approved — continuing", "at": datetime.now(timezone.utc).isoformat()})
    vars: Dict[str, Any] = {}
    # continue from the node after the assign node
    parked = None
    for e in out_edges.get(_parked_node(nodes, item), []):
        parked = e["to"]; break
    if not parked:
        await con.execute(
            "UPDATE agent_runs SET status='success', finished_at=now(), summary=$3, log=$4 "
            "WHERE org_id=$1 AND id=$2", org, run["id"], "Completed after approval", _out(log))
        return {"status": "success"}
    try:
        res = await _walk(con, org, run["agent_id"], run["id"], nodes, out_edges, parked, vars, log, who)
        if res.get("outcome") == "parked":
            await con.execute("UPDATE agent_runs SET status='needs_input', log=$3 WHERE org_id=$1 AND id=$2",
                              org, run["id"], _out(log))
            return {"status": "needs_input"}
        summary = vars.get("__output__") or "Completed after approval"
        await con.execute(
            "UPDATE agent_runs SET status='success', finished_at=now(), summary=$3, log=$4 "
            "WHERE org_id=$1 AND id=$2", org, run["id"], str(summary)[:1000], _out(log))
        return {"status": "success"}
    except Exception as e:
        await con.execute(
            "UPDATE agent_runs SET status='failed', finished_at=now(), summary=$3, log=$4 "
            "WHERE org_id=$1 AND id=$2", org, run["id"], str(e)[:1000], _out(log))
        return {"status": "failed"}


def _parked_node(nodes: dict, item: dict) -> Optional[str]:
    # the assign node whose payload created this item — best effort: the first
    # assign node in the graph. For linear graphs this is correct; branches with
    # multiple assigns resume from the first pausing assign.
    for n_id, n in nodes.items():
        if n.get("type") == "assign" and n.get("config", {}).get("pause"):
            return n_id
    return None


# --------------------------------------------------------------------------- #
# scheduled runner (cron):  python -m app.agents
# --------------------------------------------------------------------------- #
_CADENCE = {"hourly": timedelta(hours=1), "daily": timedelta(days=1), "weekly": timedelta(days=7)}


def _due(agent) -> bool:
    if agent["status"] != "active":
        return False
    cadence = _CADENCE.get(agent["schedule"])
    if cadence is None:
        return False
    last = agent["last_run_at"]
    if last is None:
        return True
    return datetime.now(timezone.utc) - last >= cadence


async def _run_all() -> None:
    import asyncpg
    conn = await asyncpg.connect(settings.database_url)

    async def _codec(c):
        for t in ("jsonb", "json"):
            await c.set_type_codec(t, encoder=json.dumps, decoder=json.loads, schema="pg_catalog")
    await _codec(conn)
    try:
        agents = await conn.fetch("SELECT * FROM agents WHERE status='active'")
        ran = 0
        for a in agents:
            if _due(dict(a)):
                await execute_agent(conn, a["org_id"], dict(a), trigger="scheduled", who="Scheduler")
                ran += 1
        print(f"agent scheduler: ran {ran} of {len(agents)} active agent(s)")
    finally:
        await conn.close()


def main() -> None:
    import asyncio
    asyncio.run(_run_all())


if __name__ == "__main__":
    main()

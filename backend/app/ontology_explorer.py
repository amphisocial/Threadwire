"""Advanced, tenant-scoped Object Explorer APIs for Threadwire Ontology Studio.

Operational data remains in the existing shared tables and is always filtered by
the authenticated user's org_id. This module stores only saved exploration
definitions, explicit saved object lists, and auditable action batch metadata.
"""
from __future__ import annotations

import json
import re
import uuid
from datetime import date, datetime
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from . import db, ontology

router = APIRouter(prefix="/api/workforce/ontology/explorer", tags=["ontology-explorer"])
_current_user = None
_schema_ready = False


def wire_auth(current_user_dep) -> None:
    global _current_user
    _current_user = current_user_dep


async def _user(request: Request) -> dict:
    if _current_user is None:
        raise HTTPException(500, "Ontology Explorer auth not wired")
    return await _current_user(request)


def _is_admin(user: dict) -> bool:
    return user.get("role") in ("org_admin", "superadmin")


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS ontology_saved_explorations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  name text NOT NULL,
  entity_key text NOT NULL,
  definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_shared boolean NOT NULL DEFAULT false,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, created_by, name)
);
CREATE INDEX IF NOT EXISTS idx_ontology_saved_explorations_org
  ON ontology_saved_explorations(org_id, entity_key, updated_at DESC);

CREATE TABLE IF NOT EXISTS ontology_saved_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  name text NOT NULL,
  entity_key text NOT NULL,
  object_keys jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_shared boolean NOT NULL DEFAULT false,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, created_by, name)
);
CREATE INDEX IF NOT EXISTS idx_ontology_saved_lists_org
  ON ontology_saved_lists(org_id, entity_key, updated_at DESC);
"""


async def _ensure_schema(con) -> None:
    global _schema_ready
    if _schema_ready:
        return
    await con.execute(SCHEMA_SQL)
    _schema_ready = True


class FilterRule(BaseModel):
    property: str = Field(min_length=1, max_length=128)
    operator: Literal[
        "contains", "equals", "not_equals", "starts_with", "ends_with",
        "gt", "gte", "lt", "lte", "is_empty", "is_not_empty", "in"
    ] = "contains"
    value: Any = None


class SortRule(BaseModel):
    property: str = Field(default="objectKey", min_length=1, max_length=128)
    direction: Literal["asc", "desc"] = "asc"


class ExploreRequest(BaseModel):
    entity_key: str = Field(min_length=1, max_length=128)
    search: str = Field(default="", max_length=500)
    filters: List[FilterRule] = Field(default_factory=list, max_length=20)
    match: Literal["all", "any"] = "all"
    sorts: List[SortRule] = Field(default_factory=lambda: [SortRule()], max_length=5)
    limit: int = Field(default=300, ge=1, le=500)


class SavedExplorationIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    entity_key: str = Field(min_length=1, max_length=128)
    definition: Dict[str, Any] = Field(default_factory=dict)
    is_shared: bool = False


class SavedListIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    entity_key: str = Field(min_length=1, max_length=128)
    object_keys: List[str] = Field(default_factory=list, max_length=500)
    is_shared: bool = False


class BulkActionIn(BaseModel):
    action_key: str = Field(min_length=1, max_length=128)
    entity_key: str = Field(min_length=1, max_length=128)
    object_keys: List[str] = Field(min_length=1, max_length=200)
    input: Dict[str, Any] = Field(default_factory=dict)


class CustomObjectPatch(BaseModel):
    properties: Dict[str, Any] = Field(default_factory=dict)
    merge: bool = True


def _out(value: Any) -> Any:
    if isinstance(value, (datetime, date, uuid.UUID)):
        return str(value)
    if isinstance(value, dict):
        return {str(k): _out(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_out(v) for v in value]
    return value


def _artifact_out(row) -> dict:
    data = dict(row)
    return {k: _out(v) for k, v in data.items()}


def _object_value(obj: dict, prop: str) -> Any:
    if prop in ("objectKey", "object_key"):
        return obj.get("objectKey")
    return (obj.get("properties") or {}).get(prop)


def _empty(value: Any) -> bool:
    return value is None or value == "" or value == [] or value == {}


def _number(value: Any) -> Optional[float]:
    try:
        if isinstance(value, bool):
            return float(value)
        return float(value)
    except (TypeError, ValueError):
        return None


def _matches(value: Any, operator: str, expected: Any) -> bool:
    if operator == "is_empty":
        return _empty(value)
    if operator == "is_not_empty":
        return not _empty(value)
    if operator == "in":
        candidates = expected if isinstance(expected, list) else [x.strip() for x in str(expected or "").split(",") if x.strip()]
        return str(value) in {str(x) for x in candidates}

    left = "" if value is None else str(value)
    right = "" if expected is None else str(expected)
    left_lower, right_lower = left.lower(), right.lower()

    if operator == "contains":
        return right_lower in left_lower
    if operator == "equals":
        return left_lower == right_lower
    if operator == "not_equals":
        return left_lower != right_lower
    if operator == "starts_with":
        return left_lower.startswith(right_lower)
    if operator == "ends_with":
        return left_lower.endswith(right_lower)

    left_num, right_num = _number(value), _number(expected)
    if left_num is not None and right_num is not None:
        a, b = left_num, right_num
    else:
        a, b = left_lower, right_lower
    return {
        "gt": a > b,
        "gte": a >= b,
        "lt": a < b,
        "lte": a <= b,
    }.get(operator, False)


def _sort_token(value: Any):
    if value is None:
        return (2, "")
    numeric = _number(value)
    if numeric is not None and not isinstance(value, str):
        return (0, numeric)
    if numeric is not None and isinstance(value, str) and re.fullmatch(r"[-+]?\d+(\.\d+)?", value.strip()):
        return (0, numeric)
    return (1, str(value).lower())


async def _entity_row(con, org_id, entity_key: str):
    row = await con.fetchrow(
        "SELECT entity_key,label,source_kind,source_table FROM ontology_entity_types "
        "WHERE org_id=$1 AND entity_key=$2",
        org_id, entity_key,
    )
    if not row:
        raise HTTPException(404, "Entity not found")
    return row


async def _exact_count(con, org_id, entity) -> Optional[int]:
    if entity["source_kind"] == "custom":
        return await con.fetchval(
            "SELECT count(*) FROM ontology_custom_objects WHERE org_id=$1 AND entity_key=$2",
            org_id, entity["entity_key"],
        )
    table = entity["source_table"]
    if not table or not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", table):
        return None
    return await con.fetchval(f"SELECT count(*) FROM {table} WHERE org_id=$1", org_id)


@router.post("/query")
async def explore_objects(body: ExploreRequest, request: Request):
    user = await _user(request)
    scan_limit = 2000
    async with db.pool().acquire() as con:
        await _ensure_schema(con)
        entity = await _entity_row(con, user["org_id"], body.entity_key)
        rows = await ontology._object_rows(con, user["org_id"], body.entity_key, scan_limit)
        total = await _exact_count(con, user["org_id"], entity)

    query = body.search.strip().lower()
    if query:
        rows = [
            row for row in rows
            if query in f"{row.get('objectKey', '')} {json.dumps(row.get('properties') or {}, default=str)}".lower()
        ]

    if body.filters:
        def accepted(row):
            decisions = [
                _matches(_object_value(row, rule.property), rule.operator, rule.value)
                for rule in body.filters
            ]
            return all(decisions) if body.match == "all" else any(decisions)
        rows = [row for row in rows if accepted(row)]

    for rule in reversed(body.sorts or [SortRule()]):
        rows.sort(
            key=lambda row, prop=rule.property: _sort_token(_object_value(row, prop)),
            reverse=rule.direction == "desc",
        )

    matched = len(rows)
    return {
        "entityKey": body.entity_key,
        "objects": [_out(row) for row in rows[:body.limit]],
        "matched": matched,
        "total": total,
        "scanLimit": scan_limit,
        "scanCapped": bool(total is not None and total > scan_limit),
        "returned": min(matched, body.limit),
    }


@router.get("/saved")
async def saved_artifacts(request: Request):
    user = await _user(request)
    who = user.get("full_name") or user["email"]
    async with db.pool().acquire() as con:
        await _ensure_schema(con)
        explorations = await con.fetch(
            "SELECT * FROM ontology_saved_explorations "
            "WHERE org_id=$1 AND (is_shared OR created_by=$2) ORDER BY updated_at DESC",
            user["org_id"], who,
        )
        lists = await con.fetch(
            "SELECT * FROM ontology_saved_lists "
            "WHERE org_id=$1 AND (is_shared OR created_by=$2) ORDER BY updated_at DESC",
            user["org_id"], who,
        )
    return {
        "explorations": [_artifact_out(row) for row in explorations],
        "lists": [_artifact_out(row) for row in lists],
    }


@router.post("/saved/explorations")
async def save_exploration(body: SavedExplorationIn, request: Request):
    user = await _user(request)
    who = user.get("full_name") or user["email"]
    async with db.pool().acquire() as con:
        await _ensure_schema(con)
        await _entity_row(con, user["org_id"], body.entity_key)
        row = await con.fetchrow(
            """INSERT INTO ontology_saved_explorations
                 (org_id,name,entity_key,definition,is_shared,created_by)
               VALUES ($1,$2,$3,$4,$5,$6)
               ON CONFLICT (org_id,created_by,name) DO UPDATE SET
                 entity_key=EXCLUDED.entity_key,definition=EXCLUDED.definition,
                 is_shared=EXCLUDED.is_shared,updated_at=now()
               RETURNING *""",
            user["org_id"], body.name.strip(), body.entity_key,
            body.definition, body.is_shared, who,
        )
    return _artifact_out(row)


@router.delete("/saved/explorations/{artifact_id}")
async def delete_exploration(artifact_id: uuid.UUID, request: Request):
    user = await _user(request)
    who = user.get("full_name") or user["email"]
    async with db.pool().acquire() as con:
        await _ensure_schema(con)
        row = await con.fetchrow(
            "SELECT created_by FROM ontology_saved_explorations WHERE org_id=$1 AND id=$2",
            user["org_id"], artifact_id,
        )
        if not row:
            raise HTTPException(404, "Saved exploration not found")
        if row["created_by"] != who and not _is_admin(user):
            raise HTTPException(403, "Only the creator or an org admin can delete this exploration")
        await con.execute(
            "DELETE FROM ontology_saved_explorations WHERE org_id=$1 AND id=$2",
            user["org_id"], artifact_id,
        )
    return {"ok": True}


@router.post("/saved/lists")
async def save_list(body: SavedListIn, request: Request):
    user = await _user(request)
    who = user.get("full_name") or user["email"]
    object_keys = list(dict.fromkeys(str(key) for key in body.object_keys if str(key).strip()))
    async with db.pool().acquire() as con:
        await _ensure_schema(con)
        await _entity_row(con, user["org_id"], body.entity_key)
        row = await con.fetchrow(
            """INSERT INTO ontology_saved_lists
                 (org_id,name,entity_key,object_keys,is_shared,created_by)
               VALUES ($1,$2,$3,$4,$5,$6)
               ON CONFLICT (org_id,created_by,name) DO UPDATE SET
                 entity_key=EXCLUDED.entity_key,object_keys=EXCLUDED.object_keys,
                 is_shared=EXCLUDED.is_shared,updated_at=now()
               RETURNING *""",
            user["org_id"], body.name.strip(), body.entity_key,
            object_keys, body.is_shared, who,
        )
    return _artifact_out(row)


@router.delete("/saved/lists/{artifact_id}")
async def delete_list(artifact_id: uuid.UUID, request: Request):
    user = await _user(request)
    who = user.get("full_name") or user["email"]
    async with db.pool().acquire() as con:
        await _ensure_schema(con)
        row = await con.fetchrow(
            "SELECT created_by FROM ontology_saved_lists WHERE org_id=$1 AND id=$2",
            user["org_id"], artifact_id,
        )
        if not row:
            raise HTTPException(404, "Saved list not found")
        if row["created_by"] != who and not _is_admin(user):
            raise HTTPException(403, "Only the creator or an org admin can delete this list")
        await con.execute(
            "DELETE FROM ontology_saved_lists WHERE org_id=$1 AND id=$2",
            user["org_id"], artifact_id,
        )
    return {"ok": True}


@router.get("/linked/{entity_key}/{object_key}")
async def linked_objects(entity_key: str, object_key: str, request: Request):
    user = await _user(request)
    async with db.pool().acquire() as con:
        await _ensure_schema(con)
        graph = await ontology._impact(con, user["org_id"], entity_key, object_key)
    groups: Dict[str, list] = {}
    for node in graph.get("nodes", []):
        if node.get("id") == graph.get("root"):
            continue
        groups.setdefault(node["entityKey"], []).append(node)
    return {
        "root": graph.get("root"),
        "groups": [{"entityKey": key, "objects": values} for key, values in groups.items()],
        "edges": graph.get("edges", []),
        "truncated": graph.get("truncated", False),
    }


@router.post("/bulk-actions")
async def run_bulk_action(body: BulkActionIn, request: Request):
    user = await _user(request)
    who = user.get("full_name") or user["email"]
    object_keys = list(dict.fromkeys(str(key) for key in body.object_keys if str(key).strip()))
    if not object_keys:
        raise HTTPException(400, "Select at least one object")
    batch_id = str(uuid.uuid4())

    async with db.pool().acquire() as con:
        await _ensure_schema(con)
        action = await con.fetchrow(
            "SELECT * FROM ontology_action_types "
            "WHERE org_id=$1 AND action_key=$2 AND active",
            user["org_id"], body.action_key,
        )
        if not action:
            raise HTTPException(404, "Action type not found")
        if action["entity_key"] not in ("*", body.entity_key):
            raise HTTPException(400, "Action is not available for this entity")

        existing = []
        for key in object_keys:
            if await ontology._one_object(con, user["org_id"], body.entity_key, key):
                existing.append(key)
        if not existing:
            raise HTTPException(404, "None of the selected objects exist for this organization")

        status = "pending" if action["requires_approval"] else "completed"
        runs = []
        async with con.transaction():
            for key in existing:
                payload = {
                    **body.input,
                    "source": "Ontology Object Explorer",
                    "batchId": batch_id,
                    "batchSize": len(existing),
                }
                row = await con.fetchrow(
                    """INSERT INTO ontology_action_runs
                         (org_id,action_key,entity_key,object_key,status,input,
                          requested_by,completed_at)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,
                         CASE WHEN $5='completed' THEN now() ELSE NULL END)
                       RETURNING *""",
                    user["org_id"], body.action_key, body.entity_key, key,
                    status, payload, who,
                )
                runs.append(_artifact_out(row))
            await con.execute(
                "INSERT INTO activity_events (org_id,type,detail,by_user) "
                "VALUES ($1,'ontology.bulk_action',$2,$3)",
                user["org_id"],
                f"{action['label']} on {len(existing)} {body.entity_key} objects; batch {batch_id}",
                who,
            )

    return {
        "ok": True,
        "batchId": batch_id,
        "status": status,
        "requested": len(object_keys),
        "created": len(runs),
        "missing": [key for key in object_keys if key not in existing],
        "runs": runs,
    }


@router.patch("/custom/{entity_key}/{object_key}")
async def patch_custom_object(
    entity_key: str, object_key: str, body: CustomObjectPatch, request: Request
):
    user = await _user(request)
    if not _is_admin(user):
        raise HTTPException(403, "Only an org admin can edit ontology custom objects")
    async with db.pool().acquire() as con:
        await _ensure_schema(con)
        entity = await _entity_row(con, user["org_id"], entity_key)
        if entity["source_kind"] != "custom":
            raise HTTPException(
                409,
                "Core operational objects remain read-only here; use their governed Threadwire workflow",
            )
        row = await con.fetchrow(
            "SELECT properties FROM ontology_custom_objects "
            "WHERE org_id=$1 AND entity_key=$2 AND object_key=$3",
            user["org_id"], entity_key, object_key,
        )
        if not row:
            raise HTTPException(404, "Custom object not found")
        properties = dict(row["properties"] or {}) if body.merge else {}
        properties.update(body.properties)
        updated = await con.fetchrow(
            "UPDATE ontology_custom_objects SET properties=$4,updated_at=now() "
            "WHERE org_id=$1 AND entity_key=$2 AND object_key=$3 "
            "RETURNING object_key,properties,created_at,updated_at",
            user["org_id"], entity_key, object_key, properties,
        )
    return {
        "objectKey": updated["object_key"],
        "properties": _out(updated["properties"] or {}),
        "createdAt": _out(updated["created_at"]),
        "updatedAt": _out(updated["updated_at"]),
    }

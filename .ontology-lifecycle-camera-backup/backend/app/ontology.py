"""Threadwire Ontology Studio.

This module is deliberately additive. The existing org-scoped operational tables
(parts, boms, sales_orders, work_orders, etc.) remain the system of record. The
ontology stores semantic labels, visual layout, relationships, custom object
records, lineage metadata and governed action history for each organization.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field

from . import db

router = APIRouter(prefix="/ontology", tags=["ontology"])
_current_user = None


def wire_auth(current_user_dep) -> None:
    global _current_user
    _current_user = current_user_dep


async def _user(request: Request) -> dict:
    if _current_user is None:  # pragma: no cover
        raise HTTPException(500, "Ontology auth not wired")
    return await _current_user(request)


def _is_admin(user: dict) -> bool:
    return user.get("role") in ("org_admin", "superadmin")


def _require_admin(user: dict) -> None:
    if not _is_admin(user):
        raise HTTPException(403, "Only an org admin can change the ontology")


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


# Entity definitions map the current shared physical tables into organization-
# scoped business objects. "eco" is intentionally custom because the current
# repo does not persist ECOs in a core table.
CORE_ENTITIES: List[dict] = [
    {"key": "customer", "label": "Customer", "table": "customers", "keys": ["customer_code"], "display": "name", "color": "#3157C8", "pos": [-9, 1, -2],
     "properties": [("customer_code", "Customer code", "text", True), ("name", "Name", "text", False), ("email", "Email", "text", False), ("region", "Region", "text", False)]},
    {"key": "sales_order", "label": "Sales Order Line", "table": "sales_orders", "keys": ["so_number", "line_number"], "display": "so_number", "color": "#3E6FE0", "pos": [-5, 1, -1],
     "properties": [("so_number", "Sales order", "text", True), ("line_number", "Line", "integer", True), ("customer", "Customer", "text", False), ("site", "Site", "text", False), ("promise_date", "Promise date", "date", False), ("revised_promise_date", "Revised promise", "date", False), ("part_number", "Part", "text", False), ("quantity", "Quantity", "number", False), ("value", "Value", "currency", False), ("status", "Status", "text", False)]},
    {"key": "part", "label": "Part", "table": "parts", "keys": ["part_number"], "display": "part_number", "color": "#12784E", "pos": [0, 1, 0],
     "properties": [("part_number", "Part number", "text", True), ("description", "Description", "text", False), ("revision", "Revision", "text", False), ("classification", "Classification", "text", False), ("commodity", "Commodity", "text", False), ("unit_cost", "Unit cost", "currency", False), ("uom", "UOM", "text", False), ("lifecycle", "Lifecycle", "text", False)]},
    {"key": "bom", "label": "BOM Line", "table": "boms", "keys": ["parent_part_number", "child_part_number", "find_number"], "display": "child_part_number", "color": "#5B6F86", "pos": [2, 4, -3],
     "properties": [("parent_part_number", "Parent part", "text", True), ("child_part_number", "Child part", "text", True), ("quantity", "Quantity per", "number", False), ("find_number", "Find number", "text", True), ("ref_designators", "Reference designators", "text", False)]},
    {"key": "vendor", "label": "Supplier", "table": "vendors", "keys": ["vendor_code"], "display": "name", "color": "#8B5E34", "pos": [0, 1, -7],
     "properties": [("vendor_code", "Supplier code", "text", True), ("name", "Name", "text", False), ("email", "Email", "text", False), ("region", "Region", "text", False)]},
    {"key": "work_order", "label": "Work Order", "table": "work_orders", "keys": ["wo_number"], "display": "wo_number", "color": "#7A4BB7", "pos": [5, 1, 0],
     "properties": [("wo_number", "Work order", "text", True), ("part_number", "Part", "text", False), ("description", "Description", "text", False), ("quantity", "Quantity", "number", False), ("site", "Site", "text", False), ("status", "Status", "text", False), ("due_date", "Due date", "date", False), ("operator", "Operator", "text", False)]},
    {"key": "operator", "label": "Operator", "table": "operators", "keys": ["operator_code"], "display": "name", "color": "#317A8B", "pos": [9, 1, -2],
     "properties": [("operator_code", "Operator code", "text", True), ("name", "Name", "text", False), ("site", "Site", "text", False), ("shift", "Shift", "text", False), ("certifications", "Certifications", "text", False)]},
    {"key": "lot", "label": "Lot / Batch", "table": "lots", "keys": ["lot_number"], "display": "lot_number", "color": "#B27C12", "pos": [7, 1, 5],
     "properties": [("lot_number", "Lot", "text", True), ("part_number", "Part", "text", False), ("work_order", "Work order", "text", False), ("quantity", "Quantity", "number", False), ("site", "Site", "text", False), ("company_ref", "Company", "text", False), ("mfg_date", "Manufactured", "date", False), ("status", "Status", "text", False), ("disposition", "Disposition", "text", False)]},
    {"key": "inspection", "label": "Inspection", "table": "inspections", "keys": ["id"], "display": "inspection_type", "color": "#2D7C6D", "pos": [4, 1, 8],
     "properties": [("id", "ID", "uuid", True), ("lot_number", "Lot", "text", False), ("inspection_type", "Type", "text", False), ("result", "Result", "text", False), ("inspector", "Inspector", "text", False), ("inspected_at", "Inspected", "date", False), ("ncr_number", "NCR", "text", False), ("notes", "Notes", "text", False)]},
    {"key": "ncr", "label": "NCR / CAPA", "table": "ncrs", "keys": ["ncr_number"], "display": "ncr_number", "color": "#AC3247", "pos": [0, 1, 9],
     "properties": [("ncr_number", "NCR", "text", True), ("lot_number", "Lot", "text", False), ("part_number", "Part", "text", False), ("description", "Description", "text", False), ("disposition", "Disposition", "text", False), ("capa_number", "CAPA", "text", False), ("status", "Status", "text", False), ("opened_at", "Opened", "date", False), ("closed_at", "Closed", "date", False)]},
    {"key": "quote", "label": "Quote", "table": "quotes", "keys": ["quote_number"], "display": "quote_number", "color": "#6C7394", "pos": [-8, 1, 5],
     "properties": [("quote_number", "Quote", "text", True), ("customer", "Customer", "text", False), ("product_family", "Product family", "text", False), ("quantity", "Quantity", "number", False), ("value", "Value", "currency", False), ("status", "Status", "text", False), ("converted_so", "Converted sales order", "text", False), ("owner", "Owner", "text", False)]},
    {"key": "blocker", "label": "Blocker", "table": "blockers", "keys": ["id"], "display": "title", "color": "#D05B45", "pos": [-2, 5, 4],
     "properties": [("id", "Blocker", "text", True), ("title", "Title", "text", False), ("status", "Status", "text", False), ("assignee", "Assignee", "text", False), ("wo", "Work order", "text", False), ("sos", "Sales orders", "json", False), ("parts", "Parts", "json", False), ("new_promise", "Revised promise", "date", False)]},
    {"key": "document", "label": "Document", "table": "documents", "keys": ["id"], "display": "title", "color": "#627487", "pos": [0, 5, -7],
     "properties": [("id", "ID", "uuid", True), ("title", "Title", "text", False), ("doc_type", "Document type", "text", False), ("filename", "Filename", "text", False), ("part_number", "Part", "text", False), ("lot_number", "Lot", "text", False), ("vendor_code", "Supplier", "text", False), ("company_ref", "Company", "text", False)]},
    {"key": "data_source", "label": "Data Source", "table": "data_sources", "keys": ["id"], "display": "name", "color": "#253A64", "pos": [-1, 8, -1],
     "properties": [("id", "ID", "uuid", True), ("kind", "Kind", "text", False), ("name", "Name", "text", False), ("status", "Status", "text", False), ("last_sync", "Last sync", "datetime", False), ("config", "Configuration", "json", False)]},
    {"key": "eco", "label": "Engineering Change", "table": "", "keys": ["eco_number"], "display": "eco_number", "color": "#A25B9B", "pos": [0, 7, 4], "custom": True,
     "properties": [("eco_number", "ECO", "text", True), ("title", "Title", "text", False), ("status", "Status", "text", False), ("affected_parts", "Affected parts", "json", False), ("effective_date", "Effective date", "date", False), ("owner", "Owner", "text", False)]},
]

RELATIONSHIPS = [
    ("customer_places_order", "places", "customer", "sales_order", "one-to-many", "name", "customer", "derived", "sales_orders"),
    ("order_requests_part", "requests", "sales_order", "part", "many-to-one", "part_number", "part_number", "derived", "sales_orders"),
    ("part_contains_part", "contains", "part", "part", "many-to-many", "part_number", "part_number", "table", "boms"),
    ("supplier_supplies_part", "supplies", "vendor", "part", "many-to-many", "vendor_code", "part_number", "table", "vendor_parts"),
    ("work_order_builds_part", "builds", "work_order", "part", "many-to-one", "part_number", "part_number", "derived", "work_orders"),
    ("operator_runs_work_order", "runs", "operator", "work_order", "one-to-many", "operator_code", "operator", "derived", "work_orders"),
    ("work_order_produces_lot", "produces", "work_order", "lot", "one-to-many", "wo_number", "work_order", "derived", "lots"),
    ("lot_has_inspection", "has inspection", "lot", "inspection", "one-to-many", "lot_number", "lot_number", "derived", "inspections"),
    ("inspection_raises_ncr", "raises", "inspection", "ncr", "many-to-one", "ncr_number", "ncr_number", "derived", "inspections"),
    ("ncr_affects_part", "affects", "ncr", "part", "many-to-one", "part_number", "part_number", "derived", "ncrs"),
    ("quote_for_customer", "for", "quote", "customer", "many-to-one", "customer", "name", "derived", "quotes"),
    ("quote_converts_order", "converts to", "quote", "sales_order", "one-to-many", "converted_so", "so_number", "derived", "quotes"),
    ("blocker_impacts_order", "impacts", "blocker", "sales_order", "many-to-many", "sos", "object_key", "derived", "blockers"),
    ("blocker_impacts_part", "impacts", "blocker", "part", "many-to-many", "parts", "part_number", "derived", "blockers"),
    ("document_describes_part", "describes", "document", "part", "many-to-one", "part_number", "part_number", "derived", "documents"),
    ("document_evidences_lot", "evidences", "document", "lot", "many-to-one", "lot_number", "lot_number", "derived", "documents"),
    ("eco_changes_part", "changes", "eco", "part", "many-to-many", "affected_parts", "part_number", "custom", ""),
]

OBJECT_SPECS: Dict[str, dict] = {
    "customer": {"table": "customers", "key": "customer_code", "columns": ["customer_code", "name", "email", "region"]},
    "sales_order": {"table": "sales_orders", "key": "so_number || '-L' || line_number", "columns": ["so_number", "line_number", "customer", "site", "promise_date", "revised_promise_date", "part_number", "quantity", "value", "status", "ship_date", "qty_shipped"]},
    "part": {"table": "parts", "key": "part_number", "columns": ["part_number", "description", "unit_cost", "uom", "commodity", "revision", "lifecycle", "classification"]},
    "bom": {"table": "boms", "key": "parent_part_number || '>' || child_part_number || '#' || coalesce(find_number,'')", "columns": ["parent_part_number", "child_part_number", "quantity", "find_number", "ref_designators"]},
    "vendor": {"table": "vendors", "key": "vendor_code", "columns": ["vendor_code", "name", "email", "region"]},
    "work_order": {"table": "work_orders", "key": "wo_number", "columns": ["wo_number", "part_number", "description", "quantity", "site", "status", "due_date", "operator"]},
    "operator": {"table": "operators", "key": "operator_code", "columns": ["operator_code", "name", "site", "shift", "certifications"]},
    "lot": {"table": "lots", "key": "lot_number", "columns": ["lot_number", "part_number", "work_order", "quantity", "site", "company_ref", "mfg_date", "status", "disposition"]},
    "inspection": {"table": "inspections", "key": "id::text", "columns": ["id", "lot_number", "inspection_type", "result", "inspector", "inspected_at", "ncr_number", "notes"]},
    "ncr": {"table": "ncrs", "key": "ncr_number", "columns": ["ncr_number", "lot_number", "part_number", "description", "disposition", "capa_number", "status", "opened_at", "closed_at"]},
    "quote": {"table": "quotes", "key": "quote_number", "columns": ["quote_number", "customer", "product_family", "quantity", "value", "required_date", "promised_date", "expected_ship_date", "owner", "status", "blocker", "blocker_category", "next_action", "site", "company_ref", "converted_so"]},
    "blocker": {"table": "blockers", "key": "id", "columns": ["id", "title", "status", "assignee", "opened_by", "action", "wo", "sos", "parts", "new_promise", "review_status", "created_at"]},
    "document": {"table": "documents", "key": "id::text", "columns": ["id", "company_ref", "doc_type", "title", "filename", "lot_number", "part_number", "vendor_code", "size_bytes", "uploaded_at"]},
    "data_source": {"table": "data_sources", "key": "id::text", "columns": ["id", "kind", "name", "config", "status", "last_sync", "last_result", "created_at"]},
}


class Position(BaseModel):
    x: float = 0
    y: float = 0
    z: float = 0


class EntityCreate(BaseModel):
    entity_key: str = Field(min_length=2, max_length=80, pattern=r"^[a-z][a-z0-9_]*$")
    label: str = Field(min_length=2, max_length=120)
    description: str = Field(default="", max_length=1000)
    color: str = Field(default="#2A46C4", max_length=20)
    position: Position = Field(default_factory=Position)


class EntityPatch(BaseModel):
    label: Optional[str] = Field(default=None, min_length=2, max_length=120)
    description: Optional[str] = Field(default=None, max_length=1000)
    color: Optional[str] = Field(default=None, max_length=20)
    position: Optional[Position] = None


class RelationshipCreate(BaseModel):
    relationship_key: str = Field(min_length=2, max_length=100, pattern=r"^[a-z][a-z0-9_]*$")
    label: str = Field(min_length=1, max_length=120)
    from_entity_key: str = Field(min_length=2, max_length=80)
    to_entity_key: str = Field(min_length=2, max_length=80)
    cardinality: str = Field(default="many-to-one", max_length=30)
    from_property: str = Field(default="", max_length=80)
    to_property: str = Field(default="", max_length=80)


class CustomObjectIn(BaseModel):
    object_key: str = Field(min_length=1, max_length=160)
    properties: Dict[str, Any] = Field(default_factory=dict)


class ActionRunIn(BaseModel):
    action_key: str = Field(min_length=2, max_length=100)
    entity_key: str = Field(min_length=2, max_length=80)
    object_key: str = Field(default="", max_length=200)
    input: Dict[str, Any] = Field(default_factory=dict)


class DecisionIn(BaseModel):
    decision: str = Field(pattern=r"^(approved|rejected)$")
    note: str = Field(default="", max_length=1000)


async def _seed_org(con, org_id) -> None:
    for spec in CORE_ENTITIES:
        source_kind = "custom" if spec.get("custom") else "core_table"
        entity_id = await con.fetchval(
            """
            INSERT INTO ontology_entity_types
              (org_id,entity_key,label,description,source_kind,source_system,source_table,key_fields,display_field,color,position,is_system)
            VALUES ($1,$2,$3,$4,$5,'Threadwire',$6,$7,$8,$9,$10,true)
            ON CONFLICT (org_id,entity_key) DO UPDATE SET
              source_kind=EXCLUDED.source_kind, source_table=EXCLUDED.source_table,
              key_fields=EXCLUDED.key_fields, display_field=EXCLUDED.display_field,
              updated_at=now()
            RETURNING id
            """,
            org_id, spec["key"], spec["label"], "Threadwire operational business object",
            source_kind, spec["table"], spec["keys"], spec["display"], spec["color"],
            {"x": spec["pos"][0], "y": spec["pos"][1], "z": spec["pos"][2]},
        )
        known_properties = set()
        for order, (key, label, dtype, is_key) in enumerate(spec["properties"]):
            known_properties.add(key)
            await con.execute(
                """
                INSERT INTO ontology_properties
                  (org_id,entity_type_id,property_key,label,data_type,source_column,source_system,is_key,sort_order)
                VALUES ($1,$2,$3,$4,$5,$6,'Threadwire',$7,$8)
                ON CONFLICT (org_id,entity_type_id,property_key) DO UPDATE SET
                  label=EXCLUDED.label,data_type=EXCLUDED.data_type,
                  source_column=EXCLUDED.source_column,is_key=EXCLUDED.is_key
                """,
                org_id, entity_id, key, label, dtype, key if source_kind == "core_table" else "", is_key, order,
            )

        # PostgreSQL schema refresh: discover additional columns that were added
        # to a current Threadwire table after this module was shipped. They become
        # lineage-visible properties without moving or copying any operational row.
        if source_kind == "core_table":
            columns = await con.fetch(
                """SELECT column_name,data_type,is_nullable
                   FROM information_schema.columns
                   WHERE table_schema='public' AND table_name=$1
                   ORDER BY ordinal_position""", spec["table"])
            hidden = {"org_id", "content_text", "content_tsv", "storage_key"}
            for offset, col in enumerate(columns, start=200):
                column = col["column_name"]
                if column in known_properties or column in hidden:
                    continue
                pg_type = col["data_type"]
                dtype = (
                    "number" if pg_type in ("numeric", "integer", "bigint", "smallint", "double precision", "real")
                    else "date" if pg_type == "date"
                    else "datetime" if "timestamp" in pg_type
                    else "boolean" if pg_type == "boolean"
                    else "uuid" if pg_type == "uuid"
                    else "json" if pg_type in ("json", "jsonb")
                    else "text"
                )
                await con.execute(
                    """INSERT INTO ontology_properties
                       (org_id,entity_type_id,property_key,label,data_type,source_column,source_system,required,is_key,sort_order)
                       VALUES ($1,$2,$3,$4,$5,$3,'Threadwire',$6,false,$7)
                       ON CONFLICT (org_id,entity_type_id,property_key) DO UPDATE SET
                         data_type=EXCLUDED.data_type,source_column=EXCLUDED.source_column,
                         required=EXCLUDED.required""",
                    org_id, entity_id, column, column.replace("_", " ").title(), dtype,
                    col["is_nullable"] == "NO", offset,
                )

    for key, label, frm, to, card, fp, tp, sk, st in RELATIONSHIPS:
        await con.execute(
            """
            INSERT INTO ontology_relationship_types
              (org_id,relationship_key,label,from_entity_key,to_entity_key,cardinality,
               from_property,to_property,source_kind,source_table)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            ON CONFLICT (org_id,relationship_key) DO UPDATE SET
              label=EXCLUDED.label,from_entity_key=EXCLUDED.from_entity_key,
              to_entity_key=EXCLUDED.to_entity_key,cardinality=EXCLUDED.cardinality,
              from_property=EXCLUDED.from_property,to_property=EXCLUDED.to_property,
              source_kind=EXCLUDED.source_kind,source_table=EXCLUDED.source_table,
              updated_at=now()
            """, org_id, key, label, frm, to, card, fp, tp, sk, st,
        )

    defaults = [
        ("request_review", "Request review", "*", "workflow", False),
        ("escalate_impact", "Escalate impact", "*", "activity", True),
        ("approve_change", "Approve engineering change", "eco", "workflow", True),
    ]
    for key, label, entity, kind, approval in defaults:
        await con.execute(
            """INSERT INTO ontology_action_types
               (org_id,action_key,label,entity_key,action_kind,requires_approval)
               VALUES ($1,$2,$3,$4,$5,$6)
               ON CONFLICT (org_id,action_key) DO NOTHING""",
            org_id, key, label, entity, kind, approval,
        )


async def _load_model(con, org_id) -> dict:
    entities = await con.fetch("SELECT * FROM ontology_entity_types WHERE org_id=$1 ORDER BY label", org_id)
    props = await con.fetch(
        """SELECT p.*, e.entity_key FROM ontology_properties p
           JOIN ontology_entity_types e ON e.id=p.entity_type_id
           WHERE p.org_id=$1 ORDER BY e.label,p.sort_order,p.property_key""", org_id)
    rels = await con.fetch("SELECT * FROM ontology_relationship_types WHERE org_id=$1 ORDER BY label", org_id)
    actions = await con.fetch("SELECT * FROM ontology_action_types WHERE org_id=$1 AND active ORDER BY label", org_id)
    counts: Dict[str, int] = {}
    for spec in CORE_ENTITIES:
        if spec.get("custom"):
            counts[spec["key"]] = await con.fetchval(
                "SELECT count(*) FROM ontology_custom_objects WHERE org_id=$1 AND entity_key=$2", org_id, spec["key"])
        else:
            counts[spec["key"]] = await con.fetchval(f"SELECT count(*) FROM {spec['table']} WHERE org_id=$1", org_id)
    prop_map: Dict[str, list] = {}
    for p in props:
        prop_map.setdefault(p["entity_key"], []).append({
            "propertyKey": p["property_key"], "label": p["label"], "dataType": p["data_type"],
            "sourceColumn": p["source_column"], "sourceSystem": p["source_system"],
            "required": p["required"], "isKey": p["is_key"], "isSensitive": p["is_sensitive"],
            "sortOrder": p["sort_order"], "config": p["config"] or {},
        })
    return {
        "entities": [{
            "id": str(e["id"]), "entityKey": e["entity_key"], "label": e["label"],
            "description": e["description"], "sourceKind": e["source_kind"],
            "sourceSystem": e["source_system"], "sourceTable": e["source_table"],
            "keyFields": e["key_fields"] or [], "displayField": e["display_field"],
            "color": e["color"], "position": e["position"] or {"x": 0, "y": 0, "z": 0},
            "config": e["config"] or {}, "isSystem": e["is_system"],
            "count": counts.get(e["entity_key"], 0), "properties": prop_map.get(e["entity_key"], []),
        } for e in entities],
        "relationships": [{
            "id": str(r["id"]), "relationshipKey": r["relationship_key"], "label": r["label"],
            "fromEntityKey": r["from_entity_key"], "toEntityKey": r["to_entity_key"],
            "cardinality": r["cardinality"], "fromProperty": r["from_property"],
            "toProperty": r["to_property"], "sourceKind": r["source_kind"],
            "sourceTable": r["source_table"], "config": r["config"] or {},
        } for r in rels],
        "actions": [{
            "id": str(a["id"]), "actionKey": a["action_key"], "label": a["label"],
            "entityKey": a["entity_key"], "actionKind": a["action_kind"],
            "requiresApproval": a["requires_approval"], "config": a["config"] or {},
        } for a in actions],
    }


async def _object_rows(con, org_id, entity_key: str, limit: int = 100) -> list:
    spec = OBJECT_SPECS.get(entity_key)
    if not spec:
        rows = await con.fetch(
            """SELECT object_key,properties,created_at,updated_at
               FROM ontology_custom_objects WHERE org_id=$1 AND entity_key=$2
               ORDER BY object_key LIMIT $3""", org_id, entity_key, limit)
        return [{"objectKey": r["object_key"], "properties": _out(r["properties"] or {}),
                 "createdAt": _out(r["created_at"]), "updatedAt": _out(r["updated_at"])} for r in rows]
    cols = ",".join(spec["columns"])
    rows = await con.fetch(
        f"SELECT ({spec['key']})::text AS object_key,{cols} FROM {spec['table']} WHERE org_id=$1 ORDER BY 1 LIMIT $2",
        org_id, limit)
    return [{"objectKey": r["object_key"], "properties": _out({c: r[c] for c in spec["columns"]})} for r in rows]


async def _one_object(con, org_id, entity_key: str, object_key: str) -> Optional[dict]:
    spec = OBJECT_SPECS.get(entity_key)
    if not spec:
        r = await con.fetchrow(
            "SELECT object_key,properties FROM ontology_custom_objects WHERE org_id=$1 AND entity_key=$2 AND object_key=$3",
            org_id, entity_key, object_key)
        return {"entityKey": entity_key, "objectKey": r["object_key"], "properties": _out(r["properties"] or {})} if r else None
    cols = ",".join(spec["columns"])
    r = await con.fetchrow(
        f"SELECT ({spec['key']})::text AS object_key,{cols} FROM {spec['table']} WHERE org_id=$1 AND ({spec['key']})::text=$2 LIMIT 1",
        org_id, object_key)
    return {"entityKey": entity_key, "objectKey": r["object_key"], "properties": _out({c: r[c] for c in spec["columns"]})} if r else None


async def _impact(con, org_id, entity_key: str, object_key: str) -> dict:
    root = await _one_object(con, org_id, entity_key, object_key)
    if not root:
        raise HTTPException(404, "Object not found")
    nodes: Dict[str, dict] = {}
    edges: list = []

    def add_node(entity: str, key: str, props: dict, label: Optional[str] = None):
        nid = f"{entity}:{key}"
        nodes[nid] = {"id": nid, "entityKey": entity, "objectKey": str(key),
                      "label": label or str(key), "properties": _out(props)}
        return nid

    def add_edge(a: str, b: str, label: str):
        edge = {"from": a, "to": b, "label": label}
        if edge not in edges:
            edges.append(edge)

    root_id = add_node(entity_key, object_key, root["properties"])
    p = root["properties"]

    async def rows(sql: str, *args):
        return await con.fetch(sql, org_id, *args)

    async def add_records(entity: str, records, key_col: str, label: str, direction: str = "out"):
        for r in records:
            props = _out(dict(r))
            key = str(props[key_col])
            nid = add_node(entity, key, props)
            add_edge(root_id, nid, label) if direction == "out" else add_edge(nid, root_id, label)

    if entity_key == "part":
        pn = p.get("part_number") or object_key
        child_boms = await rows("SELECT parent_part_number,child_part_number,quantity,find_number,ref_designators FROM boms WHERE org_id=$1 AND parent_part_number=$2 LIMIT 40", pn)
        parent_boms = await rows("SELECT parent_part_number,child_part_number,quantity,find_number,ref_designators FROM boms WHERE org_id=$1 AND child_part_number=$2 LIMIT 40", pn)
        for r in child_boms:
            nid = add_node("part", r["child_part_number"], {"part_number": r["child_part_number"], "quantityPer": r["quantity"], "findNumber": r["find_number"]})
            add_edge(root_id, nid, "contains")
        for r in parent_boms:
            nid = add_node("part", r["parent_part_number"], {"part_number": r["parent_part_number"], "quantityPer": r["quantity"], "findNumber": r["find_number"]})
            add_edge(nid, root_id, "contains")
        await add_records("sales_order", await rows("SELECT so_number || '-L' || line_number AS object_key,so_number,line_number,customer,promise_date,quantity,value,status FROM sales_orders WHERE org_id=$1 AND part_number=$2 LIMIT 30", pn), "object_key", "requested by", "in")
        await add_records("work_order", await rows("SELECT wo_number,part_number,description,quantity,site,status,due_date FROM work_orders WHERE org_id=$1 AND part_number=$2 LIMIT 30", pn), "wo_number", "builds", "in")
        await add_records("lot", await rows("SELECT lot_number,part_number,work_order,quantity,status,mfg_date FROM lots WHERE org_id=$1 AND part_number=$2 LIMIT 30", pn), "lot_number", "materializes as")
        await add_records("ncr", await rows("SELECT ncr_number,lot_number,part_number,description,disposition,status FROM ncrs WHERE org_id=$1 AND part_number=$2 LIMIT 30", pn), "ncr_number", "affected by", "in")
        await add_records("document", await rows("SELECT id::text AS object_key,title,doc_type,filename,lot_number,part_number FROM documents WHERE org_id=$1 AND part_number=$2 LIMIT 20", pn), "object_key", "described by", "in")
        await add_records("blocker", await rows("SELECT id,title,status,assignee,wo,sos,parts,new_promise FROM blockers WHERE org_id=$1 AND parts ? $2 LIMIT 30", pn), "id", "impacted by", "in")
        vendor_rows = await rows("SELECT vp.vendor,v.name,vp.vendor_part_number,vp.unit_cost,vp.lead_time_days FROM vendor_parts vp LEFT JOIN vendors v ON v.org_id=vp.org_id AND v.vendor_code=vp.vendor WHERE vp.org_id=$1 AND vp.part_number=$2 LIMIT 30", pn)
        for r in vendor_rows:
            nid = add_node("vendor", r["vendor"], dict(r), r["name"] or r["vendor"])
            add_edge(nid, root_id, "supplies")
    elif entity_key == "sales_order":
        so = p.get("so_number") or object_key.split("-L")[0]
        line_key = object_key
        if p.get("part_number"):
            part = await _one_object(con, org_id, "part", p["part_number"])
            if part:
                nid = add_node("part", part["objectKey"], part["properties"]); add_edge(root_id, nid, "requests")
        if p.get("customer"):
            rs = await rows("SELECT customer_code,name,email,region FROM customers WHERE org_id=$1 AND lower(name)=lower($2) LIMIT 5", p["customer"])
            await add_records("customer", rs, "customer_code", "places", "in")
        blks = await rows("SELECT id,title,status,assignee,wo,sos,parts,new_promise FROM blockers WHERE org_id=$1 AND (sos ? $2 OR sos ? $3) LIMIT 30", line_key, so)
        await add_records("blocker", blks, "id", "impacted by", "in")
    elif entity_key == "work_order":
        wo = p.get("wo_number") or object_key
        if p.get("part_number"):
            part = await _one_object(con, org_id, "part", p["part_number"])
            if part:
                nid = add_node("part", part["objectKey"], part["properties"]); add_edge(root_id, nid, "builds")
        await add_records("lot", await rows("SELECT lot_number,part_number,work_order,quantity,status,mfg_date FROM lots WHERE org_id=$1 AND work_order=$2 LIMIT 40", wo), "lot_number", "produces")
        await add_records("blocker", await rows("SELECT id,title,status,assignee,wo,sos,parts,new_promise FROM blockers WHERE org_id=$1 AND wo=$2 LIMIT 30", wo), "id", "impacted by", "in")
    elif entity_key == "lot":
        lot = p.get("lot_number") or object_key
        if p.get("part_number"):
            part = await _one_object(con, org_id, "part", p["part_number"])
            if part:
                nid = add_node("part", part["objectKey"], part["properties"]); add_edge(root_id, nid, "contains")
        if p.get("work_order"):
            wo = await _one_object(con, org_id, "work_order", p["work_order"])
            if wo:
                nid = add_node("work_order", wo["objectKey"], wo["properties"]); add_edge(nid, root_id, "produces")
        await add_records("inspection", await rows("SELECT id::text AS object_key,lot_number,inspection_type,result,inspector,inspected_at,ncr_number,notes FROM inspections WHERE org_id=$1 AND lot_number=$2 LIMIT 40", lot), "object_key", "has inspection")
        await add_records("ncr", await rows("SELECT ncr_number,lot_number,part_number,description,disposition,status FROM ncrs WHERE org_id=$1 AND lot_number=$2 LIMIT 30", lot), "ncr_number", "has NCR")
        await add_records("document", await rows("SELECT id::text AS object_key,title,doc_type,filename,lot_number,part_number FROM documents WHERE org_id=$1 AND lot_number=$2 LIMIT 30", lot), "object_key", "evidenced by", "in")
    elif entity_key == "ncr":
        if p.get("part_number"):
            obj = await _one_object(con, org_id, "part", p["part_number"])
            if obj:
                nid = add_node("part", obj["objectKey"], obj["properties"]); add_edge(root_id, nid, "affects")
        if p.get("lot_number"):
            obj = await _one_object(con, org_id, "lot", p["lot_number"])
            if obj:
                nid = add_node("lot", obj["objectKey"], obj["properties"]); add_edge(nid, root_id, "has NCR")
    elif entity_key in ("customer", "quote"):
        customer = p.get("name") if entity_key == "customer" else p.get("customer")
        if customer:
            await add_records("sales_order", await rows("SELECT so_number || '-L' || line_number AS object_key,so_number,line_number,customer,part_number,promise_date,quantity,value,status FROM sales_orders WHERE org_id=$1 AND lower(customer)=lower($2) LIMIT 40", customer), "object_key", "places" if entity_key == "customer" else "related order")
            if entity_key == "customer":
                await add_records("quote", await rows("SELECT quote_number,customer,product_family,quantity,value,status,converted_so FROM quotes WHERE org_id=$1 AND lower(customer)=lower($2) LIMIT 40", customer), "quote_number", "receives quote")
        if entity_key == "quote" and p.get("converted_so"):
            rs = await rows("SELECT so_number || '-L' || line_number AS object_key,so_number,line_number,customer,part_number,promise_date,quantity,value,status FROM sales_orders WHERE org_id=$1 AND so_number=$2 LIMIT 40", p["converted_so"])
            await add_records("sales_order", rs, "object_key", "converts to")
    elif entity_key == "vendor":
        vendor = p.get("vendor_code") or object_key
        rs = await rows("SELECT vp.part_number,p.description,vp.vendor_part_number,vp.unit_cost,vp.lead_time_days FROM vendor_parts vp LEFT JOIN parts p ON p.org_id=vp.org_id AND p.part_number=vp.part_number WHERE vp.org_id=$1 AND vp.vendor=$2 LIMIT 50", vendor)
        for r in rs:
            nid = add_node("part", r["part_number"], dict(r), r["part_number"])
            add_edge(root_id, nid, "supplies")
    elif entity_key == "blocker":
        for pn in p.get("parts") or []:
            obj = await _one_object(con, org_id, "part", str(pn))
            nid = add_node("part", str(pn), obj["properties"] if obj else {"part_number": pn})
            add_edge(root_id, nid, "impacts")
        for so_key in p.get("sos") or []:
            obj = await _one_object(con, org_id, "sales_order", str(so_key))
            nid = add_node("sales_order", str(so_key), obj["properties"] if obj else {"sales_order": so_key})
            add_edge(root_id, nid, "impacts")
    elif entity_key == "eco":
        for pn in p.get("affected_parts") or []:
            obj = await _one_object(con, org_id, "part", str(pn))
            nid = add_node("part", str(pn), obj["properties"] if obj else {"part_number": pn})
            add_edge(root_id, nid, "changes")

    return {"root": root_id, "nodes": list(nodes.values())[:80], "edges": edges[:120], "truncated": len(nodes) > 80 or len(edges) > 120}


@router.get("/model")
async def get_model(request: Request):
    user = await _user(request)
    async with db.pool().acquire() as con:
        async with con.transaction():
            await _seed_org(con, user["org_id"])
            model = await _load_model(con, user["org_id"])
    model["canWrite"] = _is_admin(user)
    model["tenant"] = {"orgId": str(user["org_id"]), "legalName": user.get("legal_name", "")}
    return model


@router.post("/bootstrap")
async def bootstrap(request: Request):
    user = await _user(request)
    _require_admin(user)
    async with db.pool().acquire() as con:
        async with con.transaction():
            await _seed_org(con, user["org_id"])
            model = await _load_model(con, user["org_id"])
    return {"ok": True, **model}


@router.post("/entities")
async def create_entity(body: EntityCreate, request: Request):
    user = await _user(request); _require_admin(user)
    async with db.pool().acquire() as con:
        try:
            row = await con.fetchrow(
                """INSERT INTO ontology_entity_types
                   (org_id,entity_key,label,description,source_kind,source_system,color,position,is_system)
                   VALUES ($1,$2,$3,$4,'custom','Threadwire',$5,$6,false) RETURNING *""",
                user["org_id"], body.entity_key, body.label, body.description, body.color, body.position.model_dump())
        except Exception as e:
            if "unique" in str(e).lower():
                raise HTTPException(409, "That entity key already exists")
            raise
    return {"id": str(row["id"]), "entityKey": row["entity_key"], "label": row["label"], "position": row["position"]}


@router.patch("/entities/{entity_key}")
async def patch_entity(entity_key: str, body: EntityPatch, request: Request):
    user = await _user(request); _require_admin(user)
    fields, values = [], []
    for col, val in (("label", body.label), ("description", body.description), ("color", body.color),
                     ("position", body.position.model_dump() if body.position else None)):
        if val is not None:
            values.append(val); fields.append(f"{col}=${len(values)+2}")
    if not fields:
        return {"ok": True}
    async with db.pool().acquire() as con:
        result = await con.execute(
            f"UPDATE ontology_entity_types SET {','.join(fields)},updated_at=now() WHERE org_id=$1 AND entity_key=$2",
            user["org_id"], entity_key, *values)
    if result.endswith("0"):
        raise HTTPException(404, "Entity not found")
    return {"ok": True}


@router.delete("/entities/{entity_key}")
async def delete_entity(entity_key: str, request: Request):
    user = await _user(request); _require_admin(user)
    async with db.pool().acquire() as con:
        row = await con.fetchrow("SELECT is_system FROM ontology_entity_types WHERE org_id=$1 AND entity_key=$2", user["org_id"], entity_key)
        if not row:
            raise HTTPException(404, "Entity not found")
        if row["is_system"]:
            raise HTTPException(409, "Core Threadwire entities cannot be deleted; hide or relabel them instead")
        async with con.transaction():
            await con.execute("DELETE FROM ontology_relationship_types WHERE org_id=$1 AND (from_entity_key=$2 OR to_entity_key=$2)", user["org_id"], entity_key)
            await con.execute("DELETE FROM ontology_custom_objects WHERE org_id=$1 AND entity_key=$2", user["org_id"], entity_key)
            await con.execute("DELETE FROM ontology_entity_types WHERE org_id=$1 AND entity_key=$2", user["org_id"], entity_key)
    return {"ok": True}


@router.post("/relationships")
async def create_relationship(body: RelationshipCreate, request: Request):
    user = await _user(request); _require_admin(user)
    async with db.pool().acquire() as con:
        keys = await con.fetch("SELECT entity_key FROM ontology_entity_types WHERE org_id=$1 AND entity_key=ANY($2::text[])", user["org_id"], [body.from_entity_key, body.to_entity_key])
        if len({r["entity_key"] for r in keys}) != len({body.from_entity_key, body.to_entity_key}):
            raise HTTPException(400, "Both entities must exist")
        try:
            row = await con.fetchrow(
                """INSERT INTO ontology_relationship_types
                   (org_id,relationship_key,label,from_entity_key,to_entity_key,cardinality,from_property,to_property,source_kind)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'custom') RETURNING *""",
                user["org_id"], body.relationship_key, body.label, body.from_entity_key,
                body.to_entity_key, body.cardinality, body.from_property, body.to_property)
        except Exception as e:
            if "unique" in str(e).lower():
                raise HTTPException(409, "That relationship key already exists")
            raise
    return {"id": str(row["id"]), "relationshipKey": row["relationship_key"]}


@router.delete("/relationships/{relationship_key}")
async def delete_relationship(relationship_key: str, request: Request):
    user = await _user(request); _require_admin(user)
    async with db.pool().acquire() as con:
        result = await con.execute("DELETE FROM ontology_relationship_types WHERE org_id=$1 AND relationship_key=$2 AND source_kind='custom'", user["org_id"], relationship_key)
    if result.endswith("0"):
        raise HTTPException(409, "Only custom relationships can be deleted")
    return {"ok": True}


@router.get("/objects/{entity_key}")
async def get_objects(entity_key: str, request: Request, search: str = "", limit: int = Query(100, ge=1, le=300)):
    user = await _user(request)
    async with db.pool().acquire() as con:
        exists = await con.fetchval("SELECT 1 FROM ontology_entity_types WHERE org_id=$1 AND entity_key=$2", user["org_id"], entity_key)
        if not exists:
            raise HTTPException(404, "Entity not found")
        rows = await _object_rows(con, user["org_id"], entity_key, min(300, max(limit, 100 if search else limit)))
    if search.strip():
        q = search.strip().lower()
        rows = [r for r in rows if q in (r["objectKey"] + " " + str(r.get("properties", {}))).lower()][:limit]
    return {"entityKey": entity_key, "objects": rows[:limit], "count": len(rows[:limit])}


@router.post("/objects/{entity_key}")
async def create_object(entity_key: str, body: CustomObjectIn, request: Request):
    user = await _user(request); _require_admin(user)
    async with db.pool().acquire() as con:
        entity = await con.fetchrow("SELECT source_kind FROM ontology_entity_types WHERE org_id=$1 AND entity_key=$2", user["org_id"], entity_key)
        if not entity:
            raise HTTPException(404, "Entity not found")
        if entity["source_kind"] != "custom":
            raise HTTPException(409, "Core operational objects must be created through their existing Threadwire workflow or import")
        await con.execute(
            """INSERT INTO ontology_custom_objects (org_id,entity_key,object_key,properties,created_by)
               VALUES ($1,$2,$3,$4,$5)
               ON CONFLICT (org_id,entity_key,object_key) DO UPDATE SET properties=EXCLUDED.properties,updated_at=now()""",
            user["org_id"], entity_key, body.object_key, body.properties, user.get("full_name") or user["email"])
    return {"ok": True, "entityKey": entity_key, "objectKey": body.object_key}


@router.delete("/objects/{entity_key}/{object_key}")
async def delete_object(entity_key: str, object_key: str, request: Request):
    user = await _user(request); _require_admin(user)
    async with db.pool().acquire() as con:
        result = await con.execute("DELETE FROM ontology_custom_objects WHERE org_id=$1 AND entity_key=$2 AND object_key=$3", user["org_id"], entity_key, object_key)
    if result.endswith("0"):
        raise HTTPException(404, "Custom object not found")
    return {"ok": True}


@router.get("/impact/{entity_key}/{object_key}")
async def impact(entity_key: str, object_key: str, request: Request):
    user = await _user(request)
    async with db.pool().acquire() as con:
        return await _impact(con, user["org_id"], entity_key, object_key)


@router.get("/actions/runs")
async def action_runs(request: Request, limit: int = Query(50, ge=1, le=200)):
    user = await _user(request)
    async with db.pool().acquire() as con:
        rows = await con.fetch("SELECT * FROM ontology_action_runs WHERE org_id=$1 ORDER BY requested_at DESC LIMIT $2", user["org_id"], limit)
    return [{k: _out(v) for k, v in dict(r).items()} for r in rows]


@router.post("/actions/runs")
async def create_action_run(body: ActionRunIn, request: Request):
    user = await _user(request)
    who = user.get("full_name") or user["email"]
    async with db.pool().acquire() as con:
        action = await con.fetchrow("SELECT * FROM ontology_action_types WHERE org_id=$1 AND action_key=$2 AND active", user["org_id"], body.action_key)
        if not action:
            raise HTTPException(404, "Action type not found")
        if action["entity_key"] not in ("*", body.entity_key):
            raise HTTPException(400, "Action is not available for this entity")
        status = "pending" if action["requires_approval"] else "completed"
        row = await con.fetchrow(
            """INSERT INTO ontology_action_runs
               (org_id,action_key,entity_key,object_key,status,input,requested_by,completed_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,CASE WHEN $5='completed' THEN now() ELSE NULL END) RETURNING *""",
            user["org_id"], body.action_key, body.entity_key, body.object_key, status, body.input, who)
        if status == "completed":
            await con.execute("INSERT INTO activity_events (org_id,type,detail,by_user) VALUES ($1,'ontology.action',$2,$3)", user["org_id"], f"{action['label']}: {body.entity_key} {body.object_key}", who)
    return {k: _out(v) for k, v in dict(row).items()}


@router.post("/actions/runs/{run_id}/decision")
async def decide_action(run_id: uuid.UUID, body: DecisionIn, request: Request):
    user = await _user(request); _require_admin(user)
    who = user.get("full_name") or user["email"]
    status = "completed" if body.decision == "approved" else "rejected"
    async with db.pool().acquire() as con:
        async with con.transaction():
            row = await con.fetchrow(
                """UPDATE ontology_action_runs SET status=$3,approved_by=$4,decided_at=now(),
                   completed_at=CASE WHEN $3='completed' THEN now() ELSE completed_at END,
                   output=jsonb_build_object('decisionNote',$5)
                   WHERE org_id=$1 AND id=$2 AND status='pending' RETURNING *""",
                user["org_id"], run_id, status, who, body.note)
            if not row:
                raise HTTPException(404, "Pending action not found")
            if status == "completed":
                await con.execute("INSERT INTO activity_events (org_id,type,detail,by_user) VALUES ($1,'ontology.action.approved',$2,$3)", user["org_id"], f"{row['action_key']}: {row['entity_key']} {row['object_key']}", who)
    return {k: _out(v) for k, v in dict(row).items()}

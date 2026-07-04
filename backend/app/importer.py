"""CSV import engine for ThreadWire digital-thread data.

Each entity declares its columns (name, required, kind) and how to upsert.
Rows are imported with autocommit semantics so a bad row is reported but does
not abort the rest of the file. `parts` must be loaded before `boms` and
`vendor_parts`, which reference existing part numbers.
"""
from __future__ import annotations

import csv
import io
from datetime import date
from decimal import Decimal
from typing import Optional

# kind: text | num | int | date
ENTITIES = [
    {
        "entity": "parts", "label": "Parts", "order": 1,
        "table": "parts",
        "note": "Load parts FIRST — BOMs and vendor parts reference them. One row per part number. Vendor pricing goes in the separate 'Vendor parts' file (a part can have several vendors).",
        "cols": [
            ("part_number", True, "text"), ("description", False, "text"),
            ("unit_cost", False, "num"), ("uom", False, "text"),
            ("commodity", False, "text"), ("revision", False, "text"),
            ("lifecycle", False, "text"),
        ],
        "conflict": ["part_number"],
        "sample": [
            ["PN-3320", "Spindle Housing", "412.50", "ea", "Machined", "C", "Production"],
            ["PN-4501", "Servo Bracket", "88.00", "ea", "Sheet Metal", "B", "Production"],
            ["PN-3323", "Collet Nut", "9.75", "ea", "Hardware", "A", "Production"],
        ],
    },
    {
        "entity": "boms", "label": "BOMs (single level)", "order": 2,
        "table": "boms",
        "note": "Single-level only: one row per parent→child line. Deeper levels are imported as their own parent rows in additional files. Parent and child parts must already exist in Parts.",
        "cols": [
            ("parent_part_number", True, "text"), ("child_part_number", True, "text"),
            ("quantity", True, "num"), ("find_number", False, "text"),
            ("ref_designators", False, "text"),
        ],
        "conflict": ["parent_part_number", "child_part_number", "find_number"],
        "requires_parts": ["parent_part_number", "child_part_number"],
        "sample": [
            ["PN-3320", "PN-3323", "4", "10", "R1,R2,R3,R4"],
            ["PN-3320", "PN-4501", "1", "20", "A1"],
        ],
    },
    {
        "entity": "vendors", "label": "Vendors", "order": 3,
        "table": "vendors",
        "note": "Suppliers. Referenced by Vendor parts via the vendor code.",
        "cols": [
            ("vendor_code", True, "text"), ("name", True, "text"),
            ("email", False, "text"), ("region", False, "text"),
        ],
        "conflict": ["vendor_code"],
        "sample": [
            ["V-100", "Precision Castings Co", "sales@precast.example", "US-SE"],
            ["V-220", "Apex Hardware", "orders@apexhw.example", "US-MW"],
        ],
    },
    {
        "entity": "vendor_parts", "label": "Vendor parts", "order": 4,
        "table": "vendor_parts",
        "note": "Maps a part to a supplier's part number and price. A part may have multiple vendors — one row each. (vendor + vendor_part_number) must be unique. Parts must already exist.",
        "cols": [
            ("part_number", True, "text"), ("vendor", True, "text"),
            ("vendor_part_number", True, "text"), ("unit_cost", False, "num"),
            ("lead_time_days", False, "int"),
        ],
        "conflict": ["vendor", "vendor_part_number"],
        "requires_parts": ["part_number"],
        "sample": [
            ["PN-3320", "V-100", "PC-9920", "405.00", "35"],
            ["PN-3320", "V-220", "AX-3320B", "418.00", "21"],
            ["PN-3323", "V-220", "AX-NUT-12", "9.10", "14"],
        ],
    },
    {
        "entity": "customers", "label": "Customers", "order": 5,
        "table": "customers",
        "note": "Customers placing sales orders. Sales orders reference the customer code or name.",
        "cols": [
            ("customer_code", True, "text"), ("name", True, "text"),
            ("email", False, "text"), ("region", False, "text"),
        ],
        "conflict": ["customer_code"],
        "sample": [
            ["C-VTX", "Vertex Aerospace", "po@vertex.example", "US-NE"],
            ["C-APX", "Apex Defense", "supply@apexdef.example", "US-SE"],
        ],
    },
    {
        "entity": "sales_orders", "label": "Sales orders", "order": 6,
        "table": "sales_orders",
        "note": "Multi-line. Each row is one sales-order LINE: so_number + line_number + one end-item part (SOEI) with its own quantity, value and promise_date. line_number goes in 10s (10,20,30…); leave blank to default to 10. promise_date is YYYY-MM-DD.",
        "cols": [
            ("so_number", True, "text"), ("line_number", False, "int"),
            ("customer", True, "text"),
            ("site", False, "text"), ("promise_date", True, "date"),
            ("part_number", False, "text"), ("quantity", False, "num"),
            ("value", False, "num"), ("status", False, "text"),
        ],
        "conflict": ["so_number", "line_number"],
        "sample": [
            ["SO-5001", "10", "Vertex Aerospace", "Lawrence, MA", "2026-06-22", "PN-3320", "40", "128000", "open"],
            ["SO-5001", "20", "Vertex Aerospace", "Lawrence, MA", "2026-06-24", "PN-3321", "100", "40000", "open"],
            ["SO-5004", "10", "Apex Defense", "Greenville, SC", "2026-06-24", "PN-4501", "200", "96000", "open"],
        ],
    },
    {
        "entity": "work_orders", "label": "Work orders", "order": 7,
        "table": "work_orders",
        "note": "Shop-floor work orders. due_date is YYYY-MM-DD. Blockers can reference a work order.",
        "cols": [
            ("wo_number", True, "text"), ("part_number", False, "text"),
            ("description", False, "text"), ("quantity", False, "num"),
            ("site", False, "text"), ("status", False, "text"),
            ("due_date", False, "date"), ("operator", False, "text"),
        ],
        "conflict": ["wo_number"],
        "sample": [
            ["WO-7790", "PN-4501", "Servo bracket build", "200", "Greenville, SC", "in_process", "2026-06-23", "OP-12"],
            ["WO-7781", "PN-3320", "Spindle housing run", "40", "Lawrence, MA", "released", "2026-06-21", "OP-04"],
        ],
    },
    {
        "entity": "operators", "label": "Operators", "order": 8,
        "table": "operators",
        "note": "Shop-floor operators / people work can be assigned to.",
        "cols": [
            ("operator_code", True, "text"), ("name", True, "text"),
            ("site", False, "text"), ("shift", False, "text"),
            ("certifications", False, "text"),
        ],
        "conflict": ["operator_code"],
        "sample": [
            ["OP-04", "M. Reyes", "Lawrence, MA", "1st", "CNC, Deburr"],
            ["OP-12", "A. Kidd", "Greenville, SC", "2nd", "Welding, Anodize"],
        ],
    },
    {
        "entity": "lots", "label": "Lots / batches", "order": 9,
        "table": "lots",
        "note": "Manufacturing lots/batches — the spine of a Device History Record (DHR). Export from IQMS. company_ref tags the acquired entity (e.g. NextPhase). status: released|hold|quarantine|shipped.",
        "cols": [
            ("lot_number", True, "text"), ("part_number", False, "text"),
            ("work_order", False, "text"), ("quantity", False, "num"),
            ("site", False, "text"), ("company_ref", False, "text"),
            ("mfg_date", False, "date"), ("status", False, "text"), ("disposition", False, "text"),
        ],
        "conflict": ["lot_number"],
        "sample": [
            ["NX-9842", "PN-3320", "WO-7781", "40", "Lawrence, MA", "NextPhase", "2026-06-14", "released", "accepted"],
            ["NX-9843", "PN-4501", "WO-7790", "200", "Greenville, SC", "NextPhase", "2026-06-18", "hold", "pending NCR"],
        ],
    },
    {
        "entity": "inspections", "label": "Inspections", "order": 10,
        "table": "inspections",
        "note": "Quality inspections per lot (incoming/in-process/final). Export from IQMS quality module. result: pass|fail|conditional. Link a failing inspection to an NCR via ncr_number.",
        "cols": [
            ("lot_number", True, "text"), ("inspection_type", False, "text"),
            ("result", False, "text"), ("inspector", False, "text"),
            ("inspected_at", False, "date"), ("ncr_number", False, "text"), ("notes", False, "text"),
        ],
        "conflict": [],
        "sample": [
            ["NX-9842", "final", "pass", "QA-03", "2026-06-15", "", "All dimensions in tolerance"],
            ["NX-9843", "in-process", "fail", "QA-03", "2026-06-19", "NCR-5521", "Anodize coating thickness low"],
        ],
    },
    {
        "entity": "ncrs", "label": "NCRs / CAPA", "order": 11,
        "table": "ncrs",
        "note": "Non-conformance records and CAPA linkage. disposition: use-as-is|rework|scrap|RTV. status: open|closed.",
        "cols": [
            ("ncr_number", True, "text"), ("lot_number", False, "text"),
            ("part_number", False, "text"), ("description", False, "text"),
            ("disposition", False, "text"), ("capa_number", False, "text"),
            ("status", False, "text"), ("opened_at", False, "date"), ("closed_at", False, "date"),
        ],
        "conflict": ["ncr_number"],
        "sample": [
            ["NCR-5521", "NX-9843", "PN-4501", "Anodize coating below spec thickness", "rework", "CAPA-118", "open", "2026-06-19", ""],
        ],
    },
    {
        "entity": "quotes", "label": "Quotes", "order": 12,
        "table": "quotes",
        "note": "Delivery Desk quote-to-order tracker. status: open|quoted|won|lost|converted. "
                "blocker_category: material|qa|engineering|customer|supplier_docs|none. A quote can be "
                "converted to a sales order from the app or via /api/quotes/{id}/convert.",
        "cols": [
            ("quote_number", True, "text"), ("customer", False, "text"),
            ("product_family", False, "text"), ("custom_attributes", False, "text"),
            ("quantity", False, "num"), ("value", False, "num"),
            ("required_date", False, "date"), ("promised_date", False, "date"),
            ("expected_ship_date", False, "date"), ("owner", False, "text"),
            ("status", False, "text"), ("blocker", False, "text"),
            ("blocker_category", False, "text"), ("next_action", False, "text"),
            ("site", False, "text"), ("company_ref", False, "text"), ("notes", False, "text"),
        ],
        "conflict": ["quote_number"],
        "sample": [
            ["Q-1001", "Vertex Aerospace", "Lace-up grips", "cable dia 12mm", "40", "128000",
             "2026-07-10", "2026-07-08", "", "A. Mishra", "quoted", "", "none", "Follow up with customer",
             "Lawrence, MA", "AMTEC", "Repeat of Q-0921 geometry"],
            ["Q-1002", "Helios Robotics", "Custom light guide", "NA 0.22, 850nm", "120", "54000",
             "2026-07-14", "", "", "R. Alvarez", "open", "Awaiting engineering feasibility", "engineering",
             "Confirm fiber type", "Greenville, SC", "FTI", "Non-telecom, regulated customer"],
        ],
    },
]

SPEC = {e["entity"]: e for e in ENTITIES}


def _norm(h: str) -> str:
    return h.strip().lower().replace(" ", "_")


def _cast(v: str, kind: str):
    if v is None or v == "":
        return None
    if kind == "num":
        return Decimal(str(v).replace(",", ""))
    if kind == "int":
        return int(float(str(v).replace(",", "")))
    if kind == "date":
        return date.fromisoformat(str(v).strip())
    return str(v)


def parse_csv(text: str):
    reader = csv.DictReader(io.StringIO(text))
    fieldmap = {_norm(k): k for k in (reader.fieldnames or []) if k is not None}
    rows = []
    for raw in reader:
        rows.append({norm: (raw.get(orig) or "").strip() for norm, orig in fieldmap.items()})
    return rows, list(fieldmap.keys())


def sample_csv(entity: str) -> str:
    spec = SPEC[entity]
    header = [c for c, _, _ in spec["cols"]]
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(header)
    for row in spec.get("sample", []):
        w.writerow(row)
    return out.getvalue()


def entities_meta():
    out = []
    for e in sorted(ENTITIES, key=lambda x: x["order"]):
        out.append({
            "entity": e["entity"], "label": e["label"], "order": e["order"],
            "note": e["note"],
            "requires_parts": bool(e.get("requires_parts")),
            "columns": [{"name": c, "required": req} for c, req, _ in e["cols"]],
        })
    return out


async def _upsert(con, org_id, spec, row):
    cols = [c for c, _, _ in spec["cols"]]
    vals = {}
    for col, required, kind in spec["cols"]:
        raw = row.get(col, "")
        if required and (raw is None or raw == ""):
            raise ValueError("missing required '%s'" % col)
        try:
            vals[col] = _cast(raw, kind)
        except Exception:
            raise ValueError("bad value for '%s': %r" % (col, raw))
    if "line_number" in vals and vals.get("line_number") is None:
        vals["line_number"] = 10  # sales-order lines default to 10
    collist = ["org_id"] + cols
    placeholders = ["$1"] + ["$%d" % (i + 2) for i in range(len(cols))]
    args = [org_id] + [vals[c] for c in cols]
    if not spec["conflict"]:
        sql = "INSERT INTO %s (%s) VALUES (%s)" % (spec["table"], ",".join(collist), ",".join(placeholders))
        await con.execute(sql, *args)
        return "inserted"
    updates = ["%s=EXCLUDED.%s" % (c, c) for c in cols if c not in spec["conflict"]]
    updates.append("updated_at=now()")
    sql = (
        "INSERT INTO %s (%s) VALUES (%s) ON CONFLICT (org_id,%s) DO UPDATE SET %s RETURNING (xmax = 0) AS inserted"
        % (spec["table"], ",".join(collist), ",".join(placeholders),
           ",".join(spec["conflict"]), ",".join(updates))
    )
    args = [org_id] + [vals[c] for c in cols]
    inserted = await con.fetchval(sql, *args)
    return "inserted" if inserted else "updated"


async def do_import(con, org_id, entity: str, rows: list):
    if entity not in SPEC:
        raise ValueError("unknown entity")
    spec = SPEC[entity]
    res = {"entity": entity, "inserted": 0, "updated": 0, "errors": [], "total": len(rows)}

    part_set = None
    if spec.get("requires_parts"):
        recs = await con.fetch("SELECT part_number FROM parts WHERE org_id = $1", org_id)
        part_set = {r["part_number"] for r in recs}

    for i, row in enumerate(rows, start=2):  # header is line 1
        try:
            if spec.get("requires_parts"):
                for col in spec["requires_parts"]:
                    pv = row.get(col, "")
                    if pv and pv not in part_set:
                        raise ValueError("part '%s' not found — import Parts first" % pv)
            kind = await _upsert(con, org_id, spec, row)
            res[kind] += 1
        except Exception as e:
            if len(res["errors"]) < 50:
                res["errors"].append({"row": i, "message": str(e)})
    res["error_count"] = (res["total"] - res["inserted"] - res["updated"])
    if entity == "sales_orders" and (res["inserted"] or res["updated"]):
        # mark every part used as a sales-order end item (SOEI), if not already classified
        try:
            await con.execute(
                "UPDATE parts p SET classification='SOEI' FROM sales_orders s "
                "WHERE s.org_id=p.org_id AND s.part_number=p.part_number AND p.org_id=$1 "
                "AND (p.classification IS NULL OR p.classification='')", org_id)
        except Exception:
            pass
    return res


async def org_data_summary(con, org_id) -> str:
    """Compact authoritative summary of imported data + recent imports, appended
    to the assistant's system prompt so imports are part of its answers."""
    try:
        counts = await con.fetchrow(
            "SELECT "
            "(SELECT count(*) FROM parts WHERE org_id=$1) AS parts,"
            "(SELECT count(*) FROM boms WHERE org_id=$1) AS boms,"
            "(SELECT count(*) FROM vendors WHERE org_id=$1) AS vendors,"
            "(SELECT count(*) FROM vendor_parts WHERE org_id=$1) AS vendor_parts,"
            "(SELECT count(*) FROM customers WHERE org_id=$1) AS customers,"
            "(SELECT count(*) FROM sales_orders WHERE org_id=$1) AS sales_orders,"
            "(SELECT count(*) FROM work_orders WHERE org_id=$1) AS work_orders,"
            "(SELECT count(*) FROM operators WHERE org_id=$1) AS operators",
            org_id)
        evts = await con.fetch(
            "SELECT entity, inserted, updated, errors, created_at FROM import_events "
            "WHERE org_id=$1 ORDER BY created_at DESC LIMIT 10", org_id)
        acts = await con.fetch(
            "SELECT type, detail, by_user, created_at FROM activity_events "
            "WHERE org_id=$1 ORDER BY created_at DESC LIMIT 12", org_id)
    except Exception:
        return ""
    if not counts:
        return ""
    lines = ["IMPORTED THREADWIRE DATA (server-side, authoritative). Record counts:"]
    lines.append(", ".join("%s=%s" % (k, counts[k]) for k in counts.keys()))
    if evts:
        lines.append("Recent imports (newest first):")
        for e in evts:
            lines.append("- %s: +%d new, %d updated, %d errors (%s)" % (
                e["entity"], e["inserted"], e["updated"], e["errors"],
                e["created_at"].strftime("%Y-%m-%d %H:%M")))
    if acts:
        lines.append("Recent changes (newest first):")
        for a in acts:
            lines.append("- %s: %s — %s (%s)" % (
                a["type"], a["detail"], a["by_user"], a["created_at"].strftime("%Y-%m-%d %H:%M")))
    return "\n".join(lines)

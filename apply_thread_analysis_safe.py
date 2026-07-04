from pathlib import Path
from datetime import datetime

ROOT = Path.cwd()
FRONTEND = ROOT / "frontend" / "src" / "ThreadWire.jsx"
BACKEND = ROOT / "backend" / "app" / "main.py"
MIGRATION = ROOT / "db" / "migrations" / "999_thread_analysis_apis.sql"
STAMP = datetime.now().strftime("%Y%m%d%H%M%S")

THREAD_API_MARKER = "# thread analysis APIs: supply-chain pegging + ECO impact"
THREAD_UI_START = "/* --------------------------- DIGITAL THREAD ----------------------------- */"
THREAD_UI_END = "/* ============================ ROI CALCULATOR ============================= */"
BACKEND_INSERT_BEFORE = "# --------------------------------------------------------------------------- #\n# billing (Stripe) + usage"

BACKEND_API_CODE = r'''
# --------------------------------------------------------------------------- #
# thread analysis APIs: supply-chain pegging + ECO impact
# --------------------------------------------------------------------------- #
class ThreadCopilotIn(BaseModel):
    analysis_type: str = "bom"   # bom | eco
    entity_id: str = ""
    question: str = ""
    context: dict = Field(default_factory=dict)


def _iso(v):
    if v is None:
        return None
    return v.isoformat() if hasattr(v, "isoformat") else v


def _num(v):
    if v is None:
        return 0
    try:
        return float(v)
    except Exception:
        return 0


def _r(row):
    if not row:
        return None
    out = {}
    for k, v in dict(row).items():
        if hasattr(v, "isoformat"):
            out[k] = v.isoformat()
        elif hasattr(v, "__float__") and v.__class__.__name__ == "Decimal":
            out[k] = float(v)
        else:
            out[k] = v
    return out


@app.get("/api/thread/bom/search")
async def thread_bom_search(q: str = "", user: dict = Depends(current_user)):
    q = (q or "").strip()
    like = "%" + q.upper() + "%"
    async with db.pool().acquire() as con:
        rows = await con.fetch(
            """
            WITH candidates AS (
              SELECT p.part_number, p.description, p.revision, p.classification, p.commodity,
                     EXISTS (SELECT 1 FROM boms b WHERE b.org_id=p.org_id AND b.parent_part_number=p.part_number) AS has_bom,
                     0 AS rank
                FROM parts p
               WHERE p.org_id=$1
                 AND ($2='' OR upper(p.part_number) LIKE $3 OR upper(coalesce(p.description,'')) LIKE $3)
              UNION
              SELECT b.parent_part_number AS part_number, coalesce(p.description,'') AS description,
                     coalesce(p.revision,'') AS revision, coalesce(p.classification,'') AS classification,
                     coalesce(p.commodity,'') AS commodity, true AS has_bom, 1 AS rank
                FROM boms b
                LEFT JOIN parts p ON p.org_id=b.org_id AND p.part_number=b.parent_part_number
               WHERE b.org_id=$1
                 AND ($2='' OR upper(b.parent_part_number) LIKE $3 OR upper(b.child_part_number) LIKE $3)
            )
            SELECT part_number, max(description) AS description, max(revision) AS revision,
                   max(classification) AS classification, max(commodity) AS commodity,
                   bool_or(has_bom) AS has_bom
              FROM candidates
             GROUP BY part_number
             ORDER BY bool_or(has_bom) DESC, part_number
             LIMIT 25
            """,
            user["org_id"], q, like)
    return {"items": [_r(x) for x in rows]}


@app.get("/api/thread/bom/{part_number}/pegging")
async def thread_bom_pegging(part_number: str, user: dict = Depends(current_user)):
    pn = (part_number or "").strip()
    async with db.pool().acquire() as con:
        root = await con.fetchrow(
            "SELECT part_number, description, revision, classification, commodity, unit_cost FROM parts WHERE org_id=$1 AND part_number=$2",
            user["org_id"], pn)
        bom = await con.fetch(
            """
            SELECT b.parent_part_number, b.child_part_number, b.quantity, b.find_number, b.ref_designators,
                   coalesce(p.description,'') AS description, coalesce(p.revision,'') AS revision,
                   coalesce(p.commodity,'') AS commodity, coalesce(p.unit_cost,0) AS unit_cost
              FROM boms b
              LEFT JOIN parts p ON p.org_id=b.org_id AND p.part_number=b.child_part_number
             WHERE b.org_id=$1 AND b.parent_part_number=$2
             ORDER BY nullif(b.find_number,''), b.child_part_number
            """, user["org_id"], pn)
        root_demand = await con.fetchval(
            """
            SELECT coalesce(sum(coalesce(quantity,0)),0) FROM sales_orders
             WHERE org_id=$1 AND part_number=$2
               AND lower(coalesce(status,'')) NOT IN ('closed','complete','completed','shipped','cancelled','canceled')
            """, user["org_id"], pn)
        if not root_demand:
            root_demand = 1
        inv_rows = await con.fetch(
            """
            SELECT part_number, site, on_hand, allocated, available, safety_stock, inspection_hold, updated_at
              FROM inventory_balances
             WHERE org_id=$1 AND (part_number=$2 OR part_number = ANY($3::text[]))
             ORDER BY part_number, site
            """, user["org_id"], pn, [b["child_part_number"] for b in bom])
        po_rows = await con.fetch(
            """
            SELECT po_number, line_number, part_number, supplier, quantity, open_quantity, due_date, status
              FROM purchase_order_lines
             WHERE org_id=$1 AND (part_number=$2 OR part_number = ANY($3::text[]))
               AND lower(coalesce(status,'')) NOT IN ('closed','complete','completed','cancelled','canceled')
             ORDER BY due_date NULLS LAST, po_number, line_number
            """, user["org_id"], pn, [b["child_part_number"] for b in bom])
        so_rows = await con.fetch(
            """
            SELECT so_number, line_number, customer, part_number, quantity, promise_date, value, status
              FROM sales_orders
             WHERE org_id=$1 AND (part_number=$2 OR part_number = ANY($3::text[]))
               AND lower(coalesce(status,'')) NOT IN ('closed','complete','completed','shipped','cancelled','canceled')
             ORDER BY promise_date NULLS LAST, so_number, line_number
            """, user["org_id"], pn, [b["child_part_number"] for b in bom])

    inv_by_part = {}
    for r in inv_rows:
        d = inv_by_part.setdefault(r["part_number"], {"on_hand": 0, "allocated": 0, "available": 0, "safety_stock": 0, "inspection_hold": 0, "sites": []})
        d["on_hand"] += _num(r["on_hand"])
        d["allocated"] += _num(r["allocated"])
        d["available"] += _num(r["available"])
        d["safety_stock"] += _num(r["safety_stock"])
        d["inspection_hold"] += _num(r["inspection_hold"])
        d["sites"].append(_r(r))
    inbound_by_part = {}
    for p in po_rows:
        inbound_by_part[p["part_number"]] = inbound_by_part.get(p["part_number"], 0) + _num(p["open_quantity"] or p["quantity"])

    bom_tree = []
    gaps = []
    hard_pegs = []
    soft_pegs = []
    risk_triage = []
    for b in bom:
        child = b["child_part_number"]
        required = _num(root_demand) * _num(b["quantity"])
        inv = inv_by_part.get(child, {"on_hand": 0, "allocated": 0, "available": 0, "safety_stock": 0, "inspection_hold": 0, "sites": []})
        inbound = inbound_by_part.get(child, 0)
        gap = max(required - inv["available"] - inbound, 0)
        tone = "red" if gap > 0 else "amber" if inv["available"] < required else "green"
        bom_tree.append({
            "part_number": child,
            "description": b["description"],
            "revision": b["revision"],
            "qty_per": _num(b["quantity"]),
            "find_number": b["find_number"],
            "ref_designators": b["ref_designators"],
            "required_qty": required,
            "on_hand": inv["on_hand"],
            "available": inv["available"],
            "allocated": inv["allocated"],
            "inbound": inbound,
            "gap": gap,
            "tone": tone,
        })
        if inv["available"] > 0:
            hard_pegs.append({"part_number": child, "source": "Inventory", "pegged_qty": min(inv["available"], required), "demand": pn, "confidence": "hard", "date": None})
        for p in po_rows:
            if p["part_number"] == child:
                soft_pegs.append({"part_number": child, "source": p["po_number"], "supplier": p["supplier"], "pegged_qty": _num(p["open_quantity"] or p["quantity"]), "confidence": "soft", "date": _iso(p["due_date"]), "status": p["status"]})
        if gap > 0:
            gaps.append({"part_number": child, "short_qty": gap, "risk": "high", "recommendation": "expedite PO, substitute approved alt, or re-promise impacted demand"})
        risk_triage.append({"part_number": child, "issue": "coverage gap" if gap else "covered", "severity": "high" if gap else "low", "exposure_qty": gap, "next_action": "review buyer plan" if gap else "monitor"})

    demand_supply_buckets = []
    for s in so_rows:
        demand_supply_buckets.append({"date": _iso(s["promise_date"]), "type": "demand", "ref": f"{s['so_number']}-L{s['line_number']}", "part_number": s["part_number"], "qty": _num(s["quantity"]), "customer": s["customer"]})
    for p in po_rows:
        demand_supply_buckets.append({"date": _iso(p["due_date"]), "type": "supply", "ref": f"{p['po_number']}-L{p['line_number']}", "part_number": p["part_number"], "qty": _num(p["open_quantity"] or p["quantity"]), "supplier": p["supplier"]})
    demand_supply_buckets.sort(key=lambda x: (x["date"] or "9999-12-31", x["type"]))

    selected = bom_tree[0]["part_number"] if bom_tree else pn
    return {
        "part": _r(root) or {"part_number": pn, "description": ""},
        "root_demand": _num(root_demand),
        "selected_part": selected,
        "bom_tree": bom_tree,
        "inventory": inv_by_part,
        "demand_supply_buckets": demand_supply_buckets,
        "hard_pegs": hard_pegs,
        "soft_pegs": soft_pegs,
        "gaps": gaps,
        "risk_triage": risk_triage,
    }


@app.get("/api/thread/eco/search")
async def thread_eco_search(q: str = "", user: dict = Depends(current_user)):
    q = (q or "").strip()
    like = "%" + q.upper() + "%"
    async with db.pool().acquire() as con:
        rows = await con.fetch(
            """
            SELECT eco_number, title, status, owner, effective_date, created_at
              FROM eco_changes
             WHERE org_id=$1
               AND ($2='' OR upper(eco_number) LIKE $3 OR upper(coalesce(title,'')) LIKE $3 OR upper(coalesce(owner,'')) LIKE $3)
             ORDER BY created_at DESC
             LIMIT 25
            """, user["org_id"], q, like)
    return {"items": [_r(x) for x in rows]}


@app.get("/api/thread/eco/{eco_number}/impact")
async def thread_eco_impact(eco_number: str, user: dict = Depends(current_user)):
    eco = (eco_number or "").strip()
    async with db.pool().acquire() as con:
        change = await con.fetchrow("SELECT * FROM eco_changes WHERE org_id=$1 AND eco_number=$2", user["org_id"], eco)
        items = await con.fetch("SELECT * FROM eco_affected_items WHERE org_id=$1 AND eco_number=$2 ORDER BY part_number", user["org_id"], eco)
        drawings = await con.fetch("SELECT * FROM eco_affected_drawings WHERE org_id=$1 AND eco_number=$2 ORDER BY drawing_number", user["org_id"], eco)
        tasks = await con.fetch("SELECT * FROM eco_ims_tasks WHERE org_id=$1 AND eco_number=$2 ORDER BY due_date NULLS LAST, task_number", user["org_id"], eco)
        orphan = await con.fetch("SELECT * FROM eco_orphan_exposure WHERE org_id=$1 AND eco_number=$2 ORDER BY exposure_value DESC NULLS LAST", user["org_id"], eco)
        part_list = [x["part_number"] for x in items]
        so = await con.fetch(
            """
            SELECT so_number, line_number, customer, part_number, quantity, promise_date, value, status
              FROM sales_orders
             WHERE org_id=$1 AND part_number = ANY($2::text[])
               AND lower(coalesce(status,'')) NOT IN ('closed','complete','completed','shipped','cancelled','canceled')
             ORDER BY promise_date NULLS LAST
            """, user["org_id"], part_list)
    orphan_total = sum(_num(x["exposure_value"]) for x in orphan)
    open_tasks = sum(1 for x in tasks if (x["status"] or "").lower() not in ("closed", "complete", "completed", "done"))
    sales_exposure = sum(_num(x["value"]) for x in so)
    return {
        "eco": _r(change) or {"eco_number": eco, "title": "", "status": ""},
        "affected_items": [_r(x) for x in items],
        "affected_drawings": [_r(x) for x in drawings],
        "ims_tasks": [_r(x) for x in tasks],
        "orphan_inventory": [_r(x) for x in orphan],
        "schedule_slip_risks": [_r(x) for x in so],
        "program_rollup": [
            {"metric": "Affected parts", "value": len(items), "tone": "blue"},
            {"metric": "Open IMS tasks", "value": open_tasks, "tone": "amber" if open_tasks else "green"},
            {"metric": "Orphan inventory exposure", "value": orphan_total, "tone": "red" if orphan_total else "green"},
            {"metric": "Open order exposure", "value": sales_exposure, "tone": "amber" if sales_exposure else "green"},
        ],
    }


@app.post("/api/thread/copilot")
async def thread_copilot(body: ThreadCopilotIn, user: dict = Depends(current_user)):
    system = (
        "You are Threadwire's manufacturing digital-thread analyst. Be concise, practical, and grounded. "
        "Explain hard pegs, soft pegs, shortages, ECO orphan inventory, and schedule exposure. "
        "Do not invent facts beyond the provided JSON context."
    )
    messages = [{"role": "user", "content": "Question: %s\n\nContext JSON:\n%s" % (body.question, json.dumps(body.context, default=str)[:12000])}]
    async with db.pool().acquire() as con:
        await bump_usage(con, user["user_id"], user["org_id"])
    text = await ai_complete(system, messages)
    return {"text": text}
'''

MIGRATION_SQL = r'''-- Threadwire Digital Thread analysis APIs
-- Idempotent support tables for supply-chain pegging and ECO impact analysis.

CREATE TABLE IF NOT EXISTS inventory_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  part_number text NOT NULL,
  site text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  lot_number text NOT NULL DEFAULT '',
  on_hand numeric(14,4) NOT NULL DEFAULT 0,
  allocated numeric(14,4) NOT NULL DEFAULT 0,
  available numeric(14,4) NOT NULL DEFAULT 0,
  safety_stock numeric(14,4) NOT NULL DEFAULT 0,
  inspection_hold numeric(14,4) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inventory_balances_org_part ON inventory_balances(org_id, part_number);

CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  po_number text NOT NULL,
  line_number integer NOT NULL DEFAULT 10,
  supplier text NOT NULL DEFAULT '',
  part_number text NOT NULL DEFAULT '',
  quantity numeric(14,4) NOT NULL DEFAULT 0,
  open_quantity numeric(14,4) NOT NULL DEFAULT 0,
  due_date date,
  status text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS purchase_order_lines_org_po_line ON purchase_order_lines(org_id, po_number, line_number);
CREATE INDEX IF NOT EXISTS purchase_order_lines_org_part ON purchase_order_lines(org_id, part_number);

CREATE TABLE IF NOT EXISTS eco_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  eco_number text NOT NULL,
  title text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT '',
  owner text NOT NULL DEFAULT '',
  effective_date date,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, eco_number)
);

CREATE TABLE IF NOT EXISTS eco_affected_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  eco_number text NOT NULL,
  part_number text NOT NULL,
  old_revision text NOT NULL DEFAULT '',
  new_revision text NOT NULL DEFAULT '',
  disposition text NOT NULL DEFAULT '',
  impact text NOT NULL DEFAULT '',
  UNIQUE(org_id, eco_number, part_number)
);
CREATE INDEX IF NOT EXISTS eco_affected_items_org_eco ON eco_affected_items(org_id, eco_number);
CREATE INDEX IF NOT EXISTS eco_affected_items_org_part ON eco_affected_items(org_id, part_number);

CREATE TABLE IF NOT EXISTS eco_affected_drawings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  eco_number text NOT NULL,
  drawing_number text NOT NULL,
  old_revision text NOT NULL DEFAULT '',
  new_revision text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT '',
  UNIQUE(org_id, eco_number, drawing_number)
);

CREATE TABLE IF NOT EXISTS eco_ims_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  eco_number text NOT NULL,
  task_number text NOT NULL,
  task_name text NOT NULL DEFAULT '',
  owner text NOT NULL DEFAULT '',
  due_date date,
  status text NOT NULL DEFAULT '',
  blocker text NOT NULL DEFAULT '',
  UNIQUE(org_id, eco_number, task_number)
);

CREATE TABLE IF NOT EXISTS eco_orphan_exposure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  eco_number text NOT NULL,
  part_number text NOT NULL,
  quantity numeric(14,4) NOT NULL DEFAULT 0,
  exposure_value numeric(16,2) NOT NULL DEFAULT 0,
  recommended_action text NOT NULL DEFAULT '',
  UNIQUE(org_id, eco_number, part_number)
);
'''

THREAD_UI_CODE = r'''/* --------------------------- DIGITAL THREAD ----------------------------- */
function ThreadPage({ tier, setTier }) {
  const api = async (url, opts = {}) => {
    const res = await fetch(url, { credentials: "include", ...opts, headers: { "Content-Type": "application/json", ...(opts.headers || {}) } });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };

  const samplePegging = {
    part: { part_number: "MAX14001AAP+", description: "Motorized Actuator Assembly", revision: "B" },
    root_demand: 48,
    selected_part: "PN-3322",
    bom_tree: [
      { part_number: "PN-3320", description: "Spindle Assembly", revision: "C", qty_per: 1, required_qty: 48, on_hand: 18, available: 16, allocated: 2, inbound: 20, gap: 12, tone: "red" },
      { part_number: "PN-3322", description: "Precision Bearing", revision: "A", qty_per: 2, required_qty: 96, on_hand: 40, available: 34, allocated: 6, inbound: 30, gap: 32, tone: "red" },
      { part_number: "PN-3323", description: "Sensor Harness", revision: "D", qty_per: 1, required_qty: 48, on_hand: 12, available: 10, allocated: 2, inbound: 42, gap: 0, tone: "amber" },
      { part_number: "PN-3324", description: "Machined Bracket", revision: "B", qty_per: 4, required_qty: 192, on_hand: 210, available: 190, allocated: 20, inbound: 0, gap: 2, tone: "amber" },
    ],
    inventory: {
      "PN-3322": { on_hand: 40, available: 34, allocated: 6, safety_stock: 10, inspection_hold: 0, sites: [{ site: "BOS", location: "A-12", on_hand: 40, available: 34 }] },
    },
    hard_pegs: [
      { part_number: "PN-3322", source: "Inventory BOS/A-12", pegged_qty: 34, demand: "SO-1042-L10", confidence: "hard", date: "2026-07-12" },
      { part_number: "PN-3320", source: "Inventory BOS/A-04", pegged_qty: 16, demand: "SO-1041-L20", confidence: "hard", date: "2026-07-10" },
    ],
    soft_pegs: [
      { part_number: "PN-3322", source: "PO-77819", supplier: "Acme Bearings", pegged_qty: 30, confidence: "soft", date: "2026-07-18", status: "Open" },
      { part_number: "PN-3323", source: "PO-77821", supplier: "WireTech", pegged_qty: 42, confidence: "soft", date: "2026-07-20", status: "Delayed" },
    ],
    gaps: [
      { part_number: "PN-3322", short_qty: 32, risk: "high", recommendation: "Expedite PO-77819 or split shipment for SO-1042" },
      { part_number: "PN-3320", short_qty: 12, risk: "high", recommendation: "Check substitute spindle rev C/D compatibility" },
    ],
    demand_supply_buckets: [
      { date: "2026-07-10", type: "demand", ref: "SO-1041-L20", part_number: "PN-3322", qty: 46, customer: "Aerospace OEM" },
      { date: "2026-07-18", type: "supply", ref: "PO-77819-L10", part_number: "PN-3322", qty: 30, supplier: "Acme Bearings" },
      { date: "2026-07-24", type: "demand", ref: "SO-1042-L10", part_number: "PN-3322", qty: 50, customer: "MedTech Systems" },
    ],
    risk_triage: [
      { part_number: "PN-3322", issue: "coverage gap", severity: "high", exposure_qty: 32, next_action: "buyer expedite + customer re-promise" },
      { part_number: "PN-3323", issue: "delayed inbound", severity: "medium", exposure_qty: 0, next_action: "watch supplier date" },
    ],
  };
  const sampleEco = {
    eco: { eco_number: "ECO-2026-0418", title: "Bearing stack revision for actuator assembly", status: "In Review", owner: "Engineering", effective_date: "2026-07-25" },
    affected_items: [
      { part_number: "PN-3322", old_revision: "A", new_revision: "B", disposition: "Use as is until 07/25", impact: "SO demand and open WIP" },
      { part_number: "PN-3320", old_revision: "C", new_revision: "D", disposition: "Rework", impact: "subassembly build plan" },
      { part_number: "MAX14001AAP+", old_revision: "B", new_revision: "C", disposition: "roll to next build", impact: "customer promise dates" },
    ],
    affected_drawings: [
      { drawing_number: "DWG-3322", old_revision: "A", new_revision: "B", status: "released pending" },
      { drawing_number: "DWG-3320", old_revision: "C", new_revision: "D", status: "checker review" },
    ],
    ims_tasks: [
      { task_number: "IMS-901", task_name: "Release revised drawing package", owner: "Design Eng", due_date: "2026-07-11", status: "Open", blocker: "checker capacity" },
      { task_number: "IMS-902", task_name: "Disposition old rev inventory", owner: "Quality", due_date: "2026-07-15", status: "Open", blocker: "MRB decision" },
      { task_number: "IMS-903", task_name: "Supplier PO revision", owner: "Supply Chain", due_date: "2026-07-18", status: "Not started", blocker: "supplier acknowledgement" },
    ],
    orphan_inventory: [
      { part_number: "PN-3322", quantity: 40, exposure_value: 18400, recommended_action: "Use before cutoff or convert via rework" },
      { part_number: "PN-3320", quantity: 18, exposure_value: 12600, recommended_action: "MRB disposition" },
    ],
    schedule_slip_risks: [
      { so_number: "SO-1042", line_number: 10, customer: "MedTech Systems", part_number: "MAX14001AAP+", quantity: 24, promise_date: "2026-07-24", value: 186000, status: "At risk" },
    ],
    program_rollup: [
      { metric: "Affected parts", value: 3, tone: "blue" },
      { metric: "Open IMS tasks", value: 3, tone: "amber" },
      { metric: "Orphan inventory exposure", value: 31000, tone: "red" },
      { metric: "Open order exposure", value: 186000, tone: "amber" },
    ],
  };

  const [tab, setTab] = useState("supply");
  const [bomQ, setBomQ] = useState("MAX14001AAP+");
  const [bomResults, setBomResults] = useState([]);
  const [pegging, setPegging] = useState(samplePegging);
  const [selPart, setSelPart] = useState(samplePegging.selected_part);
  const [ecoQ, setEcoQ] = useState("ECO-2026-0418");
  const [ecoResults, setEcoResults] = useState([]);
  const [ecoImpact, setEcoImpact] = useState(sampleEco);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("Demo data shown until matching live rows are imported.");
  const [copilotQ, setCopilotQ] = useState("");
  const [copilotA, setCopilotA] = useState("");

  const money = (n) => "$" + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const qty = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });
  const toneColor = (t) => t === "red" || t === "high" ? "var(--red)" : t === "green" || t === "low" ? "var(--green)" : t === "blue" ? "var(--blue)" : "var(--amber)";
  const rows = pegging?.bom_tree?.length ? pegging.bom_tree : samplePegging.bom_tree;
  const selectedInv = (pegging.inventory || {})[selPart] || samplePegging.inventory[selPart] || {};
  const hard = (pegging.hard_pegs || []).filter((p) => !selPart || p.part_number === selPart);
  const soft = (pegging.soft_pegs || []).filter((p) => !selPart || p.part_number === selPart);

  async function searchBom(q = bomQ) {
    setBusy(true); setNote("");
    try {
      const data = await api(`/api/thread/bom/search?q=${encodeURIComponent(q)}`);
      setBomResults(data.items || []);
      const first = (data.items || [])[0];
      if (first?.part_number) await loadPegging(first.part_number);
      else { setPegging(samplePegging); setSelPart(samplePegging.selected_part); setNote("No live BOM match yet — showing demo pegging analysis."); }
    } catch (e) {
      setPegging(samplePegging); setSelPart(samplePegging.selected_part); setNote("API unavailable or no session — showing demo pegging analysis.");
    } finally { setBusy(false); }
  }
  async function loadPegging(pn) {
    const data = await api(`/api/thread/bom/${encodeURIComponent(pn)}/pegging`);
    if (!data.bom_tree?.length) { setPegging(samplePegging); setSelPart(samplePegging.selected_part); setNote("Part found, but no BOM rows yet — showing demo pegging analysis."); return; }
    setPegging(data); setSelPart(data.selected_part || data.bom_tree[0]?.part_number); setNote("Live pegging data loaded from backend APIs.");
  }
  async function searchEco(q = ecoQ) {
    setBusy(true); setNote("");
    try {
      const data = await api(`/api/thread/eco/search?q=${encodeURIComponent(q)}`);
      setEcoResults(data.items || []);
      const first = (data.items || [])[0];
      if (first?.eco_number) await loadEco(first.eco_number);
      else { setEcoImpact(sampleEco); setNote("No live ECO match yet — showing demo ECO impact analysis."); }
    } catch (e) { setEcoImpact(sampleEco); setNote("API unavailable or no session — showing demo ECO impact analysis."); }
    finally { setBusy(false); }
  }
  async function loadEco(id) {
    const data = await api(`/api/thread/eco/${encodeURIComponent(id)}/impact`);
    if (!data.affected_items?.length) { setEcoImpact(sampleEco); setNote("ECO found, but no impact rows yet — showing demo ECO impact analysis."); return; }
    setEcoImpact(data); setNote("Live ECO impact data loaded from backend APIs.");
  }
  async function askCopilot() {
    const q = copilotQ || (tab === "supply" ? "What is the biggest ship risk and what should I do next?" : "Summarize the ECO impact and mitigation plan.");
    setCopilotQ(q); setCopilotA("Thinking…");
    try {
      const data = await api("/api/thread/copilot", { method: "POST", body: JSON.stringify({ analysis_type: tab === "supply" ? "bom" : "eco", entity_id: tab === "supply" ? pegging.part?.part_number : ecoImpact.eco?.eco_number, question: q, context: tab === "supply" ? pegging : ecoImpact }) });
      setCopilotA(data.text || "No response.");
    } catch (e) {
      setCopilotA(tab === "supply" ? "Biggest risk: parts with uncovered gaps or delayed soft pegs. Prioritize hard allocation, expedite open POs, and re-promise exposed SO lines before the customer misses their date." : "Biggest risk: old-revision inventory and open IMS tasks. Decide use-as-is vs rework/scrap, lock the effective date, and push supplier/customer communication from the ECO owner.");
    }
  }

  useEffect(() => { searchBom(bomQ); }, []);

  const Cell = ({ label, value, tone }) => <div className="tf-panel" style={{ padding: 14 }}><div className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)", textTransform: "uppercase" }}>{label}</div><div style={{ marginTop: 6, fontSize: 22, fontWeight: 800, color: toneColor(tone) }}>{value}</div></div>;
  const SearchBox = ({ value, onChange, onRun, placeholder }) => <div style={{ display: "flex", gap: 10 }}><input className="tf-input" value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onRun()} placeholder={placeholder} /><button className="tf-btn tf-btn-primary" onClick={onRun} disabled={busy}><PackageSearch size={15} />{busy ? "Searching…" : "Analyze"}</button></div>;

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: "34px 22px 70px" }}>
      <PageHead icon={GitBranch} eyebrow="Manufacturing Delivery Control · Digital thread" title="Supply chain + ECO impact intelligence"
        sub="Search a BOM for live pegging, hard/soft allocation, inventory exposure and shortage gaps — or search an ECO to see affected parts, drawings, IMS tasks, orphan inventory and schedule risk."
        tier={tier} setTier={setTier} />

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <button className={`tf-btn ${tab === "supply" ? "tf-btn-primary" : "tf-btn-ghost"}`} onClick={() => setTab("supply")}><Layers size={15} /> Supply Chain Pegging</button>
        <button className={`tf-btn ${tab === "eco" ? "tf-btn-primary" : "tf-btn-ghost"}`} onClick={() => setTab("eco")}><GitBranch size={15} /> ECO Impact Analysis</button>
        <span className="tf-chip" style={{ marginLeft: "auto" }}>{note}</span>
      </div>

      {tab === "supply" ? (
        <div className="tf-fade">
          <div className="tf-panel" style={{ padding: 16, marginBottom: 16 }}>
            <div className="tf-eyebrow" style={{ marginBottom: 10 }}>Start with BOM / top assembly search</div>
            <SearchBox value={bomQ} onChange={setBomQ} onRun={() => searchBom()} placeholder="Search BOM or part, e.g. MAX14001AAP+" />
            {!!bomResults.length && <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>{bomResults.slice(0, 8).map((p) => <button key={p.part_number} className="tf-chip" onClick={() => loadPegging(p.part_number)}>{p.part_number}</button>)}</div>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginBottom: 16 }}>
            <Cell label="Root demand" value={qty(pegging.root_demand)} tone="blue" />
            <Cell label="BOM lines" value={rows.length} tone="green" />
            <Cell label="Shortage gaps" value={(pegging.gaps || []).length} tone={(pegging.gaps || []).length ? "red" : "green"} />
            <Cell label="Soft pegs" value={(pegging.soft_pegs || []).length} tone="amber" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.3fr .9fr", gap: 16 }} className="tf-cols">
            <div className="tf-panel" style={{ overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8 }}><Boxes size={16} color="var(--thread)" /><b>BOM structure + material coverage</b><span className="tf-chip" style={{ marginLeft: "auto" }}>{pegging.part?.part_number}</span></div>
              {rows.map((r) => <div key={r.part_number} className="tf-row" onClick={() => setSelPart(r.part_number)} style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", cursor: "pointer", background: selPart === r.part_number ? "var(--panel2)" : "transparent" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><StatusDot tone={r.tone === "red" ? "red" : r.tone === "green" ? "green" : "yellow"} /><span className="tf-mono" style={{ color: "var(--thread)", fontSize: 12.5 }}>{r.part_number}</span><span style={{ color: "var(--muted)", fontSize: 13 }}>{r.description}</span><Tag tone={r.tone === "red" ? "red" : r.tone === "green" ? "green" : "yellow"}>{r.gap ? `short ${qty(r.gap)}` : "covered"}</Tag></div>
                <div className="tf-mono" style={{ marginTop: 7, fontSize: 11, color: "var(--faint)" }}>qty/assy {qty(r.qty_per)} · required {qty(r.required_qty)} · available {qty(r.available)} · inbound {qty(r.inbound)} · allocated {qty(r.allocated)}</div>
              </div>)}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="tf-panel" style={{ padding: 16 }}><div className="tf-eyebrow" style={{ marginBottom: 10 }}>Inventory · {selPart}</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><Cell label="On hand" value={qty(selectedInv.on_hand)} tone="blue" /><Cell label="Available" value={qty(selectedInv.available)} tone="green" /><Cell label="Allocated" value={qty(selectedInv.allocated)} tone="amber" /><Cell label="Inspection hold" value={qty(selectedInv.inspection_hold)} tone={selectedInv.inspection_hold ? "red" : "green"} /></div></div>
              <div className="tf-panel" style={{ padding: 16 }}><div className="tf-eyebrow" style={{ marginBottom: 10 }}>Risk triage</div>{(pegging.risk_triage || []).slice(0, 5).map((x) => <div key={x.part_number} style={{ padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}><span className="tf-mono" style={{ color: toneColor(x.severity) }}>{x.part_number}</span> · {x.issue}<div className="tf-mono" style={{ color: "var(--faint)", fontSize: 11 }}>{x.next_action}</div></div>)}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 16 }} className="tf-cols">
            <PegPanel title="Hard pegs" rows={hard} empty="No hard pegs for selected part" />
            <PegPanel title="Soft pegs" rows={soft} empty="No soft pegs for selected part" />
            <div className="tf-panel" style={{ padding: 16 }}><div className="tf-eyebrow" style={{ marginBottom: 10 }}>Demand / supply timeline</div>{(pegging.demand_supply_buckets || []).slice(0, 6).map((x, i) => <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: "7px 0", borderBottom: "1px solid var(--line)" }}><Tag tone={x.type === "demand" ? "red" : "green"}>{x.type}</Tag><span className="tf-mono" style={{ fontSize: 11 }}>{x.date || "no date"}</span><span style={{ marginLeft: "auto", fontSize: 12 }}>{x.ref} · {qty(x.qty)}</span></div>)}</div>
          </div>
        </div>
      ) : (
        <div className="tf-fade">
          <div className="tf-panel" style={{ padding: 16, marginBottom: 16 }}><div className="tf-eyebrow" style={{ marginBottom: 10 }}>Start with ECO search</div><SearchBox value={ecoQ} onChange={setEcoQ} onRun={() => searchEco()} placeholder="Search ECO, e.g. ECO-2026-0418" />{!!ecoResults.length && <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>{ecoResults.slice(0, 8).map((e) => <button key={e.eco_number} className="tf-chip" onClick={() => loadEco(e.eco_number)}>{e.eco_number}</button>)}</div>}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginBottom: 16 }}>{(ecoImpact.program_rollup || []).map((m) => <Cell key={m.metric} label={m.metric} value={typeof m.value === "number" && m.metric.toLowerCase().includes("exposure") ? money(m.value) : m.value} tone={m.tone} />)}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1.15fr .85fr", gap: 16 }} className="tf-cols">
            <div className="tf-panel" style={{ overflow: "hidden" }}><div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", display: "flex", gap: 8, alignItems: "center" }}><GitBranch size={16} color="var(--blue)" /><b>{ecoImpact.eco?.eco_number}</b><span style={{ color: "var(--muted)" }}>{ecoImpact.eco?.title}</span><Tag tone="yellow">{ecoImpact.eco?.status || "review"}</Tag></div>{(ecoImpact.affected_items || []).map((x) => <div key={x.part_number} style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)" }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="tf-mono" style={{ color: "var(--thread)" }}>{x.part_number}</span><Tag tone="blue">{x.old_revision || "-"} → {x.new_revision || "-"}</Tag><span style={{ marginLeft: "auto", color: "var(--muted)", fontSize: 12 }}>{x.disposition}</span></div><div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>{x.impact}</div></div>)}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}><MiniList title="Affected drawings" rows={ecoImpact.affected_drawings || []} main="drawing_number" sub={(x) => `${x.old_revision || "-"} → ${x.new_revision || "-"} · ${x.status || ""}`} /><MiniList title="IMS / execution tasks" rows={ecoImpact.ims_tasks || []} main="task_number" sub={(x) => `${x.task_name || ""} · ${x.owner || ""} · due ${x.due_date || "—"}`} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }} className="tf-cols"><MiniList title="Orphan inventory exposure" rows={ecoImpact.orphan_inventory || []} main="part_number" sub={(x) => `qty ${qty(x.quantity)} · ${money(x.exposure_value)} · ${x.recommended_action || "review disposition"}`} /><MiniList title="Schedule-slip risk" rows={ecoImpact.schedule_slip_risks || []} main={(x) => `${x.so_number || "SO"}-L${x.line_number || 10}`} sub={(x) => `${x.customer || "customer"} · ${x.part_number || ""} · ${qty(x.quantity)} due ${x.promise_date || "—"} · ${money(x.value)}`} /></div>
        </div>
      )}

      <div className="tf-panel" style={{ padding: 16, marginTop: 16 }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><Sparkles size={16} color="var(--amber)" /><b>{tab === "supply" ? "Pegging copilot" : "ECO impact copilot"}</b></div><div style={{ display: "flex", gap: 10 }}><input className="tf-input" value={copilotQ} onChange={(e) => setCopilotQ(e.target.value)} placeholder={tab === "supply" ? "Ask: which orders are at risk and what can we ship?" : "Ask: what inventory becomes orphaned and what tasks block release?"} /><button className="tf-btn tf-btn-primary" onClick={askCopilot}><Sparkles size={15} />Ask</button></div>{copilotA && <div style={{ marginTop: 12, color: "var(--muted)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{copilotA}</div>}</div>

      {tier === "paid" && <div style={{ marginTop: 22 }}><ConnectGate title="Wire up live BOM, inventory, PO and ECO data" lines={["Pull BOMs and ECOs from PLM; inventory, SO and PO supply from ERP/MRP.", "Expose hard allocations vs soft planned supply, then let AI explain delivery exposure.", "Use the sample fallback for demos while customers import real CSV/API data."]} connectors={[{ name: "SAP / ERP", desc: "SO, PO, inventory", icon: Database }, { name: "PLM", desc: "BOM, ECO, drawings", icon: Layers }, { name: "MES / IMS", desc: "tasks + WIP", icon: Workflow }]} /></div>}
    </div>
  );
}

function PegPanel({ title, rows, empty }) {
  return <div className="tf-panel" style={{ padding: 16 }}><div className="tf-eyebrow" style={{ marginBottom: 10 }}>{title}</div>{rows.length ? rows.map((x, i) => <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}><div style={{ display: "flex", gap: 8 }}><span className="tf-mono" style={{ color: "var(--thread)", fontSize: 12 }}>{x.part_number}</span><Tag tone={x.confidence === "hard" ? "green" : "yellow"}>{x.confidence}</Tag><span style={{ marginLeft: "auto", fontSize: 12 }}>{x.source}</span></div><div className="tf-mono" style={{ color: "var(--faint)", fontSize: 11, marginTop: 4 }}>qty {Number(x.pegged_qty || 0).toLocaleString()} · {x.date || x.demand || x.supplier || ""}</div></div>) : <div style={{ color: "var(--faint)", fontSize: 13 }}>{empty}</div>}</div>;
}
function MiniList({ title, rows, main, sub }) {
  const m = (x) => typeof main === "function" ? main(x) : x[main];
  const s = (x) => typeof sub === "function" ? sub(x) : x[sub];
  return <div className="tf-panel" style={{ padding: 16 }}><div className="tf-eyebrow" style={{ marginBottom: 10 }}>{title}</div>{rows.length ? rows.map((x, i) => <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}><div className="tf-mono" style={{ color: "var(--thread)", fontSize: 12 }}>{m(x)}</div><div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>{s(x)}</div></div>) : <div style={{ color: "var(--faint)", fontSize: 13 }}>No rows yet.</div>}</div>;
}

'''


def backup(path: Path):
    if path.exists():
        b = path.with_name(path.name + f".bak.{STAMP}")
        b.write_text(path.read_text(encoding="utf-8"), encoding="utf-8")
        print(f"backup: {b}")


def patch_frontend():
    if not FRONTEND.exists():
        raise SystemExit(f"Missing {FRONTEND}")
    txt = FRONTEND.read_text(encoding="utf-8")
    start = txt.find(THREAD_UI_START)
    end = txt.find(THREAD_UI_END)
    if start < 0 or end < 0 or end <= start:
        raise SystemExit("Could not find Digital Thread / ROI markers in frontend/src/ThreadWire.jsx")
    if "Supply chain + ECO impact intelligence" in txt:
        print("frontend: digital-thread tabs already present")
        return
    backup(FRONTEND)
    new = txt[:start] + THREAD_UI_CODE + txt[end:]
    FRONTEND.write_text(new, encoding="utf-8")
    print("patched frontend/src/ThreadWire.jsx")


def patch_backend():
    if not BACKEND.exists():
        raise SystemExit(f"Missing {BACKEND}")
    txt = BACKEND.read_text(encoding="utf-8")
    if len(txt.strip()) < 1000 or "app = FastAPI" not in txt:
        raise SystemExit(
            "backend/app/main.py is empty or not restored. Restore it first:\n"
            "  git checkout f5935e41 -- backend/app/main.py\n"
            "  git add backend/app/main.py && git commit -m \"Restore backend FastAPI app\"\n"
            "Then run this script again."
        )
    if THREAD_API_MARKER in txt:
        print("backend: thread analysis APIs already present")
        return
    idx = txt.find(BACKEND_INSERT_BEFORE)
    if idx < 0:
        raise SystemExit("Could not find billing marker in backend/app/main.py; refusing to patch blindly.")
    backup(BACKEND)
    new = txt[:idx] + BACKEND_API_CODE + "\n\n" + txt[idx:]
    BACKEND.write_text(new, encoding="utf-8")
    print("patched backend/app/main.py")


def write_migration():
    MIGRATION.parent.mkdir(parents=True, exist_ok=True)
    if MIGRATION.exists() and MIGRATION.read_text(encoding="utf-8") == MIGRATION_SQL:
        print("migration already present")
        return
    backup(MIGRATION)
    MIGRATION.write_text(MIGRATION_SQL, encoding="utf-8")
    print(f"wrote {MIGRATION}")


if __name__ == "__main__":
    patch_frontend()
    patch_backend()
    write_migration()
    print("\nDone. Now run: npm --prefix frontend run build && python3 -m py_compile backend/app/main.py")

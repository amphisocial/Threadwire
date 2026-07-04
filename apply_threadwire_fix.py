#!/usr/bin/env python3
"""
Apply Threadwire Delivery/Sales Order edit fixes over the latest main branch.
Run from the repository root:

  python3 apply_threadwire_fix.py
  git diff
  git add frontend/src/ThreadWire.jsx backend/app/main.py db/migrations/999_so_edit_audit_idempotent.sql
  git commit -m "Fix sales order promise date editing"
  git push

The script is intentionally idempotent: re-running it should not duplicate changes.
"""
from __future__ import annotations

from pathlib import Path
import re
import shutil
import sys
from datetime import datetime

ROOT = Path.cwd()
FRONTEND = ROOT / "frontend" / "src" / "ThreadWire.jsx"
BACKEND = ROOT / "backend" / "app" / "main.py"
MIGRATION_DIR = ROOT / "db" / "migrations"
MIGRATION = MIGRATION_DIR / "999_so_edit_audit_idempotent.sql"


def die(msg: str) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def backup(path: Path) -> None:
    ts = datetime.now().strftime("%Y%m%d%H%M%S")
    shutil.copy2(path, path.with_suffix(path.suffix + f".bak.{ts}"))


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old in text:
        return text.replace(old, new, 1)
    if new in text:
        print(f"already applied: {label}")
        return text
    die(f"Could not find expected block for: {label}")


def replace_between(text: str, start: str, end: str, new_block: str, label: str) -> str:
    s = text.find(start)
    if s == -1:
        if new_block.strip() in text:
            print(f"already applied: {label}")
            return text
        die(f"Could not find start marker for: {label}")
    e = text.find(end, s)
    if e == -1:
        die(f"Could not find end marker for: {label}")
    return text[:s] + new_block.rstrip() + "\n\n" + text[e:]


def patch_backend() -> None:
    if not BACKEND.exists():
        die(f"Missing {BACKEND}")
    text = BACKEND.read_text()
    backup(BACKEND)

    new_func = r'''@app.patch("/api/sales_orders/{so_number}/{line_number}")
async def edit_sales_order_line(so_number: str, line_number: int, body: SOLineEdit,
                                user: dict = Depends(current_user)):
    who = user.get("full_name") or user["email"]
    async with db.pool().acquire() as con:
        cur = await con.fetchrow(
            "SELECT revised_promise_date, status, ship_date FROM sales_orders "
            "WHERE org_id=$1 AND so_number=$2 AND line_number=$3", user["org_id"], so_number, line_number)
        if not cur:
            raise HTTPException(404, "Order line not found")

        # Keep WHERE params fixed at $1/$2/$3 and number SET params from $4 onward.
        # The old implementation reused $1/$2/$3 for both SET and WHERE, which broke
        # revised promise/status/ship-date edits and prevented audit fields from saving.
        args = [user["org_id"], so_number, line_number]
        sets, changed = [], []

        def add_arg(value):
            args.append(value)
            return "$%d" % len(args)

        if body.revised_promise_date is not None:
            newd = _parse_date(body.revised_promise_date)
            if newd != cur["revised_promise_date"]:
                sets.append("revised_promise_date=%s" % add_arg(newd))
                sets.append("promise_changed_by=%s" % add_arg(who))
                sets.append("promise_changed_at=now()")
                changed.append("revised promise %s→%s" % (cur["revised_promise_date"] or "—", newd or "—"))

        if body.status is not None and body.status != (cur["status"] or ""):
            sets.append("status=%s" % add_arg(body.status))
            sets.append("status_changed_by=%s" % add_arg(who))
            sets.append("status_changed_at=now()")
            changed.append("status %s→%s" % (cur["status"] or "—", body.status or "—"))

        if body.ship_date is not None:
            new_ship = _parse_date(body.ship_date)
            if new_ship != cur["ship_date"]:
                sets.append("ship_date=%s" % add_arg(new_ship))

        if not sets:
            return {"changed": False}

        sets.append("updated_at=now()")
        await con.execute(
            "UPDATE sales_orders SET %s WHERE org_id=$1 AND so_number=$2 AND line_number=$3" % ",".join(sets), *args)
        if changed:
            await _log_activity(con, user["org_id"], who, "order.edited",
                                "%s L%s · %s" % (so_number, line_number, "; ".join(changed)))
    return {"changed": True}'''

    text = replace_between(
        text,
        '@app.patch("/api/sales_orders/{so_number}/{line_number}")',
        'class ShipmentIn(BaseModel):',
        new_func,
        "backend sales order PATCH parameter numbering",
    )
    BACKEND.write_text(text)
    print(f"patched {BACKEND}")


def patch_frontend() -> None:
    if not FRONTEND.exists():
        die(f"Missing {FRONTEND}")
    text = FRONTEND.read_text()
    backup(FRONTEND)

    text = replace_once(
        text,
        '    .tf-input::placeholder{color:var(--faint)}\n',
        '    .tf-input::placeholder{color:var(--faint)}\n'
        '    .tf input[type="date"], .tf-input[type="date"]{color-scheme:dark}\n',
        "date inputs use dark native picker styling",
    )

    text = replace_once(
        text,
        '  const { blockers, openBlocker, openForm, closeSO, openSOLines, editSOLine, recordShipment, setBlockerStatus } = useData();',
        '  const { blockers, openBlocker, openForm, closeSO, openSOLines, editSOLine, recordShipment, setBlockerStatus, setDelivWeek } = useData();',
        "SalesOrderModal gets setDelivWeek",
    )

    text = replace_once(
        text,
        '  useEffect(() => { if (o) { setEf({ promise: o.revisedPromise || "", status: o.status || "", shipDate: o.shipDate || "" }); setEdit(false); setNote(""); } }, [o && o.id]);',
        '  useEffect(() => { if (o) { setEf({ promise: o.revisedPromise || o.promise || "", status: o.status || "", shipDate: o.shipDate || "" }); setEdit(false); setNote(""); } }, [o && o.id, o && o.revisedPromise, o && o.promise, o && o.shipDate, o && o.status]);',
        "edit form initializes Promise Date with effective current promise",
    )

    text = replace_once(
        text,
        '{o.revisedPromise && <><span className="tf-mono" style={{ fontSize: 11.5, color: "var(--faint)" }}>Revised promise</span><span style={{ fontSize: 13, fontWeight: 700, color: "var(--amber)" }}>{o.revisedPromise}{o.promiseChangedBy ? <span className="tf-mono" style={{ fontSize: 9.5, color: "var(--faint)", fontWeight: 400 }}> · by {o.promiseChangedBy}</span> : null}</span></>}',
        '{o.revisedPromise && <><span className="tf-mono" style={{ fontSize: 11.5, color: "var(--faint)" }}>Revised promise</span><span style={{ fontSize: 13, fontWeight: 700, color: "var(--amber)" }}>{o.revisedPromise}{o.promiseChangedBy ? <span className="tf-mono" style={{ fontSize: 9.5, color: "var(--faint)", fontWeight: 400 }}> · changed by {o.promiseChangedBy}{o.promiseChangedAt ? " · " + fmtDateTime(o.promiseChangedAt) : ""}</span> : null}</span></>}',
        "SalesOrderModal revised promise audit includes who and when",
    )

    text = replace_once(
        text,
        '          const inp = { fontFamily: "var(--mono)", fontSize: 12, background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: 8, padding: "7px 9px", color: "var(--ink)", outline: "none" };',
        '          const inp = { fontFamily: "var(--mono)", fontSize: 12, background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: 8, padding: "7px 9px", color: "var(--ink)", colorScheme: "dark", outline: "none", minWidth: 0 };',
        "SalesOrderModal native date picker styling",
    )

    old_save = '          const save = async () => { if (!okDate(ef.promise) || !okDate(ef.shipDate)) { setNote("Dates must be YYYY-MM-DD."); return; } setBusy("save"); setNote(""); const patch = {}; if (ef.promise !== (o.revisedPromise || "")) patch.revised_promise_date = ef.promise; if (ef.status !== (o.status || "")) patch.status = ef.status; if (ef.shipDate !== (o.shipDate || "")) patch.ship_date = ef.shipDate; if (!Object.keys(patch).length) { setEdit(false); setBusy(""); return; } const r = await editSOLine(o.so, o.line, patch); setBusy(""); if (r && r.offline) { setNote("Editing works on live data only."); return; } setEdit(false); if (patch.status && CLOSED_STATUSES.includes(patch.status.toLowerCase())) closeAttached(); };'
    new_save = '''          const save = async () => {
            if (!okDate(ef.promise) || !okDate(ef.shipDate)) { setNote("Dates must be YYYY-MM-DD."); return; }
            setBusy("save"); setNote("");
            const patch = {};
            const nextRevisedPromise = ef.promise && ef.promise !== (o.promise || "") ? ef.promise : "";
            if (nextRevisedPromise !== (o.revisedPromise || "")) patch.revised_promise_date = nextRevisedPromise;
            if (ef.status !== (o.status || "")) patch.status = ef.status;
            if (ef.shipDate !== (o.shipDate || "")) patch.ship_date = ef.shipDate;
            if (!Object.keys(patch).length) { setEdit(false); setBusy(""); return; }
            const r = await editSOLine(o.so, o.line, patch);
            setBusy("");
            if (r && r.offline) { setNote("Editing works on live data only."); return; }
            setEdit(false);
            const nextCalendarDate = Object.prototype.hasOwnProperty.call(patch, "revised_promise_date") ? (patch.revised_promise_date || o.promise) : null;
            if (nextCalendarDate) setDelivWeek?.(mondayOf(D(nextCalendarDate)));
            if (patch.status && CLOSED_STATUSES.includes(patch.status.toLowerCase())) closeAttached();
          };'''
    text = replace_once(text, old_save, new_save, "SalesOrderModal save revised promise and navigate calendar")

    text = replace_once(
        text,
        '<span className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)", width: 92 }}>Revised promise</span>\n                    <input type="date" style={{ ...inp, flex: 1 }} value={ef.promise || ""} onChange={(e) => setEf({ ...ef, promise: e.target.value })} />',
        '<span className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)", width: 92 }}>Promise date</span>\n                    <input type="date" title="Sets a revised promise date while retaining the original promise for audit" style={{ ...inp, flex: 1 }} value={ef.promise || ""} onChange={(e) => setEf({ ...ef, promise: e.target.value })} />',
        "SalesOrderModal label Promise date",
    )

    old_card = '''  const Card = ({ o }) => {
    const blk = openBlockerForSO(blockers, o.id);
    const done = isClosedLine(o);
    return (
      <div className="tf-panel" onClick={() => openSO(o.id)} style={{ padding: 0, marginBottom: 8, overflow: "hidden", cursor: "pointer", border: done ? "1px solid var(--green)" : blk ? "1px solid var(--red)" : "1px solid var(--line)", background: done ? "rgba(67,194,119,.06)" : undefined }}>
        {done ? <div style={{ height: 4, background: "var(--green)" }} /> : blk ? <div style={{ height: 4, background: "var(--red)" }} /> : null}
        <div style={{ padding: "10px 11px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{o.customer}</span>
            <span style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
              {blk && <span onClick={(e) => { e.stopPropagation(); openBlocker(blk.id); }} title="Open blocker" style={{ cursor: "pointer", display: "grid", placeItems: "center", width: 22, height: 22, borderRadius: 6, background: "rgba(240,86,58,.15)" }}><AlertTriangle size={13} color="var(--red)" /></span>}
              <span onClick={(e) => { e.stopPropagation(); openForm([o.id]); }} title="Create blocker" style={{ cursor: "pointer", display: "grid", placeItems: "center", width: 22, height: 22, borderRadius: 6, background: "var(--panel2)" }}><Plus size={14} color="var(--muted)" /></span>
            </span>
          </div>
          <div className="tf-disp" style={{ fontSize: 16, fontWeight: 800, margin: "3px 0 1px" }}>{fmtMoney(o.value)}</div>
          <div className="tf-mono" style={{ fontSize: 10, color: "var(--faint)" }}>{o.so} · L{o.line} · qty {o.qty}</div>
          {revisedForSO(blockers, o.id) && <div className="tf-mono" style={{ fontSize: 9.5, color: "var(--amber)", marginTop: 2 }}>↪ revised from {o.promise}</div>}
          <div style={{ marginTop: 5, display: "flex", flexWrap: "wrap", gap: 4 }}>
            {o.parts.map((pn) => <PartLink key={pn} pn={pn} style={{ fontSize: 10, padding: "1px 6px", border: "1px solid var(--line2)", borderRadius: 6 }}>{pn}</PartLink>)}
          </div>
        </div>
      </div>
    );
  };'''

    new_card = '''  const Card = ({ o }) => {
    const blk = openBlockerForSO(blockers, o.id);
    const done = isClosedLine(o);
    const directRevised = o.revisedPromise || null;
    const blockerRevised = revisedForSO(blockers, o.id);
    const revised = directRevised || blockerRevised;
    const hasRevised = !!revised;
    return (
      <div className="tf-panel" onClick={() => openSO(o.id)} style={{ padding: 0, marginBottom: 8, overflow: "hidden", cursor: "pointer", border: done ? "1px solid var(--green)" : blk ? "1px solid var(--red)" : "1px solid var(--line)", background: done ? "rgba(67,194,119,.06)" : undefined }}>
        {done ? <div style={{ height: 4, background: "var(--green)" }} /> : blk ? <div style={{ height: 4, background: "var(--red)" }} /> : hasRevised ? <div style={{ height: 4, background: "var(--amber)" }} /> : null}
        <div style={{ padding: "10px 11px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{o.customer}</span>
            <span style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
              {blk && <span onClick={(e) => { e.stopPropagation(); openBlocker(blk.id); }} title="Open blocker" style={{ cursor: "pointer", display: "grid", placeItems: "center", width: 22, height: 22, borderRadius: 6, background: "rgba(240,86,58,.15)" }}><AlertTriangle size={13} color="var(--red)" /></span>}
              <span onClick={(e) => { e.stopPropagation(); openForm([o.id]); }} title="Create blocker" style={{ cursor: "pointer", display: "grid", placeItems: "center", width: 22, height: 22, borderRadius: 6, background: "var(--panel2)" }}><Plus size={14} color="var(--muted)" /></span>
            </span>
          </div>
          <div className="tf-disp" style={{ fontSize: 16, fontWeight: 800, margin: "3px 0 1px" }}>{fmtMoney(o.value)}</div>
          <div className="tf-mono" style={{ fontSize: 10, color: "var(--faint)" }}>{o.so} · L{o.line} · qty {o.qty}</div>
          <div className="tf-mono" style={{ fontSize: 9.8, color: "var(--faint)", marginTop: 2 }}>
            promise <span style={{ textDecoration: hasRevised ? "line-through" : "none", opacity: hasRevised ? 0.55 : 1 }}>{o.promise || "—"}</span>
            {hasRevised && <><span style={{ color: "var(--faint)" }}> → </span><span style={{ color: "var(--amber)", fontWeight: 700 }}>{revised}</span></>}
          </div>
          {hasRevised && (
            <div className="tf-mono" style={{ fontSize: 9.5, color: "var(--amber)", marginTop: 2 }}>
              ↪ {directRevised ? "revised promise" : "blocker revised"}{directRevised && o.promiseChangedBy ? <> · {o.promiseChangedBy}{o.promiseChangedAt ? " · " + fmtDateTime(o.promiseChangedAt) : ""}</> : null}
            </div>
          )}
          <div style={{ marginTop: 5, display: "flex", flexWrap: "wrap", gap: 4 }}>
            {o.parts.map((pn) => <PartLink key={pn} pn={pn} style={{ fontSize: 10, padding: "1px 6px", border: "1px solid var(--line2)", borderRadius: 6 }}>{pn}</PartLink>)}
          </div>
        </div>
      </div>
    );
  };'''
    text = replace_once(text, old_card, new_card, "Delivery card revised promise display")

    FRONTEND.write_text(text)
    print(f"patched {FRONTEND}")


def write_migration() -> None:
    MIGRATION_DIR.mkdir(parents=True, exist_ok=True)
    MIGRATION.write_text("""-- Idempotent safety migration for Delivery/Sales Order edit fields.\n-- Safe to run repeatedly. Required by the revised promise date + fulfillment audit flow.\n\nALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS revised_promise_date date;\nALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS ship_date date;\nALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS qty_shipped numeric(14,4) NOT NULL DEFAULT 0;\nALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS promise_changed_by text;\nALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS promise_changed_at timestamptz;\nALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS status_changed_by text;\nALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS status_changed_at timestamptz;\n\nCREATE TABLE IF NOT EXISTS so_shipments (\n  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,\n  so_number        text NOT NULL,\n  line_number      integer NOT NULL DEFAULT 10,\n  qty              numeric(14,4) NOT NULL,\n  ship_date        date NOT NULL,\n  value_recognized numeric(16,2) NOT NULL DEFAULT 0,\n  created_by       text,\n  created_at       timestamptz NOT NULL DEFAULT now()\n);\nCREATE INDEX IF NOT EXISTS so_shipments_org_date ON so_shipments (org_id, ship_date);\nCREATE INDEX IF NOT EXISTS so_shipments_org_line ON so_shipments (org_id, so_number, line_number);\n""")
    print(f"wrote {MIGRATION}")


def main() -> None:
    print(f"Applying Threadwire sales-order edit fixes in {ROOT}")
    patch_backend()
    patch_frontend()
    write_migration()
    print("\nDone. Review with: git diff")


if __name__ == "__main__":
    main()

"""Delivery-Risk Agent.

Nightly (or on demand) the agent scans open sales-order lines whose promise date
has passed and, for any not already covered by an active blocker, creates a blocker
attributed to 'Agent' with review_status='under_review' (amber card, human-in-loop).
A person then Confirms it (turns red) or Dismisses it.

Runnable standalone for cron:  python -m app.agent
"""
import asyncio
import json

from .config import settings

_CLOSED_SO = ("shipped", "closed", "complete", "completed", "delivered",
              "cancelled", "canceled", "done", "invoiced")


async def scan_org(con, org_id, who="Agent") -> dict:
    """Create under-review blockers for past-due, still-open SO lines. Idempotent:
    skips any line already covered by an active (non-closed) blocker."""
    rows = await con.fetch(
        "SELECT so_number, line_number, part_number, customer, promise_date, value, quantity, qty_shipped "
        "FROM sales_orders WHERE org_id=$1 AND promise_date IS NOT NULL "
        "AND promise_date < CURRENT_DATE "
        "AND lower(coalesce(status,'')) <> ALL($2::text[]) "
        "AND coalesce(qty_shipped,0) < coalesce(quantity,0)",
        org_id, list(_CLOSED_SO))
    created = []
    for r in rows:
        line = r["line_number"] if r["line_number"] is not None else 10
        so_line = "%s-L%s" % (r["so_number"], line)
        already = await con.fetchval(
            "SELECT 1 FROM blockers WHERE org_id=$1 AND status <> 'closed' AND sos @> $2::jsonb",
            org_id, json.dumps([so_line]))
        if already:
            continue
        n = await con.fetchval("SELECT count(*) FROM blockers WHERE org_id=$1", org_id)
        bid = "BLK-" + str(2001 + int(n))
        while await con.fetchval("SELECT 1 FROM blockers WHERE org_id=$1 AND id=$2", org_id, bid):
            n += 1
            bid = "BLK-" + str(2001 + int(n))
        what = r["part_number"] or r["customer"] or "order"
        ordered = float(r["quantity"] or 0)
        shipped = float(r["qty_shipped"] or 0)
        remaining = ordered - shipped
        partial = shipped > 0
        bal = (" · %g of %g still open" % (remaining, ordered)) if ordered else ""
        title = "Past due%s: %s L%s — %s%s" % (
            " (partial)" if partial else "", r["so_number"], line, what, bal)
        pd = r["promise_date"].isoformat() if r["promise_date"] else "?"
        detail = ("%g of %g units still unshipped. " % (remaining, ordered)) if partial else ""
        action = ("Auto-detected by the delivery agent: promise date %s has passed with the order "
                  "still open. %sInvestigate, then Confirm (real blocker) or Dismiss (false alarm)." % (pd, detail))
        parts = [r["part_number"]] if r["part_number"] else []
        await con.execute(
            "INSERT INTO blockers (id, org_id, title, status, review_status, assignee, opened_by, "
            "action, wo, sos, parts, comments) "
            "VALUES ($1,$2,$3,'open','under_review',NULL,$4,$5,NULL,$6::jsonb,$7::jsonb,'[]'::jsonb)",
            bid, org_id, title, who, action, json.dumps([so_line]), json.dumps(parts))
        try:
            await con.execute(
                "INSERT INTO activity_events (org_id, type, detail, by_user) VALUES ($1,$2,$3,$4)",
                org_id, "blocker.agent_flagged", (bid + " · " + title)[:300], who)
        except Exception:
            pass
        created.append(bid)
    return {"created": len(created), "ids": created}


async def _run_all() -> None:
    import asyncpg
    conn = await asyncpg.connect(settings.database_url)
    try:
        orgs = await conn.fetch("SELECT id FROM organizations")
        total = 0
        for o in orgs:
            res = await scan_org(conn, o["id"])
            total += res["created"]
            if res["created"]:
                print("org %s: flagged %d — %s" % (o["id"], res["created"], ", ".join(res["ids"])))
        print("delivery agent: flagged %d blocker(s) across %d org(s)" % (total, len(orgs)))
    finally:
        await conn.close()


def main() -> None:
    asyncio.run(_run_all())


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
# Repair Threadwire assistant date/forecast context after the 422 fix.
#
# Run from the Threadwire repository root:
#   python3 fix_threadwire_forecast_reasoning.py --check
#   python3 fix_threadwire_forecast_reasoning.py
#   git diff --check
#   bash redeploy.sh

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(
            f"{label}: expected exactly one matching block, found {count}. "
            "No files were changed."
        )
    return text.replace(old, new, 1)


def replace_between(text: str, start: str, end: str, replacement: str, label: str) -> str:
    start_at = text.find(start)
    if start_at < 0:
        raise RuntimeError(f"{label}: start marker not found. No files were changed.")
    end_at = text.find(end, start_at)
    if end_at < 0:
        raise RuntimeError(f"{label}: end marker not found. No files were changed.")
    if text.find(start, start_at + len(start)) >= 0:
        raise RuntimeError(f"{label}: multiple start markers found. No files were changed.")
    return text[:start_at] + replacement + text[end_at:]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    root = Path.cwd()
    path = root / "frontend/src/ThreadWire.jsx"
    if not path.is_file():
        print("Run this script from the Threadwire repository root.", file=sys.stderr)
        return 2

    original = path.read_text(encoding="utf-8")
    updated = original

    # The Delivery page should open on the real current week, not the earliest
    # promise date found in sample or imported data.
    updated = replace_once(
        updated,
        '''  const [delivWeek, setDelivWeek] = useState(() => mondayOf(D(SALES_ORDERS.map((s) => s.promise).sort()[0])));
''',
        '''  const [delivWeek, setDelivWeek] = useState(() => mondayOf(new Date()));
''',
        "current delivery week initialization",
    )

    updated = replace_once(
        updated,
        '''        ACTIVE_ORDERS = m; setSos(m);
        const ds = m.map((s) => s.promise).filter(Boolean).sort()[0];
        if (ds) setDelivWeek(mondayOf(D(ds)));
''',
        '''        ACTIVE_ORDERS = m; setSos(m);
''',
        "remove earliest-order week reset",
    )

    # The month view had the same historical-date behavior.
    updated = replace_once(
        updated,
        '''  const earliest = useMemo(() => sos.map((s) => s.promise).filter(Boolean).sort()[0], [sos]);
  const [monthRef, setMonthRef] = useState(() => D(earliest));
''',
        '''  const [monthRef, setMonthRef] = useState(() => new Date());
''',
        "current delivery month initialization",
    )

    # Resolve a question-specific compact snapshot. Unlike the previous complete
    # browser dump, this remains small while carrying exact forecast calculations.
    updated = replace_once(
        updated,
        '''    const clientSnapshot = !backend && snapshot ? "\\n\\n" + snapshot : "";
    const sys = cfg.system + liveGuard + clientSnapshot + screenCtx + wfCtx;
''',
        '''    const resolvedSnapshot = typeof snapshot === "function" ? snapshot(q) : snapshot;
    const clientSnapshot = resolvedSnapshot ? "\\n\\n" + resolvedSnapshot : "";
    const sys = cfg.system + liveGuard + clientSnapshot + screenCtx + wfCtx;
''',
        "question-specific compact assistant snapshot",
    )

    old_guard = '''    const liveGuard = backend
      ? "\\n\\nSIGNED-IN MODE: Ignore sample/demo records embedded earlier. "
        + "Use SERVER DATABASE CONTEXT and LIVE THREADWIRE DATA as authoritative. "
        + "If the requested information is absent, say it is unavailable; do not invent it."
      : "";
'''
    new_guard = '''    const liveGuard = backend
      ? "\\n\\nSIGNED-IN MODE: Ignore sample/demo records embedded earlier. "
        + "Use the COMPACT LIVE DELIVERY CONTEXT and server database context as authoritative. "
        + "Never invent today's date, a week range, an effective promise date, or a revenue total. "
        + "Use the exact precomputed values supplied in the context."
      : "";
'''
    updated = replace_once(
        updated,
        old_guard,
        new_guard,
        "signed-in assistant authority instructions",
    )

    start_marker = '''  // full live snapshot appended to the system prompt so the model always sees
'''
    end_marker = '''  const go = (r) => { setRoute(r); window.scrollTo?.({ top: 0, behavior: "instant" }); };
'''

    compact_context = r'''  // Compact, question-specific context. Calculations use the same functions as
  // the Delivery page, so the assistant cannot invent week boundaries or omit
  // sales-order lines that qualify through a revised/effective promise date.
  const buildAiContext = (question = "") => {
    const now = new Date();
    const timezone = (typeof Intl !== "undefined" && Intl.DateTimeFormat().resolvedOptions().timeZone) || "America/New_York";
    const currentWeekStart = mondayOf(now);
    const currentWeekEnd = addDays(currentWeekStart, 6);
    const selectedWeekStart = delivWeek;
    const selectedWeekEnd = addDays(delivWeek, 6);

    const compactOrder = (o) => {
      const blocker = openBlockerForSO(blockers, o.id);
      const blockerRevisedPromise = revisedForSO(blockers, o.id);
      return {
        id: o.id,
        salesOrder: o.so,
        line: o.line,
        customer: o.customer,
        site: o.site,
        part: o.part,
        quantity: o.qty,
        value: o.value,
        originalPromiseDate: o.promise,
        salesOrderRevisedPromiseDate: o.revisedPromise || null,
        blockerRevisedPromiseDate: blockerRevisedPromise || null,
        effectivePromiseDate: effPromise(blockers, o),
        status: o.status || "",
        blocked: !!blocker,
        blockerId: blocker?.id || null,
        blockerTitle: blocker?.title || null,
      };
    };

    const summarize = (rows) => {
      const expectedRevenue = rows.reduce((sum, o) => sum + (o.value || 0), 0);
      const blockedRevenue = rows
        .filter((o) => !!openBlockerForSO(blockers, o.id))
        .reduce((sum, o) => sum + (o.value || 0), 0);
      return {
        expectedRevenue,
        committedRevenue: expectedRevenue - blockedRevenue,
        blockedRevenue,
        orderLineCount: rows.length,
      };
    };

    const inRange = (o, start, end) => {
      const effective = effPromise(blockers, o);
      return effective >= isoOf(start) && effective <= isoOf(end);
    };

    const currentWeekRows = sos.filter((o) => inRange(o, currentWeekStart, currentWeekEnd));
    const selectedScope = delivSite === "All" ? sos : sos.filter((o) => o.site === delivSite);
    const selectedWeekRows = selectedScope.filter((o) => inRange(o, selectedWeekStart, selectedWeekEnd));

    const mentioned = [...new Set(
      (String(question).match(/\b(?:[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*-)?SO-\d+\b/gi) || [])
        .map((s) => s.toUpperCase())
    )];
    const mentionedRows = mentioned.length
      ? sos.filter((o) => mentioned.includes(String(o.so).toUpperCase()))
      : [];

    const payload = [
      "COMPACT LIVE DELIVERY CONTEXT — authoritative and calculated by the application.",
      `CURRENT LOCAL DATETIME = ${now.toLocaleString()} (${timezone})`,
      `TODAY = ${isoOf(now)}`,
      `CURRENT WEEK DEFINITION = Monday ${isoOf(currentWeekStart)} through Sunday ${isoOf(currentWeekEnd)}, inclusive.`,
      "EFFECTIVE PROMISE RULE = sales-order revised promise date, else open blocker's revised promise date, else original promise date.",
      "FORECAST RULE = sum every sales-order line whose effective promise date is inside the range. Blocked lines remain in expected revenue and are also reported as blocked/at-risk.",
      "Do not recalculate or contradict the supplied totals.",
      "CURRENT_WEEK_ALL_SITES_SUMMARY = " + JSON.stringify({
        rangeStart: isoOf(currentWeekStart),
        rangeEnd: isoOf(currentWeekEnd),
        site: "All",
        ...summarize(currentWeekRows),
      }),
      "CURRENT_WEEK_ALL_SITES_INCLUDED_LINES = " + JSON.stringify(currentWeekRows.map(compactOrder)),
      "DELIVERY_PAGE_SELECTED_VIEW_SUMMARY = " + JSON.stringify({
        rangeStart: isoOf(selectedWeekStart),
        rangeEnd: isoOf(selectedWeekEnd),
        site: delivSite,
        ...summarize(selectedWeekRows),
      }),
      "DELIVERY_PAGE_SELECTED_VIEW_INCLUDED_LINES = " + JSON.stringify(selectedWeekRows.map(compactOrder)),
    ];

    if (mentionedRows.length) {
      payload.push(
        "EXACT DETAILS FOR SALES ORDERS MENTIONED IN THE QUESTION = "
        + JSON.stringify(mentionedRows.map(compactOrder))
      );
    }

    payload.push(
      'For "this week", always use CURRENT_WEEK_ALL_SITES_SUMMARY unless the user explicitly asks for the currently selected Delivery-page view or a particular site.'
    );
    return payload.join("\n");
  };

'''

    updated = replace_between(
        updated,
        start_marker,
        end_marker,
        compact_context,
        "replace oversized AI context",
    )

    updated = replace_once(
        updated,
        '''      <DockedAssistant route={route} chat={chats[route]} update={updateChat} open={dockOpen} setOpen={setDockOpen} botCtx={botCtx} snapshot={aiContext} backend={backend} />
''',
        '''      <DockedAssistant route={route} chat={chats[route]} update={updateChat} open={dockOpen} setOpen={setDockOpen} botCtx={botCtx} snapshot={buildAiContext} backend={backend} />
''',
        "use compact AI context builder",
    )

    print("All expected source blocks matched.")
    print(f"  frontend/src/ThreadWire.jsx: ready ({len(updated) - len(original):+d} bytes)")

    if args.check:
        print("Check only: no files changed.")
        return 0

    backup = path.with_name(path.name + ".bak-before-forecast-reasoning-fix")
    if not backup.exists():
        shutil.copy2(path, backup)
    path.write_text(updated, encoding="utf-8")

    print("Forecast reasoning fix applied.")
    print("Next:")
    print("  git diff --check")
    print("  git diff -- frontend/src/ThreadWire.jsx")
    print("  bash redeploy.sh")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

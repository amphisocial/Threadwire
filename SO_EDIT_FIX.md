# Sales-order edit fix (restores the lost repair)

## What was broken and why
The earlier Digital Thread zip shipped a full copy of `frontend/src/ThreadWire.jsx`
taken before the SO-edit repair, and the `git reset --hard` on EC2 discarded any
server-local commits — so the repair was lost from both sides. This re-applies it
to current main (Digital Thread changes are untouched and included).

## Fixes in this zip
1. `backend/app/main.py` — PATCH /api/sales_orders/{so}/{line}: SET placeholders
   were numbered $1..$n and then collided with the WHERE clause's $1..$3
   (org_id / so_number / line_number), scrambling every save. Args are now
   seeded with the WHERE values so SET params number from $4 — revised promise,
   status, ship date, and the changed-by/changed-at audit fields save correctly.
2. `frontend/src/ThreadWire.jsx` — Delivery card now shows
   "↪ revised from ~~old-date~~ → new-date" for a directly edited
   revised_promise_date, not only blocker-driven revisions (card movement to
   the new date already used the effective promise; saving works again with #1).
3. Quarterly rollup now buckets by effective (revised) promise date, matching
   the day/week/month views.
4. SO edit + ship date inputs use the native dark date picker
   (colorScheme: dark), same as the blocker form.

## Deploy
Windows repo root: unzip over the repo →
`git add -A && git commit -m "Fix SO line edit: SQL params, revised-date card, dark date pickers" && git push origin main`
EC2: `git pull && bash redeploy.sh` → hard-refresh.

## Verify
Open a sales order card → Edit → set a revised promise date → Save.
Expect: promise date struck through with the revised date beside it, card moves
to the new date on the calendar, and the activity log shows "order.edited …
revised promise old→new" with your name.

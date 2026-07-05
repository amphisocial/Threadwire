# Navigation rework + Quote-to-Order page

## Behavior
LOGGED OUT top nav: Home · ROI Calculator · Case Studies · [Request a diagnostic].
Delivery/Blockers/Forecast/Digital Thread are gone from the menu (the demo tiles
on the Home page still open them with sample data, so the sales demo keeps working).

LOGGED IN top nav: Delivery · Blockers · Forecast · Digital Thread.
- Delivery is the default landing page, and clicking the logo goes to Delivery.
- Home / ROI Calculator / Case Studies / Request-a-diagnostic disappear.
- Compliance appears only if switched on in Admin → Settings (new toggle).
- Quote-to-Order appears only if switched on in Admin → Settings (existing toggle).
- Site admin (role = superadmin) additionally sees Case Studies (the CMS).
- Guard: a logged-in user on a marketing or switched-off route is bounced to Delivery.

## New: Quote-to-Order page
Pipeline board (open → quoted → won → converted) fed by /api/quotes.
"Convert to order" calls /api/quotes/{q}/convert, creating the SO on the
Delivery calendar. Demo pipeline shows when no live quotes exist; the docked
assistant has a quotes persona (pipeline value, what to convert next).

## Files
- db/migrations/015_org_feature_flags.sql — organizations.compliance_enabled
  (default FALSE → Compliance is hidden for every org until an admin enables it;
  flip it in Admin → Settings after deploying). schema.sql updated for fresh installs.
- backend/app/main.py — session query + /api/auth/me expose compliance_enabled;
  PATCH /api/admin/settings now accepts partial updates for both flags.
- frontend/src/auth/Admin.jsx — Compliance module toggle in Settings.
- frontend/src/ThreadWire.jsx — TopNav logic, route guards, QuotesPage,
  quotes assistant persona. (Includes the SO-edit fix — built on current main.)

## Deploy
Windows: unzip over repo root → git add -A && git commit -m "Nav rework + quote-to-order page" && git push origin main
EC2: git pull && bash redeploy.sh   (migration 015 applies automatically)
Then each org admin: Admin → Settings → switch on Compliance / Quote-to-Order as wanted.
Users need a reload (or sign out/in) to pick up flag changes.

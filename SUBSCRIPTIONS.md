# Product subscriptions + switcher + platform admin

## What this adds
- **Product switcher** in the signed-in nav (next to the logo): shows the 3
  products, highlights the current one, lets a user jump to any product they're
  subscribed to (navigates to that product's subdomain), shows locked ones, and
  offers "Add a product" → Get in touch for ones they don't have.
- **Subscriptions view**: the switcher dropdown is the user's "your subscriptions"
  list (effective products).
- **Platform admin (superadmin) → Admin ▸ Subscriptions tab**: pick a company,
  set its baseline products, and grant/restrict products per user. Effective
  access = (company baseline + user grants) − user restrictions.
- **Shared session across subdomains**: the session cookie can now be issued for
  `.threadwire.ai` so logging in on one product keeps you logged in when you
  switch to another.

## Deploy
Frontend: 3 changed files per app (`ThreadWire.jsx`, `lib/api.js`, `auth/Admin.jsx`),
identical across all four apps. Backend: `app/main.py`, `app/config.py`.
Migration: `db/migrations/021_product_subscriptions.sql` (idempotent; seeds
existing companies with all three products so nobody loses access).

Then:
```bash
bash ~/threadwire-app/redeploy-multi.sh     # runs migration + backend + all 4 apps
```

## REQUIRED env for cross-subdomain login
Add to the backend env (`/opt/threadwire/backend/.env`) and restart the API:
```
TW_COOKIE_DOMAIN=.threadwire.ai
```
Without it the cookie stays host-only and switching subdomains logs the user out.
`COOKIE_SECURE=true` should remain set (all subdomains are HTTPS). Leave
`TW_COOKIE_DOMAIN` empty on localhost.

> After setting TW_COOKIE_DOMAIN, existing sessions (host-only cookies) will
> still work until they expire; new logins get the shared-domain cookie. To force
> it, users sign out/in once.

## Entitlements API (for reference)
- `GET  /api/me` → now includes `products` (effective), `company_products`,
  `product_grants`, `product_restrictions`, `is_platform_admin`.
- `GET  /api/platform/orgs` (superadmin)
- `PUT  /api/platform/orgs/{org_id}/products` { products: [...] }
- `GET  /api/platform/orgs/{org_id}/users`
- `PUT  /api/platform/users/{user_id}/products` { grants?: [...], restrictions?: [...] }

## Making someone a platform admin
Platform admin = existing `superadmin` role. Use the existing helper:
`backend/scripts/make_site_admin.py` (promotes a user to superadmin).

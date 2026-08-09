# User Management: per-product allocation + License tab (full drop)

This is the complete, deployable set for:
- **Admin ▸ License** — 3 products × 3 per-seat tiers (Pro 10/$3.99, Gold 50/$9.99,
  Platinum 100/$24.99), live monthly total, Stripe checkout, "Talk to us".
- **Admin ▸ User Management** — sub-tabs:
    • **Seats & invites** — license seats + invitations (unchanged).
    • **Delivery / Workforce / Requirements allocation** — one tab per subscribed
      product; toggle which licensed users can open each, capped by the tier's
      seats. The **Workforce** tab keeps its **role + discipline scope** controls
      (nothing lost).
- Backend: `/api/admin/usage` returns company_products / product_tiers / per-member
  allocations; `PUT /api/admin/members/{id}/allocation` allocates within the cap;
  `/api/billing/catalog` + `/api/billing/subscribe` power the License tab.

## Files
Frontend (identical across all 4 apps): `src/ThreadWire.jsx`, `src/main.jsx`,
`src/lib/api.js`, `src/auth/Admin.jsx`.
Backend: `app/main.py`, `app/config.py`, `app/billing.py`.
Migrations: `021_product_subscriptions.sql`, `022_product_tiers.sql` (idempotent).

## Deploy
```bash
bash redeploy-multi.sh          # migrations + backend + all 4 apps
```

## Why the allocation tabs may look "missing"
The per-product allocation tabs only render for products the COMPANY is
subscribed to (company_products). Until the org has products, only
"Seats & invites" shows. Give the company products via the License tab checkout,
a superadmin grant (Admin ▸ Subscriptions), or directly:
```sql
UPDATE organizations
   SET products='{delivery,workforce,requirements}',
       product_tiers='{"delivery":"gold","workforce":"gold","requirements":"pro"}'::jsonb
 WHERE legal_name = 'Your Company';
```

## Env (for the License tab checkout)
Nine per-seat Stripe price IDs in /opt/threadwire/backend/.env:
STRIPE_PRICE_<PRODUCT>_<TIER>  (PRODUCT = DELIVERY|WORKFORCE|REQUIREMENTS,
TIER = PRO|GOLD|PLATINUM), optional _LIVE/_TEST. Keep TW_COOKIE_DOMAIN=.threadwire.ai.

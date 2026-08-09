# Clean navigation + product licensing

## Navigation
- **Marketing (threadwire.ai / home build only):** Home · Products · ROI · Case Studies.
  ROI and Case Studies now render ONLY on the marketing build.
- **Product apps (delivery/workforce/requirements subdomains):** show ONLY that
  product's tabs. No ROI, no Case Studies, no other product's pages. Logged-out
  visitors get the app in sample mode; a "Log in / Sign up" button and the
  product's "Try … with sample data" flow lead into it.
- **Product page "Try":** `Try <Product> with sample data` → goes to that
  product's subdomain (`?try=1`). "Log in to unlock every feature" → subdomain
  `?signup=1`, which opens the auth screen. After login the user is on that
  product's app.
- **Clean logout:** always returns to threadwire.ai (the marketing root).
- **Switching products:** the in-nav product switcher navigates to the other
  subdomain; unentitled products show LOCKED and route to details / contact.
- **No access:** a signed-in user on a product they aren't subscribed to gets a
  clean "You don't have access to <product> yet" screen (no marketing bleed).

## Licensing (replaces diagnostic/core/pro/enterprise)
Admin ▸ **License** tab: three products × three per-seat tiers, billed as a fixed
seat block:
- **Pro** — up to 10 users — $3.99/user/mo
- **Gold** — up to 50 users — $9.99/user/mo
- **Platinum** — up to 100 users — $24.99/user/mo

Pick a tier per product (any combination); the **monthly total** updates live.
"Checkout / Update subscription" opens **Stripe** (one subscription, one line per
product, quantity = the tier's seat cap). A **Talk to us** link covers
services/setup. On successful payment the company's products + tiers are applied.

Superadmin can still grant products directly in **Admin ▸ Subscriptions**.

## REQUIRED: Stripe price IDs in /opt/threadwire/backend/.env
Nine per-seat prices (product × tier). Names:
```
STRIPE_PRICE_DELIVERY_PRO       STRIPE_PRICE_DELIVERY_GOLD       STRIPE_PRICE_DELIVERY_PLATINUM
STRIPE_PRICE_WORKFORCE_PRO      STRIPE_PRICE_WORKFORCE_GOLD      STRIPE_PRICE_WORKFORCE_PLATINUM
STRIPE_PRICE_REQUIREMENTS_PRO   STRIPE_PRICE_REQUIREMENTS_GOLD   STRIPE_PRICE_REQUIREMENTS_PLATINUM
```
Optional `_LIVE` / `_TEST` suffixes are honored (matching your PAYMENT_MODE), with
the plain name as fallback — e.g. `STRIPE_PRICE_WORKFORCE_GOLD_LIVE`.
Each Stripe price must be a **recurring per-unit** price; checkout passes
quantity = 10 / 50 / 100. Keep `TW_COOKIE_DOMAIN=.threadwire.ai` set (from the
last drop) so login persists across subdomains.

## Deploy
```bash
bash ~/threadwire-app/redeploy-multi.sh      # migrations 021 + 022, backend, all 4 apps
```
Migrations are idempotent. Existing companies keep all three products (021 seed);
022 adds the per-product tier map (empty until they subscribe).

-- Product subscriptions (Delivery / Workforce / Requirements).
--
-- Scoping: a company sets the baseline set of products; a platform admin
-- (role = 'superadmin') can additionally grant or restrict products per user.
-- Effective products for a user =
--     (organization.products  UNION  users.product_grants)  MINUS  users.product_restrictions
--
-- Existing organizations are seeded with all three products so no current user
-- loses access when this migration is applied.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS products text[] NOT NULL DEFAULT '{delivery,workforce,requirements}';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS product_grants text[] NOT NULL DEFAULT '{}';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS product_restrictions text[] NOT NULL DEFAULT '{}';

-- Seed any pre-existing rows that came in as NULL (defensive; default handles new rows).
UPDATE organizations
   SET products = '{delivery,workforce,requirements}'
 WHERE products IS NULL;

UPDATE users
   SET product_grants = '{}'
 WHERE product_grants IS NULL;

UPDATE users
   SET product_restrictions = '{}'
 WHERE product_restrictions IS NULL;

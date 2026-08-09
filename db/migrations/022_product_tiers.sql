-- Per-product subscription tier for each company (Pro / Gold / Platinum).
--
-- organizations.products (from 021) stays the on/off list of active products.
-- product_tiers records the seat tier per active product, e.g.
--     {"delivery": "gold", "workforce": "pro"}
-- Line total for a product = TIERS[tier].seats * TIERS[tier].rate (fixed block).

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS product_tiers jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE organizations
   SET product_tiers = '{}'::jsonb
 WHERE product_tiers IS NULL;

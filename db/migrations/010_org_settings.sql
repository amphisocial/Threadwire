-- Per-company feature flag: Quote-to-Order tracking (Delivery Desk for small-cap
-- shops without heavy ERP/MES). Default OFF — companies with full systems don't see it.
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS quote_to_order boolean NOT NULL DEFAULT false;

-- Per-org feature flags controlled from Admin → Settings.
-- Compliance module: hidden from the top nav until an admin switches it on.
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS compliance_enabled boolean NOT NULL DEFAULT false;

-- Membership (Stripe) + per-user daily token metering.

ALTER TABLE users ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';      -- free | pro
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_status text DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS enterprise boolean NOT NULL DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS enterprise_status text DEFAULT '';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- one row per user per day; the date key makes the daily reset automatic
CREATE TABLE IF NOT EXISTS usage_daily (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  usage_date date NOT NULL,
  tokens     integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, usage_date)
);
CREATE INDEX IF NOT EXISTS usage_daily_org_date ON usage_daily (org_id, usage_date);

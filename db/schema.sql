-- ThreadWire — database schema (PostgreSQL)
-- Run once:  psql "$DATABASE_URL" -f db/schema.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Tenants (one row per US-registered customer company)
-- The company name is an ATTRIBUTE, not the key. Names are not unique, change,
-- and collide across states — so the primary key is a surrogate UUID.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
    id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_name               text NOT NULL,
    normalized_name          text NOT NULL,            -- lower/space-collapsed, for dedupe
    state_of_incorporation   text,
    domain                   text,
    status                   text NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('pending','active','suspended')),
    created_at               timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS organizations_normalized_name_key
    ON organizations (normalized_name);

-- ---------------------------------------------------------------------------
-- Users. First user of an org is the org_admin. 'superadmin' = platform owner.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id         uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email          text NOT NULL,
    full_name      text,
    password_hash  text NOT NULL,                       -- argon2id
    role           text NOT NULL DEFAULT 'member'
                       CHECK (role IN ('superadmin','org_admin','member')),
    mfa_secret     bytea,                                -- AES-GCM encrypted TOTP secret
    mfa_enabled    boolean NOT NULL DEFAULT false,
    created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (lower(email));
CREATE INDEX IF NOT EXISTS users_org_idx ON users (org_id);

-- ---------------------------------------------------------------------------
-- Server-side sessions (cookie holds only the opaque session id).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mfa_passed  boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    expires_at  timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);

-- ---------------------------------------------------------------------------
-- Connector credentials (Jama, Jira, DOORS, Jamf, Intune), per tenant.
-- Non-secret fields live in `config` (base URL, project key, tenant_id, ...).
-- The actual token/secret/refresh-token is AES-256-GCM encrypted by the app
-- and stored as ciphertext — NEVER in plaintext, NEVER sent to the browser.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS connector_credentials (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id             uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    type               text NOT NULL
                           CHECK (type IN ('jama','jira','doors','jamf','intune')),
    auth_method        text NOT NULL DEFAULT 'api_token'
                           CHECK (auth_method IN ('oauth','api_token','basic','client_secret')),
    config             jsonb NOT NULL DEFAULT '{}'::jsonb,
    secret_ciphertext  bytea,
    secret_last4       text,                            -- for masked display only
    updated_by         uuid REFERENCES users(id),
    updated_at         timestamptz NOT NULL DEFAULT now(),
    UNIQUE (org_id, type)
);
CREATE INDEX IF NOT EXISTS connector_org_idx ON connector_credentials (org_id);

-- ---------------------------------------------------------------------------
-- OPTIONAL hardening: Row-Level Security as a second layer behind the
-- app-level org scoping. To enable, the app must run, per request:
--     SET LOCAL app.current_org = '<org-uuid>';
-- Leave commented until that wiring is in place, or queries will return empty.
-- ---------------------------------------------------------------------------
-- ALTER TABLE connector_credentials ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY tenant_isolation ON connector_credentials
--     USING (org_id = current_setting('app.current_org', true)::uuid);
-- Migration 002: connector catalog (governs available connectors) + invites.
-- Safe to run on an existing database.

CREATE TABLE IF NOT EXISTS connector_catalog (
    type        text PRIMARY KEY,
    label       text NOT NULL,
    category    text,
    enabled     boolean NOT NULL DEFAULT true,
    auth_method text NOT NULL DEFAULT 'api_token',
    fields      jsonb NOT NULL DEFAULT '[]'::jsonb,  -- form schema for the config UI
    doc_url     text,
    sort        int NOT NULL DEFAULT 100
);

-- Seed: Jira + Jama enabled now; SAP / Oracle ERP / Teamcenter visible but disabled.
INSERT INTO connector_catalog (type, label, category, enabled, auth_method, fields, doc_url, sort) VALUES
('jira', 'Jira', 'Issues & Plans', true, 'basic',
  '[{"key":"base_url","label":"Jira base URL","placeholder":"https://your-domain.atlassian.net"},
    {"key":"email","label":"Account email"},
    {"key":"project_key","label":"Project key (e.g. MFG)","optional":true},
    {"key":"api_token","label":"API token","secret":true}]'::jsonb,
  'https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/', 10),
('jama', 'Jama Connect', 'Requirements', true, 'oauth',
  '[{"key":"base_url","label":"Jama base URL","placeholder":"https://your.jamacloud.com"},
    {"key":"client_id","label":"API client ID"},
    {"key":"client_secret","label":"API client secret","secret":true},
    {"key":"project_id","label":"Project ID","optional":true}]'::jsonb,
  'https://dev.jamasoftware.com/', 20),
('sap', 'SAP ERP', 'ERP', false, 'oauth', '[]'::jsonb, NULL, 30),
('oracle_erp', 'Oracle ERP', 'ERP', false, 'oauth', '[]'::jsonb, NULL, 40),
('teamcenter', 'Siemens Teamcenter', 'PLM', false, 'oauth', '[]'::jsonb, NULL, 50)
ON CONFLICT (type) DO NOTHING;

CREATE TABLE IF NOT EXISTS invites (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email       text NOT NULL,
    token       text NOT NULL UNIQUE,
    invited_by  uuid REFERENCES users(id),
    role        text NOT NULL DEFAULT 'member',
    status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked')),
    created_at  timestamptz NOT NULL DEFAULT now(),
    expires_at  timestamptz NOT NULL,
    accepted_at timestamptz
);
CREATE INDEX IF NOT EXISTS invites_org_idx ON invites (org_id);
CREATE INDEX IF NOT EXISTS invites_token_idx ON invites (token);

-- ===== data import tables (003) =====
-- ThreadWire data import: core digital-thread entities (org-scoped, idempotent).
-- Load order matters: parts must exist before boms / vendor_parts reference them.

CREATE TABLE IF NOT EXISTS customers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_code text NOT NULL,
  name          text NOT NULL,
  email         text DEFAULT '',
  region        text DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS customers_org_code ON customers (org_id, customer_code);

CREATE TABLE IF NOT EXISTS vendors (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_code text NOT NULL,
  name        text NOT NULL,
  email       text DEFAULT '',
  region      text DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS vendors_org_code ON vendors (org_id, vendor_code);

CREATE TABLE IF NOT EXISTS operators (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  operator_code  text NOT NULL,
  name           text NOT NULL,
  site           text DEFAULT '',
  shift          text DEFAULT '',
  certifications text DEFAULT '',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS operators_org_code ON operators (org_id, operator_code);

CREATE TABLE IF NOT EXISTS parts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  part_number text NOT NULL,
  description text DEFAULT '',
  unit_cost   numeric(14,2),
  uom         text DEFAULT '',
  commodity   text DEFAULT '',
  revision    text DEFAULT '',
  lifecycle   text DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS parts_org_pn ON parts (org_id, part_number);

-- one part can be supplied by several vendors; (vendor, vendor_part_number) is unique
CREATE TABLE IF NOT EXISTS vendor_parts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  part_number        text NOT NULL,
  vendor             text NOT NULL,
  vendor_part_number text NOT NULL,
  unit_cost          numeric(14,2),
  lead_time_days     integer,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS vendor_parts_org_vendor_vpn ON vendor_parts (org_id, vendor, vendor_part_number);

-- single-level BOM; deeper levels are imported as their own parent rows
CREATE TABLE IF NOT EXISTS boms (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_part_number text NOT NULL,
  child_part_number  text NOT NULL,
  quantity           numeric(14,4) NOT NULL DEFAULT 1,
  find_number        text NOT NULL DEFAULT '',
  ref_designators    text DEFAULT '',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS boms_org_parent_child_find ON boms (org_id, parent_part_number, child_part_number, find_number);

CREATE TABLE IF NOT EXISTS work_orders (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  wo_number    text NOT NULL,
  part_number  text DEFAULT '',
  description  text DEFAULT '',
  quantity     numeric(14,4),
  site         text DEFAULT '',
  status       text DEFAULT '',
  due_date     date,
  operator     text DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS work_orders_org_wo ON work_orders (org_id, wo_number);

CREATE TABLE IF NOT EXISTS sales_orders (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  so_number    text NOT NULL,
  customer     text NOT NULL DEFAULT '',
  site         text DEFAULT '',
  promise_date date,
  part_number  text DEFAULT '',
  quantity     numeric(14,4),
  value        numeric(16,2),
  status       text DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS sales_orders_org_so ON sales_orders (org_id, so_number);

-- import audit (feeds the assistant's recent-changes awareness)
CREATE TABLE IF NOT EXISTS import_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity     text NOT NULL,
  inserted   integer NOT NULL DEFAULT 0,
  updated    integer NOT NULL DEFAULT 0,
  errors     integer NOT NULL DEFAULT 0,
  filename   text DEFAULT '',
  by_user    uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS import_events_org_created ON import_events (org_id, created_at DESC);

-- ===== blockers + activity (004) =====
-- Persistent blockers (members read/write these instead of in-browser sample),
-- plus a general activity log that feeds the assistant's recent-changes awareness.

CREATE TABLE IF NOT EXISTS blockers (
  id          text NOT NULL,                 -- BLK-#### unique per org
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title       text NOT NULL,
  status      text NOT NULL DEFAULT 'open',  -- open | assigned | closed
  assignee    text,
  opened_by   text,
  action      text DEFAULT '',
  wo          text,
  sos         jsonb NOT NULL DEFAULT '[]',
  parts       jsonb NOT NULL DEFAULT '[]',
  comments    jsonb NOT NULL DEFAULT '[]',
  new_promise date,
  created_at  timestamptz NOT NULL DEFAULT now(),
  closed_at   timestamptz,
  closed_by   text,
  PRIMARY KEY (org_id, id)
);
CREATE INDEX IF NOT EXISTS blockers_org_status ON blockers (org_id, status);

CREATE TABLE IF NOT EXISTS activity_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type       text NOT NULL,
  detail     text DEFAULT '',
  by_user    text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activity_events_org_created ON activity_events (org_id, created_at DESC);

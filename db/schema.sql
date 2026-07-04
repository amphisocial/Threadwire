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

-- ===== billing + usage (005) =====
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

-- ===== sales-order lines + classification (006) =====
-- Multi-line sales orders + SOEI part classification.

-- 1) line numbers (existing rows all become line 10; new lines go 10,20,30,…)
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS line_number integer NOT NULL DEFAULT 10;

-- 2) uniqueness moves from (org, so_number) to (org, so_number, line_number)
DROP INDEX IF EXISTS sales_orders_org_so;
CREATE UNIQUE INDEX IF NOT EXISTS sales_orders_org_so_line
  ON sales_orders (org_id, so_number, line_number);

-- 3) parts get a classification; SO end items are tagged 'SOEI'
ALTER TABLE parts ADD COLUMN IF NOT EXISTS classification text NOT NULL DEFAULT '';

-- 4) backfill any blank part on a sales-order line with a random existing part
--    (keeps every card showing an end item; no-op once filled)
UPDATE sales_orders s
   SET part_number = COALESCE(
         (SELECT p.part_number FROM parts p
           WHERE p.org_id = s.org_id ORDER BY random() LIMIT 1),
         'PN-UNASSIGNED')
 WHERE s.part_number IS NULL OR s.part_number = '';

-- 5) tag every part used as a sales-order end item
UPDATE parts p
   SET classification = 'SOEI'
  FROM sales_orders s
 WHERE s.org_id = p.org_id
   AND s.part_number = p.part_number
   AND (p.classification IS NULL OR p.classification = '');

-- ===== re-link legacy blockers to lines (007) =====
-- Re-link blockers created before sales orders became line-level.
-- Old blockers store bare SO numbers (e.g. "SO-5004") in sos; expand each to the
-- line ids of that SO (e.g. "SO-5004-L10"). Idempotent: once every element
-- already contains "-L", re-running changes nothing.

DO $$
DECLARE
  b        RECORD;
  elem     text;
  lid      text;
  cnt      int;
  new_sos  jsonb;
BEGIN
  FOR b IN SELECT id, org_id, sos FROM blockers WHERE sos IS NOT NULL LOOP
    new_sos := '[]'::jsonb;
    FOR elem IN SELECT jsonb_array_elements_text(b.sos) LOOP
      IF position('-L' in elem) > 0 THEN
        new_sos := new_sos || to_jsonb(elem);
      ELSE
        cnt := 0;
        FOR lid IN
          SELECT so_number || '-L' || line_number
            FROM sales_orders
           WHERE org_id = b.org_id AND so_number = elem
        LOOP
          new_sos := new_sos || to_jsonb(lid);
          cnt := cnt + 1;
        END LOOP;
        IF cnt = 0 THEN
          -- no matching line found; assume the legacy default line 10
          new_sos := new_sos || to_jsonb(elem || '-L10');
        END IF;
      END IF;
    END LOOP;
    IF new_sos <> b.sos THEN
      UPDATE blockers SET sos = new_sos WHERE id = b.id;
    END IF;
  END LOOP;
END $$;

-- ===== compliance + documents + data sources (008) =====
-- Phase 1 of the "Connected Digital Thread": compliance/traceability data model,
-- a document registry (S3 or local) tagged by company + type, and registered data sources.

-- Registered data sources (S3 / SharePoint / IQMS / Salesforce). Config is non-secret
-- metadata (bucket, prefix, host); credentials, if any, live in .env or the OS keychain.
CREATE TABLE IF NOT EXISTS data_sources (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  kind        text NOT NULL,                       -- s3 | sharepoint | iqms | salesforce | csv
  name        text NOT NULL,
  config      jsonb NOT NULL DEFAULT '{}'::jsonb,
  status      text NOT NULL DEFAULT 'connected',   -- connected | error | syncing
  last_sync   timestamptz,
  last_result text DEFAULT '',
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS data_sources_org ON data_sources (org_id);

-- Documents (supplier certs, CoC/CoA, SOPs, inspection PDFs). content_text holds
-- extracted text for retrieval/citations; company_ref tags which company the file
-- belongs to (an org may hold docs for several acquired entities).
CREATE TABLE IF NOT EXISTS documents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_ref  text NOT NULL DEFAULT '',           -- e.g. "NextPhase", "Formula Plastics"
  doc_type     text NOT NULL DEFAULT 'other',      -- cert | coc | coa | sop | inspection | dhr | other
  title        text NOT NULL DEFAULT '',
  filename     text NOT NULL,
  storage_key  text NOT NULL,                       -- org_<id>/<doc_type>/<filename>
  storage      text NOT NULL DEFAULT 'local',       -- s3 | local
  source_id    uuid REFERENCES data_sources(id) ON DELETE SET NULL,
  lot_number   text DEFAULT '',
  part_number  text DEFAULT '',
  vendor_code  text DEFAULT '',
  content_text text NOT NULL DEFAULT '',
  content_tsv  tsvector,
  size_bytes   bigint DEFAULT 0,
  uploaded_by  text,
  uploaded_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS documents_org ON documents (org_id);
CREATE INDEX IF NOT EXISTS documents_lot ON documents (org_id, lot_number);
CREATE INDEX IF NOT EXISTS documents_part ON documents (org_id, part_number);
CREATE INDEX IF NOT EXISTS documents_tsv ON documents USING gin (content_tsv);

CREATE OR REPLACE FUNCTION documents_tsv_update() RETURNS trigger AS $$
BEGIN
  NEW.content_tsv :=
    setweight(to_tsvector('english', coalesce(NEW.title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.lot_number,'') || ' ' || coalesce(NEW.part_number,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.content_text,'')), 'B');
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS documents_tsv_trg ON documents;
CREATE TRIGGER documents_tsv_trg BEFORE INSERT OR UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION documents_tsv_update();

-- Lots / batches (the spine of a Device History Record).
CREATE TABLE IF NOT EXISTS lots (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lot_number   text NOT NULL,
  part_number  text DEFAULT '',
  work_order   text DEFAULT '',
  quantity     numeric,
  site         text DEFAULT '',
  company_ref  text DEFAULT '',
  mfg_date     date,
  status       text DEFAULT '',                     -- released | hold | quarantine | shipped
  disposition  text DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS lots_org_lot ON lots (org_id, lot_number);

-- Inspections tied to a lot.
CREATE TABLE IF NOT EXISTS inspections (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lot_number   text NOT NULL,
  inspection_type text DEFAULT '',                  -- incoming | in-process | final | dimensional
  result       text DEFAULT '',                     -- pass | fail | conditional
  inspector    text DEFAULT '',
  inspected_at date,
  ncr_number   text DEFAULT '',
  notes        text DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inspections_org_lot ON inspections (org_id, lot_number);

-- Non-conformance records / CAPA linkage.
CREATE TABLE IF NOT EXISTS ncrs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ncr_number   text NOT NULL,
  lot_number   text DEFAULT '',
  part_number  text DEFAULT '',
  description  text DEFAULT '',
  disposition  text DEFAULT '',                      -- use-as-is | rework | scrap | RTV
  capa_number  text DEFAULT '',
  status       text DEFAULT '',                      -- open | closed
  opened_at    date,
  closed_at    date,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ncrs_org_num ON ncrs (org_id, ncr_number);
CREATE INDEX IF NOT EXISTS ncrs_org_lot ON ncrs (org_id, lot_number);

-- ===== quotes / delivery desk (009) =====
-- Delivery Desk: quotes and the quote -> order thread.
-- A quote is the front of the "quote-to-shipment" tracker in the AMTEC/FTI offers.

CREATE TABLE IF NOT EXISTS quotes (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  quote_number       text NOT NULL,
  customer           text DEFAULT '',
  product_family     text DEFAULT '',
  custom_attributes  text DEFAULT '',
  quantity           numeric,
  value              numeric,                 -- quoted amount
  required_date      date,
  promised_date      date,
  expected_ship_date date,
  owner              text DEFAULT '',
  status             text DEFAULT 'open',     -- open | quoted | won | lost | converted
  blocker            text DEFAULT '',
  blocker_category   text DEFAULT '',         -- material | qa | engineering | customer | supplier_docs | none
  next_action        text DEFAULT '',
  site               text DEFAULT '',
  company_ref        text DEFAULT '',
  notes              text DEFAULT '',
  converted_so       text DEFAULT '',         -- so_number once converted to an order
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS quotes_org_num ON quotes (org_id, quote_number);
CREATE INDEX IF NOT EXISTS quotes_org_status ON quotes (org_id, status);

-- ===== org settings: quote-to-order flag (010) =====
-- Per-company feature flag: Quote-to-Order tracking (Delivery Desk for small-cap
-- shops without heavy ERP/MES). Default OFF — companies with full systems don't see it.
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS quote_to_order boolean NOT NULL DEFAULT false;

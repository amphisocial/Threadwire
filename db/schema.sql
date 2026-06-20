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

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

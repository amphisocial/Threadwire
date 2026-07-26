-- 019_ontology_explorer.sql
-- Saved semantic explorations and explicit object lists only.
-- Existing operational objects remain in their authoritative shared tables,
-- isolated by org_id in every query.

CREATE TABLE IF NOT EXISTS ontology_saved_explorations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  name text NOT NULL,
  entity_key text NOT NULL,
  definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_shared boolean NOT NULL DEFAULT false,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, created_by, name)
);

CREATE INDEX IF NOT EXISTS idx_ontology_saved_explorations_org
  ON ontology_saved_explorations(org_id, entity_key, updated_at DESC);

CREATE TABLE IF NOT EXISTS ontology_saved_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  name text NOT NULL,
  entity_key text NOT NULL,
  object_keys jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_shared boolean NOT NULL DEFAULT false,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, created_by, name)
);

CREATE INDEX IF NOT EXISTS idx_ontology_saved_lists_org
  ON ontology_saved_lists(org_id, entity_key, updated_at DESC);

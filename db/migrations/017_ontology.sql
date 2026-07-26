-- Threadwire Ontology Studio
-- Additive, organization-scoped semantic metadata over the existing operational
-- tables. No existing part/BOM/order/work-order data is moved or duplicated.

CREATE TABLE IF NOT EXISTS ontology_entity_types (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_key     text NOT NULL,
  label          text NOT NULL,
  description    text NOT NULL DEFAULT '',
  source_kind    text NOT NULL DEFAULT 'custom'
                    CHECK (source_kind IN ('core_table','custom')),
  source_system  text NOT NULL DEFAULT 'Threadwire',
  source_table   text NOT NULL DEFAULT '',
  key_fields     jsonb NOT NULL DEFAULT '[]'::jsonb,
  display_field  text NOT NULL DEFAULT '',
  color          text NOT NULL DEFAULT '#2A46C4',
  position       jsonb NOT NULL DEFAULT '{"x":0,"y":0,"z":0}'::jsonb,
  config         jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_system      boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, entity_key)
);
CREATE INDEX IF NOT EXISTS ontology_entity_org ON ontology_entity_types (org_id, entity_key);

CREATE TABLE IF NOT EXISTS ontology_properties (
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type_id  uuid NOT NULL REFERENCES ontology_entity_types(id) ON DELETE CASCADE,
  property_key    text NOT NULL,
  label           text NOT NULL,
  data_type       text NOT NULL DEFAULT 'text',
  source_column   text NOT NULL DEFAULT '',
  source_system   text NOT NULL DEFAULT 'Threadwire',
  required        boolean NOT NULL DEFAULT false,
  is_key          boolean NOT NULL DEFAULT false,
  is_sensitive    boolean NOT NULL DEFAULT false,
  sort_order      integer NOT NULL DEFAULT 100,
  config          jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (org_id, entity_type_id, property_key)
);
CREATE INDEX IF NOT EXISTS ontology_property_entity ON ontology_properties (entity_type_id, sort_order);

CREATE TABLE IF NOT EXISTS ontology_relationship_types (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  relationship_key  text NOT NULL,
  label             text NOT NULL,
  from_entity_key   text NOT NULL,
  to_entity_key     text NOT NULL,
  cardinality       text NOT NULL DEFAULT 'many-to-one',
  from_property     text NOT NULL DEFAULT '',
  to_property       text NOT NULL DEFAULT '',
  source_kind       text NOT NULL DEFAULT 'derived'
                       CHECK (source_kind IN ('derived','table','custom')),
  source_table      text NOT NULL DEFAULT '',
  config            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, relationship_key)
);
CREATE INDEX IF NOT EXISTS ontology_relationship_org ON ontology_relationship_types (org_id);
CREATE INDEX IF NOT EXISTS ontology_relationship_from ON ontology_relationship_types (org_id, from_entity_key);
CREATE INDEX IF NOT EXISTS ontology_relationship_to ON ontology_relationship_types (org_id, to_entity_key);

CREATE TABLE IF NOT EXISTS ontology_custom_objects (
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_key   text NOT NULL,
  object_key   text NOT NULL,
  properties   jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by   text NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, entity_key, object_key)
);
CREATE INDEX IF NOT EXISTS ontology_custom_object_entity ON ontology_custom_objects (org_id, entity_key);
CREATE INDEX IF NOT EXISTS ontology_custom_object_properties ON ontology_custom_objects USING gin (properties);

CREATE TABLE IF NOT EXISTS ontology_action_types (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  action_key         text NOT NULL,
  label              text NOT NULL,
  entity_key         text NOT NULL DEFAULT '*',
  action_kind        text NOT NULL DEFAULT 'workflow'
                         CHECK (action_kind IN ('workflow','activity')),
  requires_approval  boolean NOT NULL DEFAULT true,
  active             boolean NOT NULL DEFAULT true,
  config             jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, action_key)
);

CREATE TABLE IF NOT EXISTS ontology_action_runs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  action_key    text NOT NULL,
  entity_key    text NOT NULL,
  object_key    text NOT NULL DEFAULT '',
  status        text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','approved','rejected','completed','failed')),
  input         jsonb NOT NULL DEFAULT '{}'::jsonb,
  output        jsonb NOT NULL DEFAULT '{}'::jsonb,
  requested_by  text NOT NULL DEFAULT '',
  approved_by   text NOT NULL DEFAULT '',
  requested_at  timestamptz NOT NULL DEFAULT now(),
  decided_at    timestamptz,
  completed_at  timestamptz
);
CREATE INDEX IF NOT EXISTS ontology_action_run_org ON ontology_action_runs (org_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS ontology_action_run_status ON ontology_action_runs (org_id, status);

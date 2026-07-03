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

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

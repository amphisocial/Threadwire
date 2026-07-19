-- Workforce Intelligence: persistent, org-scoped storage for engineering
-- resource planning. Members read; org admins write (import / manual create /
-- baseline). Public visitors use the in-browser demo and never reach these
-- tables. Per-month maps are stored as jsonb ({ "YYYY-MM": value }).

-- People (engineers and other disciplines). "id" is a per-org id (e.g. SW-001).
CREATE TABLE IF NOT EXISTS wf_people (
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  id          text NOT NULL,
  name        text NOT NULL,
  discipline  text NOT NULL DEFAULT 'SW',   -- SW|FW|EE|ME|SE|TE|PM
  location    text NOT NULL DEFAULT 'REM',  -- AUS|BOS|DEN|RAL|REM
  seniority   int  NOT NULL DEFAULT 2,      -- 1 junior .. 3 senior
  rate        numeric,                       -- optional $/h override
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, id)
);
CREATE INDEX IF NOT EXISTS wf_people_org_disc ON wf_people (org_id, discipline);

-- Projects, including optional per-discipline required resources.
CREATE TABLE IF NOT EXISTS wf_projects (
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  id          text NOT NULL,
  code        text NOT NULL DEFAULT '',
  name        text NOT NULL,
  manager     text NOT NULL DEFAULT '',
  lead        text NOT NULL DEFAULT '',
  phase       text NOT NULL DEFAULT '',
  customer    text NOT NULL DEFAULT '',
  required    jsonb NOT NULL DEFAULT '{}'::jsonb,  -- { disciplineCode: fte } required per discipline
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, id)
);

-- Allocations: a person's committed percentage per month on a project.
-- "source" records where the allocation came from (baseline, or a REQ-#### fill).
CREATE TABLE IF NOT EXISTS wf_allocations (
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  id          text NOT NULL,
  person_id   text NOT NULL,
  project_id  text NOT NULL,
  pcts        jsonb NOT NULL DEFAULT '{}'::jsonb,  -- { "YYYY-MM": percent }
  source      text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, id)
);
CREATE INDEX IF NOT EXISTS wf_alloc_org_person  ON wf_allocations (org_id, person_id);
CREATE INDEX IF NOT EXISTS wf_alloc_org_project ON wf_allocations (org_id, project_id);

-- Resource requests: outstanding demand awaiting a fill. "ask" is a per-month
-- percentage map so a request can taper across the months it spans.
CREATE TABLE IF NOT EXISTS wf_requests (
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  id          text NOT NULL,
  project_id  text NOT NULL,
  discipline  text NOT NULL DEFAULT 'SW',
  ask         jsonb NOT NULL DEFAULT '{}'::jsonb,  -- { "YYYY-MM": percent }
  seniority   int NOT NULL DEFAULT 2,
  need        text NOT NULL DEFAULT '',             -- "YYYY-MM" first month needed
  note        text NOT NULL DEFAULT '',
  status      text NOT NULL DEFAULT 'Open',         -- Open | Declined
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, id)
);
CREATE INDEX IF NOT EXISTS wf_requests_org_status ON wf_requests (org_id, status);

-- Baselines: the imported plan (e.g. from Microsoft Project) as planned hours
-- per project per month. One row per project.
CREATE TABLE IF NOT EXISTS wf_baselines (
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id  text NOT NULL,
  source      text NOT NULL DEFAULT '',
  planned     jsonb NOT NULL DEFAULT '{}'::jsonb,  -- { "YYYY-MM": plannedHours }
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, project_id)
);

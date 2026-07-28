-- AI Studio — Agent Builder (020)
-- Org-scoped, no-code agents that users compose in the AI Studio. An agent is a
-- graph of nodes (data sources, if/else conditions, external web queries, AI
-- decision points, human-in-the-loop assignments and outputs). Every run is
-- fully audited in agent_runs; assignments the agent hands to people land in
-- agent_inbox (the human-in-the-loop queue). All idempotent so redeploy.sh can
-- re-apply safely.

-- Agent definitions. "graph" holds { nodes:[...], edges:[...] } exactly as the
-- visual builder saves it. "schedule" is a coarse cadence label the cron runner
-- honours ('manual' means run-on-demand only).
CREATE TABLE IF NOT EXISTS agents (
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  id           text NOT NULL,                       -- per-org id, e.g. AGT-a1b2c3
  name         text NOT NULL DEFAULT 'Untitled agent',
  description  text NOT NULL DEFAULT '',
  graph        jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
  schedule     text NOT NULL DEFAULT 'manual',      -- manual | hourly | daily | weekly
  status       text NOT NULL DEFAULT 'draft',       -- draft | active | paused
  created_by   text NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  last_run_at  timestamptz,
  PRIMARY KEY (org_id, id)
);
CREATE INDEX IF NOT EXISTS agents_org_status ON agents (org_id, status);

-- One row per execution. "log" is the ordered list of step results the audit
-- view expands. A run parked on a human decision is status='needs_input' and is
-- resumed when the linked inbox item is resolved.
CREATE TABLE IF NOT EXISTS agent_runs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id     text NOT NULL,
  status       text NOT NULL DEFAULT 'running',     -- running | success | failed | stopped | needs_input
  trigger      text NOT NULL DEFAULT 'manual',      -- manual | scheduled
  summary      text NOT NULL DEFAULT '',
  log          jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{ node, type, status, detail, at }]
  started_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz,
  created_by   text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS agent_runs_org_agent ON agent_runs (org_id, agent_id, started_at DESC);
CREATE INDEX IF NOT EXISTS agent_runs_org_status ON agent_runs (org_id, status);

-- Human-in-the-loop queue. The agent assigns an activity, blocker, approval or
-- review to a person; they resolve it and (for approvals) their decision can
-- resume the parked run.
CREATE TABLE IF NOT EXISTS agent_inbox (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id     text NOT NULL,
  run_id       uuid REFERENCES agent_runs(id) ON DELETE CASCADE,
  assignee     text NOT NULL DEFAULT '',            -- user email (or name) the item is for
  kind         text NOT NULL DEFAULT 'action',      -- action | blocker | approval | review
  title        text NOT NULL DEFAULT '',
  detail       text NOT NULL DEFAULT '',
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  status       text NOT NULL DEFAULT 'open',         -- open | done | dismissed
  decision     text NOT NULL DEFAULT '',            -- for approvals: approve | reject | free text
  created_at   timestamptz NOT NULL DEFAULT now(),
  resolved_at  timestamptz,
  resolved_by  text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS agent_inbox_org_status ON agent_inbox (org_id, status);
CREATE INDEX IF NOT EXISTS agent_inbox_org_assignee ON agent_inbox (org_id, assignee, status);

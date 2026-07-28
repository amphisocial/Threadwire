# Threadwire — Operational Intelligence for Engineering & Manufacturing

A multi-tenant platform packaged as **three products that share one operational
thread**. Buy the whole platform for one connected view, or license any single
product on its own:

1. **Operational Intelligence** (Delivery Tracker) — blocker-aware delivery
   calendar, committed-vs-at-risk revenue forecast, and the digital thread
   (work orders, BOM, ECO, POs).
2. **Workforce Intelligence** — engineering-resource allocation and capacity:
   allocation vs plan by project, per-person utilisation and spare capacity,
   resource requests, and imports for people (CSV), projects (CSV) and
   Microsoft Project baselines (MSPDI XML). See `frontend/src/workforce/`.
3. **Requirements Intelligence** — AI-drafted parent/child requirement trees,
   coverage, conflicts and trace to tests, design and change.

Every product ships with sample data and a page-aware AI assistant for
contextual **What-If** analysis.

### Workforce Intelligence (new module)

- `frontend/src/workforce/data.js` — deterministic sample-data generator,
  CSV + Microsoft Project (MSPDI) XML parsers, and the roll-up math.
- `frontend/src/workforce/WorkforceIntelligence.jsx` — the module UI
  (Portfolio · Projects · People · Requests · Data & Admin), built on
  Threadwire's design tokens.
- **Persistence.** When a visitor is signed in, the module reads and writes the
  organisation's dataset server-side, so CSV imports and manually created
  people (with engineering roles) and projects (with required resources per
  discipline) survive reloads and are shared across the org. Org admins write;
  other members read. Public/anonymous visitors fall back to a local in-browser
  session, and the **Load sample demo data** option is always a local preview
  that is never persisted.
  - Backend: `backend/app/workforce.py` — `GET/PUT /api/workforce/data`,
    `POST /api/workforce/clear` (member read, org-admin write), wired in
    `main.py`.
  - Schema: `db/migrations/016_workforce.sql` (`wf_people`, `wf_projects` with a
    per-discipline `required` map, `wf_allocations`, `wf_requests`,
    `wf_baselines`), applied idempotently by `redeploy.sh`.
  - The plan/budget track a project is measured against is derived from its
    `required` resources per discipline (or an imported Microsoft Project
    baseline when present).
  - Import templates live in `samples/workforce/`.
- The module publishes a live snapshot to `window.__twWorkforceCtx`, which the
  docked assistant appends to its prompt on the Workforce page so What-If
  questions reason over real numbers.

### AI Studio — Agent Builder (new module)

A no-code agent builder that lives in the top **AI Studio** workspace (next to
Operations and Ontology). Users compose an agent as a visual graph and run it
against their own data.

- `frontend/src/agents/AgentStudio.jsx` — the module UI: a draggable node-graph
  editor (drag from a step's right dot to another step's left dot to wire them),
  a **Your data** palette that lists the org's uploaded files, created entities
  and operational tables, a per-step config drawer, a **Runs** audit view and an
  **Inbox** for human-in-the-loop items. Built on Threadwire's design tokens.
- Step types: **Trigger**, **Data source** (uploaded file · entity · table ·
  web URL), **If/else** condition (branches on a value), **Web query** (pulls
  external data to merge), **AI decision** (server-side model call), **Assign to
  person** (human-in-the-loop — assigns an approval/action/blocker/review to a
  user; an approval can pause the run), and **Output**.
- **Backend:** `backend/app/agents.py` — `/api/agents` CRUD, `/catalog` (data +
  people), `/{id}/run` (executes the graph), `/{id}/runs` and `/runs/{run_id}`
  (audit), `/runs/{run_id}/stop`, `/{id}/status` (activate/pause scheduling), and
  `/inbox/items` + `/inbox/{id}/resolve`. Wired in `main.py` like the other
  routers. Web queries are restricted to public http(s) targets (private/loopback
  and cloud-metadata addresses are refused).
- **Schema:** `db/migrations/020_agent_studio.sql` (`agents`, `agent_runs`,
  `agent_inbox`), applied idempotently by `redeploy.sh`.
- **Scheduling (optional cron):** `python -m app.agents` runs every *active*
  agent whose cadence is due (hourly/daily/weekly). Point an OS cron/timer at it;
  agents left on **Manual** only run from **Run once**.

This repo turns the prototype into a deployable app for a single EC2 box
(replaces the `threadwire.ai` root), with self-hosted auth + Postgres and a
FastAPI backend that proxies AI calls server-side.

```
threadwire-app/
├── db/
│   └── schema.sql                 # tenants, users, sessions, encrypted connectors (+ optional RLS)
├── backend/                       # FastAPI
│   ├── requirements.txt
│   ├── .env.example               # copy to .env on the server (never commit the real one)
│   └── app/
│       ├── config.py              # env config
│       ├── db.py                  # asyncpg pool
│       ├── crypto.py              # AES-256-GCM for connector secrets
│       ├── security.py            # argon2 password hashing
│       ├── ai.py                  # Anthropic proxy (server-side key)
│       └── main.py                # auth + tenants + connectors + /api/ai/chat
├── frontend/                      # Vite + React (the app UI)
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx               # auth gate + sign-out
│       ├── ThreadWire.jsx         # the app (AI calls now hit /api/ai/chat)
│       ├── auth/Login.jsx         # login / company registration
│       └── lib/api.js
└── deploy/
    ├── nginx-threadwire.conf      # serves dist at root, proxies /api
    ├── threadwire-api.service     # systemd unit for uvicorn
    └── deploy.md                  # step-by-step for the t2.small  ← START HERE
```

## Architecture on one box

```
            https://threadwire.ai
                     │
                   Nginx ──────────── /            → static React build (dist/)
                     │                /api/*        → 127.0.0.1:8000 (FastAPI/uvicorn)
                     │
                FastAPI ──────────── /api/ai/chat  → Anthropic (server-side key)
                     │                auth, tenants, connector secrets
                     │
                 Postgres (localhost) — orgs, users, sessions, encrypted connectors
```

## Quick start

Local dev: run Postgres + `uvicorn app.main:app --reload` (port 8000), then
`cd frontend && npm install && npm run dev` (Vite proxies `/api` to 8000).

Production on the t2.small: follow **`deploy/deploy.md`**.

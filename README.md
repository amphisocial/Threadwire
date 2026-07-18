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
- It runs entirely in the browser session (no new backend endpoints or DB
  migrations). Use **Load sample demo data** or the **Data & Admin** tab to
  import your own. Import templates live in `samples/workforce/`.
- The module publishes a live snapshot to `window.__twWorkforceCtx`, which the
  docked assistant appends to its prompt on the Workforce page so What-If
  questions reason over real numbers.

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

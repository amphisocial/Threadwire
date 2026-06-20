# ThreadWire — AI for Manufacturing

A multi-tenant manufacturing platform: requirements (Jama/DOORS), contracts,
asset lifecycle + SPC, and a digital thread (work orders, BOM, ECO, POs), each
with a subject-aware AI assistant.

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

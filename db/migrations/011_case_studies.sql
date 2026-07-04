-- Migration 009: Case Studies / whitepapers library.
--
-- Site-level content (NOT tenant data): whitepapers and case studies that the
-- platform owner publishes on the public /case-studies page. Only users with
-- role = 'superadmin' (the ThreadWire site admin — distinct from customers'
-- org_admin) can create, edit or delete rows; everyone can read published ones.
--
-- Run once:  psql "$DATABASE_URL" -f db/migrations/009_case_studies.sql

CREATE TABLE IF NOT EXISTS case_studies (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title         text NOT NULL,
    summary       text NOT NULL DEFAULT '',
    filename      text NOT NULL,                       -- original upload name
    content_type  text NOT NULL,                       -- application/pdf, docx MIME, ...
    file_kind     text NOT NULL DEFAULT 'pdf'
                      CHECK (file_kind IN ('pdf','docx','doc')),
    storage_key   text NOT NULL,                       -- key inside storage.py backend
    storage       text NOT NULL DEFAULT 'local',       -- 's3' | 'local' (informational)
    size_bytes    bigint NOT NULL DEFAULT 0,
    html_content  text,                                -- extracted HTML (docx) for in-browser reading
    published     boolean NOT NULL DEFAULT true,       -- false = draft, admin-only
    published_at  timestamptz NOT NULL DEFAULT now(),  -- drives the chronological ordering
    uploaded_by   uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS case_studies_published_idx
    ON case_studies (published, published_at DESC);

-- ---------------------------------------------------------------------------
-- Site admin. The role already exists in users ('superadmin'); to promote an
-- account after it registers through the normal UI, either run the helper
-- script (backend/scripts/make_site_admin.py) or this one-liner:
--
--   UPDATE users SET role = 'superadmin' WHERE lower(email) = lower('you@threadwire.ai');
-- ---------------------------------------------------------------------------

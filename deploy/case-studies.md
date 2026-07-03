# Case Studies / whitepapers — deploy notes

New public page at **`/case-studies`**: a chronological library of PDF and Word
whitepapers with an in-browser reader. Managed entirely from the UI by the
**site admin** (`users.role = 'superadmin'`, the platform owner). This role is
separate from `org_admin`, which is a customer company's admin and has no
access to this feature.

## 1. Migrate the database

```bash
psql "$DATABASE_URL" -f db/migrations/009_case_studies.sql
```

## 2. Install the new backend dependency

`mammoth` converts uploaded .docx files to HTML at upload time so visitors can
read them in the browser (PDFs use the browser's own viewer).

```bash
cd /opt/threadwire/backend
source .venv/bin/activate   # or however the venv is activated on the box
pip install -r requirements.txt
sudo systemctl restart threadwire-api
```

## 3. Create the site admin

Option A — promote an account that already registered through the UI:

```bash
cd /opt/threadwire/backend
set -a; . .env; set +a          # so DATABASE_URL is set
python scripts/make_site_admin.py you@threadwire.ai
```

Option B — create it from scratch (an internal "ThreadWire (Platform)" org is
created automatically, since every user belongs to an organization):

```bash
python scripts/make_site_admin.py admin@threadwire.ai \
    --create --name "Site Admin" --password 'a-strong-password'
```

The site admin then signs in normally at `/` and opens `/case-studies` — they
will see the SITE ADMIN badge, a "New case study" button, and per-item
Edit / Publish / Unpublish / Delete controls. Everyone else (including
customers' org admins) sees the read-only library with published items only.

## 4. Rebuild the frontend

```bash
cd frontend && npm install && npm run build
# then sync dist/ to /var/www/threadwire/dist as usual (redeploy.sh)
```

No nginx changes needed: the existing SPA fallback (`try_files … /index.html`)
already serves `/case-studies`, and `/api/case-studies*` rides the existing
`/api/` proxy.

## Where the files live

Uploads go through `backend/app/storage.py`, same as org documents:
S3 when `THREADWIRE_S3_BUCKET` is set, otherwise the local directory
(`THREADWIRE_UPLOAD_DIR`, default `/opt/threadwire/backend/uploads`), under
the site-level prefix `site/case_studies/<uuid>/<filename>` — kept separate
from tenant data (`org_<uuid>/…`). Max upload size 30 MB; accepted types
.pdf, .docx, .doc.

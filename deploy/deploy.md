# Deploying ThreadWire to your t2.small (replaces threadwire.ai root)

One box runs everything: **Nginx → static React build + FastAPI (`/api`) → local Postgres.**
You already have Nginx + a cert for `threadwire.ai`; we reuse both.

> t2.small = 1 vCPU / 2 GB RAM. The two memory-sensitive moves are baked in below:
> add swap, and **build the frontend off the box** so a Vite build never OOMs live traffic.

---

## 0. One-time: back up the current site

```bash
sudo cp -r /var/www/threadwire /var/www/threadwire.bak.$(date +%F) 2>/dev/null || true
sudo cp /etc/nginx/sites-available/threadwire /root/threadwire.nginx.bak 2>/dev/null || true
```

## 1. Swap (protects against OOM on 2 GB)

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 2. Postgres (local only)

```bash
sudo apt update && sudo apt install -y postgresql python3-venv python3-pip
sudo -u postgres psql <<'SQL'
CREATE USER threadwire WITH PASSWORD 'CHANGE_ME_STRONG';
CREATE DATABASE threadwire OWNER threadwire;
SQL
```

Light tuning for 2 GB — edit `/etc/postgresql/*/main/postgresql.conf`:

```
shared_buffers = 256MB
effective_cache_size = 768MB
max_connections = 20
```

```bash
sudo systemctl restart postgresql
```

Load the schema:

```bash
psql "postgresql://threadwire:CHANGE_ME_STRONG@localhost:5432/threadwire" -f db/schema.sql
```

## 3. Backend (FastAPI under systemd)

```bash
sudo mkdir -p /opt/threadwire && sudo chown -R $USER /opt/threadwire
cp -r backend /opt/threadwire/
cd /opt/threadwire/backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

cp .env.example .env
# Generate the secret-encryption key:
python3 -c "import secrets,base64;print('TW_SECRET_KEY=' + base64.b64encode(secrets.token_bytes(32)).decode())"
nano .env        # paste TW_SECRET_KEY, set DATABASE_URL, ANTHROPIC_API_KEY, COOKIE_SECURE=true
```

Install + start the service (run from the repo root, where `deploy/` lives):

```bash
sudo cp deploy/threadwire-api.service /etc/systemd/system/
sudo chown -R www-data:www-data /opt/threadwire
sudo systemctl daemon-reload
sudo systemctl enable --now threadwire-api
curl -s localhost:8000/api/health     # -> {"ok":true}
```

## 4. Frontend (BUILD LOCALLY, then ship the dist)

On your **laptop** (not the t2.small):

```bash
cd frontend
npm install
npm run build          # produces frontend/dist/
rsync -avz dist/ ubuntu@threadwire.ai:/tmp/twdist/
```

On the **server**:

```bash
sudo mkdir -p /var/www/threadwire/dist
sudo rsync -a --delete /tmp/twdist/ /var/www/threadwire/dist/
sudo chown -R www-data:www-data /var/www/threadwire
```

*(If you must build on the box, swap from step 1 makes it possible: `NODE_OPTIONS=--max-old-space-size=1024 npm run build` — but local builds are safer.)*

## 5. Nginx (point the root at the app)

```bash
sudo cp deploy/nginx-threadwire.conf /etc/nginx/sites-available/threadwire
sudo ln -sf /etc/nginx/sites-available/threadwire /etc/nginx/sites-enabled/threadwire
sudo nginx -t && sudo systemctl reload nginx
```

Your existing `threadwire.ai` cert is referenced as-is. Visit **https://threadwire.ai** — register a company, sign in, and the assistants now run through your server.

---

## Updating later

- **Frontend:** rebuild locally → `rsync --delete` to `/var/www/threadwire/dist/`.
- **Backend:** `git pull` (or recopy) → `sudo systemctl restart threadwire-api`.

## Security checklist

- `.env` stays on the server, `chmod 600`, never committed. `ANTHROPIC_API_KEY` and `TW_SECRET_KEY` live there only.
- Connector secrets (Jama/Jira/DOORS/Jamf/Intune) are AES-256-GCM encrypted before they touch Postgres and are never returned to the browser.
- `COOKIE_SECURE=true` so the session cookie is HTTPS-only and `HttpOnly`.
- Postgres listens on `localhost` only; do not open 5432 in the security group.
- Back up daily: `pg_dump` to a file (and ideally to S3).

## What's wired vs. next

Working end to end: registration/login, multi-tenant orgs keyed by company, the per-page AI assistants (via the backend proxy), and the encrypted connector-credential **API** (`GET/PUT/DELETE /api/connectors/{type}`).
Next step to fully close the loop: point the in-app "Connect" forms (Jama/DOORS/Jira/Jamf/Intune) at `PUT /api/connectors/{type}`, and have the AI endpoints load each tenant's real data through those stored credentials instead of the bundled sample data.

#!/usr/bin/env bash
# One-shot redeploy: run from the unzipped project dir, e.g.  bash ~/threadwire-app/redeploy.sh
set -euo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)"
APP=/opt/threadwire
ENVFILE="$APP/backend/.env"

echo "== backend =="
sudo cp -r "$SRC/backend/app/." "$APP/backend/app/"
sudo cp "$SRC/backend/requirements.txt" "$APP/backend/"
sudo chown -R ec2-user:ec2-user "$APP/backend"
"$APP/backend/.venv/bin/pip" install -q -r "$APP/backend/requirements.txt"

echo "== migrations (idempotent) =="
DBURL="$(grep -E '^DATABASE_URL=' "$ENVFILE" | cut -d= -f2-)"
for m in "$SRC"/db/migrations/*.sql; do
  echo "  applying $(basename "$m")"
  psql "$DBURL" -f "$m" >/dev/null
done

echo "== restart api =="
sudo systemctl restart threadwire-api
sleep 2
echo -n "  health: "; curl -s localhost:8000/api/health; echo

echo "== frontend build =="
sudo cp -r "$SRC/frontend/src/." "$APP/frontend/src/"
sudo chown -R ec2-user:ec2-user "$APP/frontend"
cd "$APP/frontend"
export NODE_OPTIONS=--max-old-space-size=900
npm run build
sudo cp -r dist/* /var/www/threadwire/dist/
sudo chown -R nginx:nginx /var/www/threadwire

echo "== done — hard-refresh https://threadwire.ai =="

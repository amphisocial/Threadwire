#!/usr/bin/env bash
# Redeploy for the monorepo layout (apps/{home,delivery,workforce,requirements}).
# Backend unchanged (systemd threadwire-api). Front-ends are independent app
# folders sharing install via npm workspaces; each is served by PM2.
#
#   bash ~/threadwire-app/redeploy-multi.sh            # backend + all 4 apps
#   bash ~/threadwire-app/redeploy-multi.sh workforce  # ONE product only
set -euo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)"
APP=/opt/threadwire
ENVFILE="$APP/backend/.env"
ONLY="${1:-all}"   # all | home | delivery | workforce | requirements

if [ "$ONLY" = "all" ]; then
  echo "== backend =="
  sudo cp -r "$SRC/backend/app/." "$APP/backend/app/"
  sudo cp "$SRC/backend/requirements.txt" "$APP/backend/"
  sudo chown -R ec2-user:ec2-user "$APP/backend"
  "$APP/backend/.venv/bin/pip" install -q -r "$APP/backend/requirements.txt"

  echo "== migrations (idempotent) =="
  DBURL="$(grep -E '^DATABASE_URL=' "$ENVFILE" | cut -d= -f2-)"
  for m in "$SRC"/db/migrations/*.sql; do
    echo "  applying $(basename "$m")"; psql "$DBURL" -f "$m" >/dev/null
  done

  echo "== restart api =="
  sudo systemctl restart threadwire-api
  sleep 2; echo -n "  health: "; curl -s localhost:8000/api/health; echo
fi

echo "== frontend source (apps + root workspace) =="
sudo cp -r "$SRC/apps/." "$APP/apps/"
sudo cp "$SRC/package.json" "$APP/package.json"
sudo cp "$SRC/ecosystem.config.js" "$APP/ecosystem.config.js"
sudo chown -R ec2-user:ec2-user "$APP/apps" "$APP/package.json" "$APP/ecosystem.config.js"

cd "$APP"
export NODE_OPTIONS=--max-old-space-size=900
npm install --no-audit --no-fund   # workspace-aware; hoists shared deps

if [ "$ONLY" = "all" ]; then
  npm run build --workspaces
  pm2 restart tw-home tw-delivery tw-workforce tw-requirements
else
  npm run build -w "@threadwire/$ONLY"
  pm2 restart "tw-$ONLY"
fi

pm2 save
echo "== done — hard-refresh the affected host(s) =="

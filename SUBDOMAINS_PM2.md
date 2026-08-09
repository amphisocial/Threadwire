# Threadwire — monorepo: 4 app folders, 4 PM2 services, 4 subdomains

One repo, one `main` branch. The front-end is split into four **independent app
folders** under `apps/`, each a full copy of the code locked to its product and
tied together by **npm workspaces** (one install at the root). Backend is
untouched — still systemd (`threadwire-api`) at `127.0.0.1:8000`; every
subdomain proxies `/api/` to it.

## Layout
```
/opt/threadwire
├── package.json            # npm workspaces: ["apps/*"]
├── ecosystem.config.js     # the 4 PM2 services
├── redeploy-multi.sh       # build/restart all, or one product
├── apps/
│   ├── home/               # marketing site  → threadwire.ai        (:4000)
│   ├── delivery/           # Delivery app    → delivery.threadwire.ai     (:4001)
│   ├── workforce/          # Workforce app   → workforce.threadwire.ai    (:4002)
│   └── requirements/       # Requirements app→ requirements.threadwire.ai (:4003)
├── backend/                # unchanged (FastAPI on systemd)
└── db/                     # unchanged
```
Each `apps/<name>/` has its own `src/` (full copy), `package.json`,
`vite.config.js`, `index.html`, and a committed `.env` with
`VITE_APP_TARGET=<name>` that locks the build to that product. `home` is left in
marketing mode and still resolves products at runtime.

| App          | PM2 name          | Port | Host                          |
|--------------|-------------------|------|-------------------------------|
| home         | `tw-home`         | 4000 | threadwire.ai / www           |
| delivery     | `tw-delivery`     | 4001 | delivery.threadwire.ai        |
| workforce    | `tw-workforce`    | 4002 | workforce.threadwire.ai       |
| requirements | `tw-requirements` | 4003 | requirements.threadwire.ai    |

---

## First-time migration on the box

1. **Install PM2 + serve** (once):
   ```bash
   sudo npm i -g pm2 serve
   ```

2. **Bring the new layout onto the server.** Pull `main` (with `apps/`, root
   `package.json`, `ecosystem.config.js`) into `/opt/threadwire`, or let
   `redeploy-multi.sh` copy it. The old `frontend/` folder is no longer used and
   can be removed once you've confirmed the new services work.

3. **Install workspaces + build all four:**
   ```bash
   cd /opt/threadwire
   export NODE_OPTIONS=--max-old-space-size=900
   npm install                 # one install for all apps (workspaces)
   npm run build --workspaces   # produces apps/*/dist
   ```

4. **DNS** — four A records to the same EC2 IP as `threadwire.ai`:
   ```
   delivery       A   <ec2-ip>
   workforce      A   <ec2-ip>
   requirements   A   <ec2-ip>
   www            A   <ec2-ip>   # if missing
   ```
   Verify: `dig delivery.threadwire.ai +short` returns the IP.

5. **Start PM2 services:**
   ```bash
   pm2 start /opt/threadwire/ecosystem.config.js
   pm2 save
   sudo env PATH=$PATH pm2 startup systemd -u ec2-user --hp /home/ec2-user
   # run the exact line pm2 prints so services survive reboot
   ```
   Check: `pm2 ls` shows four `tw-*` online; `curl -s localhost:4001 | head` returns HTML.

6. **nginx** — one server block per host (replace the old static block). Each
   proxies `/` to its port and `/api/` to the backend:
   ```nginx
   server {
     listen 80; server_name threadwire.ai www.threadwire.ai;
     location /api/ { proxy_pass http://127.0.0.1:8000; proxy_set_header Host $host; }
     location /     { proxy_pass http://127.0.0.1:4000; proxy_set_header Host $host; }
   }
   server {
     listen 80; server_name delivery.threadwire.ai;
     location /api/ { proxy_pass http://127.0.0.1:8000; proxy_set_header Host $host; }
     location /     { proxy_pass http://127.0.0.1:4001; proxy_set_header Host $host; }
   }
   server {
     listen 80; server_name workforce.threadwire.ai;
     location /api/ { proxy_pass http://127.0.0.1:8000; proxy_set_header Host $host; }
     location /     { proxy_pass http://127.0.0.1:4002; proxy_set_header Host $host; }
   }
   server {
     listen 80; server_name requirements.threadwire.ai;
     location /api/ { proxy_pass http://127.0.0.1:8000; proxy_set_header Host $host; }
     location /     { proxy_pass http://127.0.0.1:4003; proxy_set_header Host $host; }
   }
   ```
   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```

7. **TLS** for the new hosts:
   ```bash
   sudo certbot --nginx \
     -d threadwire.ai -d www.threadwire.ai \
     -d delivery.threadwire.ai \
     -d workforce.threadwire.ai \
     -d requirements.threadwire.ai
   ```
   (Install if needed: `sudo dnf install -y certbot python3-certbot-nginx`.)

---

## Day-to-day deploys

```bash
bash ~/threadwire-app/redeploy-multi.sh              # backend + all 4 apps
bash ~/threadwire-app/redeploy-multi.sh workforce    # rebuild + restart ONLY Workforce
```
A single-product deploy builds only that app's `dist` and restarts only its PM2
service; the other three keep running.

## Notes

- **Fully independent source (your choice):** each product folder has its own
  full copy of the code. A shared fix (nav, contact form, styles, ThreadWire.jsx)
  must be applied in each `apps/<name>/src` you want it in — that's the isolation
  tradeoff. Workspaces only share the *install*, not the source.
- **Committed `.env`:** the per-app `.env` (build target) is committed on purpose;
  only `backend/.env` is gitignored.
- **Old single-app files:** `frontend/` and the original `redeploy.sh` still work
  if you ever want the single-build layout back; remove `frontend/` once you've
  cut over.
- **Entitlements** still gate signed-in tabs per product (`user.products` /
  `user.<product>_enabled`).

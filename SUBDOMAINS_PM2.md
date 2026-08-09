# Threadwire — monorepo: 4 app folders, 4 PM2 services, 4 subdomains

One repo, one `main` branch. The front-end is split into four **independent app
folders** under `apps/`, each a full copy of the code locked to its product and
tied together by **npm workspaces** (one install at the root). Backend is
untouched — still systemd (`threadwire-api`) at `127.0.0.1:8000`; every
subdomain proxies `/api/` to it.

**DNS model (same as athenabot.ai):** point a wildcard `*.threadwire.ai` A record
at the server once. After that, adding a product/subdomain is only an nginx
server block + a certbot line — no new DNS record each time.

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

1. **Install PM2** (once — no `serve` package needed, a bundled static server handles it):
   ```bash
   sudo npm i -g pm2
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

4. **DNS — one wildcard record (same as athenabot.ai).** Instead of adding a
   record per subdomain, point a wildcard at the same EC2 IP as `threadwire.ai`.
   Then any new subdomain resolves automatically and you only ever touch nginx +
   certbot — exactly like `*.athenabot.ai`.
   ```
   *      A   <ec2-ip>     # covers delivery/workforce/requirements + anything future
   @      A   <ec2-ip>     # apex threadwire.ai (if not already set)
   ```
   If you'd rather not use a wildcard, individual records work too:
   ```
   delivery A <ec2-ip>  ·  workforce A <ec2-ip>  ·  requirements A <ec2-ip>  ·  www A <ec2-ip>
   ```
   Verify: `dig delivery.threadwire.ai +short` returns the IP. With a wildcard
   already in place, this step is a no-op and you go straight to nginx + certbot.

5. **Start PM2 services:**
   ```bash
   pm2 start /opt/threadwire/ecosystem.config.js
   pm2 save
   sudo env PATH=$PATH pm2 startup systemd -u ec2-user --hp /home/ec2-user
   # run the exact line pm2 prints so services survive reboot
   ```
   Check: `pm2 ls` shows four `tw-*` online; `curl -s localhost:4001 | head` returns HTML.

   > First run must be `pm2 start` (not `restart`). `redeploy-multi.sh` uses
   > `pm2 startOrRestart`, which handles both, so later deploys just work.

6. **nginx** — use the ready file `deploy/nginx-threadwire.conf` (it matches your
   existing cert path and `/api/` proxy style). It sets apex → `:4000` and each
   subdomain → its port; the three subdomains start HTTP-only so nginx passes
   `-t` before their certs exist.
   ```bash
   sudo cp /opt/threadwire/deploy/nginx-threadwire.conf /etc/nginx/sites-available/threadwire
   # (ensure it's enabled: on Amazon Linux without sites-enabled, copy to
   #  /etc/nginx/conf.d/threadwire.conf instead)
   sudo nginx -t && sudo systemctl reload nginx
   ```

7. **TLS — certbot per subdomain (same as athenabot.ai).** Even with a wildcard
   A record, you don't need a wildcard cert: certbot's nginx plugin validates
   each host over HTTP-01 against the server block, so just list the hosts. Do
   them all at once, or add one at a time as you spin up each product:
   ```bash
   sudo certbot --nginx \
     -d threadwire.ai -d www.threadwire.ai \
     -d delivery.threadwire.ai \
     -d workforce.threadwire.ai \
     -d requirements.threadwire.ai
   ```
   Adding one later is the same one-liner you used before — e.g. a new subdomain:
   ```bash
   sudo certbot --nginx -d newthing.threadwire.ai
   ```
   (Install if needed: `sudo dnf install -y certbot python3-certbot-nginx`.)
   The wildcard A record means no DNS change is required to add a subdomain —
   only the nginx server block + this certbot line, exactly your athenabot flow.

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

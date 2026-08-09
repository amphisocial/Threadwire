// PM2 — four independent Threadwire front-end services (monorepo layout).
// Each app is its own folder under apps/ with its own dist, served by the
// bundled zero-dependency static-server.js (no global `serve` needed).
// Backend stays on systemd (threadwire-api :8000); nginx maps each subdomain
// to a port below.
//
//   pm2 start /opt/threadwire/ecosystem.config.js
//   pm2 save
//
// Restart one product independently:
//   pm2 restart tw-workforce
module.exports = {
  apps: [
    { name: "tw-home",         script: "static-server.js", args: "apps/home/dist 4000",         cwd: "/opt/threadwire", autorestart: true },
    { name: "tw-delivery",     script: "static-server.js", args: "apps/delivery/dist 4001",     cwd: "/opt/threadwire", autorestart: true },
    { name: "tw-workforce",    script: "static-server.js", args: "apps/workforce/dist 4002",    cwd: "/opt/threadwire", autorestart: true },
    { name: "tw-requirements", script: "static-server.js", args: "apps/requirements/dist 4003", cwd: "/opt/threadwire", autorestart: true },
  ],
};

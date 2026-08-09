// PM2 — four independent Threadwire front-end services (monorepo layout).
// Each app is its own folder under apps/ with its own dist. Backend stays on
// systemd (threadwire-api :8000); nginx maps each subdomain to a port below.
//
//   npm i -g pm2 serve
//   pm2 start /opt/threadwire/ecosystem.config.js
//   pm2 save
//
// Restart one product independently:
//   pm2 restart tw-workforce
module.exports = {
  apps: [
    { name: "tw-home",         script: "serve", args: "-s apps/home/dist -l 4000",         cwd: "/opt/threadwire", autorestart: true },
    { name: "tw-delivery",     script: "serve", args: "-s apps/delivery/dist -l 4001",     cwd: "/opt/threadwire", autorestart: true },
    { name: "tw-workforce",    script: "serve", args: "-s apps/workforce/dist -l 4002",    cwd: "/opt/threadwire", autorestart: true },
    { name: "tw-requirements", script: "serve", args: "-s apps/requirements/dist -l 4003", cwd: "/opt/threadwire", autorestart: true },
  ],
};

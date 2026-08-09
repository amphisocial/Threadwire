#!/usr/bin/env node
/* Minimal, zero-dependency static file server with SPA fallback.
   Replaces the `serve` package so there's no global dependency or CLI-flag
   drift between environments. PM2 runs one instance per product.

   Usage:  node static-server.js <dist-dir> <port>
   Example: node static-server.js apps/delivery/dist 4001
   (paths are resolved against the process working directory / PM2 `cwd`.) */
const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(process.argv[2] || process.env.SERVE_PATH || "dist");
const port = parseInt(process.argv[3] || process.env.SERVE_PORT || "3000", 10);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
};

function send(res, status, body, headers) {
  res.writeHead(status, headers || {});
  res.end(body);
}

function serveFile(res, filePath, fallback) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (fallback) return serveFile(res, path.join(root, "index.html"), null);
      return send(res, 404, "Not found");
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = TYPES[ext] || "application/octet-stream";
    // hashed Vite assets are immutable; never cache index.html
    const cache = ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable";
    send(res, 200, data, { "Content-Type": type, "Cache-Control": cache });
  });
}

const server = http.createServer((req, res) => {
  try {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    let filePath = path.normalize(path.join(root, urlPath));
    if (!filePath.startsWith(root)) return send(res, 403, "Forbidden"); // no traversal

    fs.stat(filePath, (err, stat) => {
      if (!err && stat.isDirectory()) filePath = path.join(filePath, "index.html");
      // If the path has no file extension and isn't a real file, fall back to
      // index.html so client-side routes (e.g. /case-studies) resolve.
      const spaFallback = !path.extname(filePath);
      serveFile(res, filePath, spaFallback);
    });
  } catch (e) {
    send(res, 500, "Server error");
  }
});

server.listen(port, () => {
  console.log(`static-server: serving ${root} on :${port}`);
});

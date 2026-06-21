// Thin client for the backend API. Same-origin in production; the Vite dev
// server proxies /api to the FastAPI backend.

async function jsonOrThrow(res) {
  if (res.ok) return res.json();
  let detail = "Request failed";
  try { detail = (await res.json()).detail || detail; } catch { /* ignore */ }
  throw new Error(detail);
}

const opts = (method, body) => ({
  method,
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  ...(body ? { body: JSON.stringify(body) } : {}),
});

export const getMe = () => fetch("/api/me", { credentials: "include" }).then(jsonOrThrow);
export const login = (email, password) =>
  fetch("/api/auth/login", opts("POST", { email, password })).then(jsonOrThrow);
export const register = (payload) =>
  fetch("/api/auth/register", opts("POST", payload)).then(jsonOrThrow);
export const verifyMfa = (code) =>
  fetch("/api/auth/mfa/verify", opts("POST", { code })).then(jsonOrThrow);
export const logout = () => fetch("/api/auth/logout", opts("POST")).then(jsonOrThrow);
export const searchCompanies = (q) =>
  fetch("/api/companies/search?q=" + encodeURIComponent(q), { credentials: "include" })
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => []);

export const getCatalog = () => fetch("/api/connectors/catalog", { credentials: "include" }).then(jsonOrThrow);
export const getConnectors = () => fetch("/api/connectors", { credentials: "include" }).then(jsonOrThrow);
export const saveConnector = (type, payload) => fetch("/api/connectors/" + type, opts("PUT", payload)).then(jsonOrThrow);
export const deleteConnector = (type) => fetch("/api/connectors/" + type, opts("DELETE")).then(jsonOrThrow);
export const testConnector = (type) => fetch("/api/connectors/" + type + "/test", opts("POST")).then(jsonOrThrow);
export const listInvites = () => fetch("/api/invites", { credentials: "include" }).then(jsonOrThrow);
export const createInvite = (email) => fetch("/api/invites", opts("POST", { email })).then(jsonOrThrow);
export const revokeInvite = (id) => fetch("/api/invites/" + id, opts("DELETE")).then(jsonOrThrow);
export const lookupInvite = (token) => fetch("/api/invites/lookup?token=" + encodeURIComponent(token), { credentials: "include" }).then(jsonOrThrow);
export const acceptInvite = (payload) => fetch("/api/invites/accept", opts("POST", payload)).then(jsonOrThrow);
export const importEntities = () => fetch("/api/import/entities", { credentials: "include" }).then(jsonOrThrow);
export const importData = (entity, csv) => fetch("/api/import/" + entity, opts("POST", { csv })).then(jsonOrThrow);
export const listEvents = (limit = 20) => fetch("/api/events?limit=" + limit, { credentials: "include" }).then(jsonOrThrow);
export const sampleUrl = (entity) => "/api/import/sample/" + entity;

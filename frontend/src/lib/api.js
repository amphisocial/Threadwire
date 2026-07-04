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
export const billingCheckout = (plan) => fetch("/api/billing/checkout", opts("POST", { plan })).then(jsonOrThrow);
export const billingConfirm = (sid) => fetch("/api/billing/confirm?session_id=" + encodeURIComponent(sid), { credentials: "include" }).then(jsonOrThrow);
export const billingPortal = () => fetch("/api/billing/portal", opts("POST")).then(jsonOrThrow);
export const adminUsage = () => fetch("/api/admin/usage", { credentials: "include" }).then(jsonOrThrow);
export const updateMember = (id, body) => fetch("/api/admin/members/" + id, opts("PATCH", body)).then(jsonOrThrow);
export const importFromSource = (body) => fetch("/api/import/source", opts("POST", body)).then(jsonOrThrow);

// data sources + document store + compliance / traceability
export const listDataSources = () => fetch("/api/data_sources", { credentials: "include" }).then(jsonOrThrow);
export const createDataSource = (kind, name, config) => fetch("/api/data_sources", opts("POST", { kind, name, config })).then(jsonOrThrow);
export const syncDataSource = (id) => fetch("/api/data_sources/" + id + "/sync", opts("POST")).then(jsonOrThrow);
export const listDocuments = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return fetch("/api/documents" + (q ? "?" + q : ""), { credentials: "include" }).then(jsonOrThrow);
};
export const searchDocuments = (q) => fetch("/api/documents/search?q=" + encodeURIComponent(q), { credentials: "include" }).then(jsonOrThrow);
export const loadSampleDocs = () => fetch("/api/documents/load_samples", opts("POST")).then(jsonOrThrow);
export const docDownloadUrl = (id) => "/api/documents/" + id + "/download";
export const uploadDocument = (formData) => fetch("/api/documents/upload", { method: "POST", credentials: "include", body: formData }).then(jsonOrThrow);
export const getLots = () => fetch("/api/lots", { credentials: "include" }).then(jsonOrThrow);
export const traceLot = (lot) => fetch("/api/trace/lot/" + encodeURIComponent(lot), { credentials: "include" }).then(jsonOrThrow);
export const aiTraceLot = (lot) => fetch("/api/ai/trace/" + encodeURIComponent(lot), opts("POST")).then(jsonOrThrow);

// Delivery Desk — quotes
export const getQuotes = () => fetch("/api/quotes", { credentials: "include" }).then(jsonOrThrow);
export const convertQuote = (quoteNumber) => fetch("/api/quotes/" + encodeURIComponent(quoteNumber) + "/convert", opts("POST")).then(jsonOrThrow);

// org settings + sample datasets
export const updateSettings = (settings) => fetch("/api/admin/settings", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) }).then(jsonOrThrow);
export const loadSampleDataset = (industry) => fetch("/api/admin/load_sample_dataset", opts("POST", { industry })).then(jsonOrThrow);
export const sampleCsvUrl = (industry, entity) => "/api/admin/sample_dataset/" + industry + "/" + entity + ".csv";

// Case Studies (public read; site-admin CMS write)
export const listCaseStudies = () => fetch("/api/case-studies", { credentials: "include" }).then(jsonOrThrow);
export const getCaseStudy = (id) => fetch("/api/case-studies/" + id, { credentials: "include" }).then(jsonOrThrow);
export const caseStudyFileUrl = (id, download = false) => "/api/case-studies/" + id + "/file" + (download ? "?download=1" : "");
export const uploadCaseStudy = (formData) => fetch("/api/case-studies", { method: "POST", credentials: "include", body: formData }).then(jsonOrThrow);
export const updateCaseStudy = (id, body) => fetch("/api/case-studies/" + id, opts("PATCH", body)).then(jsonOrThrow);
export const deleteCaseStudy = (id) => fetch("/api/case-studies/" + id, opts("DELETE")).then(jsonOrThrow);

// Delivery-Risk Agent
export const runDeliveryAgent = () => fetch("/api/agent/scan_delivery_risk", opts("POST")).then(jsonOrThrow);
export const confirmBlocker = (id) => fetch("/api/blockers/" + id + "/confirm", opts("POST")).then(jsonOrThrow);
export const dismissBlocker = (id) => fetch("/api/blockers/" + id + "/dismiss", opts("POST")).then(jsonOrThrow);

import React, { useEffect, useState, useCallback } from "react";
import { AGENT_META, DEFAULT_PROMPTS, loadPrompts, savePrompt, isCustomized } from "../workbench/prompts.js";
import {
  listInvites, createInvite, revokeInvite,
  importEntities, importData, listEvents, sampleUrl,
  adminUsage, updateMember, billingCheckout, importFromSource,
  listDataSources, createDataSource, syncDataSource,
  listDocuments, uploadDocument, loadSampleDocs, docDownloadUrl,
  updateSettings, loadSampleDataset, sampleCsvUrl,
} from "../lib/api.js";

/* ---- design tokens (must match ThreadWire.jsx) ---- */
const C = {
  bg: "#F4F6FA", bg2: "#EEF2F7", panel: "#FFFFFF", panel2: "#F5F8FC",
  line: "#DCE3EC", line2: "#C6D2E0",
  ink: "#15222D", muted: "#47606F", faint: "#8093A0",
  amber: "#2A46C4", thread: "#3E6FE0", green: "#4dcb80",
  red: "#f26249", blue: "#6ab4ff",
};
const mono = "'IBM Plex Mono',monospace";
const disp = "'Bricolage Grotesque',sans-serif";

const inp = {
  fontFamily: mono, fontSize: 13, background: "rgba(255,255,255,.04)",
  border: `1px solid ${C.line2}`, borderRadius: 9, padding: "10px 12px",
  color: C.ink, width: "100%", outline: "none", boxSizing: "border-box",
};
const btn = {
  fontFamily: mono, fontSize: 12.5, fontWeight: 600, borderRadius: 9,
  padding: "9px 14px", cursor: "pointer", border: `1px solid ${C.line2}`,
  background: C.panel2, color: C.ink, display: "inline-flex", alignItems: "center", gap: 6,
};
const btnP = { ...btn, background: `linear-gradient(180deg,${C.amber},#1B2E8C)`, border: "none", color: "#ffffff" };
const card = { background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 20 };
const eyebrow = { fontFamily: mono, fontSize: 10.5, letterSpacing: ".22em", textTransform: "uppercase", color: C.amber, marginBottom: 12 };

function Tag({ tone, children }) {
  const cols = { green: C.green, red: C.red, blue: C.blue, amber: C.amber, muted: C.faint, thread: C.thread };
  const c = cols[tone] || C.faint;
  return <span style={{ fontFamily: mono, fontSize: 10.5, padding: "2px 8px", borderRadius: 6, color: c, background: c + "22", whiteSpace: "nowrap" }}>{children}</span>;
}

function TabBar({ tabs, active, setActive }) {
  return (
    <div style={{ display: "flex", gap: 4, background: C.bg2, border: `1px solid ${C.line}`, borderRadius: 12, padding: 4, marginBottom: 28 }}>
      {tabs.map(({ id, label, icon }) => (
        <button key={id} onClick={() => setActive(id)} style={{
          flex: 1, fontFamily: mono, fontSize: 13, fontWeight: 600, borderRadius: 9, padding: "10px 14px",
          border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
          background: active === id ? C.panel2 : "transparent",
          color: active === id ? C.ink : C.faint,
          borderBottom: active === id ? `2px solid ${C.amber}` : "2px solid transparent",
          transition: ".15s",
        }}>
          <span>{icon}</span> {label}
        </button>
      ))}
    </div>
  );
}

function SubTabBar({ tabs, active, setActive }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: `1px solid ${C.line}`, paddingBottom: 0 }}>
      {tabs.map(({ id, label }) => (
        <button key={id} onClick={() => setActive(id)} style={{
          fontFamily: mono, fontSize: 12.5, fontWeight: 600, background: "transparent", border: "none",
          cursor: "pointer", padding: "8px 2px", marginRight: 16,
          color: active === id ? C.ink : C.faint,
          borderBottom: active === id ? `2px solid ${C.amber}` : "2px solid transparent",
          transition: ".15s",
        }}>{label}</button>
      ))}
    </div>
  );
}

/* =================== TAB 1: DATA IMPORT =================== */

function FormatHelp({ ent, onClose }) {
  if (!ent) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(4,7,12,.8)", display: "grid", placeItems: "center", padding: 18 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 540, maxHeight: "86vh", overflowY: "auto", background: C.panel, border: `1px solid ${C.line2}`, borderRadius: 14, padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 17, fontFamily: disp }}>{ent.label} — CSV format</span>
          <span onClick={onClose} style={{ marginLeft: "auto", cursor: "pointer", color: C.faint, fontSize: 20 }}>✕</span>
        </div>
        <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.55, marginBottom: 14 }}>{ent.note}</div>
        <div style={eyebrow}>Required columns</div>
        <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
          {ent.columns.map((c, i) => (
            <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: i % 2 ? C.bg2 : "transparent" }}>
              <span style={{ fontFamily: mono, fontSize: 12.5, color: C.ink }}>{c.name}</span>
              {c.required ? <Tag tone="red">required</Tag> : <span style={{ fontFamily: mono, fontSize: 10.5, color: C.faint }}>optional</span>}
            </div>
          ))}
        </div>
        <a href={sampleUrl(ent.entity)} style={{ ...btnP, textDecoration: "none" }}>Download sample CSV</a>
      </div>
    </div>
  );
}

const ENTITIES = ["parts", "vendors", "vendor_parts", "work_orders", "sales_orders", "customers", "operators"];
const ENTITY_LABELS = { parts: "Parts", vendors: "Vendors", vendor_parts: "Vendor Parts", work_orders: "Work Orders", sales_orders: "Sales Orders", customers: "Customers", operators: "Operators" };

const SOURCES = [
  { id: "odoo", label: "Odoo", note: "Uses Odoo JSON-RPC (v14+). Requires your Odoo URL, database name, username and an API key generated in Settings → Technical → API Keys.", fields: ["base_url", "db_name", "username", "api_key"] },
  { id: "mrpeasy", label: "MRPeasy", note: "Uses MRPeasy REST API v1. Generate an API token in MRPeasy under Settings → Integrations → API.", fields: ["api_key"] },
];

function CsvImport({ isAdmin }) {
  const [entities, setEntities] = useState([]);
  const [entity, setEntity] = useState("");
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(null);
  const [events, setEvents] = useState([]);

  const loadEvents = () => listEvents(10).then(setEvents).catch(() => {});
  useEffect(() => {
    importEntities().then((es) => { setEntities(es); if (es[0]) setEntity(es[0].entity); }).catch(() => {});
    loadEvents();
  }, []);
  const cur = entities.find((e) => e.entity === entity);

  const onFile = (f) => {
    if (!f) return;
    setFileName(f.name); setResult(null);
    const r = new FileReader();
    r.onload = () => setCsv(String(r.result || ""));
    r.readAsText(f);
  };
  const run = async () => {
    setBusy(true); setResult(null);
    try { const r = await importData(entity, csv); setResult(r); loadEvents(); }
    catch (e) { setResult({ error: e.message }); }
    finally { setBusy(false); }
  };

  if (!isAdmin) return <div style={{ color: C.faint, fontSize: 13 }}>Admin access required.</div>;

  return (
    <>
      <div style={card}>
        <div style={eyebrow}>Import entity</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 14, lineHeight: 1.55 }}>
          Load a CSV file to import data. <b style={{ color: C.ink }}>Import Parts first</b> — BOMs, vendor parts and work orders reference existing part numbers.
          Click <b style={{ color: C.ink }}>?</b> to see the exact column format and download a sample.
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
          <select value={entity} onChange={(e) => { setEntity(e.target.value); setResult(null); }} style={{ ...inp, width: "auto", minWidth: 200 }}>
            {entities.map((e) => <option key={e.entity} value={e.entity}>{e.order}. {e.label}</option>)}
          </select>
          <button title="Format & sample" onClick={() => setHelp(cur)} style={{ ...btn, width: 36, height: 36, padding: 0, borderRadius: "50%", fontWeight: 800, justifyContent: "center" }}>?</button>
          <a href={cur ? sampleUrl(cur.entity) : "#"} style={{ ...btn, textDecoration: "none" }}>Sample CSV</a>
        </div>
        <label style={{ ...btn, display: "inline-block", cursor: "pointer", marginBottom: 10 }}>
          {fileName ? "📄 " + fileName : "Choose CSV file…"}
          <input type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        <textarea value={csv} onChange={(e) => { setCsv(e.target.value); setResult(null); }}
          placeholder="…or paste CSV here (first row = headers)"
          style={{ ...inp, display: "block", minHeight: 96, fontFamily: mono, fontSize: 12, resize: "vertical", marginBottom: 12 }} />
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button style={btnP} onClick={run} disabled={busy || !csv.trim() || !entity}>{busy ? "Importing…" : "Import " + (cur?.label || "")}</button>
          {cur?.requires_parts && <span style={{ fontSize: 11.5, color: C.faint }}>Parts must already exist</span>}
        </div>
        {result && (result.error
          ? <div style={{ marginTop: 14, fontSize: 12.5, color: C.red }}>✕ {result.error}</div>
          : <div style={{ marginTop: 14, fontSize: 12.5, color: C.green }}>
              ✓ {result.inserted} added · {result.updated} updated{result.error_count ? <span style={{ color: C.red }}> · {result.error_count} errors</span> : ""} (of {result.total})
              {result.errors?.length > 0 && (
                <div style={{ marginTop: 8, border: `1px solid ${C.line}`, borderRadius: 9, overflow: "hidden" }}>
                  {result.errors.map((er, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, padding: "6px 11px", background: i % 2 ? C.bg2 : "transparent", fontFamily: mono, fontSize: 11 }}>
                      <span style={{ color: C.faint }}>row {er.row}</span>
                      <span style={{ color: C.red }}>{er.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>)}
      </div>

      {events.length > 0 && (
        <div style={{ ...card, padding: 0, overflow: "hidden", marginTop: 16 }}>
          <div style={{ padding: "10px 16px", fontFamily: mono, fontSize: 10.5, color: C.faint, borderBottom: `1px solid ${C.line}` }}>RECENT IMPORTS</div>
          {events.map((ev, i) => (
            <div key={i} style={{ padding: "10px 16px", borderBottom: i < events.length - 1 ? `1px solid ${C.line}` : "none", display: "flex", alignItems: "center", gap: 10, fontSize: 12.5 }}>
              <span style={{ fontWeight: 600, color: C.ink }}>{ev.entity}</span>
              <span style={{ fontFamily: mono, fontSize: 11, color: C.muted }}>+{ev.inserted} · {ev.updated} updated{ev.errors ? " · " + ev.errors + " errors" : ""}</span>
              <span style={{ marginLeft: "auto", fontFamily: mono, fontSize: 10.5, color: C.faint }}>{new Date(ev.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
      <FormatHelp ent={help} onClose={() => setHelp(null)} />
    </>
  );
}

function SourceImport({ isAdmin }) {
  const [source, setSource] = useState("odoo");
  const [entity, setEntity] = useState("parts");
  const [creds, setCreds] = useState({ base_url: "", db_name: "", username: "", api_key: "" });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState(null);

  const src = SOURCES.find((s) => s.id === source);
  const set = (k) => (e) => setCreds((c) => ({ ...c, [k]: e.target.value }));

  const run = async () => {
    setBusy(true); setResult(null); setPreview(null);
    try {
      const r = await importFromSource({ source, entity, ...creds });
      setResult(r);
      if (r.ok && r.rows?.length) setPreview(r.rows.slice(0, 5));
    } catch (e) { setResult({ ok: false, error: e.message }); }
    finally { setBusy(false); }
  };

  if (!isAdmin) return <div style={{ color: C.faint, fontSize: 13 }}>Admin access required.</div>;

  const fieldLabels = { base_url: "Odoo URL", db_name: "Database name", username: "Username / login", api_key: "API key / password" };

  return (
    <>
      <div style={card}>
        <div style={eyebrow}>Source system</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {SOURCES.map((s) => (
            <button key={s.id} onClick={() => { setSource(s.id); setResult(null); setPreview(null); }} style={{
              ...btn,
              background: source === s.id ? C.panel2 : "transparent",
              borderColor: source === s.id ? C.amber : C.line2,
              color: source === s.id ? C.ink : C.faint,
            }}>{s.label}</button>
          ))}
          <div style={{ width: "100%", fontSize: 12.5, color: C.muted, lineHeight: 1.55, marginTop: 4 }}>{src?.note}</div>
        </div>

        <div style={eyebrow}>Entity to import</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {ENTITIES.map((e) => (
            <button key={e} onClick={() => setEntity(e)} style={{
              ...btn, fontSize: 12,
              background: entity === e ? C.panel2 : "transparent",
              borderColor: entity === e ? C.amber : C.line2,
              color: entity === e ? C.ink : C.faint,
            }}>{ENTITY_LABELS[e]}</button>
          ))}
        </div>

        <div style={eyebrow}>Connection details</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginBottom: 16 }}>
          {src?.fields.map((f) => (
            <label key={f} style={{ display: "block" }}>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>{fieldLabels[f]}</div>
              <input style={inp} type={f === "api_key" ? "password" : "text"}
                placeholder={f === "base_url" ? "https://your-odoo.com" : f === "db_name" ? "your_database" : ""}
                value={creds[f] || ""} onChange={set(f)} />
            </label>
          ))}
        </div>
        <button style={btnP} onClick={run} disabled={busy}>{busy ? "Connecting…" : `Fetch ${ENTITY_LABELS[entity]} from ${src?.label}`}</button>
      </div>

      {result && (
        <div style={{ ...card, marginTop: 16 }}>
          {result.ok ? (
            <>
              <div style={{ color: C.green, fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
                ✓ Fetched {result.count} {ENTITY_LABELS[entity]} from {src?.label}
                {result.count > 500 && <span style={{ color: C.faint }}> (showing first 500)</span>}
              </div>
              {preview && preview.length > 0 && (
                <>
                  <div style={eyebrow}>Preview (first 5 rows)</div>
                  <div style={{ overflowX: "auto", border: `1px solid ${C.line}`, borderRadius: 10 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: mono, fontSize: 11.5 }}>
                      <thead>
                        <tr style={{ background: C.bg2 }}>
                          {Object.keys(preview[0]).slice(0, 8).map((k) => (
                            <th key={k} style={{ padding: "7px 10px", textAlign: "left", color: C.faint, fontWeight: 500, borderBottom: `1px solid ${C.line}`, whiteSpace: "nowrap" }}>{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, i) => (
                          <tr key={i} style={{ borderBottom: `1px solid ${C.line}` }}>
                            {Object.values(row).slice(0, 8).map((v, j) => (
                              <td key={j} style={{ padding: "7px 10px", color: C.muted, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {v === null || v === undefined ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ marginTop: 12, fontSize: 12, color: C.faint }}>
                    To persist this data, export as CSV from {src?.label} and use the CSV Import tab, or contact support to enable live sync.
                  </div>
                </>
              )}
            </>
          ) : (
            <div style={{ color: C.red, fontSize: 13 }}>✕ {result.error}</div>
          )}
        </div>
      )}
    </>
  );
}

function DataImportTab({ isAdmin }) {
  const [sub, setSub] = useState("csv");
  return (
    <div>
      <SubTabBar
        tabs={[{ id: "csv", label: "Import by CSV" }, { id: "source", label: "Import from Source System" }]}
        active={sub} setActive={setSub}
      />
      {sub === "csv" ? <CsvImport isAdmin={isAdmin} /> : <SourceImport isAdmin={isAdmin} />}
    </div>
  );
}

/* =================== TAB 2: USER MANAGEMENT =================== */
function UserManagementTab({ isAdmin }) {
  const [data, setData] = useState(null);
  const [invites, setInvites] = useState([]);
  const [email, setEmail] = useState("");
  const [inviteMsg, setInviteMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toggling, setToggling] = useState({});

  const load = useCallback(() => {
    if (!isAdmin) return;
    adminUsage().then(setData).catch(() => {});
    listInvites().then(setInvites).catch(() => {});
  }, [isAdmin]);
  useEffect(() => { load(); }, [load]);

  const sendInvite = async () => {
    setBusy(true); setInviteMsg(null);
    try {
      const r = await createInvite(email);
      setInviteMsg({ ok: true, url: r.invite_url, emailed: r.emailed });
      setEmail(""); load();
    } catch (e) { setInviteMsg({ ok: false, msg: e.message }); }
    finally { setBusy(false); }
  };

  const toggleActive = async (member) => {
    setToggling((t) => ({ ...t, [member.id]: true }));
    try {
      await updateMember(member.id, { is_active: !member.is_active });
      load();
    } catch (e) { alert(e.message); }
    finally { setToggling((t) => ({ ...t, [member.id]: false })); }
  };

  if (!isAdmin) return <div style={{ color: C.faint, fontSize: 13 }}>Admin access required to manage users.</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Invite */}
      <div style={card}>
        <div style={eyebrow}>Invite a team member</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: inviteMsg ? 0 : undefined }}>
          <input style={{ ...inp, flex: 1, minWidth: 220 }} type="email" placeholder="colleague@company.com"
            value={email} onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && email && sendInvite()} />
          <button style={btnP} onClick={sendInvite} disabled={busy || !email}>{busy ? "Sending…" : "Send invite"}</button>
        </div>
        {inviteMsg && (inviteMsg.ok
          ? <div style={{ marginTop: 12, fontSize: 12.5 }}>
              <div style={{ color: C.green }}>✓ Invite created{inviteMsg.emailed ? " and emailed." : " — SMTP not configured, copy the link below:"}</div>
              {!inviteMsg.emailed && (
                <div style={{ fontFamily: mono, fontSize: 11.5, color: C.thread, marginTop: 8, wordBreak: "break-all", cursor: "pointer",
                  background: C.bg2, padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.line}` }}
                  onClick={() => navigator.clipboard?.writeText(inviteMsg.url)}>
                  {inviteMsg.url}  ⧉ click to copy
                </div>
              )}
            </div>
          : <div style={{ marginTop: 12, fontSize: 12.5, color: C.red }}>✕ {inviteMsg.msg}</div>)}
      </div>

      {/* Team roster */}
      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 18px", borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={eyebrow}>Team members</span>
          <span style={{ fontFamily: mono, fontSize: 11, color: C.faint, marginLeft: "auto" }}>
            {data ? `${data.members.filter(m => m.is_active !== false).length} active` : "Loading…"}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 100px", padding: "8px 18px", fontFamily: mono, fontSize: 10.5, color: C.faint, borderBottom: `1px solid ${C.line}` }}>
          <span>MEMBER</span><span>ROLE</span><span>STATUS</span><span style={{ textAlign: "right" }}>ACTION</span>
        </div>
        {!data && <div style={{ padding: 18, color: C.faint, fontSize: 13 }}>Loading…</div>}
        {data?.members.map((m, i) => {
          const active = m.is_active !== false;
          return (
            <div key={m.id || i} style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 100px", alignItems: "center",
              padding: "12px 18px", borderBottom: i < data.members.length - 1 ? `1px solid ${C.line}` : "none",
              background: !active ? "rgba(242,98,73,.04)" : "transparent" }}>
              <div>
                <div style={{ fontSize: 13.5, color: active ? C.ink : C.faint }}>
                  {m.full_name || m.email}
                  {m.role === "org_admin" && <span style={{ fontFamily: mono, fontSize: 10, color: C.amber, marginLeft: 6 }}>admin</span>}
                </div>
                <div style={{ fontFamily: mono, fontSize: 10.5, color: C.faint }}>{m.email}</div>
              </div>
              <div><Tag tone={m.plan === "enterprise" ? "thread" : m.plan === "pro" ? "amber" : "muted"}>{m.plan || "free"}</Tag></div>
              <div><Tag tone={active ? "green" : "red"}>{active ? "Active" : "Inactive"}</Tag></div>
              <div style={{ textAlign: "right" }}>
                {m.role !== "org_admin" && (
                  <button style={{ ...btn, padding: "5px 10px", fontSize: 11.5, color: active ? C.red : C.green, borderColor: active ? C.red : C.green }}
                    disabled={!!toggling[m.id]} onClick={() => toggleActive(m)}>
                    {toggling[m.id] ? "…" : active ? "Deactivate" : "Activate"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 18px", fontFamily: mono, fontSize: 10.5, color: C.faint, borderBottom: `1px solid ${C.line}` }}>PENDING INVITES</div>
          {invites.map((iv, i) => (
            <div key={iv.id} style={{ padding: "11px 18px", borderBottom: i < invites.length - 1 ? `1px solid ${C.line}` : "none", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13.5, color: C.ink }}>{iv.email}</span>
              <Tag tone={iv.status === "accepted" ? "green" : iv.status === "revoked" ? "red" : "blue"}>{iv.status}</Tag>
              <span style={{ marginLeft: "auto", fontFamily: mono, fontSize: 10.5, color: C.faint }}>{new Date(iv.created_at).toLocaleDateString()}</span>
              {iv.status === "pending" && (
                <button style={{ ...btn, padding: "5px 10px", fontSize: 11, color: C.red, borderColor: C.red }}
                  onClick={() => revokeInvite(iv.id).then(load)}>Revoke</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =================== TAB 3: LICENSE =================== */
function LicenseTab({ isAdmin }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState("");

  useEffect(() => { if (isAdmin) adminUsage().then(setData).catch(() => {}); }, [isAdmin]);

  const checkout = async (plan) => {
    setBusy(plan);
    try { const r = await billingCheckout(plan); if (r?.url) window.location.href = r.url; }
    catch { /* ignore */ }
    finally { setBusy(""); }
  };

  const TIERS = [
    { key: "diagnostic", label: "Revenue at Risk Diagnostic", price: "$2,500", period: "one-time", color: C.thread, note: "Credited toward pilot. ERP/CSV extracts, exposure map, blocker list, pilot design session.", cta: null },
    { key: "core", label: "Threadwire Core", price: "$24,000", period: "/ year", color: C.faint, note: "Single site. CSV / SFTP integration. Delivery calendar, blocker workspace, standard dashboards.", cta: null },
    { key: "pro", label: "Threadwire Pro", price: "$48,000", period: "/ year", color: C.amber, note: "Multiple sites. API integration. AI assistant. Blocker-aware revenue forecast. Quarterly value review.", cta: "pro" },
    { key: "enterprise", label: "Enterprise", price: "Custom", period: "", color: C.blue, note: "Multi-site, multi-ERP. SSO / SCIM / SLA. Data warehouse integration. Enterprise success plan.", cta: "enterprise" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Current status */}
      <div style={card}>
        <div style={eyebrow}>Current license</div>
        {!data
          ? <div style={{ color: C.faint, fontSize: 13 }}>Loading…</div>
          : <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ fontSize: 26, fontWeight: 800, fontFamily: disp, color: data.enterprise ? C.thread : C.amber }}>
                {data.enterprise ? "Enterprise" : "Core / Trial"}
              </div>
              <Tag tone={data.enterprise ? "thread" : "amber"}>{data.enterprise ? "Active" : "Active"}</Tag>
              <div style={{ marginLeft: "auto", fontFamily: mono, fontSize: 12, color: C.faint }}>
                {data.members.filter(m => m.is_active !== false).length} active users · {data.free_limit} AI messages / user / day
              </div>
            </div>
        }
      </div>

      {/* Tier cards */}
      <div style={eyebrow}>Plans</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
        {TIERS.map((t) => (
          <div key={t.key} style={{ ...card, borderTop: `2px solid ${t.color}`, display: "flex", flexDirection: "column" }}>
            <div style={{ fontWeight: 800, fontSize: 15, fontFamily: disp, marginBottom: 6 }}>{t.label}</div>
            <div style={{ fontFamily: mono, fontSize: 24, fontWeight: 700, color: t.color, marginBottom: 2 }}>{t.price}</div>
            <div style={{ fontFamily: mono, fontSize: 11, color: C.faint, marginBottom: 12 }}>{t.period}</div>
            <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6, flex: 1 }}>{t.note}</div>
            {t.cta && isAdmin && (
              <button style={{ ...btnP, marginTop: 16, justifyContent: "center", width: "100%", background: `linear-gradient(180deg,${t.color},${t.color}cc)` }}
                disabled={busy === t.cta} onClick={() => checkout(t.cta)}>
                {busy === t.cta ? "Opening…" : "Upgrade to " + t.label}
              </button>
            )}
            {!t.cta && (
              <div style={{ marginTop: 16, fontFamily: mono, fontSize: 11, color: C.faint }}>Contact us to get started</div>
            )}
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12, color: C.faint, marginTop: 4 }}>
        Pricing is site-based — no per-seat friction. All plans require your data to deliver value. Manage billing via your account portal.
      </div>
    </div>
  );
}

/* =================== MAIN ADMIN SHELL =================== */
function SettingsTab({ isAdmin, user }) {
  const [qto, setQto] = useState(!!user?.quote_to_order);
  const [comp, setComp] = useState(!!user?.compliance_enabled);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const ENTITIES = ["parts", "boms", "vendors", "vendor_parts", "customers", "sales_orders", "work_orders", "operators", "lots", "inspections", "ncrs", "quotes"];
  if (!isAdmin) return <div style={{ color: C.faint, fontSize: 13, padding: 20 }}>Admins only.</div>;

  const toggle = async (v) => {
    setQto(v); setBusy("qto"); setMsg("");
    try { await updateSettings({ quote_to_order: v }); setMsg("Saved. Reload the app for the change to take full effect."); }
    catch (e) { setMsg(e.message); setQto(!v); } finally { setBusy(""); }
  };
  const toggleComp = async (v) => {
    setComp(v); setBusy("comp"); setMsg("");
    try { await updateSettings({ compliance_enabled: v }); setMsg("Saved. Reload the app for the change to take full effect."); }
    catch (e) { setMsg(e.message); setComp(!v); } finally { setBusy(""); }
  };
  const seed = async (industry) => {
    setBusy(industry); setMsg("");
    try { const r = await loadSampleDataset(industry); const n = Object.values(r.results).reduce((a, x) => a + (x.inserted || 0) + (x.updated || 0), 0); setMsg("Loaded " + n + " records for the " + industry + " dataset."); }
    catch (e) { setMsg(e.message); } finally { setBusy(""); }
  };

  const card = { background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 18, marginBottom: 16 };
  return (
    <div style={{ paddingTop: 8 }}>
      {msg && <div style={{ fontSize: 12.5, color: C.thread, marginBottom: 12 }}>{msg}</div>}

      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Quote-to-Order tracking</div>
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
              Turn on the Delivery Desk quote pipeline (quote → order) for shops without a full ERP/MES. Off by default; leave off for companies that already track quotes in their own systems.
            </div>
          </div>
          <button onClick={() => toggle(!qto)} disabled={busy === "qto"}
            style={{ width: 54, height: 30, borderRadius: 999, border: "none", cursor: "pointer", position: "relative", background: qto ? C.green : C.line2, transition: "background .15s" }}>
            <span style={{ position: "absolute", top: 3, left: qto ? 27 : 3, width: 24, height: 24, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
          </button>
        </div>
      </div>

      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Compliance module</div>
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
              Show the Compliance tab (certs, documents, lot trace) in the top navigation for everyone in this workspace. Off by default; turn on when the team is ready to use it.
            </div>
          </div>
          <button onClick={() => toggleComp(!comp)} disabled={busy === "comp"}
            style={{ width: 54, height: 30, borderRadius: 999, border: "none", cursor: "pointer", position: "relative", background: comp ? C.green : C.line2, transition: "background .15s" }}>
            <span style={{ position: "absolute", top: 3, left: comp ? 27 : 3, width: 24, height: 24, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
          </button>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Sample datasets</div>
        <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>
          Seed a full, linked demo dataset (parts, BOMs, vendors, orders, work orders, lots, inspections, NCRs, quotes) for a target industry — or download the CSVs to edit and re-import.
        </div>
        {[["machining", "AMTEC-style machining / grips"], ["fiber", "FTI-style fiber-optic (regulated)"]].map(([ind, label]) => (
          <div key={ind} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: `1px solid ${C.line}` }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5 }}>{label}</div>
              <div style={{ fontFamily: mono, fontSize: 10.5, color: C.faint }}>{ind}</div>
            </div>
            <button style={btnP} disabled={busy === ind} onClick={() => seed(ind)}>{busy === ind ? "Loading…" : "Load into my org"}</button>
            <details style={{ position: "relative" }}>
              <summary style={{ ...btn, listStyle: "none", cursor: "pointer" }}>Download CSVs ▾</summary>
              <div style={{ position: "absolute", right: 0, marginTop: 6, background: C.panel2, border: `1px solid ${C.line2}`, borderRadius: 10, padding: 8, zIndex: 5, minWidth: 160, maxHeight: 260, overflowY: "auto" }}>
                {ENTITIES.map((e) => <a key={e} href={sampleCsvUrl(ind, e)} style={{ display: "block", padding: "5px 8px", fontFamily: mono, fontSize: 11.5, color: C.thread, textDecoration: "none" }}>{e}.csv ↓</a>)}
              </div>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}

function DataSourcesDocs({ isAdmin }) {
  const [sources, setSources] = useState([]);
  const [docs, setDocs] = useState([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [form, setForm] = useState({ name: "", prefix: "", company_ref: "", doc_type: "cert" });
  const [up, setUp] = useState({ doc_type: "cert", company_ref: "", lot_number: "", part_number: "", file: null });
  const reload = () => { listDataSources().then(setSources).catch(() => {}); listDocuments().then(setDocs).catch(() => {}); };
  useEffect(() => { if (isAdmin) reload(); }, []);
  if (!isAdmin) return <div style={{ color: C.faint, fontSize: 13, padding: 20 }}>Admins only.</div>;

  const addSource = async () => {
    if (!form.name.trim()) return; setBusy("src");
    try { await createDataSource("s3", form.name.trim(), { prefix: form.prefix.trim(), company_ref: form.company_ref.trim(), doc_type: form.doc_type }); setForm({ name: "", prefix: "", company_ref: "", doc_type: "cert" }); reload(); }
    catch (e) { setMsg(e.message); } finally { setBusy(""); }
  };
  const sync = async (id) => { setBusy(id); try { const r = await syncDataSource(id); setMsg("Indexed " + (r.indexed ?? 0) + " document(s)" + (r.note ? " — " + r.note : "")); reload(); } catch (e) { setMsg(e.message); } finally { setBusy(""); } };
  const doUpload = async () => {
    if (!up.file) { setMsg("Choose a file first"); return; } setBusy("up");
    try { const fd = new FormData(); fd.append("file", up.file); fd.append("doc_type", up.doc_type); fd.append("company_ref", up.company_ref); fd.append("lot_number", up.lot_number); fd.append("part_number", up.part_number);
      const r = await uploadDocument(fd); setMsg("Uploaded to " + r.storage + (r.indexed_text ? " (text indexed)" : "")); setUp({ ...up, file: null }); reload();
    } catch (e) { setMsg(e.message); } finally { setBusy(""); }
  };
  const loadSamples = async () => { setBusy("samples"); try { const r = await loadSampleDocs(); setMsg("Loaded " + r.loaded + " sample doc(s) to " + r.storage); reload(); } catch (e) { setMsg(e.message); } finally { setBusy(""); } };

  const inp = { fontFamily: mono, fontSize: 12, background: C.bg2, border: `1px solid ${C.line}`, borderRadius: 8, padding: "8px 10px", color: C.ink, outline: "none" };
  const DT = ["cert", "coc", "coa", "sop", "inspection", "dhr", "other"];
  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>
        Connect an S3 bucket of supplier certs/SOPs (read-only) or upload documents directly. Files are tagged by company and type so the AI can compile cited trace maps. CSV exports from IQMS/Salesforce go through the <b>Data Import</b> tab (Lots, Inspections, NCRs).
      </div>
      {msg && <div style={{ fontSize: 12.5, color: C.thread, marginBottom: 12 }}>{msg}</div>}

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ flex: "1 1 320px", background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Connect S3 bucket</div>
          <div style={{ display: "grid", gap: 8 }}>
            <input style={inp} placeholder="Name (e.g. NextPhase certs)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input style={inp} placeholder="Prefix (e.g. nextphase/certs/)" value={form.prefix} onChange={(e) => setForm({ ...form, prefix: e.target.value })} />
            <div style={{ display: "flex", gap: 8 }}>
              <input style={{ ...inp, flex: 1 }} placeholder="Company ref" value={form.company_ref} onChange={(e) => setForm({ ...form, company_ref: e.target.value })} />
              <select style={{ ...inp, width: 120 }} value={form.doc_type} onChange={(e) => setForm({ ...form, doc_type: e.target.value })}>{DT.map((t) => <option key={t} value={t}>{t}</option>)}</select>
            </div>
            <button style={btnP} disabled={busy === "src"} onClick={addSource}>{busy === "src" ? "Adding…" : "Add source"}</button>
            <div style={{ fontSize: 11, color: C.faint }}>Sync indexes objects when the server has S3 configured; otherwise use Upload.</div>
          </div>
        </div>
        <div style={{ flex: "1 1 320px", background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Upload document</div>
          <div style={{ display: "grid", gap: 8 }}>
            <input type="file" onChange={(e) => setUp({ ...up, file: e.target.files[0] || null })} style={{ ...inp, padding: 7 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <select style={{ ...inp, width: 120 }} value={up.doc_type} onChange={(e) => setUp({ ...up, doc_type: e.target.value })}>{DT.map((t) => <option key={t} value={t}>{t}</option>)}</select>
              <input style={{ ...inp, flex: 1 }} placeholder="Company ref" value={up.company_ref} onChange={(e) => setUp({ ...up, company_ref: e.target.value })} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input style={{ ...inp, flex: 1 }} placeholder="Lot #" value={up.lot_number} onChange={(e) => setUp({ ...up, lot_number: e.target.value })} />
              <input style={{ ...inp, flex: 1 }} placeholder="Part #" value={up.part_number} onChange={(e) => setUp({ ...up, part_number: e.target.value })} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ ...btnP, flex: 1 }} disabled={busy === "up"} onClick={doUpload}>{busy === "up" ? "Uploading…" : "Upload"}</button>
              <button style={btn} disabled={busy === "samples"} onClick={loadSamples}>{busy === "samples" ? "Loading…" : "Load sample certs"}</button>
            </div>
          </div>
        </div>
      </div>

      {sources.length > 0 && (
        <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
          {sources.map((s, i) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderBottom: i < sources.length - 1 ? `1px solid ${C.line}` : "none" }}>
              <span style={{ fontFamily: mono, fontSize: 10.5, color: C.blue, textTransform: "uppercase" }}>{s.kind}</span>
              <div style={{ flex: 1 }}><div style={{ fontSize: 13 }}>{s.name}</div><div style={{ fontFamily: mono, fontSize: 10.5, color: C.faint }}>{s.config?.prefix || "—"} · {s.last_result || "not synced"}</div></div>
              <button style={btn} disabled={busy === s.id} onClick={() => sync(s.id)}>{busy === s.id ? "Syncing…" : "Sync"}</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "flex", padding: "10px 14px", borderBottom: `1px solid ${C.line}`, fontFamily: mono, fontSize: 10.5, color: C.faint }}>
          <span style={{ width: 70 }}>TYPE</span><span style={{ flex: 1 }}>DOCUMENT</span><span style={{ width: 110 }}>LOT / PART</span><span style={{ width: 90, textAlign: "right" }}>FILE</span>
        </div>
        {docs.length === 0 ? <div style={{ padding: 14, fontSize: 12.5, color: C.faint }}>No documents yet. Upload one or load the sample certs.</div>
          : docs.map((d, i) => (
            <div key={d.id} style={{ display: "flex", alignItems: "center", padding: "10px 14px", borderBottom: i < docs.length - 1 ? `1px solid ${C.line}` : "none" }}>
              <span style={{ width: 70, fontFamily: mono, fontSize: 10.5, color: C.amber, textTransform: "uppercase" }}>{d.doc_type}</span>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13 }}>{d.title || d.filename}</div><div style={{ fontFamily: mono, fontSize: 10.5, color: C.faint }}>{d.company_ref || "—"} · {d.storage} · {d.uploaded_by}</div></div>
              <span style={{ width: 110, fontFamily: mono, fontSize: 10.5, color: C.muted }}>{d.lot_number || "—"}{d.part_number ? " / " + d.part_number : ""}</span>
              <a href={docDownloadUrl(d.id)} style={{ width: 90, textAlign: "right", fontFamily: mono, fontSize: 11.5, color: C.thread }}>download ↓</a>
            </div>
          ))}
      </div>
    </div>
  );
}

/* =================== TAB: AI WORKBENCH (curated prompts) =================== */
function AIWorkbenchTab({ isAdmin }) {
  const order = ["extractor", "derivation", "testgen", "cdrl"];
  const [prompts, setPrompts] = useState(() => loadPrompts());
  const [active, setActive] = useState("extractor");
  const [draft, setDraft] = useState(() => loadPrompts()[ "extractor" ]);
  const [savedTick, setSavedTick] = useState(0);

  useEffect(() => { setDraft(prompts[active]); }, [active]); // eslint-disable-line

  const meta = AGENT_META[active];
  const dirty = draft !== prompts[active];
  const customized = isCustomized(active);

  const save = () => {
    savePrompt(active, draft);
    const next = loadPrompts();
    setPrompts(next);
    setSavedTick(Date.now());
  };
  const resetToDefault = () => {
    setDraft(DEFAULT_PROMPTS[active]);
  };

  return (
    <div>
      <div style={eyebrow}>AI Workbench · curated prompts</div>
      <div style={{ color: C.muted, fontSize: 13.5, lineHeight: 1.6, marginBottom: 20, maxWidth: 720 }}>
        Each agent runs an admin-owned curated prompt. Edits saved here become the
        baseline every engineer sees. Engineers can still fine-tune a copy for a
        single run inside the agent, but the saved version below is the default
        they start from.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 20, alignItems: "start" }}>
        {/* agent list */}
        <div style={{ ...card, padding: 8 }}>
          {order.map((k) => {
            const m = AGENT_META[k];
            const on = active === k;
            const cust = isCustomized(k);
            return (
              <button key={k} onClick={() => setActive(k)} style={{
                width: "100%", textAlign: "left", border: "none", cursor: "pointer",
                borderRadius: 9, padding: "11px 12px", marginBottom: 2,
                background: on ? C.panel2 : "transparent",
                borderLeft: on ? `3px solid ${C.amber}` : "3px solid transparent",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: on ? C.ink : C.muted }}>{m.name}</div>
                  <div style={{ fontFamily: mono, fontSize: 10.5, color: C.faint }}>{m.v}</div>
                </div>
                {cust && <Tag tone="amber">edited</Tag>}
              </button>
            );
          })}
        </div>

        {/* editor */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontFamily: disp, fontWeight: 800, fontSize: 18 }}>{meta.name}</span>
            <Tag tone="blue">{meta.v}</Tag>
            {customized ? <Tag tone="amber">customized</Tag> : <Tag tone="muted">shipped default</Tag>}
            {savedTick > 0 && !dirty && <span style={{ fontFamily: mono, fontSize: 11, color: C.green }}>✓ saved</span>}
          </div>
          <div style={{ fontFamily: mono, fontSize: 11, color: C.faint, marginBottom: 12 }}>
            Variables auto-filled at run time: {meta.vars.join("  ")}
          </div>

          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={!isAdmin}
            spellCheck={false}
            style={{
              width: "100%", minHeight: 320, resize: "vertical",
              fontFamily: mono, fontSize: 12.5, lineHeight: 1.7,
              color: C.ink, background: C.panel2, border: `1px solid ${C.line2}`,
              borderRadius: 10, padding: 14, outline: "none",
            }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            {!isAdmin && <span style={{ fontFamily: mono, fontSize: 11.5, color: C.faint }}>Read-only — org admins can edit curated prompts.</span>}
            <div style={{ flex: 1 }} />
            <button style={btn} onClick={resetToDefault} disabled={!isAdmin || draft === DEFAULT_PROMPTS[active]}>Reset to shipped default</button>
            <button style={btn} onClick={() => setDraft(prompts[active])} disabled={!dirty}>Discard changes</button>
            <button style={{ ...btnP, opacity: isAdmin && dirty ? 1 : 0.5, pointerEvents: isAdmin && dirty ? "auto" : "none" }} onClick={save}>Save curated prompt</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Admin({ user, onClose }) {
  const isAdmin = user.role === "org_admin" || user.role === "superadmin";
  const [tab, setTab] = useState("import");

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: "'Inter',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        select option { background: #FFFFFF; color: #15222D; }
        input::placeholder, textarea::placeholder { color: #8093A0; }
        input:focus, textarea:focus, select:focus { border-color: #2A46C4 !important; outline: none; }
      `}</style>

      <div style={{ maxWidth: 1020, margin: "0 auto", padding: "28px 22px 80px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <span style={{ fontFamily: disp, fontWeight: 800, fontSize: 26 }}>Admin</span>
          <Tag tone={isAdmin ? "amber" : "blue"}>{isAdmin ? "org admin" : "read-only"}</Tag>
          <button style={{ ...btn, marginLeft: "auto" }} onClick={onClose}>← Back to app</button>
        </div>
        <div style={{ color: C.faint, fontSize: 13, marginBottom: 28 }}>
          {user.org?.legal_name} · {user.full_name || user.email}
        </div>

        {/* Main tab bar */}
        <TabBar
          tabs={[
            { id: "import", label: "Data Import", icon: "⬆" },
            { id: "workbench", label: "AI Workbench", icon: "🤖" },
            { id: "users", label: "User Management", icon: "👥" },
            { id: "compliance", label: "Data Sources", icon: "🧬" },
            { id: "settings", label: "Settings", icon: "⚙" },
            { id: "license", label: "License", icon: "★" },
          ]}
          active={tab} setActive={setTab}
        />

        {tab === "import" && <DataImportTab isAdmin={isAdmin} />}
        {tab === "workbench" && <AIWorkbenchTab isAdmin={isAdmin} />}
        {tab === "users" && <UserManagementTab isAdmin={isAdmin} />}
        {tab === "compliance" && <DataSourcesDocs isAdmin={isAdmin} />}
        {tab === "settings" && <SettingsTab isAdmin={isAdmin} user={user} />}
        {tab === "license" && <LicenseTab isAdmin={isAdmin} />}
      </div>
    </div>
  );
}

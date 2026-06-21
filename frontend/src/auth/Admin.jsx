import React, { useEffect, useState } from "react";
import {
  getCatalog, getConnectors, saveConnector, deleteConnector, testConnector,
  listInvites, createInvite, revokeInvite,
  importEntities, importData, listEvents, sampleUrl,
  adminUsage, billingCheckout,
} from "../lib/api.js";

const C = {
  bg: "#0a0e15", panel: "#121a26", panel2: "#172132", bg2: "#0d121c",
  line: "#243245", line2: "#2f4259", ink: "#e7eef6", muted: "#8d9fb5", faint: "#5d6f86",
  amber: "#ff8a3d", thread: "#48d6c8", green: "#43c277", red: "#f0563a", blue: "#5aa9ff",
};
const mono = "'IBM Plex Mono',monospace";
const input = { fontFamily: mono, fontSize: 13, background: C.bg2, border: `1px solid ${C.line}`, borderRadius: 9, padding: "10px 12px", color: C.ink, width: "100%", outline: "none", boxSizing: "border-box" };
const btn = { fontFamily: mono, fontSize: 12.5, fontWeight: 600, borderRadius: 9, padding: "9px 14px", cursor: "pointer", border: `1px solid ${C.line2}`, background: C.panel2, color: C.ink };
const btnP = { ...btn, background: `linear-gradient(180deg,${C.amber},#cc6a26)`, border: "none", color: "#1a0f06" };

function Tag({ tone, children }) {
  const map = { green: C.green, red: C.red, blue: C.blue, amber: C.amber, muted: C.muted };
  const c = map[tone] || C.muted;
  return <span style={{ fontFamily: mono, fontSize: 10.5, padding: "2px 8px", borderRadius: 6, color: c, background: c + "22" }}>{children}</span>;
}

function ConnectorCard({ cat, conn, isAdmin, onChanged }) {
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const configured = !!conn;

  const fields = Array.isArray(cat.fields) ? cat.fields : [];

  if (!cat.enabled) {
    return (
      <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, opacity: 0.6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{cat.label}</span>
          <span style={{ marginLeft: "auto" }}><Tag tone="muted">Coming soon</Tag></span>
        </div>
        <div style={{ fontFamily: mono, fontSize: 11, color: C.faint, marginTop: 6 }}>{cat.category}</div>
      </div>
    );
  }

  const save = async () => {
    setBusy(true); setResult(null);
    try {
      const secretField = fields.find((f) => f.secret);
      const config = {};
      fields.forEach((f) => { if (!f.secret && vals[f.key] != null) config[f.key] = vals[f.key]; });
      await saveConnector(cat.type, { auth_method: cat.auth_method, config, secret: secretField ? (vals[secretField.key] || null) : null });
      setResult({ ok: true, msg: "Saved" }); setOpen(false); onChanged();
    } catch (e) { setResult({ ok: false, msg: e.message }); }
    finally { setBusy(false); }
  };
  const test = async () => {
    setBusy(true); setResult(null);
    try { const r = await testConnector(cat.type); setResult({ ok: r.ok, msg: r.message }); }
    catch (e) { setResult({ ok: false, msg: e.message }); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true);
    try { await deleteConnector(cat.type); onChanged(); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ background: C.panel, border: `1px solid ${configured ? C.line2 : C.line}`, borderRadius: 12, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>{cat.label}</span>
        <span style={{ marginLeft: "auto" }}>{configured ? <Tag tone="green">Configured</Tag> : <Tag tone="muted">Not configured</Tag>}</span>
      </div>
      <div style={{ fontFamily: mono, fontSize: 11, color: C.faint, marginTop: 6 }}>
        {cat.category}{conn && conn.secret_last4 ? ` · secret ••••${conn.secret_last4}` : ""}{conn && conn.config && conn.config.base_url ? ` · ${conn.config.base_url}` : ""}
      </div>

      {isAdmin && (
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button style={btn} onClick={() => { setOpen((o) => !o); setVals(conn?.config || {}); setResult(null); }}>
            {configured ? "Edit" : "Configure"}
          </button>
          {configured && <button style={btn} onClick={test} disabled={busy}>Test connection</button>}
          {configured && <button style={{ ...btn, color: C.red, borderColor: C.red }} onClick={remove} disabled={busy}>Remove</button>}
          {cat.doc_url && <a href={cat.doc_url} target="_blank" rel="noreferrer" style={{ ...btn, textDecoration: "none", color: C.muted }}>Docs ↗</a>}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 10, fontSize: 12.5, color: result.ok ? C.green : C.red }}>
          {result.ok ? "✓ " : "✕ "}{result.msg}
        </div>
      )}

      {isAdmin && open && (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          {fields.map((f) => (
            <label key={f.key} style={{ display: "block" }}>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>
                {f.label}{f.optional ? " (optional)" : ""}{f.secret ? " 🔒" : ""}
              </div>
              <input style={input} type={f.secret ? "password" : "text"} placeholder={f.placeholder || ""}
                value={vals[f.key] || ""} onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))} />
            </label>
          ))}
          <div style={{ display: "flex", gap: 8 }}>
            <button style={btnP} onClick={save} disabled={busy}>{busy ? "Saving…" : "Save connection"}</button>
            <button style={btn} onClick={() => setOpen(false)}>Cancel</button>
          </div>
          <div style={{ fontFamily: mono, fontSize: 10, color: C.faint }}>
            Secrets are encrypted before storage and never shown back. Leave the secret blank when editing to keep the existing one.
          </div>
        </div>
      )}
    </div>
  );
}

function FormatHelp({ ent, onClose }) {
  if (!ent) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(4,7,12,.74)", display: "grid", placeItems: "center", padding: 18 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 540, maxHeight: "86vh", overflowY: "auto", background: C.panel, border: `1px solid ${C.line2}`, borderRadius: 14, padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontWeight: 800, fontSize: 17, fontFamily: "'Bricolage Grotesque',sans-serif" }}>{ent.label} — CSV format</span>
          <span onClick={onClose} style={{ marginLeft: "auto", cursor: "pointer", color: C.faint, fontSize: 18 }}>✕</span>
        </div>
        <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.55, marginBottom: 14 }}>{ent.note}</div>
        <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: ".15em", textTransform: "uppercase", color: C.amber, marginBottom: 8 }}>Columns</div>
        <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
          {ent.columns.map((c, i) => (
            <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: i % 2 ? C.bg2 : "transparent" }}>
              <span style={{ fontFamily: mono, fontSize: 12.5, color: C.ink }}>{c.name}</span>
              {c.required
                ? <Tag tone="red">required</Tag>
                : <span style={{ fontFamily: mono, fontSize: 10.5, color: C.faint }}>optional</span>}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <a href={sampleUrl(ent.entity)} style={{ ...btnP, textDecoration: "none", display: "inline-block" }}>⬇ Download sample CSV</a>
          <span style={{ fontSize: 11.5, color: C.faint }}>Stage your file to match these headers, then import.</span>
        </div>
      </div>
    </div>
  );
}

function DataImport({ isAdmin }) {
  const [entities, setEntities] = useState([]);
  const [entity, setEntity] = useState("");
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(null);
  const [events, setEvents] = useState([]);

  const loadEvents = () => listEvents(8).then(setEvents).catch(() => {});
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

  if (!isAdmin) return null;
  return (
    <>
      <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", color: C.amber, marginBottom: 14 }}>Data import</div>
      <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 18, marginBottom: 16 }}>
        <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 14, lineHeight: 1.55 }}>
          Import your digital-thread data from CSV. <b style={{ color: C.ink }}>Load Parts first</b> — BOMs and vendor parts reference existing part numbers. Click the <b style={{ color: C.ink }}>?</b> for each file's exact format and a sample to stage locally.
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
          <select value={entity} onChange={(e) => { setEntity(e.target.value); setResult(null); }}
            style={{ ...input, width: "auto", minWidth: 220 }}>
            {entities.map((e) => <option key={e.entity} value={e.entity}>{e.order}. {e.label}</option>)}
          </select>
          <button title="Format & sample" onClick={() => setHelp(cur)}
            style={{ ...btn, width: 38, height: 38, padding: 0, borderRadius: 999, fontWeight: 800 }}>?</button>
          <a href={cur ? sampleUrl(cur.entity) : "#"} style={{ ...btn, textDecoration: "none" }}>⬇ Sample</a>
        </div>

        <label style={{ ...btn, display: "inline-block", cursor: "pointer", marginBottom: 10 }}>
          {fileName ? "📄 " + fileName : "Choose CSV file…"}
          <input type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        <textarea value={csv} onChange={(e) => { setCsv(e.target.value); setResult(null); }}
          placeholder="…or paste CSV here (first row = headers)"
          style={{ ...input, minHeight: 96, fontFamily: mono, fontSize: 12, resize: "vertical", marginBottom: 12 }} />

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button style={btnP} onClick={run} disabled={busy || !csv.trim() || !entity}>{busy ? "Importing…" : "Import " + (cur ? cur.label : "")}</button>
          {cur?.requires_parts && <span style={{ fontSize: 11.5, color: C.faint }}>↳ referenced parts must already exist</span>}
        </div>

        {result && (result.error
          ? <div style={{ marginTop: 14, fontSize: 12.5, color: C.red }}>✕ {result.error}</div>
          : <div style={{ marginTop: 14, fontSize: 12.5 }}>
              <div style={{ color: C.green, fontWeight: 600 }}>✓ {result.inserted} added · {result.updated} updated{result.error_count ? <span style={{ color: C.red }}> · {result.error_count} error{result.error_count > 1 ? "s" : ""}</span> : ""} (of {result.total})</div>
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
        <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden", marginBottom: 36 }}>
          <div style={{ padding: "10px 16px", fontFamily: mono, fontSize: 10.5, color: C.faint, borderBottom: `1px solid ${C.line}` }}>RECENT IMPORTS · also fed to the assistant</div>
          {events.map((ev, i) => (
            <div key={i} style={{ padding: "10px 16px", borderBottom: i < events.length - 1 ? `1px solid ${C.line}` : "none", display: "flex", alignItems: "center", gap: 10, fontSize: 12.5 }}>
              <span style={{ fontWeight: 600 }}>{ev.entity}</span>
              <span style={{ fontFamily: mono, fontSize: 11, color: C.muted }}>+{ev.inserted} · {ev.updated} upd{ev.errors ? " · " + ev.errors + " err" : ""}</span>
              <span style={{ marginLeft: "auto", fontFamily: mono, fontSize: 10.5, color: C.faint }}>{new Date(ev.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      <FormatHelp ent={help} onClose={() => setHelp(null)} />
    </>
  );
}

function MembershipUsage({ isAdmin }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (isAdmin) adminUsage().then(setData).catch(() => {}); }, []);
  if (!isAdmin || !data) return null;
  const planTone = (p) => (p === "enterprise" ? "blue" : p === "pro" ? "amber" : "muted");
  const upgrade = async () => {
    setBusy(true);
    try { const r = await billingCheckout("enterprise"); if (r?.url) window.location.href = r.url; else setBusy(false); }
    catch { setBusy(false); }
  };
  return (
    <>
      <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", color: C.amber, marginBottom: 14 }}>Membership &amp; usage</div>
      <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 18, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{data.enterprise ? "Enterprise" : "Free / per-user Pro"}</span>
          <Tag tone={data.enterprise ? "blue" : "muted"}>{data.enterprise ? "unlimited for everyone" : "free tier " + data.free_limit + " / day"}</Tag>
          {!data.enterprise && (
            <button style={{ ...btnP, marginLeft: "auto" }} disabled={busy} onClick={upgrade}>
              {busy ? "Opening…" : "Upgrade company to Enterprise · $29.99/mo"}
            </button>
          )}
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
          {data.enterprise
            ? "Everyone in your company has unlimited assistant access."
            : "Each member gets " + data.free_limit + " assistant messages/day on Free. Members can upgrade themselves to Pro ($4.99/mo) from their profile, or buy Enterprise here to cover the whole company."}
        </div>
      </div>
      <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden", marginBottom: 36 }}>
        <div style={{ display: "flex", padding: "10px 16px", borderBottom: `1px solid ${C.line}`, fontFamily: mono, fontSize: 10.5, color: C.faint }}>
          <span style={{ flex: 1 }}>MEMBER</span><span style={{ width: 110 }}>PLAN</span><span style={{ width: 120, textAlign: "right" }}>TOKENS TODAY</span>
        </div>
        {data.members.map((u, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", padding: "11px 16px", borderBottom: i < data.members.length - 1 ? `1px solid ${C.line}` : "none" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5 }}>{u.full_name || u.email}{u.role === "org_admin" && <span style={{ fontFamily: mono, fontSize: 10, color: C.amber }}> · admin</span>}</div>
              <div style={{ fontFamily: mono, fontSize: 10.5, color: C.faint }}>{u.email}</div>
            </div>
            <span style={{ width: 110 }}><Tag tone={planTone(u.plan)}>{u.plan}</Tag></span>
            <span style={{ width: 120, textAlign: "right", fontFamily: mono, fontSize: 13, color: u.unlimited ? C.green : (u.tokens_today >= data.free_limit ? C.red : C.ink) }}>
              {u.unlimited ? "∞" : u.tokens_today + " / " + data.free_limit}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

export default function Admin({ user, onClose }) {
  const isAdmin = user.role === "org_admin" || user.role === "superadmin";
  const [catalog, setCatalog] = useState([]);
  const [conns, setConns] = useState({});
  const [invites, setInvites] = useState([]);
  const [email, setEmail] = useState("");
  const [inviteMsg, setInviteMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadConns = () =>
    Promise.all([getCatalog(), getConnectors()]).then(([cat, cs]) => {
      setCatalog(cat);
      const map = {}; cs.forEach((c) => { map[c.type] = c; }); setConns(map);
    }).catch(() => {});
  const loadInvites = () => { if (isAdmin) listInvites().then(setInvites).catch(() => {}); };

  useEffect(() => { loadConns(); loadInvites(); }, []);

  const sendInvite = async () => {
    setBusy(true); setInviteMsg(null);
    try {
      const r = await createInvite(email);
      setInviteMsg({ ok: true, url: r.invite_url, emailed: r.emailed });
      setEmail(""); loadInvites();
    } catch (e) { setInviteMsg({ ok: false, msg: e.message }); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: "'IBM Plex Sans',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');`}</style>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "28px 22px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 26 }}>Admin</span>
          <Tag tone={isAdmin ? "amber" : "blue"}>{isAdmin ? "org admin" : "member · read-only"}</Tag>
          <button style={{ ...btn, marginLeft: "auto" }} onClick={onClose}>← Back to app</button>
        </div>
        <div style={{ color: C.muted, fontSize: 13.5, marginBottom: 26 }}>
          {user.org?.legal_name} · signed in as {user.full_name || user.email}
        </div>

        {/* membership & usage (admin only) */}
        <MembershipUsage isAdmin={isAdmin} />

        {/* connectors */}
        <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", color: C.amber, marginBottom: 14 }}>Connectors</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14, marginBottom: 36 }}>
          {catalog.map((cat) => (
            <ConnectorCard key={cat.type} cat={cat} conn={conns[cat.type]} isAdmin={isAdmin} onChanged={loadConns} />
          ))}
        </div>

        {/* data import (admin only) */}
        <DataImport isAdmin={isAdmin} />

        {/* invites (admin only) */}
        {isAdmin && (
          <>
            <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", color: C.amber, marginBottom: 14 }}>Invite teammates</div>
            <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 18, marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input style={{ ...input, flex: 1, minWidth: 220 }} type="email" placeholder="teammate@company.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && email && sendInvite()} />
                <button style={btnP} onClick={sendInvite} disabled={busy || !email}>{busy ? "Sending…" : "Send invite"}</button>
              </div>
              {inviteMsg && (inviteMsg.ok
                ? <div style={{ marginTop: 12, fontSize: 12.5 }}>
                    <div style={{ color: C.green }}>✓ Invite created{inviteMsg.emailed ? " and emailed." : " — email not configured, copy the link:"}</div>
                    {!inviteMsg.emailed && <div style={{ fontFamily: mono, fontSize: 11.5, color: C.thread, marginTop: 6, wordBreak: "break-all", cursor: "pointer" }}
                      onClick={() => navigator.clipboard?.writeText(inviteMsg.url)}>{inviteMsg.url}  ⧉</div>}
                  </div>
                : <div style={{ marginTop: 12, fontSize: 12.5, color: C.red }}>✕ {inviteMsg.msg}</div>)}
            </div>

            <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
              {invites.length === 0 && <div style={{ padding: 18, color: C.faint, fontSize: 13 }}>No invites yet.</div>}
              {invites.map((iv) => (
                <div key={iv.id} style={{ padding: "12px 16px", borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13.5 }}>{iv.email}</span>
                  <Tag tone={iv.status === "accepted" ? "green" : iv.status === "revoked" ? "red" : "blue"}>{iv.status}</Tag>
                  <span style={{ marginLeft: "auto", fontFamily: mono, fontSize: 10.5, color: C.faint }}>
                    {new Date(iv.created_at).toLocaleDateString()}
                  </span>
                  {iv.status === "pending" && <button style={{ ...btn, padding: "5px 10px", color: C.red, borderColor: C.line }} onClick={() => revokeInvite(iv.id).then(loadInvites)}>Revoke</button>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

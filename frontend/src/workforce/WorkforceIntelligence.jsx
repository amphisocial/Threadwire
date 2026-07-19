import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  Users2, FolderKanban, Inbox, Clock, Database, LayoutDashboard, Upload,
  CheckCircle2, AlertTriangle, Sparkles, ArrowRight, Trash2, FileSpreadsheet,
  Search, Plus, X, TrendingUp, Gauge,
} from "lucide-react";
import {
  MONTHS, DATA_MONTHS, CURRENT, monthStd, monthLabel, isPlanning, mIdx,
  DISCIPLINES, discName, discRate, LOCATIONS, locName,
  pctIn, activeIn, liveMonths, rangeLabel, fteMonths, flatPcts, POLICY_MAX_DEFAULT,
  generateSampleData, emptyData, rollup, loadByMonth, outstandingDemand, requestState, pctOf,
  parseCSV, importUsersCSV, importProjectsCSV, parseMSProjectXML,
  normalizeStore, fromServer, toServer,
} from "./data.js";
import { wfGetData, wfPutData, wfClear } from "../lib/api.js";

/* =========================================================================
   Workforce Intelligence — a Threadwire module.
   Built on Threadwire's design tokens (.tf …). Tabs: Portfolio · Projects ·
   People · Requests · Data & Admin. Publishes a live snapshot to
   window.__twWorkforceCtx so the docked assistant can run What-If analysis.
   ========================================================================= */

const fmtH = (n) => Math.round(n).toLocaleString() + "h";
const fmtPct = (n) => (isFinite(n) ? Math.round(n) : 0) + "%";
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

/* attainment colour, in tf tokens */
function attColor(p, inProgress) {
  if (inProgress) return "var(--blue)";
  if (p >= 96 && p <= 108) return "var(--green)";
  if (p >= 85 && p < 96) return "var(--yellow)";
  return "var(--red)";
}

/* ---------- small building blocks -------------------------------------- */
function KPI({ label, value, sub, tone }) {
  return (
    <div className="tf-panel" style={{ padding: 16 }}>
      <div className="tf-eyebrow" style={{ marginBottom: 8 }}>{label}</div>
      <div className="tf-disp" style={{ fontSize: 30, fontWeight: 800, color: tone || "var(--ink)", lineHeight: 1 }}>{value}</div>
      {sub && <div className="tf-mono" style={{ fontSize: 11, color: "var(--faint)", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

/* Signature element: a demand bar — committed allocation stacked with the
   outstanding (unfilled request) demand, read against the plan/budget track. */
function DemandBar({ budget, committed, outstanding = 0, height = 12 }) {
  const max = Math.max(budget, committed + outstanding, 1);
  const w = (v) => `${clamp((v / max) * 100, 0, 100)}%`;
  const over = committed + outstanding > budget * 1.001;
  return (
    <div style={{ position: "relative" }}>
      {/* budget track */}
      <div style={{ height, background: "var(--inset)", borderRadius: 3, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, width: w(committed), background: over ? "var(--red)" : "var(--amber)", opacity: 0.9 }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: w(committed), width: w(outstanding), background: "repeating-linear-gradient(45deg,var(--thread),var(--thread) 3px,transparent 3px,transparent 6px)", opacity: 0.75 }} />
      </div>
      {/* budget marker */}
      {budget > 0 && (
        <div title={`Plan ${fmtH(budget)}`} style={{ position: "absolute", top: -2, bottom: -2, left: w(budget), width: 2, background: "var(--ink)", opacity: 0.55 }} />
      )}
    </div>
  );
}
function DemandKey() {
  const item = (bg, label, dashed) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 16, height: 9, borderRadius: 2, background: dashed ? "repeating-linear-gradient(45deg,var(--thread),var(--thread) 3px,transparent 3px,transparent 6px)" : bg, border: dashed ? "1px solid var(--thread)" : "none" }} />
      <span className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)" }}>{label}</span>
    </span>
  );
  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
      {item("var(--amber)", "Allocated")}
      {item(null, "Open requests", true)}
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 2, height: 12, background: "var(--ink)", opacity: 0.55 }} />
        <span className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)" }}>Plan</span>
      </span>
      {item("var(--red)", "Over plan")}
    </div>
  );
}

function Chip({ children, tone = "muted" }) {
  const map = {
    green: ["rgba(18,120,78,.12)", "var(--green)"], red: ["rgba(172,50,71,.12)", "var(--red)"],
    yellow: ["rgba(178,124,18,.12)", "var(--yellow)"], blue: ["rgba(42,70,196,.12)", "var(--blue)"],
    thread: ["rgba(62,111,224,.12)", "var(--thread)"], muted: ["rgba(128,147,160,.12)", "var(--muted)"],
  };
  const [bg, fg] = map[tone] || map.muted;
  return <span style={{ fontFamily: "var(--mono)", fontSize: 11, background: bg, color: fg, borderRadius: 999, padding: "2px 9px", whiteSpace: "nowrap" }}>{children}</span>;
}

function Seniority({ level }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }} title={`Level ${level}`}>
      {[1, 2, 3].map((i) => (
        <span key={i} style={{ width: 5, height: 5, borderRadius: 99, background: i <= level ? "var(--amber)" : "var(--line2)" }} />
      ))}
    </span>
  );
}

/* connection / save status in the header */
function StatusPill({ status, saveState, previewing, loaded }) {
  let color = "var(--muted)", text = loaded ? "● Data loaded" : "○ No data";
  if (previewing) { color = "var(--thread)"; text = "◐ Sample preview (local)"; }
  else if (status === "connected") {
    color = saveState === "error" ? "var(--red)" : "var(--green)";
    text = saveState === "saving" ? "◐ Saving…" : saveState === "error" ? "⚠ Save failed" : "● Saved to workspace";
  } else if (status === "readonly") { color = "var(--blue)"; text = "● Workspace · read-only"; }
  return <span className="tf-chip" style={{ color }} title={status === "connected" ? "Changes are saved to your organisation's workspace" : status === "readonly" ? "You can view workspace data; an org admin makes changes" : "A local in-browser session"}>{text}</span>;
}

/* =========================================================================
   Main module
   ========================================================================= */
export default function WorkforceIntelligence() {
  const [data, setData] = useState(emptyData);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("portfolio");
  const [month, setMonth] = useState(CURRENT);
  const [toast, setToast] = useState(null);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 2800); };

  /* Persistence. When the visitor is signed in, the module reads and writes
     the organisation's workforce dataset server-side, so imports and manually
     created records survive reloads and are shared across the org. Org admins
     write; other members read. Public visitors (or anyone offline) fall back
     to a local in-browser session. The sample demo data is always a local
     preview and is never persisted. */
  const conn = useRef({ connected: false, canWrite: false });
  const booted = useRef(false);
  const skipSave = useRef(false);
  const preview = useRef(false);
  const saveTimer = useRef(null);
  const [status, setStatus] = useState("local");     // local | connected | readonly
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const [previewing, setPreviewing] = useState(false);
  const canWrite = status !== "readonly";

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await wfGetData();
        if (!alive) return;
        conn.current = { connected: true, canWrite: !!res.canWrite };
        const total = (res.people || []).length + (res.projects || []).length +
          (res.allocations || []).length + (res.requests || []).length;
        if (total > 0) { skipSave.current = true; setData(fromServer(res)); setLoaded(true); }
        setStatus(res.canWrite ? "connected" : "readonly");
      } catch {
        conn.current = { connected: false, canWrite: false };
        setStatus("local");
      } finally { booted.current = true; }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!booted.current) return;
    if (skipSave.current) { skipSave.current = false; return; }
    if (preview.current) return;
    if (!conn.current.connected || !conn.current.canWrite) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("saving");
    saveTimer.current = setTimeout(() => {
      wfPutData(toServer(data))
        .then(() => setSaveState("saved"))
        .catch((e) => { setSaveState("error"); flash(e.message || "Couldn't save to the workspace."); });
    }, 500);
  }, [data]);

  const loadSample = () => {
    preview.current = true; setPreviewing(true);
    setData(generateSampleData()); setLoaded(true);
    flash("Sample demo data loaded — a local preview, not saved to your workspace.");
  };
  const exitPreview = async () => {
    preview.current = false; setPreviewing(false);
    if (conn.current.connected) {
      try {
        const res = await wfGetData();
        skipSave.current = true; setData(fromServer(res));
        setLoaded(((res.people || []).length + (res.projects || []).length) > 0);
      } catch { setData(emptyData()); setLoaded(false); }
    } else { setData(emptyData()); setLoaded(false); }
    flash("Left sample preview.");
  };
  const clearAll = async () => {
    if (preview.current) { preview.current = false; setPreviewing(false); }
    setData(emptyData()); setLoaded(false);
    if (conn.current.connected && conn.current.canWrite) {
      try { await wfClear(); flash("All workforce data cleared from the workspace."); }
      catch (e) { flash(e.message || "Couldn't clear the workspace."); }
    } else { flash("All workforce data cleared."); }
  };

  const inProgress = month === CURRENT;
  const store = useMemo(() => normalizeStore(data), [data]);
  const roll = useMemo(() => rollup(store, month), [store, month]);
  const load = useMemo(() => loadByMonth(store), [store]);
  const out = useMemo(() => outstandingDemand(store), [store]);
  const project = (id) => store.projects.find((p) => p.id === id) || {};

  /* month-by-month attainment trend, for the portfolio chart */
  const trend = useMemo(() => DATA_MONTHS.map((k) => {
    let c = 0, a = 0, b = 0;
    (store.allocations || []).forEach((al) => {
      if (!activeIn(al, k)) return;
      c += (pctIn(al, k) / 100) * monthStd(k);
      a += store.actuals[`${al.personId}|${al.projectId}|${k}`] ?? 0;
    });
    Object.entries(store.budget).forEach(([kk, v]) => { if (kk.endsWith(k)) b += v; });
    return { month: monthLabel(k), toPlan: +pctOf(a, b).toFixed(0), toCommit: +pctOf(a, c).toFixed(0) };
  }), [store]);

  /* publish a live snapshot for the docked assistant's What-If analysis */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!loaded) { window.__twWorkforceCtx = null; return; }
    const projLines = store.projects.map((p) => {
      const r = roll.byProject[p.id] || { budget: 0, committed: 0, actual: 0 };
      const outH = out.byProject[p.id] || 0;
      return `${p.code} ${p.name} [${p.phase}] plan=${Math.round(r.budget)}h allocated=${Math.round(r.committed)}h openRequests=${Math.round(outH)}h actual=${Math.round(r.actual)}h`;
    }).join("\n");
    const discLines = DISCIPLINES.map((d) => {
      const heads = store.people.filter((e) => e.disc === d.id).length;
      const loadM = load[month] || {};
      const people = store.people.filter((e) => e.disc === d.id);
      const avg = people.length ? people.reduce((t, e) => t + (loadM[e.id] || 0), 0) / people.length : 0;
      const free = people.filter((e) => (loadM[e.id] || 0) < 100).length;
      return `${d.name} (${d.id}): ${heads} people, avg load ${Math.round(avg)}%, ${free} with spare capacity, rate $${d.rate}/h`;
    }).join("\n");
    const openReq = (store.requests || []).filter((r) => requestState(store, r).status !== "Filled" && r.status !== "Declined");
    window.__twWorkforceCtx = [
      "LIVE WORKFORCE DATA — authoritative current state for What-If analysis. Period = " + monthLabel(month) + (inProgress ? " (in progress)" : "") + ". Hours are per-month; a person at 100% ≈ " + monthStd(month) + "h.",
      `TOTALS this period: plan ${Math.round(roll.tot.budget)}h, allocated ${Math.round(roll.tot.committed)}h, actual ${Math.round(roll.tot.actual)}h. Headcount ${store.people.length}. Open/partial requests ${openReq.length}.`,
      "PROJECTS:\n" + projLines,
      "DISCIPLINES:\n" + discLines,
      "OPEN REQUESTS:\n" + openReq.map((r) => `${r.id} ${project(r.projectId).name} · ${discName(r.disc)} · needs ${monthLabel(r.need)} · ${requestState(store, r).status} · ${r.note}`).join("\n"),
    ].join("\n\n");
  }, [store, month, roll, out, load, loaded, inProgress]);
  useEffect(() => () => { if (typeof window !== "undefined") window.__twWorkforceCtx = null; }, []);

  const TABS = [
    { id: "portfolio", label: "Portfolio", icon: LayoutDashboard },
    { id: "projects", label: "Projects", icon: FolderKanban },
    { id: "people", label: "People", icon: Users2 },
    { id: "requests", label: "Requests", icon: Inbox, badge: (store.requests || []).filter((r) => requestState(store, r).status !== "Filled" && r.status !== "Declined").length },
    { id: "admin", label: "Data & Admin", icon: Database },
  ];

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "26px 22px 0" }}>
      {/* header */}
      <div className="tf-fade" style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--panel2)", border: "1px solid var(--line2)", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Users2 size={24} color="var(--amber)" />
        </div>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div className="tf-eyebrow" style={{ marginBottom: 8 }}>Workforce Intelligence · Allocation & capacity control</div>
          <h1 className="tf-disp" style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>Who is on what — and where the plan won't hold</h1>
          <p style={{ color: "var(--muted)", margin: "8px 0 0", maxWidth: 640, lineHeight: 1.55 }}>
            Allocation, capacity and timekeeping across projects and disciplines. Import your people and plans, or load sample data to see the module in action.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
          <StatusPill status={status} saveState={saveState} previewing={previewing} loaded={loaded} />
          {!loaded && <button className="tf-btn tf-btn-primary" style={{ padding: "8px 14px" }} onClick={loadSample}><Sparkles size={14} /> Load sample demo data</button>}
        </div>
      </div>

      {previewing && (
        <div className="tf-fade" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "10px 14px", marginBottom: 14, borderRadius: 10, background: "rgba(62,111,224,.08)", border: "1px solid rgba(62,111,224,.25)" }}>
          <Sparkles size={15} color="var(--thread)" />
          <span style={{ fontSize: 13, color: "var(--muted)", flex: 1, minWidth: 220 }}>
            You're viewing <b style={{ color: "var(--ink)" }}>sample data</b> — a local preview. Nothing here is saved to your workspace.
          </span>
          <button className="tf-btn tf-btn-ghost" style={{ padding: "6px 12px" }} onClick={exitPreview}>Exit preview</button>
        </div>
      )}

      {!loaded ? (
        <EmptyState onLoad={loadSample} onImport={() => { setLoaded(true); setTab("admin"); }} canWrite={canWrite} />
      ) : (
        <>
          {/* period + tabs */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 4, background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: 12, padding: 4, overflowX: "auto" }}>
              {TABS.map((t) => {
                const on = tab === t.id;
                return (
                  <button key={t.id} onClick={() => setTab(t.id)} className="tf-mono"
                    style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 600, cursor: "pointer", border: "none", borderRadius: 9, padding: "8px 12px", whiteSpace: "nowrap",
                      background: on ? "var(--panel)" : "transparent", color: on ? "var(--ink)" : "var(--faint)", boxShadow: on ? "0 1px 2px rgba(21,34,45,.08)" : "none" }}>
                    <t.icon size={14} /> {t.label}
                    {t.badge > 0 && <span style={{ fontSize: 10, background: "var(--amber)", color: "#fff", borderRadius: 999, padding: "0 6px" }}>{t.badge}</span>}
                  </button>
                );
              })}
            </div>
            {tab !== "admin" && (
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
                <span className="tf-eyebrow">Period</span>
                <select className="tf-input" style={{ width: "auto", padding: "8px 10px" }} value={month} onChange={(e) => setMonth(e.target.value)}>
                  {MONTHS.map((m) => (
                    <option key={m.key} value={m.key}>{m.label} · {m.std}h{m.key === CURRENT ? " (open)" : m.planning ? " (planning)" : ""}</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {tab === "portfolio" && <Portfolio data={store} roll={roll} out={out} trend={trend} month={month} inProgress={inProgress} project={project} setTab={setTab} />}
          {tab === "projects" && <Projects data={store} setData={setData} roll={roll} out={out} month={month} inProgress={inProgress} project={project} load={load} flash={flash} canWrite={canWrite} />}
          {tab === "people" && <People data={store} setData={setData} load={load} month={month} flash={flash} canWrite={canWrite} />}
          {tab === "requests" && <Requests data={store} setData={setData} month={month} project={project} load={load} flash={flash} canWrite={canWrite} />}
          {tab === "admin" && <Admin data={store} setData={setData} flash={flash} loadSample={loadSample} clearAll={clearAll} canWrite={canWrite} status={status} previewing={previewing} />}
        </>
      )}

      {toast && (
        <div className="tf-fade" style={{ position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)", zIndex: 80, display: "flex", alignItems: "center", gap: 8, padding: "11px 16px", background: "var(--ink)", color: "#fff", borderRadius: 10, fontSize: 13, maxWidth: 520 }}>
          <CheckCircle2 size={16} color="var(--green)" /> {toast}
        </div>
      )}
    </div>
  );
}

/* ---------- empty state ------------------------------------------------- */
function EmptyState({ onLoad, onImport, canWrite }) {
  return (
    <div className="tf-panel tf-fade" style={{ padding: 34, textAlign: "center" }}>
      <div style={{ width: 60, height: 60, borderRadius: 16, background: "var(--panel2)", border: "1px solid var(--line2)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
        <Users2 size={30} color="var(--amber)" />
      </div>
      <h2 className="tf-disp" style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>Start with your workforce, or a live sample</h2>
      <p style={{ color: "var(--muted)", maxWidth: 520, margin: "0 auto 22px", lineHeight: 1.6 }}>
        {canWrite
          ? "Load a seeded organisation to explore every view, or import your own people, projects and Microsoft Project baselines from the admin panel."
          : "No workforce data has been added to your workspace yet. Load a seeded organisation to explore every view — an org admin can import or create the real records."}
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <button className="tf-btn tf-btn-primary" onClick={onLoad}><Sparkles size={15} /> Load sample demo data</button>
        {canWrite && <button className="tf-btn" onClick={onImport}><Upload size={15} /> Import my data</button>}
      </div>
    </div>
  );
}

/* =========================================================================
   Portfolio
   ========================================================================= */
function Portfolio({ data, roll, out, trend, month, inProgress, project, setTab }) {
  const totOut = Object.values(out.byProject).reduce((t, v) => t + v, 0);
  const attain = pctOf(roll.tot.actual, roll.tot.budget);
  const util = (() => {
    const load = loadByMonth(data)[month] || {};
    const vals = data.people.map((e) => load[e.id] || 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  })();
  const overProjects = data.projects.filter((p) => {
    const r = roll.byProject[p.id] || { budget: 0, committed: 0 };
    return r.committed + (out.byProject[p.id] || 0) > r.budget * 1.001 && r.budget > 0;
  });

  const rows = data.projects
    .map((p) => ({ p, r: roll.byProject[p.id] || { budget: 0, committed: 0, actual: 0 }, o: out.byProject[p.id] || 0 }))
    .filter((x) => x.r.budget > 0 || x.r.committed > 0 || x.o > 0)
    .sort((a, b) => (b.r.committed + b.o) - (a.r.committed + a.o));

  return (
    <div className="tf-fade">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 18 }}>
        <KPI label="Headcount" value={data.people.length} sub={`${DISCIPLINES.length} disciplines`} />
        <KPI label={`Avg utilisation · ${monthLabel(month)}`} value={fmtPct(util)} tone={util > 100 ? "var(--red)" : util > 85 ? "var(--amber)" : "var(--ink)"} sub={`ceiling ${POLICY_MAX_DEFAULT}%`} />
        <KPI label="Allocated vs plan" value={roll.tot.budget ? fmtPct(pctOf(roll.tot.committed, roll.tot.budget)) : "—"} sub={`${fmtH(roll.tot.committed)} / ${fmtH(roll.tot.budget)}`} />
        <KPI label="Open request demand" value={fmtH(totOut)} tone={totOut > 0 ? "var(--thread)" : "var(--ink)"} sub={`${overProjects.length} project${overProjects.length === 1 ? "" : "s"} over plan`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, marginBottom: 18 }} className="tf-cols">
        {/* demand bars */}
        <div className="tf-panel" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <h3 className="tf-disp" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Demand vs plan · {monthLabel(month)}</h3>
            <span className="tf-mono" style={{ fontSize: 11, color: "var(--faint)" }}>allocated + open requests, against plan</span>
          </div>
          <div style={{ marginBottom: 14 }}><DemandKey /></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 13, maxHeight: 340, overflowY: "auto" }} className="tf-scroll">
            {rows.slice(0, 12).map(({ p, r, o }) => (
              <div key={p.id} onClick={() => setTab("projects")} style={{ cursor: "pointer" }} className="tf-row" title="Open Projects">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12.5 }}>
                  <span style={{ fontWeight: 600 }}>{p.name} <span className="tf-mono" style={{ color: "var(--faint)", fontSize: 11 }}>{p.code}</span></span>
                  <span className="tf-mono" style={{ color: "var(--faint)", fontSize: 11 }}>{fmtH(r.committed)}{o > 0 ? ` +${fmtH(o)}` : ""} / {fmtH(r.budget)}</span>
                </div>
                <DemandBar budget={r.budget} committed={r.committed} outstanding={o} />
              </div>
            ))}
            {!rows.length && <div style={{ color: "var(--faint)", fontSize: 13, padding: 20, textAlign: "center" }}>No allocations in {monthLabel(month)}.</div>}
          </div>
        </div>

        {/* attainment trend */}
        <div className="tf-panel" style={{ padding: 18 }}>
          <h3 className="tf-disp" style={{ fontSize: 18, fontWeight: 700, margin: "0 0 2px" }}>Attainment trend</h3>
          <p className="tf-mono" style={{ fontSize: 11, color: "var(--faint)", margin: "0 0 12px" }}>actual hours vs plan, by month</p>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--faint)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--faint)" }} domain={[0, 140]} />
                <ReferenceLine y={100} stroke="var(--green)" strokeDasharray="4 4" />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--line2)" }} formatter={(v) => v + "%"} />
                <Line type="monotone" dataKey="toPlan" name="vs plan" stroke="var(--amber)" strokeWidth={2.4} dot={{ r: 2.5 }} />
                <Line type="monotone" dataKey="toCommit" name="vs allocated" stroke="var(--thread)" strokeWidth={2} strokeDasharray="4 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
            <span className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)", display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 14, height: 3, background: "var(--amber)" }} /> vs plan</span>
            <span className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)", display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 14, height: 3, background: "var(--thread)" }} /> vs allocated</span>
          </div>
        </div>
      </div>

      {/* discipline capacity strip */}
      <div className="tf-panel" style={{ padding: 18 }}>
        <h3 className="tf-disp" style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px" }}>Discipline capacity · {monthLabel(month)}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
          {DISCIPLINES.map((d) => {
            const load = loadByMonth(data)[month] || {};
            const ppl = data.people.filter((e) => e.disc === d.id);
            if (!ppl.length) return null;
            const avg = ppl.reduce((t, e) => t + (load[e.id] || 0), 0) / ppl.length;
            const free = ppl.filter((e) => (load[e.id] || 0) < 95).length;
            return (
              <div key={d.id} style={{ padding: 12, border: "1px solid var(--line)", borderRadius: 10, background: "var(--panel2)" }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{d.name}</div>
                <div className="tf-mono" style={{ fontSize: 11, color: "var(--faint)", marginBottom: 8 }}>{ppl.length} people · {free} free</div>
                <div style={{ height: 7, background: "var(--inset)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${clamp(avg, 0, 100)}%`, background: avg > 100 ? "var(--red)" : avg > 85 ? "var(--amber)" : "var(--green)" }} />
                </div>
                <div className="tf-mono" style={{ fontSize: 11, color: "var(--faint)", marginTop: 5 }}>{fmtPct(avg)} avg load</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   Projects
   ========================================================================= */
function Projects({ data, setData, roll, out, month, inProgress, project, load, flash, canWrite }) {
  const [sel, setSel] = useState(null);
  const [creating, setCreating] = useState(false);
  const rows = data.projects.map((p) => ({ p, r: roll.byProject[p.id] || { budget: 0, committed: 0, actual: 0 }, o: out.byProject[p.id] || 0 }));

  if (sel) {
    const p = project(sel);
    const lines = roll.lines.filter((l) => l.projectId === sel).sort((a, b) => b.committed - a.committed);
    const r = roll.byProject[sel] || { budget: 0, committed: 0, actual: 0 };
    return (
      <div className="tf-fade">
        <button className="tf-link" onClick={() => setSel(null)} style={{ marginBottom: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>← All projects</button>
        <div className="tf-panel" style={{ padding: 18, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 className="tf-disp" style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{p.name}</h2>
              <div className="tf-mono" style={{ fontSize: 12, color: "var(--faint)", marginTop: 4 }}>{p.code} · {p.phase} · {p.customer} · PM {p.manager} · Lead {p.lead}</div>
            </div>
            <div style={{ display: "flex", gap: 20 }}>
              <div><div className="tf-eyebrow">Plan</div><div className="tf-disp" style={{ fontSize: 22, fontWeight: 800 }}>{fmtH(r.budget)}</div></div>
              <div><div className="tf-eyebrow">Allocated</div><div className="tf-disp" style={{ fontSize: 22, fontWeight: 800, color: r.committed > r.budget ? "var(--red)" : "var(--amber)" }}>{fmtH(r.committed)}</div></div>
              <div><div className="tf-eyebrow">Actual</div><div className="tf-disp" style={{ fontSize: 22, fontWeight: 800, color: attColor(pctOf(r.actual, r.budget), inProgress) }}>{inProgress ? "—" : fmtH(r.actual)}</div></div>
            </div>
          </div>
          <div style={{ marginTop: 14 }}><DemandBar budget={r.budget} committed={r.committed} outstanding={out.byProject[sel] || 0} height={14} /></div>
        </div>
        <div className="tf-panel" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", fontWeight: 600, fontSize: 14 }}>People on {p.name} · {monthLabel(month)}</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ textAlign: "left", color: "var(--faint)", fontSize: 11 }}>
              {["Person", "Discipline", "Location", "Allocation", "Actual"].map((h) => <th key={h} style={{ padding: "8px 16px", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id} className="tf-row" style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ padding: "9px 16px", fontWeight: 500 }}>{l.person.name} <Seniority level={l.person.seniority} /></td>
                  <td style={{ padding: "9px 16px" }}>{discName(l.person.disc)}</td>
                  <td style={{ padding: "9px 16px", color: "var(--muted)" }}>{locName(l.person.loc)}</td>
                  <td style={{ padding: "9px 16px" }} className="tf-mono">{l.pct}% · {fmtH(l.committed)}</td>
                  <td style={{ padding: "9px 16px" }} className="tf-mono">{inProgress ? "—" : fmtH(l.actual)}</td>
                </tr>
              ))}
              {!lines.length && <tr><td colSpan={5} style={{ padding: 20, textAlign: "center", color: "var(--faint)" }}>No one allocated in {monthLabel(month)}.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="tf-fade">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
        <div className="tf-mono" style={{ fontSize: 12, color: "var(--faint)" }}>{rows.length} project{rows.length === 1 ? "" : "s"}</div>
        {canWrite && <button className="tf-btn tf-btn-primary" onClick={() => setCreating(true)}><Plus size={14} /> New project</button>}
      </div>
      <div className="tf-panel" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr style={{ textAlign: "left", color: "var(--faint)", fontSize: 11 }}>
            {["Project", "Phase", "Customer", "Plan → allocated", "Attain", ""].map((h) => <th key={h} style={{ padding: "10px 16px", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map(({ p, r, o }) => {
              const att = pctOf(r.actual, r.budget);
              return (
                <tr key={p.id} className="tf-row" style={{ borderTop: "1px solid var(--line)", cursor: "pointer" }} onClick={() => setSel(p.id)}>
                  <td style={{ padding: "11px 16px", fontWeight: 600 }}>{p.name}<div className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)" }}>{p.code}</div></td>
                  <td style={{ padding: "11px 16px" }}><Chip tone="blue">{p.phase}</Chip></td>
                  <td style={{ padding: "11px 16px", color: "var(--muted)" }}>{p.customer}</td>
                  <td style={{ padding: "11px 16px", minWidth: 200 }}>
                    <DemandBar budget={r.budget} committed={r.committed} outstanding={o} />
                    <div className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 4 }}>{fmtH(r.committed)}{o > 0 ? ` +${fmtH(o)} open` : ""} / {fmtH(r.budget)}</div>
                  </td>
                  <td style={{ padding: "11px 16px" }}><span className="tf-mono" style={{ color: attColor(att, inProgress), fontWeight: 600 }}>{inProgress || !r.budget ? "—" : fmtPct(att)}</span></td>
                  <td style={{ padding: "11px 16px", color: "var(--faint)" }}><ArrowRight size={15} /></td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: "var(--faint)" }}>No projects yet — add one, import a list, or load sample data.</td></tr>}
          </tbody>
        </table>
      </div>
      {creating && <ProjectModal data={data} setData={setData} flash={flash} onClose={() => setCreating(false)} />}
    </div>
  );
}

/* =========================================================================
   People
   ========================================================================= */
function People({ data, setData, load, month, flash, canWrite }) {
  const [q, setQ] = useState("");
  const [disc, setDisc] = useState("all");
  const [avail, setAvail] = useState(false);
  const [creating, setCreating] = useState(false);
  const loadM = load[month] || {};
  const rows = data.people
    .filter((e) => (disc === "all" || e.disc === disc) && (!q || e.name.toLowerCase().includes(q.toLowerCase())) && (!avail || (loadM[e.id] || 0) < 95))
    .sort((a, b) => (loadM[b.id] || 0) - (loadM[a.id] || 0));

  return (
    <div className="tf-fade">
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={15} color="var(--faint)" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
          <input className="tf-input" style={{ paddingLeft: 32 }} placeholder="Search people…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="tf-input" style={{ width: "auto" }} value={disc} onChange={(e) => setDisc(e.target.value)}>
          <option value="all">All disciplines</option>
          {DISCIPLINES.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <button className="tf-btn" onClick={() => setAvail((v) => !v)} style={{ borderColor: avail ? "var(--amber)" : undefined, color: avail ? "var(--amber)" : undefined }}>
          <Gauge size={14} /> Spare capacity only
        </button>
        {canWrite && <button className="tf-btn tf-btn-primary" onClick={() => setCreating(true)}><Plus size={14} /> New person</button>}
      </div>
      <div className="tf-panel" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr style={{ textAlign: "left", color: "var(--faint)", fontSize: 11 }}>
            {["Person", "Discipline", "Location", "Level", `Load · ${monthLabel(month)}`].map((h) => <th key={h} style={{ padding: "10px 16px", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.slice(0, 120).map((e) => {
              const l = loadM[e.id] || 0;
              return (
                <tr key={e.id} className="tf-row" style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ padding: "9px 16px", fontWeight: 500 }}>{e.name}</td>
                  <td style={{ padding: "9px 16px" }}>{discName(e.disc)}</td>
                  <td style={{ padding: "9px 16px", color: "var(--muted)" }}>{locName(e.loc)}</td>
                  <td style={{ padding: "9px 16px" }}><Seniority level={e.seniority} /></td>
                  <td style={{ padding: "9px 16px", minWidth: 160 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 7, background: "var(--inset)", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${clamp(l, 0, 100)}%`, background: l > 100 ? "var(--red)" : l > 90 ? "var(--amber)" : l === 0 ? "var(--line2)" : "var(--green)" }} />
                      </div>
                      <span className="tf-mono" style={{ fontSize: 11, color: l === 0 ? "var(--faint)" : "var(--muted)", width: 38, textAlign: "right" }}>{fmtPct(l)}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "var(--faint)" }}>No one matches.</td></tr>}
          </tbody>
        </table>
      </div>
      {rows.length > 120 && <div className="tf-mono" style={{ fontSize: 11, color: "var(--faint)", marginTop: 8, textAlign: "center" }}>Showing first 120 of {rows.length}.</div>}
      {creating && <PersonModal data={data} setData={setData} flash={flash} onClose={() => setCreating(false)} />}
    </div>
  );
}

/* =========================================================================
   Requests — fill, decline, and create resource asks
   ========================================================================= */
function Requests({ data, setData, month, project, load, flash, canWrite }) {
  const [fill, setFill] = useState(null);
  const [creating, setCreating] = useState(false);
  const open = (data.requests || []).filter((r) => r.status !== "Declined");

  const decline = (id) => { setData((d) => ({ ...d, requests: d.requests.map((r) => r.id === id ? { ...r, status: "Declined" } : r) })); flash(`${id} declined.`); };

  return (
    <div className="tf-fade">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
        <div className="tf-mono" style={{ fontSize: 12, color: "var(--faint)" }}>{open.filter((r) => requestState(data, r).status !== "Filled").length} open · {open.filter((r) => requestState(data, r).status === "Filled").length} filled</div>
        {canWrite && <button className="tf-btn tf-btn-primary" onClick={() => setCreating(true)}><Plus size={14} /> New request</button>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {open.map((r) => {
          const st = requestState(data, r);
          const p = project(r.projectId);
          const tone = st.status === "Filled" ? "green" : st.status === "Partially filled" ? "yellow" : "red";
          return (
            <div key={r.id} className="tf-panel" style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span className="tf-mono" style={{ fontSize: 12, fontWeight: 600 }}>{r.id}</span>
                    <Chip tone={tone}>{st.status}</Chip>
                    <Chip tone="blue">{discName(r.disc)}</Chip>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name} <span className="tf-mono" style={{ fontSize: 11, color: "var(--faint)" }}>{p.code}</span></div>
                  <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>{r.note}</div>
                  <div className="tf-mono" style={{ fontSize: 11, color: "var(--faint)", marginTop: 6 }}>
                    Ask {rangeLabel(r)} · needs {monthLabel(r.need)} · {st.months.map((m) => `${m.label} ${m.ask}%`).join(" · ")}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, justifyContent: "center" }}>
                  <div className="tf-disp" style={{ fontSize: 20, fontWeight: 800, color: tone === "green" ? "var(--green)" : "var(--ink)" }}>{fmtPct(st.pct)}<span style={{ fontSize: 12, color: "var(--faint)" }}> covered</span></div>
                  {st.status !== "Filled" && canWrite && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="tf-btn tf-btn-ghost" style={{ padding: "6px 12px" }} onClick={() => decline(r.id)}>Decline</button>
                      <button className="tf-btn tf-btn-primary" style={{ padding: "6px 12px" }} onClick={() => setFill(r)}>Fill</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {!open.length && <div className="tf-panel" style={{ padding: 24, textAlign: "center", color: "var(--faint)" }}>No open requests.</div>}
      </div>

      {fill && <FillModal data={data} setData={setData} req={fill} load={load} project={project} flash={flash} onClose={() => setFill(null)} />}
      {creating && <CreateModal data={data} setData={setData} project={project} flash={flash} onClose={() => setCreating(false)} />}
    </div>
  );
}

function Modal({ title, sub, onClose, children, wide }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(21,34,45,.5)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", padding: 18 }}>
      <div onClick={(e) => e.stopPropagation()} className="tf-panel" style={{ width: wide ? 640 : 480, maxWidth: "100%", maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div><h3 className="tf-disp" style={{ fontSize: 19, fontWeight: 700, margin: 0 }}>{title}</h3>{sub && <div className="tf-mono" style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>{sub}</div>}</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted)" }}><X size={18} /></button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

function FillModal({ data, setData, req, load, project, flash, onClose }) {
  const st = requestState(data, req);
  const need = liveMonths(req);
  const candidates = data.people.filter((e) => e.disc === req.disc)
    .map((e) => {
      const room = need.reduce((min, m) => Math.min(min, POLICY_MAX_DEFAULT - ((load[m.key] || {})[e.id] || 0)), 999);
      return { e, room };
    })
    .filter((c) => c.room > 0)
    .sort((a, b) => b.room - a.room);

  const assign = (e) => {
    const pcts = {};
    st.months.forEach((m) => {
      const room = POLICY_MAX_DEFAULT - ((load[m.key] || {})[e.id] || 0);
      const take = Math.min(m.short, Math.max(0, room));
      if (take > 0) pcts[m.key] = take;
    });
    if (!Object.keys(pcts).length) { flash(`${e.name} has no spare capacity in the needed months.`); return; }
    const alloc = { id: `A${data.allocations.length}`, personId: e.id, projectId: req.projectId, pcts, source: req.id };
    setData((d) => ({ ...d, allocations: [...d.allocations, alloc] }));
    flash(`${e.name} added to ${req.id}.`);
    onClose();
  };

  return (
    <Modal title={`Fill ${req.id}`} sub={`${project(req.projectId).name} · ${discName(req.disc)} · short ${st.months.filter((m) => m.short > 0).map((m) => `${m.label} ${m.short}%`).join(", ") || "—"}`} onClose={onClose} wide>
      <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 0 }}>People in {discName(req.disc)} with room in the needed months. Assigning fills each month up to the remaining ask, capped at the {POLICY_MAX_DEFAULT}% ceiling.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto" }} className="tf-scroll">
        {candidates.slice(0, 30).map(({ e, room }) => (
          <div key={e.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", border: "1px solid var(--line)", borderRadius: 9 }}>
            <div><div style={{ fontWeight: 500, fontSize: 13 }}>{e.name} <Seniority level={e.seniority} /></div><div className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)" }}>{locName(e.loc)} · {Math.round(room)}% free</div></div>
            <button className="tf-btn tf-btn-primary" style={{ padding: "6px 12px" }} onClick={() => assign(e)}>Assign</button>
          </div>
        ))}
        {!candidates.length && <div style={{ color: "var(--faint)", fontSize: 13, textAlign: "center", padding: 16 }}>No one in this discipline has spare capacity.</div>}
      </div>
    </Modal>
  );
}

function CreateModal({ data, setData, project, flash, onClose }) {
  const [projectId, setProjectId] = useState(data.projects[0]?.id || "");
  const [disc, setDisc] = useState("SW");
  const [from, setFrom] = useState(CURRENT);
  const [to, setTo] = useState(MONTHS[Math.min(mIdx(CURRENT) + 2, MONTHS.length - 1)].key);
  const [pct, setPct] = useState(50);
  const [note, setNote] = useState("");

  const submit = () => {
    if (!projectId) { flash("Pick a project first."); return; }
    const ask = flatPcts(from, to, pct);
    if (!Object.keys(ask).length) { flash("Check the month range."); return; }
    const id = `REQ-${1040 + (data.requests || []).length}`;
    setData((d) => ({ ...d, requests: [...d.requests, { id, projectId, disc, ask, seniority: 2, need: from, note: note || "New resource request.", status: "Open" }] }));
    flash(`${id} created.`);
    onClose();
  };

  return (
    <Modal title="New resource request" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label><div className="tf-eyebrow" style={{ marginBottom: 5 }}>Project</div>
          <select className="tf-input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>{data.projects.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.code}</option>)}</select></label>
        <label><div className="tf-eyebrow" style={{ marginBottom: 5 }}>Discipline</div>
          <select className="tf-input" value={disc} onChange={(e) => setDisc(e.target.value)}>{DISCIPLINES.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
        <div style={{ display: "flex", gap: 10 }}>
          <label style={{ flex: 1 }}><div className="tf-eyebrow" style={{ marginBottom: 5 }}>From</div>
            <select className="tf-input" value={from} onChange={(e) => setFrom(e.target.value)}>{MONTHS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}</select></label>
          <label style={{ flex: 1 }}><div className="tf-eyebrow" style={{ marginBottom: 5 }}>To</div>
            <select className="tf-input" value={to} onChange={(e) => setTo(e.target.value)}>{MONTHS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}</select></label>
        </div>
        <label><div className="tf-eyebrow" style={{ marginBottom: 5 }}>Loading — {pct}%</div>
          <input type="range" min={10} max={100} step={5} value={pct} onChange={(e) => setPct(+e.target.value)} style={{ width: "100%" }} /></label>
        <label><div className="tf-eyebrow" style={{ marginBottom: 5 }}>Note</div>
          <input className="tf-input" value={note} placeholder="Why is this needed?" onChange={(e) => setNote(e.target.value)} /></label>
        <button className="tf-btn tf-btn-primary" style={{ justifyContent: "center" }} onClick={submit}>Create request</button>
      </div>
    </Modal>
  );
}

/* Manually add a person, with their engineering role (discipline). */
function PersonModal({ data, setData, flash, onClose }) {
  const [name, setName] = useState("");
  const [disc, setDisc] = useState("SW");
  const [loc, setLoc] = useState("REM");
  const [seniority, setSeniority] = useState(2);

  const nextId = () => {
    let n = data.people.filter((e) => e.disc === disc).length + 1;
    let id = `${disc}-${String(n).padStart(3, "0")}`;
    const taken = new Set(data.people.map((e) => e.id));
    while (taken.has(id)) { n += 1; id = `${disc}-${String(n).padStart(3, "0")}`; }
    return id;
  };

  const submit = () => {
    if (!name.trim()) { flash("Give the person a name."); return; }
    const person = { id: nextId(), name: name.trim(), disc, loc, seniority: Number(seniority), rate: null, active: true };
    setData((d) => ({ ...d, people: [...d.people, person] }));
    flash(`${person.name} added to ${discName(disc)}.`);
    onClose();
  };

  return (
    <Modal title="New person" sub="Add an engineer or team member to the workforce" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label><div className="tf-eyebrow" style={{ marginBottom: 5 }}>Full name</div>
          <input className="tf-input" value={name} placeholder="e.g. Priya Rao" autoFocus onChange={(e) => setName(e.target.value)} /></label>
        <div style={{ display: "flex", gap: 10 }}>
          <label style={{ flex: 1 }}><div className="tf-eyebrow" style={{ marginBottom: 5 }}>Engineering role</div>
            <select className="tf-input" value={disc} onChange={(e) => setDisc(e.target.value)}>{DISCIPLINES.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
          <label style={{ flex: 1 }}><div className="tf-eyebrow" style={{ marginBottom: 5 }}>Location</div>
            <select className="tf-input" value={loc} onChange={(e) => setLoc(e.target.value)}>{LOCATIONS.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}</select></label>
        </div>
        <label><div className="tf-eyebrow" style={{ marginBottom: 5 }}>Seniority</div>
          <select className="tf-input" value={seniority} onChange={(e) => setSeniority(+e.target.value)}>
            <option value={1}>Junior</option><option value={2}>Mid</option><option value={3}>Senior</option>
          </select></label>
        <button className="tf-btn tf-btn-primary" style={{ justifyContent: "center" }} onClick={submit}>Add person</button>
      </div>
    </Modal>
  );
}

/* Manually add a project, with the resources it requires per discipline. */
function ProjectModal({ data, setData, flash, onClose }) {
  const PHASES = ["Concept", "Design", "Integration", "Qualification", "Production", "Sustaining"];
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [manager, setManager] = useState("");
  const [lead, setLead] = useState("");
  const [phase, setPhase] = useState("Design");
  const [customer, setCustomer] = useState("");
  const [required, setRequired] = useState({});   // disciplineCode -> FTE

  const setReq = (disc, v) => setRequired((r) => { const n = { ...r }; const f = Math.max(0, +v || 0); if (f) n[disc] = f; else delete n[disc]; return n; });

  const submit = () => {
    if (!name.trim()) { flash("Give the project a name."); return; }
    const n = data.projects.length + 1;
    const id = `P${n}-${Date.now().toString(36).slice(-4)}`;
    const project = {
      id, code: code.trim() || `PRJ-${1000 + n}`, name: name.trim(),
      manager: manager.trim() || "—", lead: lead.trim() || "—", phase,
      customer: customer.trim() || "—", required,
    };
    setData((d) => ({ ...d, projects: [...d.projects, project] }));
    const reqN = Object.keys(required).length;
    flash(`${project.name} added${reqN ? ` · required set for ${reqN} discipline${reqN === 1 ? "" : "s"}` : ""}.`);
    onClose();
  };

  return (
    <Modal title="New project" sub="Required resources per discipline become the project's plan" onClose={onClose} wide>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <label style={{ flex: 2 }}><div className="tf-eyebrow" style={{ marginBottom: 5 }}>Project name</div>
            <input className="tf-input" value={name} placeholder="e.g. Aurora" autoFocus onChange={(e) => setName(e.target.value)} /></label>
          <label style={{ flex: 1 }}><div className="tf-eyebrow" style={{ marginBottom: 5 }}>Code</div>
            <input className="tf-input" value={code} placeholder="PRJ-1001" onChange={(e) => setCode(e.target.value)} /></label>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <label style={{ flex: 1 }}><div className="tf-eyebrow" style={{ marginBottom: 5 }}>Program manager</div>
            <input className="tf-input" value={manager} onChange={(e) => setManager(e.target.value)} /></label>
          <label style={{ flex: 1 }}><div className="tf-eyebrow" style={{ marginBottom: 5 }}>Engineering lead</div>
            <input className="tf-input" value={lead} onChange={(e) => setLead(e.target.value)} /></label>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <label style={{ flex: 1 }}><div className="tf-eyebrow" style={{ marginBottom: 5 }}>Phase</div>
            <select className="tf-input" value={phase} onChange={(e) => setPhase(e.target.value)}>{PHASES.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
          <label style={{ flex: 1 }}><div className="tf-eyebrow" style={{ marginBottom: 5 }}>Customer</div>
            <input className="tf-input" value={customer} onChange={(e) => setCustomer(e.target.value)} /></label>
        </div>
        <div>
          <div className="tf-eyebrow" style={{ marginBottom: 6 }}>Required resources — FTE per discipline</div>
          <div className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)", marginBottom: 8 }}>1.0 FTE ≈ one full-time person (≈{monthStd(CURRENT)}h/month). This sets the monthly plan the demand bars measure against.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
            {DISCIPLINES.map((d) => (
              <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--line)", borderRadius: 9, padding: "7px 10px" }}>
                <span style={{ flex: 1, fontSize: 12.5 }}>{d.name} <span className="tf-mono" style={{ fontSize: 10, color: "var(--faint)" }}>{d.id}</span></span>
                <input className="tf-input" type="number" min={0} step={0.5} value={required[d.id] ?? ""} placeholder="0"
                  style={{ width: 62, padding: "5px 7px", textAlign: "right" }} onChange={(e) => setReq(d.id, e.target.value)} />
              </div>
            ))}
          </div>
        </div>
        <button className="tf-btn tf-btn-primary" style={{ justifyContent: "center" }} onClick={submit}>Add project</button>
      </div>
    </Modal>
  );
}

/* =========================================================================
   Data & Admin — CSV users, CSV projects, MS Project XML baselines, sample
   ========================================================================= */
function ImportCard({ icon: Icon, title, desc, accept, hint, onFile, count }) {
  const ref = useRef(null);
  const [err, setErr] = useState("");
  const pick = (f) => {
    if (!f) return;
    setErr("");
    const reader = new FileReader();
    reader.onload = () => { try { onFile(String(reader.result), f.name); } catch (e) { setErr(e.message || "Couldn't read that file."); } };
    reader.onerror = () => setErr("Couldn't read that file.");
    reader.readAsText(f);
  };
  return (
    <div className="tf-panel" style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--panel2)", border: "1px solid var(--line2)", display: "grid", placeItems: "center" }}><Icon size={18} color="var(--amber)" /></div>
        <div><div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>{count != null && <div className="tf-mono" style={{ fontSize: 11, color: "var(--thread)" }}>{count} loaded</div>}</div>
      </div>
      <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55, margin: "0 0 10px" }}>{desc}</p>
      <div className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)", background: "var(--inset)", borderRadius: 8, padding: "8px 10px", marginBottom: 12, whiteSpace: "pre-wrap" }}>{hint}</div>
      <input ref={ref} type="file" accept={accept} style={{ display: "none" }} onChange={(e) => { pick(e.target.files[0]); e.target.value = ""; }} />
      <button className="tf-btn" style={{ width: "100%", justifyContent: "center" }} onClick={() => ref.current?.click()}><Upload size={14} /> Choose file</button>
      {err && <div style={{ color: "var(--red)", fontSize: 12, marginTop: 8, display: "flex", gap: 6, alignItems: "center" }}><AlertTriangle size={13} /> {err}</div>}
    </div>
  );
}

function Admin({ data, setData, flash, loadSample, clearAll, canWrite, status, previewing }) {
  const baselineCount = Object.keys(data.baselines || {}).length;

  const onUsers = (text) => {
    const people = importUsersCSV(text);
    if (!people.length) throw new Error("No people found. Expected a header row with a name column.");
    const personById = Object.fromEntries(people.map((e) => [e.id, e]));
    setData((d) => ({ ...d, people, personById }));
    flash(`Imported ${people.length} people.`);
  };
  const onProjects = (text) => {
    const projects = importProjectsCSV(text);
    if (!projects.length) throw new Error("No projects found. Expected a header row with a name column.");
    setData((d) => ({ ...d, projects }));
    flash(`Imported ${projects.length} projects.`);
  };
  const onBaseline = (text, fname) => {
    const { name, planned, taskCount } = parseMSProjectXML(text);
    // match to an existing project by name, else create one
    setData((d) => {
      let projects = d.projects;
      let proj = projects.find((p) => p.name.toLowerCase() === name.toLowerCase());
      if (!proj) {
        proj = { id: "P" + projects.length + "-imp", code: "PRJ-" + (1000 + projects.length), name, manager: "—", lead: "—", phase: "Design", customer: "—" };
        projects = [...projects, proj];
      }
      // baseline planned hours become the budget track (spread evenly across the disciplines present, or a single PM bucket)
      const budget = { ...d.budget };
      Object.entries(planned).forEach(([mk, h]) => { budget[`${proj.id}|PM|${mk}`] = Math.round(h); });
      return { ...d, projects, baselines: { ...d.baselines, [proj.id]: { source: fname, planned, taskCount } }, budget };
    });
    flash(`Baseline “${name}” imported — ${taskCount} tasks, ${Object.keys(planned).length} months.`);
  };

  return (
    <div className="tf-fade">
      <div className="tf-panel" style={{ padding: "16px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", background: "linear-gradient(90deg,rgba(42,70,196,.05),rgba(62,111,224,.03))" }}>
        <Sparkles size={18} color="var(--amber)" />
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Load sample demo data</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Seed a full engineering organisation — people, projects, allocations, baselines and timekeeping — and explore every view.</div>
        </div>
        <button className="tf-btn tf-btn-primary" onClick={loadSample}><Sparkles size={14} /> Load sample data</button>
      </div>

      {!canWrite && (
        <div className="tf-panel" style={{ padding: 16, marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
          <AlertTriangle size={16} color="var(--blue)" />
          <div style={{ fontSize: 13, color: "var(--muted)" }}>You have read-only access to this workspace. Importing and creating records is done by an org admin. You can still load the sample data above as a local preview.</div>
        </div>
      )}

      {canWrite && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14, marginBottom: 16 }}>
          <ImportCard icon={Users2} title="Import people" count={data.people.length || null}
            desc="A CSV of your workforce. Each person becomes available to allocate to projects and requests."
            hint={"CSV columns (header row):\nname, discipline, location, seniority\n\ne.g.  Priya Rao, Software, Austin, Senior"}
            accept=".csv,text/csv" onFile={onUsers} />
          <ImportCard icon={FolderKanban} title="Import projects" count={data.projects.length || null}
            desc="A CSV of the projects people are allocated against, with manager, lead and phase."
            hint={"CSV columns (header row):\ncode, name, manager, lead, phase, customer"}
            accept=".csv,text/csv" onFile={onProjects} />
          <ImportCard icon={FileSpreadsheet} title="Import project baseline" count={baselineCount || null}
            desc="A Microsoft Project export (.xml / MSPDI). Task work is rolled into a monthly plan that becomes the budget track on each demand bar."
            hint={"Microsoft Project → File → Save As → XML (*.xml)\nMatched to a project by name (created if new)."}
            accept=".xml,application/xml,text/xml" onFile={onBaseline} />
        </div>
      )}

      <div className="tf-panel" style={{ padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Current dataset</div>
            <div className="tf-mono" style={{ fontSize: 12, color: "var(--faint)", marginTop: 4 }}>
              {data.people.length} people · {data.projects.length} projects · {data.allocations.length} allocations · {baselineCount} baselines · {(data.requests || []).length} requests
            </div>
          </div>
          {canWrite && <button className="tf-btn tf-btn-ghost" style={{ color: "var(--red)", borderColor: "var(--line2)" }} onClick={clearAll}><Trash2 size={14} /> Clear all data</button>}
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 14, border: "1px dashed var(--line2)", borderRadius: 10, fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6 }}>
        {status === "local" ? (
          <><b style={{ color: "var(--ink)" }}>Local session.</b> You're not signed in, so imports and records stay in this browser. Sign in to a workspace and an org admin's imports and edits are saved to your organisation's database and shared with the team.</>
        ) : previewing ? (
          <><b style={{ color: "var(--ink)" }}>Sample preview.</b> These sample records are a local preview and are not written to your workspace. Exit the preview to return to your saved data; import a CSV or create records to populate the workspace for real.</>
        ) : status === "readonly" ? (
          <><b style={{ color: "var(--ink)" }}>Connected workspace.</b> You're viewing your organisation's saved workforce data. Changes are made by an org admin and are shared across the team.</>
        ) : (
          <><b style={{ color: "var(--ink)" }}>Connected workspace.</b> Imports and records you create here are saved to your organisation's database and shared with the team; every change is logged. On the full tier these imports also run on scheduled syncs from your HRIS, PSA and Microsoft Project Server.</>
        )}
      </div>
    </div>
  );
}

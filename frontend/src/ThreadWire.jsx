import React, { useState, useEffect, useRef, useMemo, useContext } from "react";
import {
  LineChart, Line, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Tooltip,
  AreaChart, Area, BarChart, Bar, CartesianGrid,
} from "recharts";
import {
  Cpu, FileText, GitBranch, Workflow, ArrowRight, ArrowLeft, Activity,
  ShieldCheck, Boxes, ScrollText, Plug, Sparkles, Lock, Upload, Database,
  CircleDot, Send, Bot, AlertTriangle, CheckCircle2, Clock, Gauge,
  Wrench, PackageSearch, FileSpreadsheet, Link2, Layers, Zap, TrendingUp,
  Minus, Trash2, Calculator, SlidersHorizontal, DollarSign, Factory, ChevronDown,
  Coins, Scale, Truck,
  Plus, CalendarDays, ChevronLeft, ChevronRight, User, X, ClipboardList, Building2, Filter,
  Mic, MicOff, Volume2, VolumeX,
} from "lucide-react";

/* =========================================================================
   ThreadWire — Digital Thread platform for manufacturing (concept prototype)
   Rename the brand anywhere "ThreadWire" appears.
   ========================================================================= */

const BRAND = "ThreadWire";

/* ----------------------------- styles ----------------------------------- */
const Styles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

    .tf {
      --bg:#0a0e15; --bg2:#0d121c; --panel:#121a26; --panel2:#172132;
      --line:#243245; --line2:#2f4259;
      --ink:#e7eef6; --muted:#8d9fb5; --faint:#5d6f86;
      --amber:#ff8a3d; --amber-d:#cc6a26;
      --thread:#48d6c8; --thread-d:#2a8f86;
      --green:#43c277; --red:#f0563a; --yellow:#e3b341; --blue:#5aa9ff;
      --disp:'Bricolage Grotesque',sans-serif;
      --body:'IBM Plex Sans',sans-serif;
      --mono:'IBM Plex Mono',monospace;
      color:var(--ink); font-family:var(--body);
      background:
        radial-gradient(900px 500px at 85% -10%, rgba(255,138,61,.10), transparent 60%),
        radial-gradient(800px 600px at 0% 110%, rgba(72,214,200,.08), transparent 55%),
        var(--bg);
      min-height:100vh; letter-spacing:.1px;
    }
    .tf *{box-sizing:border-box}
    .tf-grid-bg{
      background-image:linear-gradient(rgba(47,66,89,.18) 1px,transparent 1px),
                       linear-gradient(90deg,rgba(47,66,89,.18) 1px,transparent 1px);
      background-size:46px 46px;
    }
    .tf-disp{font-family:var(--disp);letter-spacing:-.02em;line-height:1.02}
    .tf-mono{font-family:var(--mono)}
    .tf-eyebrow{font-family:var(--mono);font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:var(--amber)}
    .tf-panel{background:linear-gradient(180deg,var(--panel),var(--bg2));border:1px solid var(--line);border-radius:14px}
    .tf-chip{font-family:var(--mono);font-size:11px;border:1px solid var(--line2);border-radius:999px;padding:3px 10px;color:var(--muted)}
    .tf-btn{font-family:var(--mono);font-size:13px;font-weight:600;border-radius:10px;padding:10px 16px;border:1px solid var(--line2);background:var(--panel2);color:var(--ink);cursor:pointer;transition:.16s;display:inline-flex;align-items:center;gap:8px}
    .tf-btn:hover{border-color:var(--amber);color:#fff;transform:translateY(-1px)}
    .tf-btn-primary{background:linear-gradient(180deg,var(--amber),var(--amber-d));border-color:transparent;color:#1a0f06}
    .tf-btn-primary:hover{filter:brightness(1.08);color:#1a0f06}
    .tf-btn-ghost{background:transparent}
    .tf-link{cursor:pointer;color:var(--muted);transition:.15s;font-family:var(--mono);font-size:13px}
    .tf-link:hover{color:var(--amber)}
    .tf-tile{position:relative;overflow:hidden;cursor:pointer;transition:.2s;background:linear-gradient(180deg,var(--panel),var(--bg2));border:1px solid var(--line);border-radius:18px}
    .tf-tile:hover{transform:translateY(-4px);border-color:var(--line2);box-shadow:0 24px 60px -28px rgba(0,0,0,.8)}
    .tf-tile:hover .tf-tile-arrow{transform:translateX(4px);color:var(--amber)}
    .tf-tile-glow{position:absolute;inset:auto -40px -60px auto;width:200px;height:200px;border-radius:50%;filter:blur(40px);opacity:.18}
    .tf-row:hover{background:var(--panel2)}
    .tf-input{font-family:var(--mono);font-size:13px;background:var(--bg2);border:1px solid var(--line);border-radius:10px;padding:11px 13px;color:var(--ink);width:100%;outline:none}
    .tf-input:focus{border-color:var(--amber)}
    .tf-fade{animation:tfIn .5s ease both}
    .tf-stagger>*{animation:tfIn .5s ease both}
    .tf-stagger>*:nth-child(1){animation-delay:.03s}
    .tf-stagger>*:nth-child(2){animation-delay:.08s}
    .tf-stagger>*:nth-child(3){animation-delay:.13s}
    .tf-stagger>*:nth-child(4){animation-delay:.18s}
    .tf-stagger>*:nth-child(5){animation-delay:.23s}
    .tf-stagger>*:nth-child(6){animation-delay:.28s}
    @keyframes tfIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
    @keyframes tfPulse{0%,100%{opacity:.4}50%{opacity:1}}
    .tf-live-dot{width:8px;height:8px;border-radius:50%;background:var(--green);animation:tfPulse 1.4s infinite}
    .tf-scroll::-webkit-scrollbar{width:8px;height:8px}
    .tf-scroll::-webkit-scrollbar-thumb{background:var(--line2);border-radius:8px}
    .tf-thread-line{stroke:var(--thread);stroke-width:1.5;fill:none;stroke-dasharray:4 4;animation:tfDash 1.2s linear infinite}
    @keyframes tfDash{to{stroke-dashoffset:-16}}
    .tf-tag{font-family:var(--mono);font-size:10.5px;letter-spacing:.04em;padding:2px 8px;border-radius:6px;border:1px solid var(--line2)}
  `}</style>
);

/* ----------------------------- helpers ---------------------------------- */
async function askClaude(system, userText, history = []) {
  try {
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system,
        messages: [...history, { role: "user", content: userText }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.text || null;
  } catch {
    return null;
  }
}

const fmtUSD = (n) =>
  n >= 1000 ? "$" + (n / 1000).toFixed(n % 1000 ? 1 : 0) + "k" : "$" + n;

function StatusDot({ tone }) {
  const c = { green: "var(--green)", red: "var(--red)", yellow: "var(--yellow)", blue: "var(--blue)", thread: "var(--thread)" }[tone] || "var(--muted)";
  return <span style={{ width: 8, height: 8, borderRadius: 99, background: c, display: "inline-block" }} />;
}
function Tag({ children, tone = "muted" }) {
  const map = {
    green: ["rgba(67,194,119,.12)", "var(--green)"],
    red: ["rgba(240,86,58,.12)", "var(--red)"],
    yellow: ["rgba(227,179,65,.12)", "var(--yellow)"],
    blue: ["rgba(90,169,255,.12)", "var(--blue)"],
    thread: ["rgba(72,214,200,.12)", "var(--thread)"],
    amber: ["rgba(255,138,61,.12)", "var(--amber)"],
    muted: ["rgba(141,159,181,.10)", "var(--muted)"],
  };
  const [bg, fg] = map[tone] || map.muted;
  return <span className="tf-tag" style={{ background: bg, color: fg, borderColor: "transparent" }}>{children}</span>;
}

/* ----------------------------- mock data -------------------------------- */
const LIFECYCLE = [
  { k: "plan", label: "Plan", icon: Layers },
  { k: "design", label: "Design", icon: GitBranch },
  { k: "procure", label: "Procure", icon: PackageSearch },
  { k: "build", label: "Build", icon: Wrench },
  { k: "commission", label: "Commission", icon: Zap },
  { k: "operate", label: "Operate", icon: Activity },
  { k: "maintain", label: "Maintain", icon: Gauge },
  { k: "retire", label: "Retire", icon: CircleDot },
];

const ASSETS = [
  { id: "AST-104", name: "5-Axis CNC Mill", line: "Machining Cell A", stage: "operate", oee: 91, health: 96, next: "12 days", status: "green" },
  { id: "AST-118", name: "Robotic Welder R2", line: "Weld Bay 2", stage: "maintain", oee: 78, health: 71, next: "Overdue 2d", status: "yellow" },
  { id: "AST-090", name: "Injection Molder 800T", line: "Molding C", stage: "operate", oee: 88, health: 84, next: "21 days", status: "green" },
  { id: "AST-141", name: "AGV Fleet (x6)", line: "Logistics", stage: "commission", oee: 64, health: 90, next: "Commissioning", status: "blue" },
  { id: "AST-052", name: "Press Brake 200T", line: "Fab", stage: "operate", oee: 83, health: 58, next: "4 days", status: "red" },
  { id: "AST-160", name: "Laser Cutter Fiber-6kW", line: "Fab", stage: "procure", oee: 0, health: 100, next: "PO pending", status: "muted" },
];

const CONTRACTS = [
  { id: "NDA-2241", name: "Mutual NDA — Vertex Sensors", party: "Vertex Sensors Inc.", type: "NDA", status: "Active", risk: "low", value: 0, expiry: "2026-11-02" },
  { id: "MSA-0098", name: "Master Supply Agreement", party: "Helix Alloys GmbH", type: "MSA", status: "Expiring", risk: "med", value: 1850000, expiry: "2026-07-19" },
  { id: "SOW-0451", name: "Integration SOW — Phase 2", party: "Northbridge Automation", type: "SOW", status: "In Review", risk: "high", value: 420000, expiry: "2026-12-31" },
  { id: "SUP-0307", name: "Supply Agreement — PCBA", party: "Sundown Electronics", type: "Supply", status: "Active", risk: "low", value: 980000, expiry: "2027-03-15" },
  { id: "NDA-2255", name: "One-way NDA — Bidder", party: "Quanta Robotics", type: "NDA", status: "Draft", risk: "low", value: 0, expiry: "—" },
];

const REQUIREMENTS = [
  { id: "REQ-001", text: "The actuator shall reach 95% of commanded position within 250 ms under nominal load.", type: "Functional", status: "Verified", verif: "Test", src: "JAMA", tests: ["TC-014", "TC-022"], jira: "MFG-318", design: "DSN-Servo-Loop" },
  { id: "REQ-002", text: "Enclosure shall maintain IP65 ingress protection across the full operating temperature range.", type: "Environmental", status: "In Review", verif: "Inspection", src: "JAMA", tests: ["TC-031"], jira: "MFG-321", design: "DSN-Enclosure" },
  { id: "REQ-003", text: "Controller firmware shall log all fault codes with a UTC timestamp to non-volatile memory.", type: "Functional", status: "Verified", verif: "Test", src: "DOORS", tests: ["TC-009"], jira: "MFG-290", design: "DSN-FW-Logging" },
  { id: "REQ-004", text: "Mean time between failures (MTBF) shall exceed 25,000 operating hours.", type: "Reliability", status: "Open", verif: "Analysis", src: "DOORS", tests: [], jira: "MFG-340", design: "DSN-Reliability" },
  { id: "REQ-005", text: "Emergency stop shall halt all motion within 100 ms of activation per ISO 13850.", type: "Safety", status: "Verified", verif: "Test", src: "JAMA", tests: ["TC-001", "TC-002"], jira: "MFG-201", design: "DSN-Estop" },
  { id: "REQ-006", text: "The HMI shall display current spindle load as a percentage refreshed at least every 500 ms.", type: "Functional", status: "In Review", verif: "Demonstration", src: "JAMA", tests: ["TC-040"], jira: "MFG-355", design: "DSN-HMI" },
];

const WORKORDERS = [
  { id: "WO-7781", part: "PN-3320", desc: "Spindle Assembly", qty: 40, done: 28, status: "In Progress", due: "2026-06-14", tone: "yellow" },
  { id: "WO-7782", part: "PN-1188", desc: "Control Cabinet", qty: 12, done: 12, status: "Complete", due: "2026-06-05", tone: "green" },
  { id: "WO-7790", part: "PN-4501", desc: "Servo Bracket", qty: 200, done: 35, status: "Blocked", due: "2026-06-20", tone: "red" },
  { id: "WO-7795", part: "PN-3320", desc: "Spindle Assembly", qty: 25, done: 0, status: "Released", due: "2026-06-28", tone: "blue" },
];
const BOM = [
  { pn: "PN-3320", desc: "Spindle Assembly", level: 0, qty: 1, src: "Make", onhand: 8, demand: 65 },
  { pn: "PN-3321", desc: "Bearing, angular contact", level: 1, qty: 2, src: "Buy", onhand: 140, demand: 130 },
  { pn: "PN-3322", desc: "Shaft, hardened", level: 1, qty: 1, src: "Make", onhand: 22, demand: 65 },
  { pn: "PN-3323", desc: "Collet nut", level: 1, qty: 1, src: "Buy", onhand: 12, demand: 65 },
];
const ECO = [
  { id: "ECO-220", title: "Bearing supplier change", status: "Approved", affects: ["PN-3321"], jira: "MFG-410" },
  { id: "ECO-231", title: "Shaft tolerance tightening", status: "In Review", affects: ["PN-3322"], jira: "MFG-433" },
];
const POs = [
  { id: "PO-9912", part: "PN-3321", supplier: "Helix Alloys", qty: 200, eta: "2026-06-11", status: "Confirmed", tone: "green" },
  { id: "PO-9920", part: "PN-3323", supplier: "Sundown Elec.", qty: 80, eta: "2026-06-25", status: "Delayed", tone: "red" },
];

/* SPC sample generator */
function genSPC(n = 28, target = 50, sigma = 1.1, seed = 7) {
  let s = seed;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  return Array.from({ length: n }, (_, i) => {
    const noise = (rnd() - 0.5) * sigma * 2;
    const drift = i > 20 ? (i - 20) * 0.18 : 0; // small late drift
    return { i: i + 1, v: +(target + noise + drift).toFixed(2) };
  });
}

/* ----------------------------- shared UI -------------------------------- */
function TopNav({ route, go, tier }) {
  const links = [
    ["home", "Home"], ["thread", "Digital Thread"], ["visibility", "Delivery"], ["finance", "Forecast"], ["blockers", "Blockers"], ["directspend", "Direct Spend"], ["roi", "ROI Calculator"],
  ];
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(10,14,21,.72)", backdropFilter: "blur(10px)", borderBottom: "1px solid var(--line)" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "14px 22px", display: "flex", alignItems: "center", gap: 20 }}>
        <div onClick={() => go("home")} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg,var(--amber),var(--thread))", display: "grid", placeItems: "center" }}>
            <Workflow size={17} color="#0a0e15" strokeWidth={2.4} />
          </div>
          <span className="tf-disp" style={{ fontWeight: 800, fontSize: 19 }}>{BRAND}</span>
        </div>
        <div style={{ display: "flex", gap: 18, marginLeft: 8 }} className="tf-nav">
          {links.map(([k, l]) => (
            <span key={k} className="tf-link" onClick={() => go(k)}
              style={{ color: route === k ? "var(--ink)" : undefined, borderBottom: route === k ? "2px solid var(--amber)" : "2px solid transparent", paddingBottom: 3 }}>
              {l}
            </span>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <span className="tf-chip" style={{ color: tier === "paid" ? "var(--amber)" : "var(--muted)" }}>
            {tier === "paid" ? "● Connected tier" : "○ Free / sample"}
          </span>
          <button className="tf-btn tf-btn-primary" style={{ padding: "8px 14px" }}>Get started</button>
        </div>
      </div>
    </div>
  );
}

function PageHead({ icon: Icon, eyebrow, title, sub, tier, setTier, children }) {
  return (
    <div className="tf-fade" style={{ marginBottom: 26 }}>
      <div className="tf-eyebrow" style={{ marginBottom: 12 }}>{eyebrow}</div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--panel2)", border: "1px solid var(--line2)", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Icon size={24} color="var(--amber)" />
        </div>
        <div style={{ flex: 1, minWidth: 280 }}>
          <h1 className="tf-disp" style={{ fontSize: 34, fontWeight: 800, margin: 0 }}>{title}</h1>
          <p style={{ color: "var(--muted)", margin: "8px 0 0", maxWidth: 640, lineHeight: 1.55 }}>{sub}</p>
        </div>
        {setTier && <TierToggle tier={tier} setTier={setTier} />}
      </div>
      {children}
    </div>
  );
}

function TierToggle({ tier, setTier }) {
  return (
    <div style={{ display: "inline-flex", background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: 12, padding: 4 }}>
      {[["free", "Free · Sample", Sparkles], ["paid", "Connected · Live", Plug]].map(([k, l, I]) => (
        <button key={k} onClick={() => setTier(k)} className="tf-mono"
          style={{
            display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
            border: "none", borderRadius: 9, padding: "8px 14px",
            background: tier === k ? (k === "paid" ? "linear-gradient(180deg,var(--amber),var(--amber-d))" : "var(--panel2)") : "transparent",
            color: tier === k ? (k === "paid" ? "#1a0f06" : "var(--ink)") : "var(--faint)",
          }}>
          <I size={14} /> {l}
        </button>
      ))}
    </div>
  );
}

/* A reusable "connect your real data" gate shown on the paid tier */
function ConnectGate({ title, lines, connectors }) {
  return (
    <div className="tf-panel tf-fade" style={{ padding: 24, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 14, right: 16 }}><Tag tone="amber">CONNECTED TIER</Tag></div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <Plug size={18} color="var(--amber)" />
        <h3 className="tf-disp" style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{title}</h3>
      </div>
      <ul style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.7, margin: "8px 0 18px", paddingLeft: 18 }}>
        {lines.map((l, i) => <li key={i}>{l}</li>)}
      </ul>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginBottom: 18 }}>
        {connectors.map((c) => (
          <div key={c.name} className="tf-panel" style={{ padding: 14, background: "var(--bg2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <c.icon size={16} color="var(--thread)" />
              <span style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</span>
            </div>
            <div className="tf-mono" style={{ fontSize: 11.5, color: "var(--faint)", marginBottom: 10 }}>{c.desc}</div>
            <button className="tf-btn tf-btn-ghost" style={{ width: "100%", justifyContent: "center", padding: "7px" }}>Connect</button>
          </div>
        ))}
      </div>
      <div style={{ borderTop: "1px dashed var(--line2)", paddingTop: 16 }}>
        <div className="tf-eyebrow" style={{ marginBottom: 10 }}>Or import a file (CSV / XLSX)</div>
        <div style={{ border: "1.5px dashed var(--line2)", borderRadius: 12, padding: "22px", textAlign: "center", background: "var(--bg2)" }}>
          <Upload size={22} color="var(--muted)" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 14, color: "var(--muted)" }}>Drag a file here, or <span style={{ color: "var(--amber)" }}>browse</span></div>
          <div className="tf-mono" style={{ fontSize: 11, color: "var(--faint)", marginTop: 6 }}>Mapped automatically to the schema · column mapping editor follows</div>
        </div>
      </div>
    </div>
  );
}

/* ---- per-subject context built from the sample data ---- */
const CTX = {
  assets:
    "ASSET FLEET:\n" +
    ASSETS.map((a) => `${a.id} ${a.name} (${a.line}) stage=${a.stage} OEE=${a.oee || "n/a"}% health=${a.health}% nextPM=${a.next} status=${a.status}`).join("\n") +
    "\n\nSPC: bore-diameter X̄ chart, target 50µm, UCL 53.2, LCL 46.8, Cpk ~1.18, late upward drift on recent subgroups. PLC=Siemens S7-1500, HMI=WinCC Unified, 42 tags mapped.",
  contracts:
    "CONTRACT REPOSITORY:\n" +
    CONTRACTS.map((c) => `${c.id} "${c.name}" type=${c.type} party=${c.party} status=${c.status} risk=${c.risk} value=${c.value ? "$" + c.value.toLocaleString() : "n/a"} expiry=${c.expiry}`).join("\n"),
  requirements:
    "REQUIREMENTS SET (Jama + DOORS):\n" +
    REQUIREMENTS.map((r) => `${r.id} [${r.type}/${r.status}/${r.src}] "${r.text}" tests=${r.tests.join(",") || "NONE"} jira=${r.jira} design=${r.design}`).join("\n"),
  thread:
    "WORK ORDERS:\n" + WORKORDERS.map((w) => `${w.id} ${w.part} ${w.desc} ${w.done}/${w.qty} ${w.status} due ${w.due}`).join("\n") +
    "\n\nBOM (PN-3320 Spindle Assembly):\n" + BOM.map((b) => `${b.pn} ${b.desc} qty/asm ${b.qty} ${b.src} onhand ${b.onhand} demand ${b.demand}`).join("\n") +
    "\n\nECO:\n" + ECO.map((e) => `${e.id} ${e.title} ${e.status} affects ${e.affects.join(",")}`).join("\n") +
    "\n\nPURCHASE ORDERS:\n" + POs.map((p) => `${p.id} ${p.part} ${p.supplier} qty ${p.qty} eta ${p.eta} ${p.status}`).join("\n"),
  home:
    "ThreadWire modules: Asset Management (lifecycle, OEE, SPC, PLC/HMI), Contract Lifecycle (NDAs/MSAs/SOWs), Requirements (Jama/DOORS, traceability), Digital Thread (work orders, BOM, ECO, PO, material forecasting). Free tier = sample data; Connected tier = live integrations.",
};

/* ---- per-page assistant configuration (the "Claude for this tile") ---- */
const ASSISTANT = {
  home: {
    subject: "ThreadWire", accent: "var(--amber)",
    intro: "Ask me anything about your digital thread — I can point you to the right module.",
    suggestions: ["What can ThreadWire do?", "Where do I trace a part?", "Free vs Connected tier?"],
    system: "You are the ThreadWire product assistant for a manufacturing platform. Help users understand and navigate the modules. Be concise.\n\n" + CTX.home,
    fallback: () => "ThreadWire stitches Requirements, Contracts, Assets and the Digital Thread into one place, with an AI assistant on every page. Start on the Free tier with sample data, then connect Jama, DOORS, Jira, your MES/ERP and PLM on the Connected tier. Open any tile to dive in.",
  },
  assets: {
    subject: "Assets & Equipment", accent: "var(--amber)",
    intro: "Ask about asset health, OEE, maintenance or the SPC chart.",
    suggestions: ["Which assets need attention?", "Explain the SPC drift", "What's the lowest OEE?"],
    system: "You are an asset & equipment reliability assistant. Answer ONLY from this data. Reference asset IDs. Be concise.\n\n" + CTX.assets,
    fallback: (q) =>
      /spc|drift|control/i.test(q) ? "The X̄ chart shows a small upward drift on the most recent subgroups, trending toward UCL (53.2µm). Cpk is ~1.18 — capable but worth a tool-wear check before it breaches a control limit."
      : /oee|low/i.test(q) ? "Lowest OEE is AST-118 Robotic Welder R2 at 78% (PM overdue 2 days). AST-141 AGV Fleet shows 64% but it's still in commissioning."
      : "Attention list: AST-052 Press Brake (health 58%, PM in 4 days), AST-118 Welder (PM overdue 2d). Everything else is green. Ask me about any AST-ID.",
  },
  contracts: {
    subject: "Contracts", accent: "var(--thread)",
    intro: "Ask about obligations, renewals or risk across your agreements.",
    suggestions: ["What's expiring soon?", "Highest-risk contract?", "Total contract value?"],
    system: "You are a contract analyst. Answer ONLY from this repository. Reference contract IDs and dates. Be concise.\n\n" + CTX.contracts,
    fallback: (q) =>
      /expir|renew/i.test(q) ? "MSA-0098 (Helix Alloys, $1.85M) expires 2026-07-19 — the nearest renewal, flagged Expiring. Confirm the opt-out window before it auto-renews."
      : /risk|high/i.test(q) ? "Highest risk is SOW-0451 (Northbridge Automation, $420k, In Review) — high risk, likely scope/liability language to review before signing."
      : "5 agreements: 2 Active, 1 Expiring, 1 In Review, 1 Draft. Combined value ~$4.2M. Nearest action: MSA-0098 expiry on 2026-07-19.",
  },
  requirements: {
    subject: "Requirements", accent: "var(--blue)",
    intro: "Chat with your connected requirements — coverage, conflicts, trace.",
    suggestions: ["Which requirements lack tests?", "Summarize safety requirements", "Any conflicts?"],
    system: "You are a requirements analyst. Answer ONLY from this imported set. Cite requirement IDs. Be concise.\n\n" + CTX.requirements,
    fallback: (q) =>
      /coverage|test/i.test(q) ? "REQ-004 (MTBF > 25,000 hrs) has no linked test cases — verified by analysis, but it's a coverage gap. All others have ≥1 linked TC."
      : /safety/i.test(q) ? "Safety: REQ-005 — E-stop must halt all motion within 100 ms per ISO 13850 (Verified, TC-001/TC-002). Only Safety-tagged item in the set."
      : /conflict|ambig/i.test(q) ? "Watch REQ-006 (HMI refresh ≥500 ms) vs REQ-001 (250 ms actuator window) — confirm the slower HMI rate doesn't mislead operators about response."
      : "6 requirements: 3 Verified, 2 In Review, 1 Open. One coverage gap (REQ-004). Ask about a REQ-ID, coverage or trace links.",
  },
  thread: {
    subject: "Material & Thread", accent: "var(--green)",
    intro: "Ask for material status or shortage forecasts across the thread.",
    suggestions: ["Which parts are short?", "Will WO-7781 finish on time?", "Impact of ECO-220?"],
    system: "You are a supply-chain / material planning assistant over a manufacturing digital thread. Answer ONLY from this data, be quantitative, flag shortages. Reference IDs.\n\n" + CTX.thread,
    fallback: (q) =>
      /short|material/i.test(q) ? "Against 65-unit demand: PN-3322 short 43 (22 on-hand), PN-3323 short 53 (12 on-hand) with PO-9920 DELAYED to 06-25. PN-3321 bearings fine (140 vs 130)."
      : /7781|time|finish/i.test(q) ? "WO-7781 is 28/40 (due 06-14). Risk: PN-3323 from delayed PO-9920 (ETA 06-25) jeopardizes the last 12 units. Expedite or use an alternate supplier."
      : /eco-220|eco/i.test(q) ? "ECO-220 (bearing supplier change, Approved) affects PN-3321. Stock covers demand, so no immediate shortage — validate the new supplier's first-article and lead time first."
      : "4 work orders (WO-7790 Blocked), BOM short on PN-3322/PN-3323, PO-9920 delayed. Ask me to forecast a WO or part.",
  },
  roi: {
    subject: "ROI & Business Case", accent: "var(--amber)",
    intro: "Ask how the model works, what to enter, or how to defend the numbers.",
    suggestions: ["Hard vs soft savings?", "What's a credible payback?", "How is NPV calculated?"],
    system: "You are a manufacturing value-engineering / business-case advisor. Help the user build a credible AI ROI case using a value-driver tree, hard vs soft savings, risk adjustment, payback and NPV. Be concise and practical.\n\n" + CTX.home,
    fallback: (q) =>
      /hard|soft/i.test(q) ? "Hard savings hit the P&L and are easy to defend: recovered throughput from less downtime, scrap/rework reduction, inventory carrying, expedite freight, warranty, recovered contract leakage. Soft savings are productivity and risk-avoidance (engineering hours freed, contract/ECO cycle-time) — real, but discount them (this model uses 50%) so finance trusts the case."
      : /payback|npv|discount/i.test(q) ? "Payback is implementation cost divided by monthly net benefit (benefit minus run cost) — most manufacturing AI cases land in 6–18 months. NPV discounts the 3-year net cash flows (default 10%) back to today; a positive NPV with payback under ~18 months is a strong case."
      : "Start with industry + revenue, then refine downtime %, COPQ %, and engineering FTEs — those move the number most. Keep improvement assumptions conservative and swap in your measured baseline before presenting.",
  },
  directspend: {
    subject: "Sourcing & Direct Spend", accent: "var(--thread)",
    intro: "Ask about sourcing events, should-cost, RFQ weighting or supplier choice.",
    suggestions: ["Explain should-cost vs quote", "Who should win SE-1048?", "How does weighting work?"],
    system: "You are a direct-materials sourcing and should-cost advisor for manufacturing procurement. Help with BOM-linked sourcing, weighted RFQ scoring, should-cost modeling and supplier strategy. Be concise and practical.\n\n" + CTX.thread,
    fallback: (q) =>
      /should-cost|should cost|quote/i.test(q) ? "Should-cost builds the price bottom-up (material = mass × commodity price × scrap factor, plus labor, overhead and a fair margin). The gap between the lowest quote and should-cost is your negotiation headroom — multiply it by annual volume to size the prize."
      : /weight|rfq|scoring/i.test(q) ? "Weighted RFQ avoids picking on price alone: score each supplier on price, quality, lead time, supply risk and sustainability, then weight those to your category strategy. Strategic/bottleneck items lean toward risk and lead time; leverage items lean toward price."
      : /se-1048|win|award/i.test(q) ? "For SE-1048 (PN-3322 shaft), the recommendation shifts with your weights: price-weighted favors Midwest Forge (lowest quote), while quality/risk-weighted favors Apex. The should-cost (~$8) shows real headroom against the ~$8.90 best quote."
      : "Sourcing events fire from BOM/ECO changes. Pick one to load its weighted RFQ and should-cost. Ask me to compare suppliers or size the savings.",
  },
  blockers: {
    subject: "Shop-floor Blockers", accent: "var(--red)",
    intro: "Ask which orders are at risk, who owns a blocker, or what to prioritize.",
    suggestions: ["Which blocker risks the most revenue?", "What's open and unassigned?", "Summarize today's blockers"],
    system: "You help a manufacturing ops team triage shop-floor blockers tied to sales orders — by revenue at risk, owner and status. Be concise and action-oriented.\n\n" + CTX.thread,
    fallback: (q, c) => {
      if (!c) return "Blockers are ranked by revenue at risk. Open one to see its impacted orders, parts and work order, assign an owner, and close it when cleared.";
      const lead = c.top ? `Highest-exposure open blocker: \u201c${c.top.title}\u201d at ${fmtMoney(c.top.val)}. ` : "";
      return `${lead}${c.open} blocker${c.open === 1 ? "" : "s"} open or assigned, ${fmtMoney(c.atRisk)} revenue at risk in total. Open one to assign an owner and close it — the delivery calendar and forecast update as you do.`;
    },
  },
  visibility: {
    subject: "Delivery & Order Risk", accent: "var(--amber)",
    intro: "Ask about this week's revenue, at-risk orders, or a customer's delivery.",
    suggestions: ["What's this week's revenue forecast?", "Which orders are at risk?", "Show next week"],
    system: "You help a manufacturing team read a point-in-time delivery calendar: sales orders by promise date, revenue forecast, and which orders carry open blockers. Be concise.\n\n" + CTX.thread,
    fallback: (q, c) => {
      if (!c) return "Open the Delivery calendar to see orders by promise date; each carries committed vs blocked revenue.";
      const site = c.site === "All" ? "all sites" : c.site;
      if (/risk|blocker|blocked/i.test(q) && !/revenue|forecast|committed|expected/i.test(q))
        return `${c.atRisk} order${c.atRisk === 1 ? "" : "s"} this week (${c.weekLabel}, ${site}) carry an open blocker — ${fmtMoney(c.blocked)} at risk. Open a red-banded card to view and close the blocker.`;
      return `This week (${c.weekLabel}, ${site}): expected revenue ${fmtMoney(c.expected)} across ${c.orders} order${c.orders === 1 ? "" : "s"} — ${fmtMoney(c.committed)} committed (clear) and ${fmtMoney(c.blocked)} blocked by open issues (at risk). Clear the blockers and the full ${fmtMoney(c.expected)} ships. Use the site filter or prev/next week to change scope.`;
    },
  },
  finance: {
    subject: "Revenue Forecast", accent: "var(--green)",
    intro: "Ask about committed vs at-risk revenue, a quarter, or what's dragging the forecast.",
    suggestions: ["What's committed this quarter?", "How much revenue is at risk?", "Which quarter looks weakest?"],
    system: "You help a GM read a point-in-time, blocker-aware revenue forecast: committed (clear) vs at-risk (blocked) by quarter and month. Be concise and decision-oriented.\n\n" + CTX.thread,
    fallback: (q, c) => {
      if (!c) return "The forecast splits pipeline into committed (no open blocker) and at-risk (an open blocker on the order). Clearing blockers converts at-risk revenue to committed.";
      return `Across the forecast horizon: ${fmtMoney(c.expected)} total pipeline — ${fmtMoney(c.committed)} committed (clear) and ${fmtMoney(c.blocked)} at risk from open blockers. Clearing the highest-value blockers moves at-risk into committed. Filter by site on the Forecast page for per-location numbers and the per-quarter split.`;
    },
  },
};

/* ---- Docked, minimizable, subject-aware assistant (on every page) ---- */
function DockedAssistant({ route, chat, update, open, setOpen, botCtx }) {
  const cfg = ASSISTANT[route] || ASSISTANT.home;
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);
  const msgs = chat?.msgs || [];
  const hist = chat?.hist || [];
  useEffect(() => { if (open) endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy, open, route]);

  const [listening, setListening] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [convo, setConvo] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const recogRef = useRef(null);
  const convoRef = useRef(false);
  const voiceRef = useRef(false);
  useEffect(() => { convoRef.current = convo; }, [convo]);
  useEffect(() => { voiceRef.current = voiceOn; }, [voiceOn]);
  const sttOk = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const ttsOk = typeof window !== "undefined" && window.speechSynthesis;

  function startListen() {
    if (!sttOk) return;
    window.speechSynthesis && window.speechSynthesis.cancel();
    let r = recogRef.current;
    if (!r) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      r = new SR();
      r.lang = "en-US"; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
      r.onresult = (e) => {
        let interim = "", final = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) final += t; else interim += t;
        }
        if (final) { setInput(""); setListening(false); send(final); }
        else setInput(interim);
      };
      r.onend = () => setListening(false);
      r.onerror = (ev) => { setListening(false); if (ev.error === "not-allowed" || ev.error === "service-not-allowed") setConvo(false); };
      recogRef.current = r;
    }
    try { r.start(); setListening(true); } catch (_) {}
  }
  const stopListen = () => { try { recogRef.current && recogRef.current.stop(); } catch (_) {} setListening(false); };

  const speak = (text) => {
    if (!ttsOk) { if (convoRef.current) startListen(); return; }
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(String(text).replace(/[*_#`>]/g, ""));
    u.rate = 1.03; u.pitch = 1;
    const vs = synth.getVoices();
    const v = vs.find((x) => /Samantha|Google US English|Microsoft (Aria|Jenny|Zira)/i.test(x.name)) || vs.find((x) => /^en/i.test(x.lang));
    if (v) u.voice = v;
    u.onend = () => { setSpeaking(false); if (convoRef.current) startListen(); };
    u.onerror = () => { setSpeaking(false); };
    setSpeaking(true);
    synth.speak(u);
  };

  const toggleMic = () => {
    if (convo || listening) { setConvo(false); stopListen(); window.speechSynthesis && window.speechSynthesis.cancel(); setSpeaking(false); }
    else { setConvo(true); setVoiceOn(true); startListen(); }
  };
  const toggleVoice = () => { setVoiceOn((v) => { const nv = !v; if (!nv) { window.speechSynthesis && window.speechSynthesis.cancel(); setSpeaking(false); } return nv; }); };

  useEffect(() => () => { try { recogRef.current && recogRef.current.abort(); } catch (_) {} window.speechSynthesis && window.speechSynthesis.cancel(); }, []);
  useEffect(() => { if (!open) { setConvo(false); stopListen(); window.speechSynthesis && window.speechSynthesis.cancel(); setSpeaking(false); } }, [open]);
  useEffect(() => { setConvo(false); stopListen(); window.speechSynthesis && window.speechSynthesis.cancel(); setSpeaking(false); }, [route]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput("");
    update(route, (c) => ({ ...c, msgs: [...c.msgs, { role: "user", text: q }] }));
    setBusy(true);
    const reply = await askClaude(cfg.system, q, hist);
    const out = reply || cfg.fallback(q, botCtx);
    update(route, (c) => ({
      msgs: [...c.msgs, { role: "bot", text: out, offline: !reply }],
      hist: [...c.hist, { role: "user", content: q }, { role: "assistant", content: out }].slice(-8),
    }));
    setBusy(false);
    if (voiceRef.current) speak(out);
    else if (convoRef.current) startListen();
  };

  /* minimized pill */
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="tf-fade"
        style={{
          position: "fixed", bottom: 22, right: 22, zIndex: 60, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 10, padding: "12px 18px 12px 12px",
          borderRadius: 999, border: "1px solid var(--line2)",
          background: "linear-gradient(180deg,var(--panel),var(--bg2))",
          boxShadow: "0 18px 50px -18px rgba(0,0,0,.9)", color: "var(--ink)",
        }}>
        <span style={{ width: 32, height: 32, borderRadius: 999, background: cfg.accent, display: "grid", placeItems: "center", position: "relative" }}>
          <Bot size={18} color="#0a0e15" />
          {msgs.length > 0 && <span className="tf-live-dot" style={{ position: "absolute", top: -1, right: -1, border: "2px solid var(--panel)" }} />}
        </span>
        <span style={{ textAlign: "left", lineHeight: 1.1 }}>
          <span className="tf-mono" style={{ fontSize: 10, color: "var(--faint)", display: "block" }}>Ask AI ·</span>
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{cfg.subject}</span>
        </span>
      </button>
    );
  }

  /* expanded panel */
  return (
    <div className="tf-fade" style={{
      position: "fixed", bottom: 22, right: 22, zIndex: 60,
      width: "min(390px, calc(100vw - 32px))", height: "min(560px, calc(100vh - 110px))",
      display: "flex", flexDirection: "column", overflow: "hidden",
      borderRadius: 16, border: "1px solid var(--line2)",
      background: "linear-gradient(180deg,var(--panel),var(--bg2))",
      boxShadow: "0 30px 80px -24px rgba(0,0,0,.95)",
    }}>
      {/* header */}
      <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: cfg.accent, display: "grid", placeItems: "center" }}>
          <Bot size={16} color="#0a0e15" />
        </div>
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{cfg.subject} AI</div>
          <div className="tf-mono" style={{ fontSize: 10, color: "var(--faint)", display: "flex", alignItems: "center", gap: 5 }}>
            <span className="tf-live-dot" style={{ width: 6, height: 6 }} /> scoped to this page
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {ttsOk && (
            <button title={voiceOn ? "Mute spoken replies" : "Speak replies aloud"} onClick={toggleVoice}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: voiceOn ? cfg.accent : "var(--faint)", padding: 6, borderRadius: 8 }}>
              {voiceOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          )}
          {msgs.length > 0 && (
            <button title="Clear" onClick={() => update(route, () => ({ msgs: [], hist: [] }))}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--faint)", padding: 6, borderRadius: 8 }}>
              <Trash2 size={15} />
            </button>
          )}
          <button title="Minimize" onClick={() => setOpen(false)}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted)", padding: 6, borderRadius: 8 }}>
            <Minus size={17} />
          </button>
        </div>
      </div>

      {/* messages */}
      <div className="tf-scroll" style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 11 }}>
        {msgs.length === 0 && (
          <div style={{ color: "var(--faint)", textAlign: "center", marginTop: 22 }}>
            <Sparkles size={22} color={cfg.accent} style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 13, lineHeight: 1.5, padding: "0 8px" }}>{cfg.intro}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center", marginTop: 14 }}>
              {cfg.suggestions.map((s) => (
                <button key={s} onClick={() => send(s)} className="tf-btn tf-btn-ghost" style={{ fontSize: 11.5, padding: "6px 10px" }}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%" }}>
            <div style={{
              padding: "9px 12px", borderRadius: 12, fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap",
              background: m.role === "user" ? "var(--panel2)" : "var(--bg2)",
              border: "1px solid", borderColor: m.role === "user" ? "var(--line2)" : "var(--line)",
            }}>{m.text}</div>
            {m.offline && <div className="tf-mono" style={{ fontSize: 9, color: "var(--faint)", marginTop: 3 }}>offline reasoning over sample data</div>}
          </div>
        ))}
        {busy && <div className="tf-mono" style={{ fontSize: 12, color: "var(--faint)" }}>thinking<span style={{ animation: "tfPulse 1s infinite" }}>…</span></div>}
        <div ref={endRef} />
      </div>

      {/* input */}
      <div style={{ padding: 11, borderTop: "1px solid var(--line)", display: "flex", gap: 7, alignItems: "center" }}>
        {sttOk && (
          <button onClick={toggleMic} title={convo || listening ? "Stop voice conversation" : "Talk to the assistant"}
            style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center", cursor: "pointer",
              border: "1px solid " + (listening || convo ? "var(--red)" : "var(--line2)"),
              background: listening || convo ? "rgba(240,86,58,.16)" : "var(--bg2)",
              color: listening || convo ? "var(--red)" : "var(--muted)",
              animation: listening ? "tfPulse 1.1s infinite" : "none" }}>
            {convo || listening ? <Mic size={16} /> : <MicOff size={16} />}
          </button>
        )}
        <input className="tf-input" value={input}
          placeholder={listening ? "Listening…" : speaking ? "Speaking…" : `Ask about ${cfg.subject.toLowerCase()}…`}
          onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
        <button className="tf-btn tf-btn-primary" onClick={() => send()} disabled={busy} style={{ padding: "10px 13px" }}>
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}

/* ----------------------------- HOME ------------------------------------- */
function Home({ go }) {
  // Problem-first: the user selects the problem(s) they're trying to solve,
  // and the matching digital-thread solution surfaces with a way in.
  const [picked, setPicked] = useState([]);
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const PROBLEMS = [
    { id: "blockers", icon: AlertTriangle, tone: "var(--red)",
      q: "Shop-floor blockers and unplanned disruptions are eroding on-time delivery and putting committed orders at risk.",
      sTitle: "Work-order & issue tracking, tied to order risk", route: "blockers",
      s: "Every work order links to its parts, POs and Jira issues — so a blocked or late operation immediately surfaces the at-risk customer order and its root cause, turning OTD from a lagging metric into a live signal." },
    { id: "visibility", icon: Gauge, tone: "var(--amber)",
      q: "Order, inventory and production status live in disconnected ERP, MES, PLM and spreadsheets — there's no real-time answer to \u201cwhere is my order right now?\u201d",
      sTitle: "A single, real-time view of the thread", route: "visibility",
      s: "Work orders, BOM on-hand vs demand, ECOs and POs are stitched into one connected view you can query at any moment — with an AI assistant for point-in-time status and forecasts." },
    { id: "change", icon: GitBranch, tone: "var(--blue)",
      q: "Engineering changes propagate slowly and unpredictably across BOMs, work orders and suppliers — driving rework, scrap and obsolete inventory.",
      sTitle: "Closed-loop change-impact analysis", route: "thread",
      s: "Trace any ECO through every part, work order and supplier it touches before release, so change is planned upstream — not discovered on the floor." },
    { id: "shortage", icon: PackageSearch, tone: "var(--green)",
      q: "Material shortages and supplier delays surface too late, forcing expedites, line stoppages and missed schedules.",
      sTitle: "Predictive shortage & clear-to-build", route: "thread",
      s: "On-hand is continuously netted against work-order demand across the BOM; delayed POs raise shortage alerts naming the exact work orders and customer orders at risk." },
    { id: "trace", icon: FileText, tone: "var(--blue)",
      q: "We can't trace a requirement or quality issue through design, the as-built configuration and the work order that produced it — slowing audits, root-cause and recalls.",
      sTitle: "End-to-end traceability & genealogy", route: "thread",
      s: "Follow requirement \u2192 part \u2192 ECO \u2192 work order \u2192 PO as one clickable thread; open any object for its metadata and every linked record — built for AS9100 / IATF-grade traceability." },
    { id: "cost", icon: Coins, tone: "var(--thread)",
      q: "Direct material costs swing with volatile commodity markets and fragmented sourcing, eroding margin with little leverage at the table.",
      sTitle: "BOM-linked sourcing, should-cost & commodity control", route: "directspend",
      s: "BOM-driven sourcing events, weighted RFQs and bottom-up should-cost create real negotiation headroom — with commodity-index exposure and hedging alerts." },
    { id: "risk", icon: Scale, tone: "var(--yellow)",
      q: "Concentrated, single-source supply and limited multi-tier visibility leave us exposed to disruptions we can't see coming.",
      sTitle: "Category strategy, supplier tiering & risk scoring", route: "directspend",
      s: "A Kraljic view classifies every category by supply risk and profit impact, maps Tier 1\u20133 suppliers, and scores single-source and geographic exposure — so strategy becomes action." },
  ];
  const chosen = PROBLEMS.filter((p) => picked.includes(p.id));

  return (
    <div>
      {/* hero */}
      <div className="tf-grid-bg tf-fade" style={{ borderBottom: "1px solid var(--line)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "70px 22px 44px" }}>
          <div className="tf-eyebrow" style={{ marginBottom: 18 }}>Industrial AI · the digital thread for manufacturing</div>
          <h1 className="tf-disp" style={{ fontSize: "clamp(38px,6vw,66px)", fontWeight: 800, maxWidth: 940, margin: 0, lineHeight: 1.04 }}>
            <span style={{ color: "var(--thread)" }}>Digital Thread</span>
            <span style={{ color: "var(--line2)", fontWeight: 400, margin: "0 .28em" }}>|</span>
            <span style={{ color: "var(--amber)" }}>AI for Manufacturing</span>
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 18, lineHeight: 1.6, maxWidth: 660, margin: "20px 0 30px" }}>
            Connect work orders, BOMs, ECOs, parts and purchase orders into one live thread — then ask AI what's at risk and why.
            Start free on sample data; connect Jira and your MES/ERP when you're ready.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button className="tf-btn tf-btn-primary" onClick={() => go("thread")}>Explore the digital thread <ArrowRight size={16} /></button>
            <button className="tf-btn" onClick={() => go("roi")}>Build the ROI case</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "44px 22px 70px" }}>
        {/* problem chooser */}
        <div className="tf-eyebrow" style={{ marginBottom: 8 }}>Start with the problem — not the feature</div>
        <h2 className="tf-disp" style={{ fontSize: 27, fontWeight: 800, margin: "0 0 6px" }}>What are you trying to solve?</h2>
        <p style={{ color: "var(--muted)", fontSize: 14.5, margin: "0 0 22px", maxWidth: 680 }}>Select the challenges that sound like yours. We'll map each to the digital-thread capability that solves it — and a way straight into it.</p>

        <div className="tf-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(310px,1fr))", gap: 14 }}>
          {PROBLEMS.map((p) => {
            const on = picked.includes(p.id);
            return (
              <button key={p.id} onClick={() => toggle(p.id)} className="tf-tile" style={{ textAlign: "left", padding: 18, display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer", border: on ? `1px solid ${p.tone}` : "1px solid var(--line)", background: on ? "var(--panel2)" : "var(--panel)" }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: "var(--bg2)", border: `1px solid ${on ? p.tone : "var(--line2)"}`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <p.icon size={20} color={p.tone} />
                </div>
                <span style={{ flex: 1, fontSize: 14.5, color: "var(--ink)", lineHeight: 1.45, fontWeight: 600 }}>{p.q}</span>
                {on
                  ? <CheckCircle2 size={20} color={p.tone} style={{ flexShrink: 0, marginTop: 2 }} />
                  : <span style={{ width: 18, height: 18, borderRadius: 99, border: "2px solid var(--line2)", flexShrink: 0, marginTop: 3 }} />}
              </button>
            );
          })}
        </div>

        {/* solutions */}
        {chosen.length > 0 && (
          <div className="tf-fade" style={{ marginTop: 40 }}>
            <div className="tf-eyebrow" style={{ marginBottom: 14 }}>Your digital thread solution{chosen.length > 1 ? "s" : ""}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {chosen.map((p) => (
                <div key={p.id} className="tf-panel tf-fade" style={{ padding: 18, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--bg2)", border: `1px solid ${p.tone}`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <p.icon size={22} color={p.tone} />
                  </div>
                  <div style={{ flex: "1 1 320px" }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{p.sTitle}</div>
                    <p style={{ color: "var(--muted)", fontSize: 13.5, lineHeight: 1.55, margin: "5px 0 0" }}>{p.s}</p>
                  </div>
                  <button className="tf-btn tf-btn-primary" onClick={() => go(p.route)} style={{ flexShrink: 0 }}>
                    Open {{ directspend: "Direct Spend", blockers: "Blockers", visibility: "Delivery calendar" }[p.route] || "Digital Thread"} <ArrowRight size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* tier note */}
        <div className="tf-panel" style={{ padding: "16px 18px", marginTop: 40, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", background: "var(--bg2)" }}>
          <Sparkles size={17} color="var(--amber)" />
          <span style={{ fontSize: 13.5, color: "var(--muted)" }}>
            <b style={{ color: "var(--ink)" }}>Free</b> — explore on bundled sample data.&nbsp;
            <b style={{ color: "var(--amber)" }}>Connected</b> — wire up Jira and your MES/ERP for live data.
          </span>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- ASSETS ----------------------------------- */
function AssetsPage({ tier, setTier, stage, setStage }) {
  const [sel, setSel] = useState(ASSETS[0]);
  const [live, setLive] = useState(false);
  const [spc, setSpc] = useState(genSPC());
  const target = 50, ucl = 53.2, lcl = 46.8;

  useEffect(() => {
    if (!(live && tier === "paid")) return;
    const t = setInterval(() => {
      setSpc((p) => {
        const last = p[p.length - 1].i;
        const v = +(target + (Math.random() - 0.5) * 2.4).toFixed(2);
        return [...p.slice(-27), { i: last + 1, v }];
      });
    }, 1400);
    return () => clearInterval(t);
  }, [live, tier]);

  const filtered = stage === "all" ? ASSETS : ASSETS.filter((a) => a.stage === stage);

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "34px 22px 70px" }}>
      <PageHead icon={Boxes} eyebrow="Module · Asset Management" title="Asset lifecycle management"
        sub="Track every asset from plan to retire. Monitor OEE and health, pull PLC/HMI signals, and run SPC analysis on equipment measurement data."
        tier={tier} setTier={setTier} />

      {/* stage filter */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
        <button onClick={() => setStage("all")} className="tf-btn tf-btn-ghost" style={{ padding: "7px 13px", borderColor: stage === "all" ? "var(--amber)" : undefined }}>All stages</button>
        {LIFECYCLE.map((s) => (
          <button key={s.k} onClick={() => setStage(s.k)} className="tf-btn tf-btn-ghost"
            style={{ padding: "7px 13px", borderColor: stage === s.k ? "var(--amber)" : undefined, color: stage === s.k ? "var(--amber)" : undefined }}>
            <s.icon size={14} /> {s.label}
          </button>
        ))}
      </div>

      {tier === "free" && (
        <div className="tf-panel tf-fade" style={{ padding: "12px 16px", marginBottom: 18, display: "flex", alignItems: "center", gap: 10, background: "var(--bg2)" }}>
          <Database size={16} color="var(--green)" />
          <span style={{ fontSize: 13.5, color: "var(--muted)" }}>You're viewing the <b style={{ color: "var(--ink)" }}>bundled sample fleet</b>. SPC data is simulated. Switch to <b style={{ color: "var(--amber)" }}>Connected</b> to stream live PLC/HMI tags.</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.4fr", gap: 18 }} className="tf-cols">
        {/* asset table */}
        <div className="tf-panel tf-fade" style={{ overflow: "hidden" }}>
          <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center" }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Assets {stage !== "all" && `· ${LIFECYCLE.find((s) => s.k === stage)?.label}`}</span>
            <span className="tf-chip" style={{ marginLeft: "auto" }}>{filtered.length} items</span>
          </div>
          <div className="tf-scroll" style={{ maxHeight: 430, overflowY: "auto" }}>
            {filtered.map((a) => (
              <div key={a.id} className="tf-row" onClick={() => setSel(a)} style={{
                padding: "13px 16px", cursor: "pointer", borderBottom: "1px solid var(--line)",
                background: sel.id === a.id ? "var(--panel2)" : "transparent", display: "flex", alignItems: "center", gap: 12,
              }}>
                <StatusDot tone={a.status} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</div>
                  <div className="tf-mono" style={{ fontSize: 11, color: "var(--faint)" }}>{a.id} · {a.line}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="tf-mono" style={{ fontSize: 13, color: a.oee ? "var(--ink)" : "var(--faint)" }}>{a.oee ? a.oee + "%" : "—"}</div>
                  <div className="tf-mono" style={{ fontSize: 10, color: "var(--faint)" }}>OEE</div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <div style={{ padding: 30, textAlign: "center", color: "var(--faint)" }}>No assets in this stage.</div>}
          </div>
        </div>

        {/* detail + SPC */}
        <div className="tf-fade" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="tf-panel" style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <Cpu size={18} color="var(--amber)" />
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{sel.name}</div>
                <div className="tf-mono" style={{ fontSize: 11, color: "var(--faint)" }}>{sel.id} · {sel.line}</div>
              </div>
              <span style={{ marginLeft: "auto" }}><Tag tone={sel.status === "muted" ? "muted" : sel.status}>{LIFECYCLE.find((s) => s.k === sel.stage)?.label}</Tag></span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
              {[["OEE", sel.oee ? sel.oee + "%" : "—", Gauge], ["Health", sel.health + "%", Activity], ["Next PM", sel.next, Wrench]].map(([l, v, I]) => (
                <div key={l} style={{ background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: 11, padding: 12 }}>
                  <I size={14} color="var(--muted)" />
                  <div className="tf-disp" style={{ fontSize: 20, fontWeight: 700, marginTop: 6 }}>{v}</div>
                  <div className="tf-mono" style={{ fontSize: 10, color: "var(--faint)" }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <Tag tone="blue">PLC: Siemens S7-1500</Tag>
              <Tag tone="thread">HMI: WinCC Unified</Tag>
              <Tag tone="muted">42 tags mapped</Tag>
            </div>
          </div>

          {/* SPC */}
          <div className="tf-panel" style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
              <TrendingUp size={17} color="var(--thread)" />
              <span style={{ fontWeight: 600, fontSize: 14 }}>SPC · X̄ control chart</span>
              <span className="tf-mono" style={{ fontSize: 11, color: "var(--faint)" }}>bore Ø (µm dev)</span>
              {tier === "paid" ? (
                <button onClick={() => setLive((v) => !v)} className="tf-btn tf-btn-ghost"
                  style={{ marginLeft: "auto", padding: "5px 11px", fontSize: 11.5, borderColor: live ? "var(--green)" : undefined, color: live ? "var(--green)" : undefined }}>
                  {live && <span className="tf-live-dot" />} {live ? "Streaming" : "Start live"}
                </button>
              ) : <span className="tf-chip" style={{ marginLeft: "auto" }}>simulated</span>}
            </div>
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={spc} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="i" tick={{ fill: "var(--faint)", fontSize: 10, fontFamily: "var(--mono)" }} />
                <YAxis domain={[44, 56]} tick={{ fill: "var(--faint)", fontSize: 10, fontFamily: "var(--mono)" }} />
                <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--line2)", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "var(--muted)" }} />
                <ReferenceLine y={ucl} stroke="var(--red)" strokeDasharray="5 4" label={{ value: "UCL", fill: "var(--red)", fontSize: 10, position: "right" }} />
                <ReferenceLine y={target} stroke="var(--thread)" strokeDasharray="2 2" label={{ value: "CL", fill: "var(--thread)", fontSize: 10, position: "right" }} />
                <ReferenceLine y={lcl} stroke="var(--red)" strokeDasharray="5 4" label={{ value: "LCL", fill: "var(--red)", fontSize: 10, position: "right" }} />
                <Line type="monotone" dataKey="v" stroke="var(--amber)" strokeWidth={2} dot={{ r: 2.5, fill: "var(--amber)" }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
            <div className="tf-mono" style={{ fontSize: 11, color: "var(--faint)", marginTop: 6 }}>
              Cpk 1.18 · last 28 subgroups{spc.some((p) => p.v > ucl || p.v < lcl) ? " · ⚠ rule-1 violation detected" : " · in control"}
            </div>
          </div>
        </div>
      </div>

      {tier === "paid" && (
        <div style={{ marginTop: 22 }}>
          <ConnectGate title="Connect equipment & asset data"
            lines={[
              "Stream live PLC/HMI tags via OPC-UA or MQTT for real-time SPC.",
              "Sync the asset register and maintenance history from your CMMS / EAM.",
              "Map equipment tags to characteristics for automatic control charts.",
            ]}
            connectors={[
              { name: "OPC-UA Gateway", desc: "PLC tag streaming", icon: Cpu },
              { name: "MQTT Broker", desc: "Sparkplug B", icon: Activity },
              { name: "CMMS / EAM", desc: "Asset + PM history", icon: Wrench },
            ]} />
        </div>
      )}
    </div>
  );
}

/* --------------------------- CONTRACTS ---------------------------------- */
function ContractsPage({ tier, setTier }) {
  const [sel, setSel] = useState(CONTRACTS[1]);
  const [analysis, setAnalysis] = useState(null);
  const [busy, setBusy] = useState(false);

  const analyze = async (c) => {
    setBusy(true); setAnalysis(null);
    const sys = "You are a contract analyst for a manufacturing company. Given a contract record, return a tight review: 3 key obligations, 1-2 risk flags, and the single most important date. Be concise and use short bullet lines.";
    const text = `Contract: ${c.name}\nType: ${c.type}\nCounterparty: ${c.party}\nStatus: ${c.status}\nValue: ${c.value ? "$" + c.value.toLocaleString() : "n/a"}\nExpiry: ${c.expiry}`;
    const out = await askClaude(sys, text);
    setAnalysis(out || `Review · ${c.name}\n\nKey obligations:\n• Maintain confidentiality of disclosed technical data\n• Deliver per agreed lead times and quality spec\n• Provide change notification ahead of any substitution\n\nRisk flags:\n• ${c.risk === "high" ? "Uncapped liability language in scope clause" : c.risk === "med" ? "Auto-renewal with short opt-out window" : "Standard terms — low residual risk"}\n\nWatch date: ${c.expiry} (${c.status})`);
    setBusy(false);
  };

  const statusTone = { Active: "green", Expiring: "yellow", "In Review": "blue", Draft: "muted", Expired: "red" };
  const riskTone = { low: "green", med: "yellow", high: "red" };

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "34px 22px 70px" }}>
      <PageHead icon={ScrollText} eyebrow="Module · Contracts Lifecycle Management" title="Contracts lifecycle management"
        sub="Author, review and track NDAs, MSAs, SOWs and supply agreements end to end. Let AI extract obligations, flag risky clauses and surface renewal dates."
        tier={tier} setTier={setTier} />

      {/* summary stats */}
      <div className="tf-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, marginBottom: 22 }}>
        {[["Active", CONTRACTS.filter((c) => c.status === "Active").length, "green"],
          ["Expiring ≤90d", 1, "yellow"], ["In review", 1, "blue"],
          ["Total value", fmtUSD(CONTRACTS.reduce((s, c) => s + c.value, 0)), "amber"]].map(([l, v, t]) => (
          <div key={l} className="tf-panel" style={{ padding: 16 }}>
            <div className="tf-disp" style={{ fontSize: 26, fontWeight: 800, color: `var(--${t})` }}>{v}</div>
            <div className="tf-mono" style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 18 }} className="tf-cols">
        <div className="tf-panel tf-fade" style={{ overflow: "hidden" }}>
          <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--line)", fontWeight: 600, fontSize: 14 }}>Repository</div>
          <div className="tf-scroll" style={{ maxHeight: 440, overflowY: "auto" }}>
            {CONTRACTS.map((c) => (
              <div key={c.id} className="tf-row" onClick={() => { setSel(c); setAnalysis(null); }} style={{
                padding: "13px 16px", cursor: "pointer", borderBottom: "1px solid var(--line)",
                background: sel.id === c.id ? "var(--panel2)" : "transparent",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{c.name}</span>
                  <Tag tone={statusTone[c.status]}>{c.status}</Tag>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                  <span className="tf-mono" style={{ fontSize: 11, color: "var(--faint)" }}>{c.id} · {c.type} · {c.party}</span>
                  <span className="tf-mono" style={{ fontSize: 11, color: "var(--faint)", marginLeft: "auto" }}>risk</span>
                  <Tag tone={riskTone[c.risk]}>{c.risk}</Tag>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="tf-fade" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="tf-panel" style={{ padding: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{sel.name}</div>
            <div className="tf-mono" style={{ fontSize: 12, color: "var(--faint)", marginBottom: 14 }}>{sel.id} · {sel.party}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[["Type", sel.type], ["Value", sel.value ? "$" + sel.value.toLocaleString() : "—"], ["Status", sel.status], ["Expiry", sel.expiry]].map(([l, v]) => (
                <div key={l} style={{ background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: 10, padding: "9px 11px" }}>
                  <div className="tf-mono" style={{ fontSize: 10, color: "var(--faint)" }}>{l}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
            <button className="tf-btn tf-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => analyze(sel)} disabled={busy}>
              <Sparkles size={15} /> {busy ? "Analyzing…" : "AI clause & obligation review"}
            </button>
          </div>

          {(analysis || busy) && (
            <div className="tf-panel tf-fade" style={{ padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <ShieldCheck size={16} color="var(--thread)" /><span style={{ fontWeight: 600, fontSize: 14 }}>AI review</span>
              </div>
              {busy ? <div className="tf-mono" style={{ color: "var(--faint)", fontSize: 13 }}>reading the agreement…</div>
                : <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--muted)", whiteSpace: "pre-wrap" }}>{analysis}</div>}
            </div>
          )}
        </div>
      </div>

      {tier === "paid" && (
        <div style={{ marginTop: 22 }}>
          <ConnectGate title="Bring in your real contracts"
            lines={[
              "Import an export from your CLM, or drop PDFs/DOCX for OCR + clause extraction.",
              "Sync counterparties and renewal calendars to Outlook / Google Calendar.",
              "Route approvals and e-signature through your existing workflow.",
            ]}
            connectors={[
              { name: "DocuSign", desc: "E-signature status", icon: FileText },
              { name: "SharePoint", desc: "Contract repository", icon: Database },
              { name: "Salesforce CLM", desc: "Records + renewals", icon: ScrollText },
            ]} />
        </div>
      )}
    </div>
  );
}

/* --------------------------- REQUIREMENTS ------------------------------- */
function RequirementsPage({ tier, setTier }) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(null);
  const [sel, setSel] = useState(null);

  const connect = (src) => {
    setConnecting(src);
    setTimeout(() => { setConnected(true); setConnecting(null); }, 1200);
  };

  const statusTone = { Verified: "green", "In Review": "blue", Open: "yellow" };

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "34px 22px 70px" }}>
      <PageHead icon={FileText} eyebrow="Module · Requirements" title="Requirements intelligence"
        sub="Connect Jama Connect or IBM DOORS, then chat with your requirements in natural language. Trace each requirement to test cases, design artifacts and Jira issues."
        tier={tier} setTier={setTier} />

      {!connected ? (
        <div className="tf-fade">
          <div className="tf-eyebrow" style={{ marginBottom: 14 }}>Step 1 · Connect a requirements source</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16, marginBottom: 24 }}>
            {[
              { src: "JAMA", name: "Jama Connect", desc: tier === "paid" ? "OAuth + REST API · live sync of items, relationships and test runs" : "Loads a sample requirement set so you can try everything", icon: GitBranch },
              { src: "DOORS", name: "IBM DOORS / DOORS Next", desc: tier === "paid" ? "OSLC connector · modules, links and attributes" : "Loads a sample module to explore the features", icon: FileText },
            ].map((c) => (
              <div key={c.src} className="tf-panel" style={{ padding: 22 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 11, background: "var(--bg2)", border: "1px solid var(--line2)", display: "grid", placeItems: "center" }}>
                    <c.icon size={20} color="var(--blue)" />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{c.name}</div>
                  {tier === "free" && <span style={{ marginLeft: "auto" }}><Tag tone="green">SAMPLE</Tag></span>}
                </div>
                <p style={{ color: "var(--muted)", fontSize: 13.5, lineHeight: 1.55, margin: "0 0 16px" }}>{c.desc}</p>
                {tier === "paid" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                    <input className="tf-input" placeholder="Instance URL (https://…)" />
                    <input className="tf-input" placeholder="Project / module ID" />
                    <div className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)" }}>
                      <Lock size={10} style={{ verticalAlign: "-1px" }} /> OAuth runs in a secure popup — credentials are never typed here.
                    </div>
                  </div>
                )}
                <button className="tf-btn tf-btn-primary" style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => connect(c.src)} disabled={connecting}>
                  {connecting === c.src ? "Connecting…" : tier === "paid" ? "Authorize & sync" : "Load sample & connect"}
                </button>
              </div>
            ))}
          </div>
          <div className="tf-panel" style={{ padding: 16, display: "flex", alignItems: "center", gap: 10, background: "var(--bg2)" }}>
            <Sparkles size={16} color="var(--amber)" />
            <span style={{ fontSize: 13.5, color: "var(--muted)" }}>Once connected you can <b style={{ color: "var(--ink)" }}>chat with your requirements</b>, ask for coverage gaps, and auto-trace to test cases & Jira.</span>
          </div>
        </div>
      ) : (
        <div className="tf-fade">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <CheckCircle2 size={17} color="var(--green)" />
            <span style={{ fontSize: 14 }}>Connected · {REQUIREMENTS.length} requirements imported</span>
            <Tag tone="blue">Jama</Tag><Tag tone="thread">DOORS</Tag><Tag tone="amber">Jira linked</Tag>
            <button className="tf-link" style={{ marginLeft: "auto" }} onClick={() => { setConnected(false); setSel(null); }}>↻ Reconnect</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 18 }} className="tf-cols">
            {/* requirements + traceability */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="tf-panel" style={{ overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", fontWeight: 600, fontSize: 14 }}>Requirements & traceability</div>
                <div className="tf-scroll" style={{ maxHeight: 460, overflowY: "auto" }}>
                  {REQUIREMENTS.map((r) => (
                    <div key={r.id} className="tf-row" onClick={() => setSel(r)} style={{
                      padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid var(--line)",
                      background: sel?.id === r.id ? "var(--panel2)" : "transparent",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                        <span className="tf-mono" style={{ fontSize: 12, color: "var(--amber)" }}>{r.id}</span>
                        <Tag tone={statusTone[r.status]}>{r.status}</Tag>
                        <span className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)", marginLeft: "auto" }}>{r.src}</span>
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--muted)" }}>{r.text}</div>
                      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                        {r.tests.length ? r.tests.map((t) => <Tag key={t} tone="green"><Link2 size={9} style={{ verticalAlign: "-1px" }} /> {t}</Tag>)
                          : <Tag tone="red"><AlertTriangle size={9} style={{ verticalAlign: "-1px" }} /> no test coverage</Tag>}
                        <Tag tone="blue">{r.jira}</Tag>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* trace + coverage */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {sel ? (
                <div className="tf-panel tf-fade" style={{ padding: 16 }}>
                  <div className="tf-eyebrow" style={{ marginBottom: 10 }}>Trace · {sel.id}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    {[["Source", sel.src, "var(--ink)"], ["Design", sel.design, "var(--blue)"],
                      ["Tests", sel.tests.join(", ") || "— coverage gap", sel.tests.length ? "var(--green)" : "var(--red)"],
                      ["Jira", sel.jira, "var(--amber)"]].map(([l, v, c]) => (
                      <div key={l} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span className="tf-mono" style={{ fontSize: 11, color: "var(--faint)", width: 54 }}>{l}</span>
                        <ArrowRight size={12} color="var(--faint)" />
                        <span className="tf-tag" style={{ borderColor: "var(--line2)", color: c }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="tf-panel" style={{ padding: 18, textAlign: "center", color: "var(--faint)" }}>
                  <Link2 size={20} style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 13 }}>Select a requirement to see its trace chain.</div>
                </div>
              )}
              <div className="tf-panel" style={{ padding: 16 }}>
                <div className="tf-eyebrow" style={{ marginBottom: 12 }}>Coverage summary</div>
                {[["Verified", REQUIREMENTS.filter((r) => r.status === "Verified").length, "green"],
                  ["In review", REQUIREMENTS.filter((r) => r.status === "In Review").length, "blue"],
                  ["Open", REQUIREMENTS.filter((r) => r.status === "Open").length, "yellow"],
                  ["Coverage gaps", REQUIREMENTS.filter((r) => !r.tests.length).length, "red"]].map(([l, v, t]) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid var(--line)" }}>
                    <StatusDot tone={t} />
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>{l}</span>
                    <span className="tf-mono" style={{ marginLeft: "auto", fontSize: 14, fontWeight: 600, color: `var(--${t})` }}>{v}</span>
                  </div>
                ))}
                <div className="tf-mono" style={{ fontSize: 11, color: "var(--faint)", marginTop: 12 }}>
                  Ask the assistant (bottom-right) to explain gaps or push them to Jira.
                </div>
              </div>
            </div>
          </div>

          {tier === "paid" && (
            <div style={{ marginTop: 22 }}>
              <ConnectGate title="Keep requirements in sync"
                lines={[
                  "Two-way sync of items, relationships and verification status with Jama / DOORS.",
                  "Push coverage gaps and review actions to Jira as issues automatically.",
                  "Re-baseline and diff requirement versions on each release.",
                ]}
                connectors={[
                  { name: "Jama Connect API", desc: "REST + webhooks", icon: GitBranch },
                  { name: "DOORS OSLC", desc: "Modules + links", icon: FileText },
                  { name: "Jira", desc: "Issues + plans", icon: Workflow },
                ]} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* --------------------------- DIGITAL THREAD ----------------------------- */
function ThreadPage({ tier, setTier }) {
  const [imported, setImported] = useState({ wo: true, bom: true, eco: true, pn: true, po: true });
  const counts = { wo: WORKORDERS.length, bom: BOM.length, eco: ECO.length, pn: BOM.length, po: POs.length };
  const importDefs = [
    { k: "wo", name: "Work Orders", icon: Workflow, c: "var(--amber)" },
    { k: "bom", name: "BOM", icon: Layers, c: "var(--thread)" },
    { k: "eco", name: "ECO", icon: GitBranch, c: "var(--blue)" },
    { k: "pn", name: "Part Numbers", icon: Boxes, c: "var(--green)" },
    { k: "po", name: "Purchase Orders", icon: FileSpreadsheet, c: "var(--yellow)" },
  ];

  const woTone = { "In Progress": "yellow", Complete: "green", Blocked: "red", Released: "blue" };

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "34px 22px 70px" }}>
      <PageHead icon={GitBranch} eyebrow="Module · Digital Thread" title="The digital thread"
        sub="Stitch work orders, BOMs, ECOs, part numbers and purchase orders into one connected thread — then ask the AI bot for material status and shortage forecasts."
        tier={tier} setTier={setTier} />

      {/* import strip */}
      <div className="tf-eyebrow" style={{ marginBottom: 12 }}>Data sources · {tier === "free" ? "sample imports loaded" : "connect or import your own"}</div>
      <div className="tf-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 14 }}>
        {importDefs.map((d) => (
          <div key={d.k} className="tf-panel" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <d.icon size={18} color={d.c} />
              <span style={{ fontWeight: 600, fontSize: 14 }}>{d.name}</span>
              <span style={{ marginLeft: "auto" }}>{imported[d.k] ? <CheckCircle2 size={16} color="var(--green)" /> : <Upload size={15} color="var(--faint)" />}</span>
            </div>
            <div className="tf-mono" style={{ fontSize: 11, color: "var(--faint)", marginTop: 10 }}>
              {imported[d.k] ? `${counts[d.k]} records · ${tier === "free" ? "sample" : "imported"}` : "not imported"}
            </div>
            <button className="tf-btn tf-btn-ghost" style={{ width: "100%", justifyContent: "center", marginTop: 10, padding: "6px", fontSize: 12 }}>
              {tier === "free" ? "Reload sample" : "Import CSV"}
            </button>
          </div>
        ))}
      </div>

      {/* thread visualization */}
      <div className="tf-panel tf-fade" style={{ padding: 18, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Link2 size={16} color="var(--thread)" /><span style={{ fontWeight: 600, fontSize: 14 }}>Thread · PN-3320 Spindle Assembly</span>
          <span className="tf-chip" style={{ marginLeft: "auto" }}>traced across 5 sources</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap", justifyContent: "space-between" }}>
          {[["REQ-001", "var(--blue)", FileText], ["PN-3320", "var(--green)", Boxes], ["ECO-220", "var(--amber)", GitBranch], ["WO-7781", "var(--amber)", Workflow], ["PO-9912", "var(--yellow)", FileSpreadsheet]].map(([l, c, I], i, arr) => (
            <React.Fragment key={l}>
              <div style={{ textAlign: "center", flex: "1 1 80px" }}>
                <div style={{ width: 46, height: 46, margin: "0 auto 7px", borderRadius: 12, border: `1px solid ${c}`, background: "var(--bg2)", display: "grid", placeItems: "center", boxShadow: `0 0 18px -8px ${c}` }}>
                  <I size={20} color={c} />
                </div>
                <div className="tf-mono" style={{ fontSize: 11.5, color: "var(--muted)" }}><ThreadLink id={l}>{l}</ThreadLink></div>
              </div>
              {i < arr.length - 1 && (
                <svg width="40" height="20" style={{ flex: "0 0 auto" }} className="hide-sm"><line x1="0" y1="10" x2="40" y2="10" className="tf-thread-line" /></svg>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: 18 }} className="tf-cols">
        {/* work orders + material */}
        <div className="tf-fade" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="tf-panel" style={{ overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center" }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>MES work orders</span>
              <span className="tf-chip" style={{ marginLeft: "auto" }}>Jira-linked issues</span>
            </div>
            {WORKORDERS.map((w) => (
              <div key={w.id} style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <StatusDot tone={w.tone} />
                  <span className="tf-mono" style={{ fontSize: 12.5, color: "var(--amber)" }}><ThreadLink id={w.id}>{w.id}</ThreadLink></span>
                  <span style={{ fontSize: 13.5, color: "var(--muted)" }}><ThreadLink id={w.part} style={{ color: "inherit" }}>{w.desc}</ThreadLink></span>
                  <span style={{ marginLeft: "auto" }}><Tag tone={w.tone}>{w.status}</Tag></span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 9 }}>
                  <div style={{ flex: 1, height: 6, background: "var(--bg2)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ width: `${(w.done / w.qty) * 100}%`, height: "100%", background: `var(--${w.tone})`, borderRadius: 99 }} />
                  </div>
                  <span className="tf-mono" style={{ fontSize: 11, color: "var(--faint)" }}>{w.done}/{w.qty} · due {w.due}</span>
                </div>
              </div>
            ))}
          </div>

          {/* material status */}
          <div className="tf-panel" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <PackageSearch size={16} color="var(--thread)" /><span style={{ fontWeight: 600, fontSize: 14 }}>Material status · on-hand vs demand</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={BOM} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="pn" tick={{ fill: "var(--faint)", fontSize: 9.5, fontFamily: "var(--mono)" }} />
                <YAxis tick={{ fill: "var(--faint)", fontSize: 10, fontFamily: "var(--mono)" }} />
                <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--line2)", borderRadius: 8, fontSize: 12 }} cursor={{ fill: "rgba(255,255,255,.03)" }} />
                <Bar dataKey="onhand" fill="var(--thread)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="demand" fill="var(--amber)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="tf-mono" style={{ fontSize: 11, color: "var(--faint)" }}>
              <span style={{ color: "var(--thread)" }}>■</span> on-hand &nbsp; <span style={{ color: "var(--amber)" }}>■</span> demand &nbsp;·&nbsp; ⚠ PN-3322 & PN-3323 short for full WO demand
            </div>
          </div>
        </div>

        {/* PO / ECO / alerts */}
        <div className="tf-fade" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="tf-panel" style={{ overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", fontWeight: 600, fontSize: 14 }}>Purchase orders</div>
            {POs.map((p) => (
              <div key={p.id} style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 9 }}>
                <StatusDot tone={p.tone} />
                <div style={{ flex: 1 }}>
                  <div className="tf-mono" style={{ fontSize: 12.5, color: "var(--amber)" }}><ThreadLink id={p.id}>{p.id}</ThreadLink> · <ThreadLink id={p.part} style={{ color: "var(--green)" }}>{p.part}</ThreadLink></div>
                  <div className="tf-mono" style={{ fontSize: 11, color: "var(--faint)" }}><ThreadLink id={p.supplier} style={{ color: "inherit" }}>{p.supplier}</ThreadLink> · qty {p.qty} · ETA {p.eta}</div>
                </div>
                <Tag tone={p.tone}>{p.status}</Tag>
              </div>
            ))}
          </div>

          <div className="tf-panel" style={{ overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", fontWeight: 600, fontSize: 14 }}>Engineering changes</div>
            {ECO.map((e) => (
              <div key={e.id} style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <GitBranch size={14} color="var(--blue)" />
                  <span className="tf-mono" style={{ fontSize: 12.5, color: "var(--blue)" }}><ThreadLink id={e.id}>{e.id}</ThreadLink></span>
                  <span style={{ marginLeft: "auto" }}><Tag tone={e.status === "Approved" ? "green" : "yellow"}>{e.status}</Tag></span>
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>{e.title}</div>
                <div className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 5 }}>affects {e.affects.map((pn, i) => <React.Fragment key={pn}>{i > 0 ? ", " : ""}<ThreadLink id={pn} style={{ color: "var(--green)" }}>{pn}</ThreadLink></React.Fragment>)} · {e.jira}</div>
              </div>
            ))}
          </div>

          <div className="tf-panel" style={{ padding: 16, borderColor: "var(--red)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <AlertTriangle size={16} color="var(--red)" /><span style={{ fontWeight: 600, fontSize: 14, color: "var(--red)" }}>Shortage alert</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55 }}>
              PN-3322 short 43 and PN-3323 short 53 against full WO demand. PO-9920 (PN-3323) is delayed to 06-25 — at risk for WO-7781.
            </div>
            <div className="tf-mono" style={{ fontSize: 11, color: "var(--faint)", marginTop: 10 }}>Ask the Material AI (bottom-right) to forecast the impact.</div>
          </div>
        </div>
      </div>

      {tier === "paid" && (
        <div style={{ marginTop: 22 }}>
          <ConnectGate title="Wire up your live thread"
            lines={[
              "Pull work orders and operations from your MES / ERP in real time.",
              "Sync BOMs, ECOs and part masters from PLM; POs from procurement.",
              "Link production issues to Jira and let the bot forecast on live inventory.",
            ]}
            connectors={[
              { name: "SAP / ERP", desc: "WO, PO, inventory", icon: Database },
              { name: "PLM (Teamcenter/Windchill)", desc: "BOM, ECO, parts", icon: Layers },
              { name: "Jira", desc: "Issue tracking", icon: Workflow },
            ]} />
        </div>
      )}
    </div>
  );
}

/* ============================ ROI CALCULATOR ============================= */
/* Methodology: a value-driver tree mapped to the ThreadWire modules, with
   hard (P&L) vs soft (productivity / risk-avoidance) savings separated, a
   risk-adjustment haircut applied the way Deloitte / Gartner / TEI business
   cases are built, then payback, 3-year NPV and ROI. Improvement ranges are
   editable, conservative benchmark defaults — adjust to your own baseline. */

const num = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};
const has = (v) => v !== "" && v !== null && v !== undefined;
const fmtMoney = (n) => {
  const a = Math.abs(n), s = n < 0 ? "-" : "";
  if (a >= 1e6) return s + "$" + (a / 1e6).toFixed(a >= 1e7 ? 1 : 2) + "M";
  if (a >= 1e3) return s + "$" + Math.round(a / 1e3) + "k";
  return s + "$" + Math.round(a);
};

// Per-industry profile: dominant value drivers, baseline ratios, and which
// engineering effort the sector carries. These reshape the form + defaults.
const IND = {
  discrete:   { label: "Discrete / Industrial Equipment", margin: 30, downtime: 10, copq: 6,  warranty: 1.5, engReq: 18, designRework: 15, carrying: 20, invRatio: 0.15, primary: ["downtime", "quality", "inventory", "mes"],          note: "Line uptime, scrap and inventory turns drive most of the value." },
  automotive: { label: "Automotive / Tier-1 Supplier",    margin: 22, downtime: 8,  copq: 5,  warranty: 2.5, engReq: 20, designRework: 15, carrying: 18, invRatio: 0.13, primary: ["downtime", "quality", "warranty", "inventory"],     note: "High volume — uptime, PPAP quality and warranty dominate the case." },
  aerospace:  { label: "Aerospace & Defense",             margin: 28, downtime: 6,  copq: 8,  warranty: 1,   engReq: 38, designRework: 22, carrying: 22, invRatio: 0.22, primary: ["requirements", "quality", "eco", "contracts"],     note: "Low-volume / high-mix — requirements traceability & AS9100 compliance lead." },
  medical:    { label: "Medical Devices",                 margin: 35, downtime: 6,  copq: 9,  warranty: 1,   engReq: 35, designRework: 22, carrying: 20, invRatio: 0.18, primary: ["requirements", "quality", "eco", "contracts"],     note: "FDA design-history-file traceability and validation effort are the biggest levers." },
  pharma:     { label: "Pharma / Life Sciences",          margin: 40, downtime: 7,  copq: 7,  warranty: 0.5, engReq: 25, designRework: 15, carrying: 20, invRatio: 0.20, primary: ["quality", "requirements", "downtime", "inventory"], note: "Batch release time, deviations and GMP documentation drive value." },
  electronics:{ label: "Electronics / Semiconductor",     margin: 30, downtime: 7,  copq: 10, warranty: 2,   engReq: 22, designRework: 18, carrying: 16, invRatio: 0.14, primary: ["quality", "inventory", "downtime", "eco"],         note: "Yield, expensive scrap, fast ECO velocity and component supply risk." },
  food:       { label: "Food & Beverage",                 margin: 25, downtime: 9,  copq: 5,  warranty: 0.5, engReq: 8,  designRework: 10, carrying: 15, invRatio: 0.10, primary: ["downtime", "quality", "inventory", "mes"],         note: "OEE, yield / giveaway and short-shelf-life inventory are the key levers." },
  chemicals:  { label: "Chemicals / Process",             margin: 30, downtime: 8,  copq: 6,  warranty: 0.5, engReq: 12, designRework: 10, carrying: 18, invRatio: 0.16, primary: ["downtime", "quality", "inventory"],               note: "Asset reliability, yield and energy dominate a continuous-process plant." },
  cpg:        { label: "Consumer Packaged Goods",         margin: 28, downtime: 9,  copq: 5,  warranty: 0.8, engReq: 10, designRework: 12, carrying: 17, invRatio: 0.12, primary: ["downtime", "inventory", "quality", "mes"],         note: "Throughput, changeover losses and inventory turns drive the case." },
  heavy:      { label: "Heavy Machinery / ETO Equipment",  margin: 25, downtime: 7,  copq: 7,  warranty: 3,   engReq: 30, designRework: 20, carrying: 22, invRatio: 0.22, primary: ["requirements", "warranty", "quality", "contracts"], note: "Engineered-to-order — configuration control, warranty and contracts lead." },
};

const SCEN = { conservative: "c", likely: "l", aggressive: "a" };
// Editable benchmark improvement ranges (fraction reduction / recovery).
const IMP = {
  downtime:     { c: 0.15,  l: 0.25, a: 0.40 },
  quality:      { c: 0.10,  l: 0.20, a: 0.30 },
  warranty:     { c: 0.08,  l: 0.15, a: 0.25 },
  designRework: { c: 0.10,  l: 0.20, a: 0.30 },
  inventory:    { c: 0.08,  l: 0.15, a: 0.22 },
  expedite:     { c: 0.15,  l: 0.30, a: 0.45 },
  contractLeak: { c: 0.005, l: 0.01, a: 0.02 },
  requirements: { c: 0.25,  l: 0.40, a: 0.55 },
  contractAdmin:{ c: 0.25,  l: 0.40, a: 0.50 },
  eco:          { c: 0.25,  l: 0.40, a: 0.50 },
  mes:          { c: 0.03,  l: 0.06, a: 0.10 },
  sourcing:     { c: 0.02,  l: 0.035, a: 0.05 },
};
const LEVER_META = {
  downtime:     { label: "Predictive maintenance — recovered throughput", cat: "hard", module: "Assets" },
  quality:      { label: "SPC & quality — scrap / rework reduction",       cat: "hard", module: "Assets" },
  warranty:     { label: "Quality — warranty & returns reduction",         cat: "hard", module: "Assets" },
  designRework: { label: "Requirements — design rework avoided",           cat: "hard", module: "Requirements" },
  inventory:    { label: "Material forecasting — inventory carrying",      cat: "hard", module: "Digital Thread" },
  expedite:     { label: "Material forecasting — expedite freight",        cat: "hard", module: "Digital Thread" },
  contractLeak: { label: "Contracts — value leakage recovered",            cat: "hard", module: "Contracts" },
  requirements: { label: "Requirements analysis — engineering effort",     cat: "soft", module: "Requirements" },
  contractAdmin:{ label: "Contracts — admin & cycle-time",                 cat: "soft", module: "Contracts" },
  eco:          { label: "ECO — change-impact effort",                     cat: "soft", module: "Digital Thread" },
  mes:          { label: "MES — labor productivity",                       cat: "soft", module: "Digital Thread" },
  sourcing:     { label: "Direct spend — sourcing & should-cost savings",  cat: "hard", module: "Direct Spend" },
};
const HARD_CONF = 0.9; // risk-adjustment: hard savings are highly realizable
const SOFT_CONF = 0.5; // soft savings discounted (productivity / avoidance)

function computeROI(inp, scenario, ov) {
  const ind = IND[inp.industry] || IND.discrete;
  const sk = SCEN[scenario];
  const imp = (k) => (ov[k] != null ? ov[k] : IMP[k][sk]);

  const rev = num(inp.revenueM) * 1e6;
  const margin = num(inp.margin) / 100;
  const lines = Math.max(1, num(inp.lines));
  const opHours = 6000; // effective run-hours per line per year
  const salary = num(inp.loadedSalary);
  const hourly = salary > 0 ? salary / 2080 : 0;
  const engCost = num(inp.engFte) * salary;

  // derived dollar magnitudes (auto from revenue+industry unless overridden)
  const invValue = has(inp.inventoryM) ? num(inp.inventoryM) * 1e6 : rev * ind.invRatio;
  const expedite = has(inp.expediteK) ? num(inp.expediteK) * 1e3 : rev * 0.005;
  const cspend = has(inp.contractSpendM) ? num(inp.contractSpendM) * 1e6 : rev * 0.45;
  const contracts = has(inp.contractsPerYr) ? num(inp.contractsPerYr) : Math.round(num(inp.revenueM) * 2);
  const ecos = has(inp.ecosPerYr) ? num(inp.ecosPerYr) : Math.round(num(inp.revenueM) * 1.5);
  const carrying = (has(inp.carrying) ? num(inp.carrying) : ind.carrying) / 100;
  const labor = rev * 0.12;

  const revPerHour = rev / (lines * opHours);
  const downtimeHrs = lines * opHours * (num(inp.downtimePct) / 100);

  const amt = {
    downtime: downtimeHrs * imp("downtime") * revPerHour * margin,
    quality: rev * (num(inp.copq) / 100) * imp("quality"),
    warranty: rev * (num(inp.warranty) / 100) * imp("warranty"),
    designRework: engCost * (ind.designRework / 100) * imp("designRework"),
    inventory: invValue * carrying * imp("inventory"),
    expedite: expedite * imp("expedite"),
    contractLeak: cspend * imp("contractLeak"),
    requirements: engCost * (ind.engReq / 100) * imp("requirements"),
    contractAdmin: contracts * 8 * hourly * imp("contractAdmin"),
    eco: ecos * 24 * hourly * imp("eco"),
    mes: labor * imp("mes"),
    sourcing: rev * 0.35 * imp("sourcing"),  // direct material ≈ 35% of revenue
  };

  const levers = Object.keys(LEVER_META).map((k) => ({ key: k, ...LEVER_META[k], amount: amt[k] }));
  const hard = levers.filter((l) => l.cat === "hard").reduce((s, l) => s + l.amount, 0);
  const soft = levers.filter((l) => l.cat === "soft").reduce((s, l) => s + l.amount, 0);
  const gross = hard + soft;
  const riskAdj = hard * HARD_CONF + soft * SOFT_CONF;

  const plants = Math.max(1, num(inp.plants));
  const platform = has(inp.platformCostK) ? num(inp.platformCostK) * 1e3 : 60000 + plants * 30000;
  const impl = has(inp.implCostK) ? num(inp.implCostK) * 1e3 : 80000 + plants * 20000;

  const annual = riskAdj;
  const monthlyNet = annual / 12 - platform / 12;
  const payback = monthlyNet > 0 ? impl / monthlyNet : Infinity;

  const d = num(inp.discountPct) / 100 || 0.1;
  let npv = -impl;
  for (let y = 1; y <= 3; y++) npv += (annual - platform) / Math.pow(1 + d, y);
  const totalCost = platform * 3 + impl;
  const net3 = (annual - platform) * 3 - impl;
  const roi3 = totalCost > 0 ? net3 / totalCost : 0;

  const cashflow = [];
  let cum = -impl;
  for (let m = 1; m <= 36; m++) { cum += monthlyNet; cashflow.push({ m, cum: Math.round(cum) }); }

  return { levers, hard, soft, gross, riskAdj, annual, platform, impl, payback, npv, net3, roi3, totalCost, cashflow };
}

function ROIField({ label, sub, value, onChange, suffix, placeholder, select, children }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
        <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{label}</span>
        {sub && <span className="tf-mono" style={{ fontSize: 10, color: "var(--faint)" }}>{sub}</span>}
      </div>
      {select ? (
        <select className="tf-input" value={value} onChange={(e) => onChange(e.target.value)}
          style={{ appearance: "none", cursor: "pointer" }}>{children}</select>
      ) : (
        <div style={{ position: "relative" }}>
          <input className="tf-input" type="number" value={value} placeholder={placeholder} step="any"
            onChange={(e) => onChange(e.target.value)} />
          {suffix && <span className="tf-mono" style={{ position: "absolute", right: 12, top: 11, fontSize: 11, color: "var(--faint)" }}>{suffix}</span>}
        </div>
      )}
    </label>
  );
}

function ROIPage() {
  const baseFor = (key) => ({
    industry: key, margin: IND[key].margin, downtimePct: IND[key].downtime,
    copq: IND[key].copq, warranty: IND[key].warranty,
    revenueM: 500, plants: 3, lines: 12, engFte: 40, loadedSalary: 145000,
    inventoryM: "", expediteK: "", contractSpendM: "", contractsPerYr: "", ecosPerYr: "",
    carrying: "", platformCostK: "", implCostK: "", discountPct: 10,
  });
  const [inp, setInp] = useState(baseFor("discrete"));
  const [scenario, setScenario] = useState("likely");
  const [ov, setOv] = useState({});
  const [adv, setAdv] = useState(false);

  const set = (k) => (v) => setInp((s) => ({ ...s, [k]: v }));
  const setIndustry = (key) =>
    setInp((s) => ({ ...s, industry: key, margin: IND[key].margin, downtimePct: IND[key].downtime, copq: IND[key].copq, warranty: IND[key].warranty, carrying: "", inventoryM: "", expediteK: "", contractSpendM: "", contractsPerYr: "", ecosPerYr: "" }));
  const setScen = (sc) => { setScenario(sc); setOv({}); };

  const r = useMemo(() => computeROI(inp, scenario, ov), [inp, scenario, ov]);
  const ind = IND[inp.industry];
  const maxLever = Math.max(...r.levers.map((l) => l.amount), 1);
  const sortedLevers = [...r.levers].sort((a, b) => b.amount - a.amount);

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "34px 22px 70px" }}>
      <PageHead icon={Calculator} eyebrow="Tool · ROI Calculator"
        title="Build your AI business case"
        sub="Pick your industry and the model adapts to how that sector creates value. Hard and soft savings are separated and risk-adjusted, then turned into payback, 3-year NPV and ROI." />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} className="tf-cols">
        {/* ------------------------------- FORM ------------------------------ */}
        <div className="tf-fade" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="tf-panel" style={{ padding: 18 }}>
            <div className="tf-eyebrow" style={{ marginBottom: 14 }}>1 · Your operation</div>
            <div style={{ display: "grid", gap: 14 }}>
              <ROIField label="Industry" select value={inp.industry} onChange={setIndustry}>
                {Object.keys(IND).map((k) => <option key={k} value={k}>{IND[k].label}</option>)}
              </ROIField>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "10px 12px", background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: 10 }}>
                <Factory size={15} color="var(--amber)" style={{ marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>{ind.note}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <ROIField label="Annual revenue" suffix="$M" value={inp.revenueM} onChange={set("revenueM")} />
                <ROIField label="Sites" value={inp.plants} onChange={set("plants")} />
                <ROIField label="Production lines" value={inp.lines} onChange={set("lines")} />
              </div>
            </div>
          </div>

          <div className="tf-panel" style={{ padding: 18 }}>
            <div className="tf-eyebrow" style={{ marginBottom: 14 }}>2 · Operations & quality baseline</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <ROIField label="Contribution margin" suffix="%" value={inp.margin} onChange={set("margin")} />
              <ROIField label="Unplanned downtime" sub="of run time" suffix="%" value={inp.downtimePct} onChange={set("downtimePct")} />
              <ROIField label="Scrap & rework (COPQ)" sub="of revenue" suffix="%" value={inp.copq} onChange={set("copq")} />
              <ROIField label="Warranty & returns" sub="of revenue" suffix="%" value={inp.warranty} onChange={set("warranty")} />
            </div>
          </div>

          <div className="tf-panel" style={{ padding: 18 }}>
            <div className="tf-eyebrow" style={{ marginBottom: 14 }}>3 · Engineering & compliance</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <ROIField label="Engineering + quality FTEs" value={inp.engFte} onChange={set("engFte")} />
              <ROIField label="Avg fully-loaded salary" suffix="$/yr" value={inp.loadedSalary} onChange={set("loadedSalary")} />
            </div>
            <div className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 10 }}>
              For {ind.label}, ~{ind.engReq}% of engineering time is modeled on requirements/verification and ~{ind.designRework}% on design rework.
            </div>
          </div>

          {/* advanced */}
          <div className="tf-panel" style={{ padding: 18 }}>
            <button onClick={() => setAdv((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "transparent", border: "none", cursor: "pointer", color: "var(--ink)", padding: 0 }}>
              <SlidersHorizontal size={15} color="var(--amber)" />
              <span style={{ fontWeight: 600, fontSize: 14 }}>Supply chain, contracts & assumptions</span>
              <ChevronDown size={16} color="var(--muted)" style={{ marginLeft: "auto", transform: adv ? "rotate(180deg)" : "none", transition: ".2s" }} />
            </button>
            {adv && (
              <div className="tf-fade" style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <ROIField label="Avg inventory value" suffix="$M" placeholder={(num(inp.revenueM) * ind.invRatio).toFixed(0) + " (auto)"} value={inp.inventoryM} onChange={set("inventoryM")} />
                  <ROIField label="Expedite / premium freight" suffix="$k" placeholder={(num(inp.revenueM) * 5).toFixed(0) + " (auto)"} value={inp.expediteK} onChange={set("expediteK")} />
                  <ROIField label="Supplier spend under mgmt" suffix="$M" placeholder={(num(inp.revenueM) * 0.45).toFixed(0) + " (auto)"} value={inp.contractSpendM} onChange={set("contractSpendM")} />
                  <ROIField label="Inventory carrying cost" suffix="%" placeholder={ind.carrying + " (auto)"} value={inp.carrying} onChange={set("carrying")} />
                  <ROIField label="Contracts / year" placeholder={Math.round(num(inp.revenueM) * 2) + " (auto)"} value={inp.contractsPerYr} onChange={set("contractsPerYr")} />
                  <ROIField label="ECOs / year" placeholder={Math.round(num(inp.revenueM) * 1.5) + " (auto)"} value={inp.ecosPerYr} onChange={set("ecosPerYr")} />
                </div>
                <div>
                  <div className="tf-eyebrow" style={{ marginBottom: 10 }}>Improvement assumptions ({scenario})</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {Object.keys(IMP).map((k) => (
                      <ROIField key={k} label={LEVER_META[k].label.split("—")[1]?.trim() || k} suffix="%"
                        value={ov[k] != null ? +(ov[k] * 100).toFixed(2) : +(IMP[k][SCEN[scenario]] * 100).toFixed(2)}
                        onChange={(v) => setOv((s) => ({ ...s, [k]: num(v) / 100 }))} />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="tf-eyebrow" style={{ marginBottom: 10 }}>Investment</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <ROIField label="Platform / yr" suffix="$k" placeholder={((60000 + Math.max(1, num(inp.plants)) * 30000) / 1e3).toFixed(0) + " (auto)"} value={inp.platformCostK} onChange={set("platformCostK")} />
                    <ROIField label="Implementation" suffix="$k" placeholder={((80000 + Math.max(1, num(inp.plants)) * 20000) / 1e3).toFixed(0) + " (auto)"} value={inp.implCostK} onChange={set("implCostK")} />
                    <ROIField label="Discount rate" suffix="%" value={inp.discountPct} onChange={set("discountPct")} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------ RESULTS ---------------------------- */}
        <div className="tf-fade" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* scenario toggle */}
          <div style={{ display: "inline-flex", background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: 12, padding: 4, alignSelf: "flex-start" }}>
            {["conservative", "likely", "aggressive"].map((sc) => (
              <button key={sc} onClick={() => setScen(sc)} className="tf-mono"
                style={{ fontSize: 12, fontWeight: 600, textTransform: "capitalize", cursor: "pointer", border: "none", borderRadius: 9, padding: "8px 14px",
                  background: scenario === sc ? "var(--panel2)" : "transparent", color: scenario === sc ? "var(--amber)" : "var(--faint)" }}>
                {sc}
              </button>
            ))}
          </div>

          {/* headline KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              ["Annual benefit", fmtMoney(r.riskAdj), "risk-adjusted", "var(--amber)"],
              ["Payback", r.payback === Infinity ? ">36 mo" : r.payback.toFixed(1) + " mo", "to break-even", "var(--thread)"],
              ["3-yr ROI", Math.round(r.roi3 * 100) + "%", "net / total cost", "var(--green)"],
              ["3-yr NPV", fmtMoney(r.npv), "disc. " + (num(inp.discountPct) || 10) + "%", "var(--blue)"],
            ].map(([l, v, s, c]) => (
              <div key={l} className="tf-panel" style={{ padding: 16 }}>
                <div className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)", textTransform: "uppercase", letterSpacing: ".06em" }}>{l}</div>
                <div className="tf-disp" style={{ fontSize: 30, fontWeight: 800, color: c, marginTop: 4, lineHeight: 1 }}>{v}</div>
                <div className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 4 }}>{s}</div>
              </div>
            ))}
          </div>

          {/* hard vs soft */}
          <div className="tf-panel" style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Hard vs soft savings</span>
              <span className="tf-mono" style={{ fontSize: 11.5, color: "var(--faint)" }}>gross {fmtMoney(r.gross)}/yr</span>
            </div>
            {[["Hard", r.hard, "var(--green)", "directly hits the P&L — applied at " + Math.round(HARD_CONF * 100) + "% confidence"],
              ["Soft", r.soft, "var(--blue)", "productivity & risk-avoidance — discounted to " + Math.round(SOFT_CONF * 100) + "%"]].map(([l, val, c, d]) => (
              <div key={l} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                  <span style={{ color: c, fontWeight: 600 }}>{l}</span>
                  <span className="tf-mono">{fmtMoney(val)}/yr</span>
                </div>
                <div style={{ height: 8, background: "var(--bg2)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ width: (r.gross ? (val / r.gross) * 100 : 0) + "%", height: "100%", background: c, borderRadius: 99 }} />
                </div>
                <div className="tf-mono" style={{ fontSize: 10, color: "var(--faint)", marginTop: 4 }}>{d}</div>
              </div>
            ))}
          </div>

          {/* cashflow / payback */}
          <div className="tf-panel" style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Cumulative net cash flow</span>
              <span className="tf-mono" style={{ fontSize: 11.5, color: "var(--faint)" }}>36 months</span>
            </div>
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={r.cashflow} margin={{ top: 6, right: 8, bottom: 0, left: -4 }}>
                <defs>
                  <linearGradient id="cf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--thread)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--thread)" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--line)" strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="m" tick={{ fill: "var(--faint)", fontSize: 10, fontFamily: "var(--mono)" }} ticks={[6, 12, 18, 24, 30, 36]} />
                <YAxis tickFormatter={fmtMoney} tick={{ fill: "var(--faint)", fontSize: 10, fontFamily: "var(--mono)" }} width={52} />
                <Tooltip formatter={(v) => fmtMoney(v)} labelFormatter={(m) => "Month " + m}
                  contentStyle={{ background: "var(--panel)", border: "1px solid var(--line2)", borderRadius: 8, fontSize: 12 }} />
                <ReferenceLine y={0} stroke="var(--faint)" />
                <Area type="monotone" dataKey="cum" stroke="var(--thread)" strokeWidth={2} fill="url(#cf)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="tf-mono" style={{ fontSize: 11, color: "var(--faint)" }}>
              Break-even at {r.payback === Infinity ? "—" : "month " + Math.ceil(r.payback)} · 3-yr net {fmtMoney(r.net3)} on {fmtMoney(r.totalCost)} total cost.
            </div>
          </div>

          {/* lever breakdown */}
          <div className="tf-panel" style={{ padding: 18 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Value-driver breakdown</div>
            {sortedLevers.map((l) => (
              <div key={l.key} style={{ marginBottom: 11 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <Tag tone={l.cat === "hard" ? "green" : "blue"}>{l.cat}</Tag>
                  <span style={{ fontSize: 12.5, color: "var(--muted)", flex: 1 }}>{l.label}</span>
                  <span className="tf-mono" style={{ fontSize: 12.5, fontWeight: 600 }}>{fmtMoney(l.amount)}</span>
                </div>
                <div style={{ height: 5, background: "var(--bg2)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ width: (l.amount / maxLever) * 100 + "%", height: "100%", background: l.cat === "hard" ? "var(--green)" : "var(--blue)", borderRadius: 99 }} />
                </div>
              </div>
            ))}
          </div>

          {/* methodology */}
          <div className="tf-panel" style={{ padding: 16, background: "var(--bg2)" }}>
            <div className="tf-eyebrow" style={{ marginBottom: 8 }}>Methodology</div>
            <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>
              A value-driver tree maps each lever to a ThreadWire module, following the smart-factory benefit
              categories used in Deloitte / Gartner business cases. Hard savings hit the P&L and are applied at
              {" "}{Math.round(HARD_CONF * 100)}% confidence; soft savings (productivity, risk-avoidance) are discounted to
              {" "}{Math.round(SOFT_CONF * 100)}%. The risk-adjusted benefit drives payback, 3-year NPV (discounted) and ROI.
              Improvement ranges are editable benchmark defaults — replace them with your own measured baseline before
              presenting. Figures are illustrative, not a guarantee.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================ DIRECT SPEND =============================== */
/* Procurement of direct materials, embedded in the digital thread: sourcing
   events triggered by BOM/ECO changes, a weighted-RFQ builder, and a
   bottom-up should-cost model that gives negotiation headroom. */

const DS_EVENTS = [
  { id: "SE-1042", part: "PN-3321", desc: "Bearing, angular contact", commodity: "Bearing steel", trigger: "ECO-220 supplier change", link: "ECO-220", linkId: "ECO-220", annualQty: 26000, status: "Open RFQ", tone: "yellow" },
  { id: "SE-1048", part: "PN-3322", desc: "Shaft, hardened 4140", commodity: "Alloy steel 4140", trigger: "BOM rev — demand +18%", link: "PN-3320 BOM", linkId: "BOM:PN-3320", annualQty: 65000, status: "Sourcing", tone: "blue" },
  { id: "SE-1051", part: "PN-3323", desc: "Collet nut", commodity: "Aluminium 6061", trigger: "PO-9920 delayed — re-source", link: "PO-9920", linkId: "PO-9920", annualQty: 65000, status: "Awarding", tone: "green" },
];
const DS_DETAIL = {
  "PN-3321": {
    sc: { commodity: "Bearing steel", massKg: 0.35, pricePerKg: 2.10, scrapPct: 8, machiningHrs: 0.18, laborRate: 42, overheadPct: 60, marginPct: 14 },
    suppliers: [
      { name: "Helix Alloys", quote: 3.95, quality: 4, lead: 4, risk: 3, sustain: 3, region: "DE" },
      { name: "NTN-Lite", quote: 3.60, quality: 3, lead: 3, risk: 3, sustain: 3, region: "JP" },
      { name: "Apex Precision", quote: 4.30, quality: 5, lead: 5, risk: 5, sustain: 4, region: "US-MI" },
    ],
  },
  "PN-3322": {
    sc: { commodity: "Alloy steel 4140", massKg: 1.8, pricePerKg: 1.35, scrapPct: 12, machiningHrs: 0.42, laborRate: 38, overheadPct: 55, marginPct: 12 },
    suppliers: [
      { name: "Midwest Forge", quote: 8.90, quality: 3, lead: 3, risk: 4, sustain: 4, region: "US-OH" },
      { name: "Helix Alloys", quote: 9.85, quality: 4, lead: 4, risk: 3, sustain: 3, region: "DE" },
      { name: "Apex Precision", quote: 10.40, quality: 5, lead: 5, risk: 5, sustain: 4, region: "US-MI" },
    ],
  },
  "PN-3323": {
    sc: { commodity: "Aluminium 6061", massKg: 0.22, pricePerKg: 2.95, scrapPct: 15, machiningHrs: 0.12, laborRate: 35, overheadPct: 50, marginPct: 13 },
    suppliers: [
      { name: "Sundown Components", quote: 2.45, quality: 3, lead: 2, risk: 2, sustain: 3, region: "US-TX" },
      { name: "Cyclone Machining", quote: 2.20, quality: 4, lead: 4, risk: 4, sustain: 3, region: "US-IL" },
      { name: "Apex Precision", quote: 2.75, quality: 5, lead: 5, risk: 5, sustain: 4, region: "US-MI" },
    ],
  },
};
const DS_CRITERIA = [
  ["price", "Price"], ["quality", "Quality"], ["lead", "Lead time"], ["risk", "Supply risk"], ["sustain", "Sustainability"],
];

function shouldCost(sc) {
  const material = sc.massKg * sc.pricePerKg * (1 + sc.scrapPct / 100);
  const labor = sc.machiningHrs * sc.laborRate;
  const overhead = (material + labor) * (sc.overheadPct / 100);
  const sub = material + labor + overhead;
  const total = sub * (1 + sc.marginPct / 100);
  return { material, labor, overhead, margin: total - sub, total };
}

/* ---- Phase 2: commodity prices ---- */
const DS_COMMODITIES = [
  { key: "steel", label: "Steel HRC", unit: "$/t", forward: 772, color: "var(--blue)", series: [690, 700, 685, 710, 725, 718, 730, 742, 735, 748, 755, 760] },
  { key: "copper", label: "LME Copper", unit: "$/t", forward: 9480, color: "var(--amber)", series: [8600, 8720, 8900, 8810, 9050, 9180, 9090, 9240, 9300, 9210, 9350, 9420] },
  { key: "alu", label: "LME Aluminium", unit: "$/t", forward: 2495, color: "var(--thread)", series: [2540, 2510, 2495, 2530, 2560, 2520, 2505, 2490, 2475, 2500, 2510, 2480] },
  { key: "poly", label: "Polymer (PP)", unit: "$/kg", forward: 1.30, color: "var(--green)", series: [1.45, 1.42, 1.40, 1.41, 1.38, 1.36, 1.37, 1.35, 1.34, 1.33, 1.34, 1.32] },
];
const DS_EXPOSURE = [
  { commodity: "Steel HRC", parts: "PN-3322 shaft", annual: 585000, hedged: 40, ckey: "steel" },
  { commodity: "Bearing steel", parts: "PN-3321 bearing", annual: 102000, hedged: 0, ckey: "steel" },
  { commodity: "Aluminium 6061", parts: "PN-3323 collet", annual: 159000, hedged: 25, ckey: "alu" },
];
const dsChg = (s) => { const a = s[s.length - 1], b = s[s.length - 5]; return ((a - b) / b) * 100; };

/* ---- Phase 3: Kraljic + supplier tiers ---- */
const DS_KRALJIC = [
  { part: "PN-3321", name: "Bearing", risk: 4.2, impact: 2.8 },
  { part: "PN-3322", name: "Shaft", risk: 2.5, impact: 4.4 },
  { part: "PN-3323", name: "Collet nut", risk: 3.6, impact: 3.8 },
  { part: "PN-1188", name: "Fasteners", risk: 1.6, impact: 1.4 },
];
const dsQuad = (risk, impact) => (impact > 3 ? (risk > 3 ? "strategic" : "leverage") : (risk > 3 ? "bottleneck" : "noncritical"));
const QUAD = {
  strategic: { label: "Strategic", color: "var(--red)", strat: "Partner & dual-source. Joint supplier development, long-term agreements, and shared risk." },
  leverage: { label: "Leverage", color: "var(--green)", strat: "Competitive bidding & reverse auctions. Consolidate volume and press price — supply is plentiful." },
  bottleneck: { label: "Bottleneck", color: "var(--yellow)", strat: "Secure supply. Safety stock, qualify alternates, reduce single-source exposure." },
  noncritical: { label: "Non-critical", color: "var(--muted)", strat: "Automate & catalog. Standardize and cut transaction cost — low risk, low impact." },
};
const DS_TIERS = {
  "PN-3321": { score: 74, t1: [{ name: "Helix Alloys", role: "Bearing assembly", lead: "8 wk", cap: "68%", risk: "med", region: "DE" }, { name: "NTN-Lite", role: "Bearing assembly", lead: "7 wk", cap: "75%", risk: "med", region: "JP" }], t2: [{ name: "Precision Race Grinding", role: "Races", lead: "5 wk", cap: "60%", risk: "med", region: "DE" }], t3: [{ name: "Bearing-steel mill", role: "100Cr6 steel", lead: "12 wk", cap: "—", risk: "high", region: "Global" }] },
  "PN-3322": { score: 62, t1: [{ name: "Midwest Forge", role: "Forge & machine", lead: "6 wk", cap: "82%", risk: "med", region: "US-OH" }], t2: [{ name: "Granite Bar Stock", role: "4140 bar", lead: "4 wk", cap: "71%", risk: "low", region: "US-IN" }], t3: [{ name: "Integrated steel mill", role: "Raw 4140", lead: "10 wk", cap: "—", risk: "high", region: "Global" }] },
  "PN-3323": { score: 48, t1: [{ name: "Cyclone Machining", role: "Machined nut", lead: "3 wk", cap: "80%", risk: "low", region: "US-IL" }, { name: "Sundown Components", role: "Machined nut", lead: "4 wk", cap: "66%", risk: "med", region: "US-TX" }], t2: [{ name: "Gulf Extrusions", role: "6061 bar", lead: "3 wk", cap: "78%", risk: "low", region: "US-TX" }], t3: [{ name: "Aluminium smelter", role: "Ingot", lead: "8 wk", cap: "—", risk: "med", region: "Global" }] },
  "PN-1188": { score: 22, t1: [{ name: "FastenAll Co", role: "Fasteners", lead: "1 wk", cap: "90%", risk: "low", region: "US" }], t2: [{ name: "Wire mill", role: "Wire", lead: "2 wk", cap: "85%", risk: "low", region: "US" }], t3: [{ name: "Steel mill", role: "Rod", lead: "—", cap: "—", risk: "low", region: "Global" }] },
};

function CommoditiesTab() {
  const [cKey, setCKey] = useState("steel");
  const sel = DS_COMMODITIES.find((c) => c.key === cKey);
  const selData = sel.series.map((v, i) => ({ m: i + 1, v }));
  const volatile = [...DS_COMMODITIES].sort((a, b) => Math.abs(dsChg(b.series)) - Math.abs(dsChg(a.series)))[0];

  return (
    <div className="tf-fade">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 18 }}>
        {DS_COMMODITIES.map((c) => {
          const ch = dsChg(c.series), up = ch >= 0;
          return (
            <div key={c.key} className="tf-panel" onClick={() => setCKey(c.key)} style={{ padding: 14, cursor: "pointer", border: cKey === c.key ? "1px solid var(--line2)" : "1px solid var(--line)" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 13.5 }}>{c.label}</span>
                <span className="tf-mono" style={{ marginLeft: "auto", fontSize: 11, color: up ? "var(--red)" : "var(--green)" }}>{up ? "▲" : "▼"} {Math.abs(ch).toFixed(1)}%</span>
              </div>
              <div className="tf-disp" style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>{c.series[c.series.length - 1].toLocaleString()}<span className="tf-mono" style={{ fontSize: 10, color: "var(--faint)" }}> {c.unit}</span></div>
              <ResponsiveContainer width="100%" height={36}>
                <AreaChart data={c.series.map((v, i) => ({ i, v }))} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                  <Area type="monotone" dataKey="v" stroke={c.color} strokeWidth={1.5} fill={c.color} fillOpacity={0.12} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 18 }} className="tf-cols">
        <div className="tf-panel" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <TrendingUp size={16} color={sel.color} /><span style={{ fontWeight: 600, fontSize: 14 }}>{sel.label} · 12-month</span>
            <span className="tf-chip" style={{ marginLeft: "auto" }}>spot vs forward</span>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={selData} margin={{ top: 6, right: 8, bottom: 0, left: -8 }}>
              <CartesianGrid stroke="var(--line)" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="m" tick={{ fill: "var(--faint)", fontSize: 10, fontFamily: "var(--mono)" }} />
              <YAxis domain={["auto", "auto"]} tick={{ fill: "var(--faint)", fontSize: 10, fontFamily: "var(--mono)" }} width={48} />
              <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--line2)", borderRadius: 8, fontSize: 12 }} labelFormatter={(m) => "Month " + m} />
              <ReferenceLine y={sel.forward} stroke="var(--amber)" strokeDasharray="5 4" label={{ value: "12-mo fwd", fill: "var(--amber)", fontSize: 10, position: "right" }} />
              <Area type="monotone" dataKey="v" stroke={sel.color} strokeWidth={2} fill={sel.color} fillOpacity={0.14} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="tf-panel" style={{ padding: 16 }}>
            <div className="tf-eyebrow" style={{ marginBottom: 12 }}>Commodity exposure</div>
            {DS_EXPOSURE.map((e) => (
              <div key={e.commodity} style={{ marginBottom: 11 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                  <span style={{ color: "var(--muted)" }}>{e.commodity} <span className="tf-mono" style={{ fontSize: 10, color: "var(--faint)" }}>· {e.parts}</span></span>
                  <span className="tf-mono">{fmtMoney(e.annual)}/yr</span>
                </div>
                <div style={{ display: "flex", height: 7, background: "var(--bg2)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ width: e.hedged + "%", background: "var(--green)" }} />
                  <div style={{ width: (100 - e.hedged) + "%", background: "var(--red)", opacity: 0.5 }} />
                </div>
                <div className="tf-mono" style={{ fontSize: 10, color: "var(--faint)", marginTop: 3 }}>{e.hedged}% hedged · {100 - e.hedged}% exposed to spot</div>
              </div>
            ))}
          </div>
          <div className="tf-panel" style={{ padding: 16, borderColor: "var(--yellow)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <AlertTriangle size={15} color="var(--yellow)" /><span style={{ fontWeight: 600, fontSize: 13.5, color: "var(--yellow)" }}>Hedging alert</span>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.55 }}>
              {volatile.label} moved {dsChg(volatile.series) >= 0 ? "+" : ""}{dsChg(volatile.series).toFixed(1)}% over 90 days. Largely-unhedged exposure on linked parts — consider forward cover or an index-linked clause.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StrategyTab() {
  const [part, setPart] = useState("PN-3322");
  const item = DS_KRALJIC.find((k) => k.part === part);
  const q = dsQuad(item.risk, item.impact);
  const meta = QUAD[q];
  const tiers = DS_TIERS[part];
  const scoreTone = tiers.score > 60 ? "var(--red)" : tiers.score > 40 ? "var(--yellow)" : "var(--green)";
  const riskTone = { low: "green", med: "yellow", high: "red" };

  return (
    <div className="tf-fade" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
      <div className="tf-cols-full">
        <div className="tf-panel" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Scale size={16} color="var(--amber)" /><span style={{ fontWeight: 600, fontSize: 14 }}>Kraljic matrix</span>
            <span className="tf-chip" style={{ marginLeft: "auto" }}>tap a category</span>
          </div>
          {/* 2x2 */}
          <div style={{ position: "relative", paddingLeft: 22, paddingBottom: 22 }}>
            <div style={{ position: "relative", aspectRatio: "1 / 1", display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", borderRadius: 10, overflow: "hidden", border: "1px solid var(--line)" }}>
              {[["bottleneck", 0], ["strategic", 1], ["noncritical", 2], ["leverage", 3]].map(([qq]) => (
                <div key={qq} style={{ background: QUAD[qq].color, opacity: 0.07, display: "flex", alignItems: "flex-start", justifyContent: "flex-start" }} />
              ))}
              {/* quadrant labels */}
              <span style={{ position: "absolute", top: 8, left: 10, fontFamily: "var(--mono)", fontSize: 10, color: "var(--yellow)" }}>Bottleneck</span>
              <span style={{ position: "absolute", top: 8, right: 10, fontFamily: "var(--mono)", fontSize: 10, color: "var(--red)" }}>Strategic</span>
              <span style={{ position: "absolute", bottom: 8, left: 10, fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)" }}>Non-critical</span>
              <span style={{ position: "absolute", bottom: 8, right: 10, fontFamily: "var(--mono)", fontSize: 10, color: "var(--green)" }}>Leverage</span>
              {/* dots */}
              {DS_KRALJIC.map((k) => (
                <button key={k.part} onClick={() => setPart(k.part)} title={k.name}
                  style={{ position: "absolute", left: `calc(${(k.impact / 5) * 100}% - 7px)`, bottom: `calc(${(k.risk / 5) * 100}% - 7px)`,
                    width: 14, height: 14, borderRadius: 99, cursor: "pointer", border: part === k.part ? "2px solid #fff" : "2px solid var(--bg)",
                    background: QUAD[dsQuad(k.risk, k.impact)].color, boxShadow: part === k.part ? "0 0 0 4px rgba(255,255,255,.12)" : "none" }} />
              ))}
            </div>
            <span style={{ position: "absolute", left: -4, top: "50%", transform: "rotate(-90deg) translateX(50%)", transformOrigin: "left", fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--faint)" }}>Supply risk →</span>
            <span style={{ position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)", fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--faint)" }}>Profit impact →</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="tf-panel" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{item.name}</span>
            <span className="tf-mono" style={{ fontSize: 11, color: "var(--faint)" }}><ThreadLink id={item.part} style={{ color: "var(--green)" }}>{item.part}</ThreadLink></span>
            <span style={{ marginLeft: "auto" }}><Tag tone={q === "strategic" ? "red" : q === "leverage" ? "green" : q === "bottleneck" ? "yellow" : "muted"}>{meta.label}</Tag></span>
          </div>
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55, margin: "10px 0 0" }}>{meta.strat}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
            <span style={{ fontSize: 12.5, color: "var(--muted)" }}>Supply-risk score</span>
            <span className="tf-mono" style={{ marginLeft: "auto", fontSize: 18, fontWeight: 700, color: scoreTone }}>{tiers.score}</span>
            <span className="tf-mono" style={{ fontSize: 10, color: "var(--faint)" }}>/100</span>
          </div>
        </div>

        <div className="tf-panel" style={{ padding: 16 }}>
          <div className="tf-eyebrow" style={{ marginBottom: 12 }}>Supplier tiers · {item.part}</div>
          {[["Tier 1", tiers.t1], ["Tier 2", tiers.t2], ["Tier 3", tiers.t3]].map(([tl, arr]) => (
            <div key={tl} style={{ marginBottom: 12 }}>
              <div className="tf-mono" style={{ fontSize: 10.5, color: "var(--amber)", marginBottom: 6 }}>{tl}{tl === "Tier 1" && arr.length === 1 ? " · ⚠ single-source" : ""}</div>
              {arr.map((s) => (
                <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: 9, marginBottom: 6 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}><ThreadLink id={s.name}>{s.name}</ThreadLink></div>
                    <div className="tf-mono" style={{ fontSize: 10, color: "var(--faint)" }}>{s.role} · {s.region} · lead {s.lead} · cap {s.cap}</div>
                  </div>
                  <Tag tone={riskTone[s.risk]}>{s.risk}</Tag>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DirectSpendPage({ tier, setTier }) {
  const [tab, setTab] = useState("sourcing");
  const [sel, setSel] = useState(DS_EVENTS[1]);
  const [w, setW] = useState({ price: 35, quality: 25, lead: 20, risk: 15, sustain: 5 });
  const detail = DS_DETAIL[sel.part] || DS_DETAIL["PN-3322"];

  const sc = useMemo(() => shouldCost(detail.sc), [detail]);

  const ranked = useMemo(() => {
    const quotes = detail.suppliers.map((s) => s.quote);
    const mn = Math.min(...quotes), mx = Math.max(...quotes);
    const sumW = DS_CRITERIA.reduce((a, [k]) => a + (w[k] || 0), 0) || 1;
    return detail.suppliers
      .map((s) => {
        const priceScore = mx === mn ? 5 : 1 + 4 * (mx - s.quote) / (mx - mn);
        const scores = { price: priceScore, quality: s.quality, lead: s.lead, risk: s.risk, sustain: s.sustain };
        const total = DS_CRITERIA.reduce((a, [k]) => a + (scores[k] / 5) * (w[k] || 0), 0) / sumW * 5;
        return { ...s, priceScore, total };
      })
      .sort((a, b) => b.total - a.total);
  }, [detail, w]);

  const bestQuote = Math.min(...detail.suppliers.map((s) => s.quote));
  const headroom = bestQuote - sc.total;
  const headroomPct = (headroom / bestQuote) * 100;
  const usd = (n) => "$" + n.toFixed(2);

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "34px 22px 70px" }}>
      <PageHead icon={Coins} eyebrow="Module · Direct Spend" title="Direct material sourcing"
        sub="Procurement embedded in the digital thread. Sourcing events fire from BOM and ECO changes; build weighted RFQs and bottom-up should-cost models to negotiate from strength."
        tier={tier} setTier={setTier} />

      {tier === "free" && (
        <div className="tf-panel tf-fade" style={{ padding: "12px 16px", marginBottom: 18, display: "flex", alignItems: "center", gap: 10, background: "var(--bg2)" }}>
          <Database size={16} color="var(--green)" />
          <span style={{ fontSize: 13.5, color: "var(--muted)" }}>Sample sourcing events derived from the <b style={{ color: "var(--ink)" }}>PN-3320 BOM</b>. Switch to <b style={{ color: "var(--amber)" }}>Connected</b> to pull demand from SAP/Oracle and live commodity indices.</span>
        </div>
      )}

      {/* tab nav */}
      <div style={{ display: "flex", gap: 4, marginBottom: 18, borderBottom: "1px solid var(--line)" }}>
        {[["sourcing", "Sourcing", Coins], ["commodities", "Commodities", TrendingUp], ["strategy", "Category strategy", Scale]].map(([k, label, Ic]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            display: "flex", alignItems: "center", gap: 7, padding: "10px 14px", border: "none", cursor: "pointer", background: "transparent",
            fontFamily: "var(--mono)", fontSize: 12.5, fontWeight: 600, color: tab === k ? "var(--ink)" : "var(--faint)",
            borderBottom: tab === k ? "2px solid var(--amber)" : "2px solid transparent", marginBottom: -1,
          }}><Ic size={14} color={tab === k ? "var(--amber)" : "var(--faint)"} />{label}</button>
        ))}
      </div>

      {tab === "sourcing" && (<>
      {/* sourcing events */}
      <div className="tf-panel tf-fade" style={{ overflow: "hidden", marginBottom: 18 }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center" }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>BOM-linked sourcing events</span>
          <span className="tf-chip" style={{ marginLeft: "auto" }}>auto-generated from thread changes</span>
        </div>
        {DS_EVENTS.map((e) => (
          <div key={e.id} className="tf-row" onClick={() => setSel(e)} style={{
            padding: "13px 16px", cursor: "pointer", borderBottom: "1px solid var(--line)",
            background: sel.id === e.id ? "var(--panel2)" : "transparent", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
          }}>
            <StatusDot tone={e.tone} />
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{e.desc}</div>
              <div className="tf-mono" style={{ fontSize: 11, color: "var(--faint)" }}>{e.id} · <ThreadLink id={e.part} style={{ color: "var(--green)" }}>{e.part}</ThreadLink> · {e.commodity}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Tag tone="thread"><Link2 size={9} style={{ verticalAlign: "-1px" }} /> <ThreadLink id={e.linkId} style={{ color: "inherit" }}>{e.link}</ThreadLink></Tag>
              <span className="tf-mono" style={{ fontSize: 11, color: "var(--faint)" }}>{(e.annualQty / 1000).toFixed(0)}k/yr</span>
              <Tag tone={e.tone}>{e.status}</Tag>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 18 }} className="tf-cols">
        {/* weighted RFQ */}
        <div className="tf-panel tf-fade" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Scale size={17} color="var(--amber)" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>Weighted RFQ · {sel.part}</span>
          </div>
          <div className="tf-mono" style={{ fontSize: 11, color: "var(--faint)", marginBottom: 12 }}>Adjust the weights — ranking recomputes live.</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", marginBottom: 16 }}>
            {DS_CRITERIA.map(([k, label]) => (
              <label key={k} style={{ display: "block" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)", marginBottom: 3 }}>
                  <span>{label}</span><span className="tf-mono" style={{ color: "var(--amber)" }}>{w[k]}</span>
                </div>
                <input type="range" min="0" max="50" value={w[k]} onChange={(e) => setW((s) => ({ ...s, [k]: +e.target.value }))}
                  style={{ width: "100%", accentColor: "var(--amber)" }} />
              </label>
            ))}
          </div>
          {ranked.map((s, i) => (
            <div key={s.name} style={{ padding: "10px 12px", borderRadius: 10, marginBottom: 8, border: "1px solid var(--line)", background: i === 0 ? "rgba(67,194,119,.08)" : "var(--bg2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {i === 0 && <Tag tone="green">recommend</Tag>}
                <span style={{ fontWeight: 600, fontSize: 13.5 }}><ThreadLink id={s.name}>{s.name}</ThreadLink></span>
                <span className="tf-mono" style={{ fontSize: 11, color: "var(--faint)" }}>{s.region} · ${s.quote.toFixed(2)}/ea</span>
                <span className="tf-mono" style={{ marginLeft: "auto", fontSize: 14, fontWeight: 700, color: i === 0 ? "var(--green)" : "var(--ink)" }}>{s.total.toFixed(2)}</span>
              </div>
              <div style={{ height: 5, background: "var(--panel)", borderRadius: 99, marginTop: 7, overflow: "hidden" }}>
                <div style={{ width: (s.total / 5) * 100 + "%", height: "100%", background: i === 0 ? "var(--green)" : "var(--line2)", borderRadius: 99 }} />
              </div>
            </div>
          ))}
          <div className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 4 }}>Weighted score out of 5 · price scored relative to quotes.</div>
        </div>

        {/* should-cost */}
        <div className="tf-panel tf-fade" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Factory size={16} color="var(--thread)" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>Should-cost · {detail.sc.commodity}</span>
          </div>
          {[["Material", sc.material, "var(--thread)"], ["Labor / process", sc.labor, "var(--blue)"], ["Overhead", sc.overhead, "var(--yellow)"], ["Margin", sc.margin, "var(--faint)"]].map(([l, v, c]) => (
            <div key={l} style={{ marginBottom: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}>
                <span style={{ color: "var(--muted)" }}>{l}</span><span className="tf-mono">{usd(v)}</span>
              </div>
              <div style={{ height: 6, background: "var(--bg2)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ width: (v / sc.total) * 100 + "%", height: "100%", background: c, borderRadius: 99 }} />
              </div>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>Should-cost / unit</span>
            <span className="tf-disp" style={{ fontSize: 24, fontWeight: 800, color: "var(--thread)" }}>{usd(sc.total)}</span>
          </div>

          <div style={{ marginTop: 14, padding: 13, borderRadius: 11, background: "var(--bg2)", border: "1px solid var(--line)" }}>
            <div className="tf-eyebrow" style={{ marginBottom: 8 }}>Negotiation headroom</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div>
                <div className="tf-mono" style={{ fontSize: 11, color: "var(--faint)" }}>best quote</div>
                <div className="tf-disp" style={{ fontSize: 18, fontWeight: 700 }}>{usd(bestQuote)}</div>
              </div>
              <ArrowRight size={14} color="var(--faint)" />
              <div>
                <div className="tf-mono" style={{ fontSize: 11, color: "var(--faint)" }}>vs should-cost</div>
                <div className="tf-disp" style={{ fontSize: 18, fontWeight: 700, color: headroom > 0 ? "var(--amber)" : "var(--green)" }}>
                  {headroom > 0 ? usd(headroom) + " · " + headroomPct.toFixed(0) + "%" : "at target"}
                </div>
              </div>
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <div className="tf-mono" style={{ fontSize: 11, color: "var(--faint)" }}>annual</div>
                <div className="tf-disp" style={{ fontSize: 18, fontWeight: 700, color: "var(--amber)" }}>{fmtMoney(Math.max(0, headroom) * sel.annualQty)}</div>
              </div>
            </div>
            <div className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 8 }}>
              Headroom × {(sel.annualQty / 1000).toFixed(0)}k units/yr = potential savings on this line.
            </div>
          </div>
        </div>
      </div>

      </>)}

      {tab === "commodities" && <CommoditiesTab />}
      {tab === "strategy" && <StrategyTab />}

      {tier === "paid" && (
        <div style={{ marginTop: 22 }}>
          <ConnectGate title="Wire up direct-spend data"
            lines={[
              "Pull MRP/MPS demand and BOM explosions from SAP or Oracle ERP for live sourcing events.",
              "Feed should-cost with live commodity indices (LME copper/aluminium, steel HRC, polymer).",
              "Sync awarded events back to PO creation and the digital thread.",
            ]}
            connectors={[
              { name: "SAP ERP", desc: "MRP/MPS, BOM, PO", icon: Database },
              { name: "Oracle ERP", desc: "Demand + financials", icon: Database },
              { name: "Commodity indices", desc: "LME / steel / polymer", icon: TrendingUp },
            ]} />
        </div>
      )}
    </div>
  );
}

/* ----------------------------- ROOT ------------------------------------- */
const EMPTY_CHATS = { home: { msgs: [], hist: [] }, assets: { msgs: [], hist: [] }, contracts: { msgs: [], hist: [] }, requirements: { msgs: [], hist: [] }, thread: { msgs: [], hist: [] }, roi: { msgs: [], hist: [] }, directspend: { msgs: [], hist: [] }, blockers: { msgs: [], hist: [] }, visibility: { msgs: [], hist: [] }, finance: { msgs: [], hist: [] } };

/* ===================== DIGITAL THREAD — object explorer =================
   Click any part / BOM / work order / ECO / PO / supplier anywhere in the app
   to open a metadata dialog with clickable links to related objects, so the
   whole thread is navigable from any starting tile. */

const PART_META = {
  "PN-3320": { desc: "Spindle Assembly", rev: "C", src: "Make", lifecycle: "Production", commodity: "—", spec: "Assembly dwg 3320-C", mass: "4.6 kg", owner: "M. Reyes" },
  "PN-3321": { desc: "Bearing, angular contact", rev: "B", src: "Buy", lifecycle: "Production", commodity: "Bearing steel", spec: "ISO 7206 P4", mass: "0.35 kg", owner: "Procurement" },
  "PN-3322": { desc: "Shaft, hardened 4140", rev: "D", src: "Make", lifecycle: "Production", commodity: "Alloy steel 4140", spec: "HRC 48–52", mass: "1.8 kg", owner: "Eng · A. Kidd" },
  "PN-3323": { desc: "Collet nut", rev: "A", src: "Buy", lifecycle: "Production", commodity: "Aluminium 6061", spec: "6061-T6", mass: "0.22 kg", owner: "Procurement" },
  "PN-1188": { desc: "Control Cabinet", rev: "F", src: "Make", lifecycle: "Production", commodity: "—", spec: "UL508A", mass: "—", owner: "Electrical" },
  "PN-4501": { desc: "Servo Bracket", rev: "A", src: "Make", lifecycle: "NPI", commodity: "Aluminium 6061", spec: "Bracket dwg 4501-A", mass: "0.9 kg", owner: "Eng" },
};
const WO_ROUTING = {
  "WO-7781": [["10", "CNC turn shaft", "CNC-04", "Done"], ["20", "Heat treat 48–52 HRC", "HT-1", "Done"], ["30", "OD grind", "GR-02", "WIP"], ["40", "Press bearings", "Assy-1", "Queued"], ["50", "Runout test", "Test-A", "Queued"]],
  "WO-7782": [["10", "Sheet metal", "Punch-2", "Done"], ["20", "Wire panel", "Panel-3", "Done"], ["30", "FAT", "Test-B", "Done"]],
  "WO-7790": [["10", "Saw blank", "Saw-1", "Done"], ["20", "CNC mill bracket", "CNC-07", "Blocked — fixture"], ["30", "Anodize", "Out-1", "Queued"], ["40", "Inspect", "CMM-1", "Queued"]],
  "WO-7795": [["10", "Kit components", "Kit-1", "Queued"], ["20", "CNC turn shaft", "CNC-04", "Queued"], ["30", "Assemble", "Assy-1", "Queued"]],
};
const SUPPLIER_META = {
  "Helix Alloys": { region: "Germany", tier: "Tier 1", scope: "Bearings, forgings", lead: "8 wk", risk: "Medium", certs: "ISO 9001, IATF 16949", parts: ["PN-3321"] },
  "NTN-Lite": { region: "Japan", tier: "Tier 1", scope: "Bearings", lead: "7 wk", risk: "Medium", certs: "ISO 9001", parts: ["PN-3321"] },
  "Apex Precision": { region: "US-MI", tier: "Tier 1", scope: "Precision machining", lead: "5 wk", risk: "Low", certs: "AS9100, ISO 9001", parts: ["PN-3321", "PN-3322", "PN-3323"] },
  "Midwest Forge": { region: "US-OH", tier: "Tier 1", scope: "Forging & machining", lead: "6 wk", risk: "Medium", certs: "IATF 16949", parts: ["PN-3322"] },
  "Cyclone Machining": { region: "US-IL", tier: "Tier 1", scope: "Machining", lead: "3 wk", risk: "Low", certs: "ISO 9001", parts: ["PN-3323"] },
  "Sundown Components": { region: "US-TX", tier: "Tier 1", scope: "Machined components", lead: "4 wk", risk: "Medium", certs: "ISO 9001", parts: ["PN-3323"] },
  "Sundown Elec.": { region: "US-TX", tier: "Tier 1", scope: "Electro-mech components", lead: "4 wk", risk: "Medium", certs: "ISO 9001", parts: ["PN-3323"] },
};

function buildThread() {
  const T = {};
  for (const [pn, m] of Object.entries(PART_META)) {
    const usedWOs = WORKORDERS.filter((w) => w.part === pn).map((w) => w.id);
    const parentAsm = BOM.find((b) => b.pn === pn && b.level > 0) ? "PN-3320" : "";
    const wu = [parentAsm, ...usedWOs].filter(Boolean).join(" · ") || "—";
    T[pn] = { type: "Part", title: pn + " · " + m.desc,
      attrs: [["Description", m.desc], ["Revision", m.rev], ["Source", m.src], ["Lifecycle", m.lifecycle], ["Commodity", m.commodity], ["Spec", m.spec], ["Mass", m.mass], ["Owner", m.owner], ["Where used", wu]], links: [] };
  }
  T["BOM:PN-3320"] = { type: "BOM", title: "BOM · PN-3320 Spindle Assembly",
    attrs: [["Top part", "PN-3320"], ["Levels", "2"], ["Lines", String(BOM.length)], ["Make / Buy", "1 make · " + BOM.filter((b) => b.src === "Buy").length + " buy"]],
    table: BOM.map((b) => ({ pn: b.pn, desc: b.desc, qty: b.qty, src: b.src, onhand: b.onhand, demand: b.demand })),
    links: BOM.map((b) => b.pn) };
  if (T["PN-3320"]) T["PN-3320"].links.push("BOM:PN-3320", ...BOM.filter((b) => b.level > 0).map((b) => b.pn));
  for (const w of WORKORDERS) {
    T[w.id] = { type: "Work Order", title: w.id + " · " + w.desc,
      attrs: [["Part", w.part], ["Qty", String(w.qty)], ["Completed", w.done + " / " + w.qty], ["Status", w.status], ["Due", w.due]],
      routing: WO_ROUTING[w.id] || null, links: [w.part] };
    if (T[w.part]) T[w.part].links.push(w.id);
  }
  for (const e of ECO) {
    T[e.id] = { type: "ECO", title: e.id + " · " + e.title,
      attrs: [["Status", e.status], ["Affects", e.affects.join(", ")], ["Jira", e.jira]], links: [...e.affects] };
    e.affects.forEach((pn) => { if (T[pn]) T[pn].links.push(e.id); });
  }
  for (const p of POs) {
    T[p.id] = { type: "Purchase Order", title: p.id + " · " + p.part,
      attrs: [["Part", p.part], ["Supplier", p.supplier], ["Qty", String(p.qty)], ["ETA", p.eta], ["Status", p.status]], links: [p.part, p.supplier] };
    if (T[p.part]) T[p.part].links.push(p.id);
  }
  for (const [name, m] of Object.entries(SUPPLIER_META)) {
    T[name] = { type: "Supplier", title: name,
      attrs: [["Region", m.region], ["Tier", m.tier], ["Scope", m.scope], ["Lead time", m.lead], ["Risk", m.risk], ["Certs", m.certs]], links: m.parts || [] };
  }
  T["REQ-001"] = { type: "Requirement", title: "REQ-001 · Spindle runout ≤ 5µm",
    attrs: [["Source", "Jama"], ["Verification", "Test-A"], ["Status", "Verified"], ["Traces to", "PN-3320, WO-7781"]], links: ["PN-3320", "WO-7781"] };
  for (const k in T) T[k].links = [...new Set(T[k].links)].filter((id) => id !== k && T[id]);
  return T;
}
const THREAD = buildThread();
const TYPE_TONE = { Part: "green", "Work Order": "amber", BOM: "thread", ECO: "blue", "Purchase Order": "yellow", Supplier: "thread", Requirement: "blue" };

const ThreadCtx = React.createContext({ open: () => {} });
function useThread() { return useContext(ThreadCtx); }

function ThreadLink({ id, children, style }) {
  const { open } = useThread();
  if (!THREAD[id]) return <>{children ?? id}</>;
  return (
    <span onClick={(e) => { e.stopPropagation(); open(id); }} title={"View " + id}
      style={{ cursor: "pointer", borderBottom: "1px dotted currentColor", ...style }}>{children ?? id}</span>
  );
}

function ThreadModal({ stack, setStack }) {
  const id = stack[stack.length - 1];
  if (!id || !THREAD[id]) return null;
  const o = THREAD[id];
  const open = (nid) => setStack((s) => [...s, nid]);
  const back = () => setStack((s) => s.slice(0, -1));
  const close = () => setStack([]);
  const val = (v) => (THREAD[v] ? <ThreadLink id={v} style={{ color: "var(--thread)" }}>{v}</ThreadLink> : v);

  return (
    <div onClick={close} style={{ position: "fixed", inset: 0, zIndex: 220, background: "rgba(5,8,13,.72)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", padding: 18 }}>
      <div onClick={(e) => e.stopPropagation()} className="tf-fade" style={{ width: "100%", maxWidth: 540, maxHeight: "82vh", overflowY: "auto", background: "linear-gradient(180deg,var(--panel),var(--bg2))", border: "1px solid var(--line2)", borderRadius: 16, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          {stack.length > 1 && <span onClick={back} style={{ cursor: "pointer", color: "var(--faint)", fontSize: 13 }}>←</span>}
          <Tag tone={TYPE_TONE[o.type] || "muted"}>{o.type}</Tag>
          <span style={{ fontWeight: 700, fontSize: 15.5, flex: 1 }}>{o.title}</span>
          <span onClick={close} style={{ cursor: "pointer", color: "var(--faint)", fontSize: 18, lineHeight: 1 }}>✕</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px", marginBottom: o.routing || o.table ? 16 : 4 }}>
          {o.attrs.map(([k, v]) => (
            <React.Fragment key={k}>
              <span className="tf-mono" style={{ fontSize: 11.5, color: "var(--faint)" }}>{k}</span>
              <span style={{ fontSize: 13 }}>{val(v)}</span>
            </React.Fragment>
          ))}
        </div>

        {o.routing && (
          <div style={{ marginBottom: 16 }}>
            <div className="tf-eyebrow" style={{ marginBottom: 8 }}>Routing</div>
            {o.routing.map(([op, desc, wc, st]) => (
              <div key={op} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: 8, marginBottom: 5 }}>
                <span className="tf-mono" style={{ fontSize: 11, color: "var(--amber)" }}>{op}</span>
                <span style={{ fontSize: 12.5, flex: 1 }}>{desc}</span>
                <span className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)" }}>{wc}</span>
                <Tag tone={/done|complete/i.test(st) ? "green" : /block/i.test(st) ? "red" : /wip|progress/i.test(st) ? "yellow" : "blue"}>{st}</Tag>
              </div>
            ))}
          </div>
        )}

        {o.table && (
          <div style={{ marginBottom: 16 }}>
            <div className="tf-eyebrow" style={{ marginBottom: 8 }}>Bill of materials</div>
            {o.table.map((r) => (
              <div key={r.pn} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: 8, marginBottom: 5 }}>
                <ThreadLink id={r.pn} style={{ color: "var(--green)", fontFamily: "var(--mono)", fontSize: 11.5 }}>{r.pn}</ThreadLink>
                <span style={{ fontSize: 12.5, flex: 1 }}>{r.desc}</span>
                <span className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)" }}>×{r.qty} · {r.src}</span>
                <span className="tf-mono" style={{ fontSize: 10.5, color: r.onhand < r.demand ? "var(--red)" : "var(--green)" }}>{r.onhand}/{r.demand}</span>
              </div>
            ))}
          </div>
        )}

        {o.links.length > 0 && (
          <div>
            <div className="tf-eyebrow" style={{ marginBottom: 8 }}>Linked in the thread</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {o.links.map((lid) => (
                <span key={lid} onClick={() => open(lid)} style={{ cursor: "pointer", fontFamily: "var(--mono)", fontSize: 11.5, padding: "5px 10px", borderRadius: 8, border: "1px solid var(--line2)", background: "var(--bg2)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Tag tone={TYPE_TONE[THREAD[lid].type] || "muted"}>{THREAD[lid].type}</Tag>{lid}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================== SALES ORDERS · BLOCKERS · DELIVERY ===============
   Blockers are shop-floor issues (like project issues) tied to sales orders.
   One blocker can impact many sales orders, references parts and a work order,
   is assigned to a person, and carries $ at risk = sum of its orders' value.
   Sales orders render on a point-in-time delivery calendar by promise date. */

const PEOPLE = ["Anu Mishra", "M. Reyes", "A. Kidd", "J. Cole", "Floor Lead", "Procurement Desk"];
const SITES = ["Lawrence, MA", "Greenville, SC", "Monterrey, MX"];
const SALES_ORDERS = [
  { id: "SO-5001", customer: "Vertex Aerospace", site: "Lawrence, MA", promise: "2026-06-22", parts: ["PN-3320"], qty: 40, value: 128000 },
  { id: "SO-5002", customer: "Helios Robotics", site: "Lawrence, MA", promise: "2026-06-22", parts: ["PN-3322", "PN-3323"], qty: 120, value: 54000 },
  { id: "SO-5003", customer: "Northwind Motors", site: "Greenville, SC", promise: "2026-06-23", parts: ["PN-1188"], qty: 12, value: 38000 },
  { id: "SO-5004", customer: "Apex Defense", site: "Greenville, SC", promise: "2026-06-24", parts: ["PN-4501"], qty: 200, value: 96000 },
  { id: "SO-5005", customer: "Cascade Pumps", site: "Monterrey, MX", promise: "2026-06-25", parts: ["PN-3320"], qty: 25, value: 81000 },
  { id: "SO-5006", customer: "Vertex Aerospace", site: "Lawrence, MA", promise: "2026-06-26", parts: ["PN-3321"], qty: 300, value: 42000 },
  { id: "SO-5007", customer: "Orion Systems", site: "Greenville, SC", promise: "2026-06-20", parts: ["PN-3322"], qty: 65, value: 33000 },
  { id: "SO-5008", customer: "Helios Robotics", site: "Lawrence, MA", promise: "2026-06-19", parts: ["PN-3320"], qty: 18, value: 59000 },
  { id: "SO-5009", customer: "Apex Defense", site: "Greenville, SC", promise: "2026-06-27", parts: ["PN-4501", "PN-1188"], qty: 150, value: 120000 },
  { id: "SO-5010", customer: "Cascade Pumps", site: "Monterrey, MX", promise: "2026-07-01", parts: ["PN-3323"], qty: 65, value: 28000 },
  { id: "SO-5011", customer: "Northwind Motors", site: "Greenville, SC", promise: "2026-07-02", parts: ["PN-3320"], qty: 30, value: 99000 },
  { id: "SO-5012", customer: "Orion Systems", site: "Lawrence, MA", promise: "2026-06-29", parts: ["PN-3321", "PN-3322"], qty: 90, value: 47000 },
  { id: "SO-5013", customer: "Vertex Aerospace", site: "Lawrence, MA", promise: "2026-07-10", parts: ["PN-3320"], qty: 35, value: 112000 },
  { id: "SO-5014", customer: "Apex Defense", site: "Greenville, SC", promise: "2026-07-18", parts: ["PN-4501"], qty: 180, value: 88000 },
  { id: "SO-5015", customer: "Cascade Pumps", site: "Monterrey, MX", promise: "2026-08-05", parts: ["PN-3320"], qty: 28, value: 90000 },
  { id: "SO-5016", customer: "Helios Robotics", site: "Lawrence, MA", promise: "2026-08-21", parts: ["PN-3322", "PN-3323"], qty: 140, value: 63000 },
  { id: "SO-5017", customer: "Northwind Motors", site: "Greenville, SC", promise: "2026-09-09", parts: ["PN-1188"], qty: 16, value: 51000 },
  { id: "SO-5018", customer: "Orion Systems", site: "Lawrence, MA", promise: "2026-09-24", parts: ["PN-3321"], qty: 260, value: 39000 },
  { id: "SO-5019", customer: "Vertex Aerospace", site: "Lawrence, MA", promise: "2026-10-08", parts: ["PN-3320"], qty: 50, value: 158000 },
  { id: "SO-5020", customer: "Apex Defense", site: "Greenville, SC", promise: "2026-10-22", parts: ["PN-4501", "PN-1188"], qty: 160, value: 131000 },
  { id: "SO-5021", customer: "Cascade Pumps", site: "Monterrey, MX", promise: "2026-11-12", parts: ["PN-3323"], qty: 70, value: 30000 },
  { id: "SO-5022", customer: "Northwind Motors", site: "Greenville, SC", promise: "2026-11-26", parts: ["PN-3320"], qty: 33, value: 104000 },
  { id: "SO-5023", customer: "Helios Robotics", site: "Lawrence, MA", promise: "2026-12-10", parts: ["PN-3322"], qty: 80, value: 44000 },
  { id: "SO-5024", customer: "Orion Systems", site: "Greenville, SC", promise: "2026-12-18", parts: ["PN-4501"], qty: 120, value: 97000 },
];
const SEED_BLOCKERS = [
  { id: "BLK-2001", title: "CNC-07 fixture failure halting servo bracket", status: "assigned", assignee: "Floor Lead", openedBy: "Floor Lead", action: "Replace fixture and re-qualify first article before resuming WO-7790.", wo: "WO-7790", parts: ["PN-4501"], sos: ["SO-5004", "SO-5009"], created: "2026-06-18T13:10:00Z", closedAt: null, closedBy: null, newPromise: "2026-07-01", comments: [{ ts: "2026-06-18T14:20:00Z", who: "Floor Lead", text: "Replacement fixture ordered, ETA Jun 26. Re-qual ~2 days after." }, { ts: "2026-06-19T09:05:00Z", who: "A. Kidd", text: "Maintenance confirmed spindle is fine; isolated to fixture." }] },
  { id: "BLK-2002", title: "PN-3323 collet-nut shortage — PO-9920 delayed", status: "open", assignee: null, openedBy: "Procurement Desk", action: "Expedite PO-9920 or re-source PN-3323 to an alternate supplier.", wo: "WO-7781", parts: ["PN-3323"], sos: ["SO-5002"], created: "2026-06-19T08:40:00Z", closedAt: null, closedBy: null, newPromise: null, comments: [] },
  { id: "BLK-2003", title: "Anodize capacity risk on Q3 servo brackets", status: "open", assignee: null, openedBy: "Anu Mishra", action: "Qualify a second anodize vendor before the July build.", wo: "WO-7790", parts: ["PN-4501"], sos: ["SO-5014"], created: "2026-06-20T11:15:00Z", closedAt: null, closedBy: null, newPromise: null, comments: [] },
  { id: "BLK-2004", title: "Long-lead casting risk on Q4 spindle housings", status: "assigned", assignee: "Procurement Desk", openedBy: "Anu Mishra", action: "Place long-lead PO for PN-3320 castings now to protect Q4.", wo: null, parts: ["PN-3320"], sos: ["SO-5019", "SO-5022"], created: "2026-06-20T15:30:00Z", closedAt: null, closedBy: null, newPromise: null, comments: [] },
];

const soById = (id) => SALES_ORDERS.find((s) => s.id === id);
const blockerValue = (b) => b.sos.reduce((a, id) => a + (soById(id)?.value || 0), 0);
const openBlockerForSO = (blockers, soId) => blockers.find((b) => b.status !== "closed" && b.sos.includes(soId));
const BLK_TONE = { open: "red", assigned: "yellow", closed: "green" };
const CURRENT_USER = "Anu Mishra";
// effective promise = revised date from an open blocker (if any), else the original committed date
const revisedForSO = (blockers, soId) => { const b = blockers.find((x) => x.status !== "closed" && x.newPromise && x.sos.includes(soId)); return b ? b.newPromise : null; };
const effPromise = (blockers, o) => revisedForSO(blockers, o.id) || o.promise;
const fmtDateTime = (iso) => { try { return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }); } catch (_) { return String(iso); } };

/* date helpers (local, no TZ surprises) */
const D = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
const isoOf = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
const addDays = (dt, n) => { const x = new Date(dt); x.setDate(x.getDate() + n); return x; };
const mondayOf = (dt) => addDays(dt, -((dt.getDay() + 6) % 7));
const fmtDow = (dt) => dt.toLocaleDateString(undefined, { weekday: "short" });
const fmtMD = (dt) => dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });

const DataCtx = React.createContext(null);
function useData() { return useContext(DataCtx); }

/* ---------- blocker create form ---------- */
function BlockerForm({ pre }) {
  const { sos, people, addBlocker, closeForm } = useData();
  const [f, setF] = useState({ title: "", sos: pre.sos || [], parts: [], wo: "", assignee: "", action: "" });
  const tog = (key, v) => setF((s) => ({ ...s, [key]: s[key].includes(v) ? s[key].filter((x) => x !== v) : [...s[key], v] }));
  const val = f.sos.reduce((a, id) => a + (soById(id)?.value || 0), 0);
  const canSave = f.title.trim() && f.sos.length > 0;
  const save = () => addBlocker({ title: f.title.trim(), sos: f.sos, parts: f.parts, wo: f.wo || null, assignee: f.assignee || null, action: f.action.trim(), status: f.assignee ? "assigned" : "open" });

  const box = { fontFamily: "var(--mono)", fontSize: 12.5, background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: 9, padding: "9px 11px", color: "var(--ink)", width: "100%", outline: "none", boxSizing: "border-box" };
  const chk = (on) => ({ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 9px", borderRadius: 8, cursor: "pointer", fontSize: 12, border: `1px solid ${on ? "var(--amber)" : "var(--line)"}`, background: on ? "var(--panel2)" : "var(--bg2)", color: on ? "var(--ink)" : "var(--muted)" });

  return (
    <div onClick={closeForm} style={{ position: "fixed", inset: 0, zIndex: 230, background: "rgba(5,8,13,.72)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", padding: 18 }}>
      <div onClick={(e) => e.stopPropagation()} className="tf-fade" style={{ width: "100%", maxWidth: 560, maxHeight: "86vh", overflowY: "auto", background: "linear-gradient(180deg,var(--panel),var(--bg2))", border: "1px solid var(--line2)", borderRadius: 16, padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <ClipboardList size={18} color="var(--amber)" />
          <span style={{ fontWeight: 700, fontSize: 16, flex: 1 }}>New blocker</span>
          <span onClick={closeForm} style={{ cursor: "pointer", color: "var(--faint)", fontSize: 18 }}>✕</span>
        </div>

        <label style={{ fontSize: 12, color: "var(--muted)" }}>Summary</label>
        <input style={{ ...box, margin: "5px 0 14px" }} placeholder="What's blocking delivery?" value={f.title} onChange={(e) => setF((s) => ({ ...s, title: e.target.value }))} />

        <label style={{ fontSize: 12, color: "var(--muted)" }}>Sales orders impacted</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "6px 0 14px" }}>
          {sos.map((o) => (
            <span key={o.id} onClick={() => tog("sos", o.id)} style={chk(f.sos.includes(o.id))}>{o.id} · {o.customer} · {fmtMoney(o.value)}</span>
          ))}
        </div>

        <label style={{ fontSize: 12, color: "var(--muted)" }}>Part number(s)</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "6px 0 14px" }}>
          {Object.keys(PART_META).map((pn) => (
            <span key={pn} onClick={() => tog("parts", pn)} style={chk(f.parts.includes(pn))}>{pn}</span>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ fontSize: 12, color: "var(--muted)" }}>Work order</label>
            <select style={{ ...box, marginTop: 5 }} value={f.wo} onChange={(e) => setF((s) => ({ ...s, wo: e.target.value }))}>
              <option value="">— none —</option>
              {WORKORDERS.map((w) => <option key={w.id} value={w.id}>{w.id} · {w.desc}</option>)}
            </select>
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ fontSize: 12, color: "var(--muted)" }}>Assign to</label>
            <select style={{ ...box, marginTop: 5 }} value={f.assignee} onChange={(e) => setF((s) => ({ ...s, assignee: e.target.value }))}>
              <option value="">— unassigned —</option>
              {people.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <label style={{ fontSize: 12, color: "var(--muted)" }}>Action item</label>
        <textarea style={{ ...box, margin: "5px 0 14px", minHeight: 64, resize: "vertical" }} placeholder="Detailed action to clear the blocker…" value={f.action} onChange={(e) => setF((s) => ({ ...s, action: e.target.value }))} />

        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 12.5, color: "var(--muted)" }}>$ at risk (sum of orders)</span>
          <span className="tf-disp" style={{ marginLeft: "auto", fontSize: 20, fontWeight: 800, color: "var(--red)" }}>{fmtMoney(val)}</span>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="tf-btn tf-btn-primary" onClick={save} disabled={!canSave} style={{ opacity: canSave ? 1 : 0.5 }}>Create blocker</button>
          <button className="tf-btn" onClick={closeForm}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- blocker detail / close ---------- */
function BlockerModal({ id }) {
  const { blockers, closeBlocker, assignBlocker, setBlockerStatus, setNewPromise, addComment, closeView, people } = useData();
  const [draft, setDraft] = useState("");
  const b = blockers.find((x) => x.id === id);
  if (!b) return null;
  const val = blockerValue(b);

  return (
    <div onClick={closeView} style={{ position: "fixed", inset: 0, zIndex: 215, background: "rgba(5,8,13,.72)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", padding: 18 }}>
      <div onClick={(e) => e.stopPropagation()} className="tf-fade" style={{ width: "100%", maxWidth: 560, maxHeight: "86vh", overflowY: "auto", background: "linear-gradient(180deg,var(--panel),var(--bg2))", border: "1px solid var(--line2)", borderRadius: 16, padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <Tag tone={BLK_TONE[b.status]}>{b.status}</Tag>
          <span className="tf-mono" style={{ fontSize: 12, color: "var(--amber)" }}>{b.id}</span>
          <span onClick={closeView} style={{ marginLeft: "auto", cursor: "pointer", color: "var(--faint)", fontSize: 18 }}>✕</span>
        </div>
        <h3 className="tf-disp" style={{ fontSize: 19, fontWeight: 800, margin: "0 0 14px" }}>{b.title}</h3>

        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px", marginBottom: 16 }}>
          <span className="tf-mono" style={{ fontSize: 11.5, color: "var(--faint)" }}>$ at risk</span>
          <span className="tf-disp" style={{ fontSize: 16, fontWeight: 800, color: "var(--red)" }}>{fmtMoney(val)}</span>
          <span className="tf-mono" style={{ fontSize: 11.5, color: "var(--faint)" }}>Opened</span>
          <span style={{ fontSize: 13 }}>{fmtDateTime(b.created)}{b.openedBy ? <span className="tf-mono" style={{ fontSize: 11, color: "var(--faint)" }}> · by {b.openedBy}</span> : null}</span>
          {b.status === "closed" && b.closedAt && <>
            <span className="tf-mono" style={{ fontSize: 11.5, color: "var(--faint)" }}>Closed</span>
            <span style={{ fontSize: 13, color: "var(--green)" }}>{fmtDateTime(b.closedAt)}{b.closedBy ? <span className="tf-mono" style={{ fontSize: 11, color: "var(--faint)" }}> · by {b.closedBy}</span> : null}</span>
          </>}
          <span className="tf-mono" style={{ fontSize: 11.5, color: "var(--faint)" }}>Work order</span>
          <span style={{ fontSize: 13 }}>{b.wo ? <ThreadLink id={b.wo} style={{ color: "var(--amber)" }}>{b.wo}</ThreadLink> : "—"}</span>
          <span className="tf-mono" style={{ fontSize: 11.5, color: "var(--faint)" }}>Action item</span>
          <span style={{ fontSize: 13, lineHeight: 1.5 }}>{b.action || "—"}</span>
        </div>

        {b.parts.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div className="tf-eyebrow" style={{ marginBottom: 7 }}>Parts</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {b.parts.map((pn) => <ThreadLink key={pn} id={pn} style={{ color: "var(--green)", fontFamily: "var(--mono)", fontSize: 12, padding: "4px 9px", border: "1px solid var(--line2)", borderRadius: 8, borderBottom: "1px solid var(--line2)" }}>{pn}</ThreadLink>)}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <div className="tf-eyebrow" style={{ marginBottom: 7 }}>Impacted sales orders ({b.sos.length})</div>
          {b.sos.map((sid) => { const o = soById(sid); if (!o) return null; return (
            <div key={sid} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 11px", background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: 9, marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{o.customer} <span className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)" }}>· {o.id}</span></div>
                <div className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)" }}>promise {o.promise} · qty {o.qty} · {o.parts.map((pn, i) => <React.Fragment key={pn}>{i ? ", " : ""}<ThreadLink id={pn} style={{ color: "var(--green)" }}>{pn}</ThreadLink></React.Fragment>)}</div>
              </div>
              <span className="tf-mono" style={{ fontSize: 12, color: "var(--ink)" }}>{fmtMoney(o.value)}</span>
            </div>
          ); })}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div className="tf-eyebrow" style={{ marginBottom: 7 }}>Revised promise date</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <input type="date" value={b.newPromise || ""} onChange={(e) => setNewPromise(b.id, e.target.value)}
              style={{ fontFamily: "var(--mono)", fontSize: 12.5, background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: 9, padding: "8px 10px", color: "var(--ink)", colorScheme: "dark" }} />
            {b.newPromise
              ? <span className="tf-mono" style={{ fontSize: 11, color: "var(--amber)" }}>most-probable ship date for impacted orders</span>
              : <span className="tf-mono" style={{ fontSize: 11, color: "var(--faint)" }}>set a most-probable date based on this blocker</span>}
            {b.newPromise && <button className="tf-btn tf-btn-ghost" disabled title="ERP integration — coming soon" style={{ marginLeft: "auto", fontSize: 11, opacity: 0.55, cursor: "not-allowed" }}>Push to ERP ↗</button>}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div className="tf-eyebrow" style={{ marginBottom: 7 }}>Updates ({(b.comments || []).length})</div>
          {(b.comments || []).map((c, i) => (
            <div key={i} style={{ padding: "8px 11px", background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: 9, marginBottom: 6 }}>
              <div className="tf-mono" style={{ fontSize: 10, color: "var(--faint)", marginBottom: 3 }}>{c.who ? c.who + " · " : ""}{new Date(c.ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>{c.text}</div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 7, marginTop: 4 }}>
            <input className="tf-input" value={draft} placeholder="Add an update…" style={{ flex: 1 }}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { addComment(b.id, draft.trim()); setDraft(""); } }} />
            <button className="tf-btn tf-btn-primary" disabled={!draft.trim()} onClick={() => { if (draft.trim()) { addComment(b.id, draft.trim()); setDraft(""); } }} style={{ padding: "9px 12px", opacity: draft.trim() ? 1 : 0.5 }}>Post</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", paddingTop: 14, borderTop: "1px solid var(--line)" }}>
          <label className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)" }}>status</label>
          <select value={b.status} onChange={(e) => setBlockerStatus(b.id, e.target.value)}
            style={{ fontFamily: "var(--mono)", fontSize: 12, background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: 9, padding: "8px 10px", color: "var(--ink)" }}>
            <option value="open">open</option>
            <option value="assigned">assigned</option>
            <option value="closed">closed</option>
          </select>
          <select value={b.assignee || ""} onChange={(e) => assignBlocker(b.id, e.target.value || null)} disabled={b.status === "closed"}
            style={{ fontFamily: "var(--mono)", fontSize: 12, background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: 9, padding: "8px 10px", color: "var(--ink)" }}>
            <option value="">Unassigned</option>
            {people.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          {b.status !== "closed"
            ? <button className="tf-btn tf-btn-primary" onClick={() => closeBlocker(b.id)} style={{ marginLeft: "auto" }}>Close blocker</button>
            : <span style={{ marginLeft: "auto", color: "var(--green)", fontSize: 13, fontWeight: 600 }}>✓ Closed</span>}
        </div>
      </div>
    </div>
  );
}

/* ---------- sales order detail ---------- */
function SalesOrderModal({ id }) {
  const { blockers, openBlocker, openForm, closeSO } = useData();
  const o = soById(id);
  if (!o) return null;
  const blk = openBlockerForSO(blockers, id);
  const related = blockers.filter((b) => b.sos.includes(id)).sort((a, b) => (a.status === "closed") - (b.status === "closed") || blockerValue(b) - blockerValue(a));
  const revised = related.find((x) => x.status !== "closed" && x.newPromise)?.newPromise;
  const wos = WORKORDERS.filter((w) => o.parts.includes(w.part));

  return (
    <div onClick={closeSO} style={{ position: "fixed", inset: 0, zIndex: 206, background: "rgba(5,8,13,.72)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", padding: 18 }}>
      <div onClick={(e) => e.stopPropagation()} className="tf-fade" style={{ width: "100%", maxWidth: 540, maxHeight: "86vh", overflowY: "auto", background: "linear-gradient(180deg,var(--panel),var(--bg2))", border: "1px solid var(--line2)", borderRadius: 16, padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <Tag tone={blk ? "red" : "green"}>{blk ? "at risk" : "on track"}</Tag>
          <span className="tf-mono" style={{ fontSize: 12, color: "var(--amber)" }}>{o.id}</span>
          <span onClick={closeSO} style={{ marginLeft: "auto", cursor: "pointer", color: "var(--faint)", fontSize: 18 }}>✕</span>
        </div>
        <h3 className="tf-disp" style={{ fontSize: 20, fontWeight: 800, margin: "0 0 14px" }}>{o.customer}</h3>

        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px", marginBottom: 16 }}>
          <span className="tf-mono" style={{ fontSize: 11.5, color: "var(--faint)" }}>Site</span><span style={{ fontSize: 13 }}>{o.site}</span>
          <span className="tf-mono" style={{ fontSize: 11.5, color: "var(--faint)" }}>Promise date</span><span style={{ fontSize: 13, textDecoration: revised ? "line-through" : "none", opacity: revised ? 0.6 : 1 }}>{o.promise}</span>
          {revised && <><span className="tf-mono" style={{ fontSize: 11.5, color: "var(--faint)" }}>Revised promise</span><span style={{ fontSize: 13, fontWeight: 700, color: "var(--amber)" }}>{revised} <span className="tf-mono" style={{ fontSize: 9.5, color: "var(--faint)", fontWeight: 400 }}>· most probable</span></span></>}
          <span className="tf-mono" style={{ fontSize: 11.5, color: "var(--faint)" }}>Quantity</span><span style={{ fontSize: 13 }}>{o.qty}</span>
          <span className="tf-mono" style={{ fontSize: 11.5, color: "var(--faint)" }}>Total value</span><span className="tf-disp" style={{ fontSize: 16, fontWeight: 800 }}>{fmtMoney(o.value)}</span>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div className="tf-eyebrow" style={{ marginBottom: 7 }}>Parts</div>
          {o.parts.map((pn) => (
            <div key={pn} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 11px", background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: 9, marginBottom: 6 }}>
              <ThreadLink id={pn} style={{ color: "var(--green)", fontFamily: "var(--mono)", fontSize: 12 }}>{pn}</ThreadLink>
              <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{PART_META[pn]?.desc || ""}</span>
            </div>
          ))}
        </div>

        {wos.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div className="tf-eyebrow" style={{ marginBottom: 7 }}>Related work orders</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {wos.map((w) => <ThreadLink key={w.id} id={w.id} style={{ color: "var(--amber)", fontFamily: "var(--mono)", fontSize: 12, padding: "4px 9px", border: "1px solid var(--line2)", borderRadius: 8, borderBottom: "1px solid var(--line2)" }}>{w.id}</ThreadLink>)}
            </div>
          </div>
        )}

        {related.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div className="tf-eyebrow" style={{ marginBottom: 7 }}>Blockers on this order ({related.length})</div>
            {related.map((b) => (
              <div key={b.id} onClick={() => openBlocker(b.id)} className="tf-row" style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 11px", background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: 9, marginBottom: 6, cursor: "pointer" }}>
                <Tag tone={BLK_TONE[b.status]}>{b.status}</Tag>
                <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</span>
                <span className="tf-mono" style={{ fontSize: 11, color: "var(--red)" }}>{fmtMoney(blockerValue(b))}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", paddingTop: 14, borderTop: "1px solid var(--line)" }}>
          {related.length === 0 && <span style={{ fontSize: 12.5, color: "var(--green)" }}>No blocker on this order yet.</span>}
          <button className="tf-btn tf-btn-primary" onClick={() => openForm([o.id])} style={{ marginLeft: "auto" }}><Plus size={14} /> New blocker</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- blockers list page ---------- */
function BlockersPage() {
  const { blockers, openBlocker, openForm } = useData();
  const [filter, setFilter] = useState("all");
  const [site, setSite] = useState("All");
  const atSite = (b) => site === "All" || b.sos.some((id) => soById(id)?.site === site);
  const scoped = blockers.filter(atSite);
  const list = scoped.filter((b) => filter === "all" || b.status === filter);
  const openCount = scoped.filter((b) => b.status !== "closed").length;
  const atRisk = scoped.filter((b) => b.status !== "closed").reduce((a, b) => a + blockerValue(b), 0);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "34px 22px 70px" }}>
      <PageHead icon={ClipboardList} eyebrow="Module · Shop-floor blockers" title="Blockers"
        sub="Shop-floor issues tied to the sales orders they put at risk. Each blocker links parts, a work order and an owner — and carries the $ revenue exposed across its orders." />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 20 }}>
        {[["Open / assigned", openCount, "var(--red)"], ["$ revenue at risk", fmtMoney(atRisk), "var(--amber)"], ["Total blockers", scoped.length, "var(--ink)"]].map(([l, v, c]) => (
          <div key={l} className="tf-panel" style={{ padding: 16 }}>
            <div className="tf-disp" style={{ fontSize: 24, fontWeight: 800, color: c }}>{v}</div>
            <div className="tf-mono" style={{ fontSize: 11, color: "var(--faint)", marginTop: 3 }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {["all", "open", "assigned", "closed"].map((s) => (
            <button key={s} onClick={() => setFilter(s)} className="tf-mono" style={{ padding: "7px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12, textTransform: "capitalize", border: `1px solid ${filter === s ? "var(--amber)" : "var(--line)"}`, background: filter === s ? "var(--panel2)" : "transparent", color: filter === s ? "var(--ink)" : "var(--muted)" }}>{s}</button>
          ))}
        </div>
        <button className="tf-btn tf-btn-primary" style={{ marginLeft: "auto" }} onClick={() => openForm([])}><Plus size={15} /> New blocker</button>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Building2 size={15} color="var(--faint)" />
          <select value={site} onChange={(e) => setSite(e.target.value)} style={{ fontFamily: "var(--mono)", fontSize: 12, background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: 9, padding: "8px 10px", color: "var(--ink)" }}>
            <option value="All">All sites</option>
            {SITES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="tf-panel" style={{ overflow: "hidden" }}>
        {list.length === 0 && <div style={{ padding: 20, color: "var(--faint)", fontSize: 13 }}>No blockers in this view.</div>}
        {list.map((b) => (
          <div key={b.id} onClick={() => openBlocker(b.id)} className="tf-row" style={{ padding: "13px 16px", borderBottom: "1px solid var(--line)", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <Tag tone={BLK_TONE[b.status]}>{b.status}</Tag>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{b.title}</div>
              <div className="tf-mono" style={{ fontSize: 11, color: "var(--faint)" }}>{b.id} · {b.sos.length} order{b.sos.length > 1 ? "s" : ""} · {b.wo || "no WO"} · {b.assignee || "unassigned"}</div>
            </div>
            <span className="tf-disp" style={{ fontSize: 17, fontWeight: 800, color: "var(--red)" }}>{fmtMoney(blockerValue(b))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- point-in-time delivery calendar ---------- */
function DeliveryPage() {
  const { sos, blockers, openBlocker, openForm, openSO, delivSite: site, setDelivSite: setSite, delivWeek: weekStart, setDelivWeek: setWeekStart } = useData();
  const [view, setView] = useState("week");
  const earliest = useMemo(() => sos.map((s) => s.promise).sort()[0], [sos]);
  const [monthRef, setMonthRef] = useState(() => D(earliest));

  const filtered = site === "All" ? sos : sos.filter((s) => s.site === site);
  const daySOs = (iso) => filtered.filter((s) => effPromise(blockers, s) === iso);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekIsos = weekDays.map(isoOf);
  const weekVal = filtered.filter((s) => weekIsos.includes(effPromise(blockers, s))).reduce((a, s) => a + s.value, 0);
  const weekOrders = filtered.filter((s) => weekIsos.includes(effPromise(blockers, s)));
  const weekAtRisk = weekOrders.filter((s) => openBlockerForSO(blockers, s.id)).length;

  const Card = ({ o }) => {
    const blk = openBlockerForSO(blockers, o.id);
    return (
      <div className="tf-panel" onClick={() => openSO(o.id)} style={{ padding: 0, marginBottom: 8, overflow: "hidden", cursor: "pointer", border: blk ? "1px solid var(--red)" : "1px solid var(--line)" }}>
        {blk && <div style={{ height: 4, background: "var(--red)" }} />}
        <div style={{ padding: "10px 11px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{o.customer}</span>
            <span style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
              {blk && <span onClick={(e) => { e.stopPropagation(); openBlocker(blk.id); }} title="Open blocker" style={{ cursor: "pointer", display: "grid", placeItems: "center", width: 22, height: 22, borderRadius: 6, background: "rgba(240,86,58,.15)" }}><AlertTriangle size={13} color="var(--red)" /></span>}
              <span onClick={(e) => { e.stopPropagation(); openForm([o.id]); }} title="Create blocker" style={{ cursor: "pointer", display: "grid", placeItems: "center", width: 22, height: 22, borderRadius: 6, background: "var(--panel2)" }}><Plus size={14} color="var(--muted)" /></span>
            </span>
          </div>
          <div className="tf-disp" style={{ fontSize: 16, fontWeight: 800, margin: "3px 0 1px" }}>{fmtMoney(o.value)}</div>
          <div className="tf-mono" style={{ fontSize: 10, color: "var(--faint)" }}>{o.id} · qty {o.qty}</div>
          {revisedForSO(blockers, o.id) && <div className="tf-mono" style={{ fontSize: 9.5, color: "var(--amber)", marginTop: 2 }}>↪ revised from {o.promise}</div>}
          <div style={{ marginTop: 5, display: "flex", flexWrap: "wrap", gap: 4 }}>
            {o.parts.map((pn) => <ThreadLink key={pn} id={pn} style={{ color: "var(--green)", fontFamily: "var(--mono)", fontSize: 10, padding: "1px 6px", border: "1px solid var(--line2)", borderRadius: 6, borderBottom: "1px solid var(--line2)" }}>{pn}</ThreadLink>)}
          </div>
        </div>
      </div>
    );
  };

  /* committed vs blocked split for any subset */
  const splitFor = (pred) => {
    const ms = filtered.filter(pred);
    const blocked = ms.filter((s) => openBlockerForSO(blockers, s.id)).reduce((a, s) => a + s.value, 0);
    const committed = ms.reduce((a, s) => a + s.value, 0) - blocked;
    return { committed, blocked, total: committed + blocked, count: ms.length };
  };
  const splitBar = (g, b, h = 9) => (
    <div style={{ display: "flex", height: h, borderRadius: 99, overflow: "hidden", background: "var(--bg2)" }}>
      <div style={{ width: (g + b ? (g / (g + b)) * 100 : 0) + "%", background: "var(--green)" }} />
      <div style={{ width: (g + b ? (b / (g + b)) * 100 : 0) + "%", background: "var(--red)" }} />
    </div>
  );
  const sameMonth = (s, ref) => { const d = D(effPromise(blockers, s)); return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear(); };
  const SummaryBar = ({ title, sp }) => (
    <div className="tf-panel" style={{ padding: "14px 16px", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 24, flexWrap: "wrap", marginBottom: 10 }}>
        {title && <div style={{ fontWeight: 700, fontSize: 15, marginRight: "auto" }}>{title}</div>}
        <div><div className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)" }}>committed</div><div className="tf-disp" style={{ fontSize: 20, fontWeight: 800, color: "var(--green)" }}>{fmtMoney(sp.committed)}</div></div>
        <div><div className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)" }}>blocked</div><div className="tf-disp" style={{ fontSize: 20, fontWeight: 800, color: "var(--red)" }}>{fmtMoney(sp.blocked)}</div></div>
        <div><div className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)" }}>total</div><div className="tf-disp" style={{ fontSize: 20, fontWeight: 800 }}>{fmtMoney(sp.total)}</div></div>
        <div><div className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)" }}>orders</div><div className="tf-disp" style={{ fontSize: 20, fontWeight: 800 }}>{sp.count}</div></div>
      </div>
      {splitBar(sp.committed, sp.blocked, 10)}
    </div>
  );

  /* monthly grid */
  const monthGrid = () => {
    const first = new Date(monthRef.getFullYear(), monthRef.getMonth(), 1);
    const start = mondayOf(first);
    const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
    const sp = splitFor((s) => sameMonth(s, monthRef));
    return (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <button className="tf-btn tf-btn-ghost" onClick={() => setMonthRef(new Date(monthRef.getFullYear(), monthRef.getMonth() - 1, 1))}><ChevronLeft size={15} /></button>
          <span style={{ fontWeight: 700, fontSize: 16 }}>{monthRef.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
          <button className="tf-btn tf-btn-ghost" onClick={() => setMonthRef(new Date(monthRef.getFullYear(), monthRef.getMonth() + 1, 1))}><ChevronRight size={15} /></button>
        </div>
        <SummaryBar sp={sp} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)", textAlign: "center", paddingBottom: 4 }}>{d}</div>)}
          {cells.map((dt, i) => {
            const inMonth = dt.getMonth() === monthRef.getMonth();
            const list = daySOs(isoOf(dt));
            const v = list.reduce((a, s) => a + s.value, 0);
            const risk = list.some((s) => openBlockerForSO(blockers, s.id));
            return (
              <div key={i} onClick={() => { if (list.length === 1) { openSO(list[0].id); } else if (list.length) { setWeekStart(mondayOf(dt)); setView("week"); } }}
                style={{ minHeight: 64, borderRadius: 9, border: "1px solid var(--line)", background: inMonth ? "var(--panel)" : "transparent", opacity: inMonth ? 1 : 0.4, padding: 7, cursor: list.length ? "pointer" : "default" }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span className="tf-mono" style={{ fontSize: 11, color: "var(--muted)" }}>{dt.getDate()}</span>
                  {risk && <span style={{ marginLeft: "auto", width: 7, height: 7, borderRadius: 99, background: "var(--red)" }} />}
                </div>
                {list.length > 0 && <>
                  <div className="tf-mono" style={{ fontSize: 10, color: "var(--ink)", marginTop: 4 }}>{list.length} order{list.length > 1 ? "s" : ""}</div>
                  <div className="tf-mono" style={{ fontSize: 10, color: "var(--amber)" }}>{fmtMoney(v)}</div>
                </>}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  /* quarterly view */
  const quarterGrid = () => {
    const y = monthRef.getFullYear();
    const qIdx = Math.floor(monthRef.getMonth() / 3);
    const qMonths = [0, 1, 2].map((k) => new Date(y, qIdx * 3 + k, 1));
    const sp = splitFor((s) => { const d = D(s.promise); return d.getFullYear() === y && Math.floor(d.getMonth() / 3) === qIdx; });
    const goQ = (delta) => setMonthRef(new Date(y, qIdx * 3 + delta * 3, 1));
    return (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <button className="tf-btn tf-btn-ghost" onClick={() => goQ(-1)}><ChevronLeft size={15} /></button>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Q{qIdx + 1} {y}</span>
          <button className="tf-btn tf-btn-ghost" onClick={() => goQ(1)}><ChevronRight size={15} /></button>
        </div>
        <SummaryBar sp={sp} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }} className="tf-cols">
          {qMonths.map((mref) => {
            const ms = splitFor((s) => sameMonth(s, mref));
            return (
              <div key={mref.getMonth()} className="tf-panel" onClick={() => { setMonthRef(mref); setView("month"); }} style={{ padding: 16, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{mref.toLocaleDateString(undefined, { month: "long" })}</span>
                  <span className="tf-disp" style={{ marginLeft: "auto", fontSize: 19, fontWeight: 800 }}>{fmtMoney(ms.total)}</span>
                </div>
                <div style={{ margin: "11px 0 9px" }}>{splitBar(ms.committed, ms.blocked)}</div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "var(--green)" }}>{fmtMoney(ms.committed)} <span className="tf-mono" style={{ fontSize: 9.5, color: "var(--faint)" }}>clear</span></span>
                  <span style={{ color: "var(--red)" }}>{fmtMoney(ms.blocked)} <span className="tf-mono" style={{ fontSize: 9.5, color: "var(--faint)" }}>blocked</span></span>
                </div>
                <div className="tf-mono" style={{ fontSize: 10, color: "var(--faint)", marginTop: 8 }}>{ms.count} order{ms.count === 1 ? "" : "s"} · tap to open month</div>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "34px 22px 70px" }}>
      <PageHead icon={CalendarDays} eyebrow="Module · Point-in-time delivery" title="Delivery calendar"
        sub="Every sales order on a calendar by promise date. Orders with an open blocker show a red band; create or open a blocker right from a card. Filter by site to see revenue and risk per location." />

      {/* controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {[["week", "Weekly"], ["month", "Monthly"], ["quarter", "Quarterly"]].map(([k, label]) => (
            <button key={k} onClick={() => setView(k)} className="tf-mono" style={{ padding: "7px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12, border: `1px solid ${view === k ? "var(--amber)" : "var(--line)"}`, background: view === k ? "var(--panel2)" : "transparent", color: view === k ? "var(--ink)" : "var(--muted)" }}>{label}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginLeft: "auto" }}>
          <Building2 size={15} color="var(--faint)" />
          <select value={site} onChange={(e) => setSite(e.target.value)} style={{ fontFamily: "var(--mono)", fontSize: 12, background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: 9, padding: "8px 10px", color: "var(--ink)" }}>
            <option value="All">All sites</option>
            {SITES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {view === "week" ? (
        <>
          {/* week summary + nav */}
          <div className="tf-panel" style={{ padding: "14px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <button className="tf-btn tf-btn-ghost" onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft size={15} /></button>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{fmtMD(weekStart)} – {fmtMD(addDays(weekStart, 6))}, {weekStart.getFullYear()}</span>
            <button className="tf-btn tf-btn-ghost" onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronRight size={15} /></button>
            <button className="tf-btn tf-btn-ghost" onClick={() => setWeekStart(mondayOf(new Date()))}>Today</button>
            <div style={{ marginLeft: "auto", display: "flex", gap: 22, flexWrap: "wrap" }}>
              <div><div className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)" }}>week revenue forecast</div><div className="tf-disp" style={{ fontSize: 22, fontWeight: 800, color: "var(--amber)" }}>{fmtMoney(weekVal)}</div></div>
              <div><div className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)" }}>orders</div><div className="tf-disp" style={{ fontSize: 22, fontWeight: 800 }}>{weekOrders.length}</div></div>
              <div><div className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)" }}>at risk</div><div className="tf-disp" style={{ fontSize: 22, fontWeight: 800, color: weekAtRisk ? "var(--red)" : "var(--green)" }}>{weekAtRisk}</div></div>
            </div>
          </div>

          {/* 7-day grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(140px,1fr))", gap: 8, overflowX: "auto" }}>
            {weekDays.map((dt) => {
              const list = daySOs(isoOf(dt));
              const isToday = isoOf(dt) === isoOf(new Date());
              return (
                <div key={isoOf(dt)} style={{ minWidth: 140 }}>
                  <div style={{ textAlign: "center", padding: "7px 0", borderRadius: 9, marginBottom: 8, background: isToday ? "var(--panel2)" : "transparent", border: isToday ? "1px solid var(--amber)" : "1px solid var(--line)" }}>
                    <div className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)" }}>{fmtDow(dt)}</div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{fmtMD(dt)}</div>
                  </div>
                  {list.length === 0 && <div className="tf-mono" style={{ fontSize: 10, color: "var(--faint)", textAlign: "center", padding: "6px 0" }}>—</div>}
                  {list.map((o) => <Card key={o.id} o={o} />)}
                </div>
              );
            })}
          </div>
        </>
      ) : view === "month" ? monthGrid() : quarterGrid()}
    </div>
  );
}

/* ---------- point-in-time revenue forecast (finance / GM view) ---------- */
function FinancePage() {
  const { sos, blockers } = useData();
  const [site, setSite] = useState("All");
  const filtered = site === "All" ? sos : sos.filter((s) => s.site === site);
  const rows = filtered.map((o) => { const eff = effPromise(blockers, o); return { ...o, blk: !!openBlockerForSO(blockers, o.id), eff, ym: eff.slice(0, 7) }; });

  const mLabel = (ym) => { const [y, m] = ym.split("-"); return new Date(+y, +m - 1, 1).toLocaleDateString(undefined, { month: "short" }) + " '" + y.slice(2); };
  const months = [...new Set(rows.map((r) => r.ym))].sort();
  const monthData = months.map((ym) => {
    const ms = rows.filter((r) => r.ym === ym);
    return { label: mLabel(ym), committed: ms.filter((r) => !r.blk).reduce((a, r) => a + r.value, 0), atrisk: ms.filter((r) => r.blk).reduce((a, r) => a + r.value, 0) };
  });

  const qmap = {};
  rows.forEach((r) => { const d = D(r.eff); const q = Math.floor(d.getMonth() / 3) + 1; const k = d.getFullYear() + "-Q" + q; (qmap[k] = qmap[k] || { green: 0, blocked: 0 })[r.blk ? "blocked" : "green"] += r.value; });
  const quarters = Object.keys(qmap).sort().map((k) => ({ label: "Q" + k.slice(-1) + " " + k.slice(0, 4), green: qmap[k].green, blocked: qmap[k].blocked, total: qmap[k].green + qmap[k].blocked }));

  const totGreen = rows.filter((r) => !r.blk).reduce((a, r) => a + r.value, 0);
  const totBlocked = rows.filter((r) => r.blk).reduce((a, r) => a + r.value, 0);
  const tot = totGreen + totBlocked;
  const pct = (n) => (tot ? Math.round((n / tot) * 100) : 0);

  const splitBar = (g, b, h = 8) => (
    <div style={{ display: "flex", height: h, borderRadius: 99, overflow: "hidden", background: "var(--bg2)" }}>
      <div style={{ width: (g + b ? (g / (g + b)) * 100 : 0) + "%", background: "var(--green)" }} />
      <div style={{ width: (g + b ? (b / (g + b)) * 100 : 0) + "%", background: "var(--red)" }} />
    </div>
  );

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "34px 22px 70px" }}>
      <PageHead icon={TrendingUp} eyebrow="Module · Point-in-time finance" title="Revenue forecast"
        sub="A blocker-aware forecast a GM can trust: committed (clear) revenue versus at-risk (blocked) revenue, by quarter and month — recomputed live as blockers open and close." />

      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16 }}>
        <Building2 size={15} color="var(--faint)" />
        <select value={site} onChange={(e) => setSite(e.target.value)} style={{ fontFamily: "var(--mono)", fontSize: 12, background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: 9, padding: "8px 10px", color: "var(--ink)" }}>
          <option value="All">All sites</option>
          {SITES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="tf-mono" style={{ fontSize: 11, color: "var(--faint)", marginLeft: "auto" }}>horizon: {months.length} months · {quarters.length} quarters</span>
      </div>

      {/* top summary */}
      <div className="tf-panel tf-fade" style={{ padding: 20, marginBottom: 22 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 18, marginBottom: 16 }}>
          {[["Total pipeline", fmtMoney(tot), "var(--ink)"], ["Committed (clear)", fmtMoney(totGreen), "var(--green)"], ["At risk (blocked)", fmtMoney(totBlocked), "var(--red)"], ["At-risk share", pct(totBlocked) + "%", "var(--amber)"]].map(([l, v, c]) => (
            <div key={l}>
              <div className="tf-disp" style={{ fontSize: 26, fontWeight: 800, color: c }}>{v}</div>
              <div className="tf-mono" style={{ fontSize: 11, color: "var(--faint)", marginTop: 3 }}>{l}</div>
            </div>
          ))}
        </div>
        {splitBar(totGreen, totBlocked, 10)}
        <div className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 7 }}>
          <span style={{ color: "var(--green)" }}>■</span> committed (no open blocker) &nbsp; <span style={{ color: "var(--red)" }}>■</span> at risk (open blocker on the order)
        </div>
      </div>

      {/* quarter cards */}
      <div className="tf-eyebrow" style={{ marginBottom: 14 }}>By quarter — blocked vs clear</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, marginBottom: 26 }}>
        {quarters.map((q) => (
          <div key={q.label} className="tf-panel" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{q.label}</span>
              <span className="tf-disp" style={{ marginLeft: "auto", fontSize: 20, fontWeight: 800 }}>{fmtMoney(q.total)}</span>
            </div>
            <div style={{ margin: "12px 0 10px" }}>{splitBar(q.green, q.blocked)}</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
              <span style={{ color: "var(--green)" }}>{fmtMoney(q.green)} <span className="tf-mono" style={{ fontSize: 10, color: "var(--faint)" }}>clear</span></span>
              <span style={{ color: "var(--red)" }}>{fmtMoney(q.blocked)} <span className="tf-mono" style={{ fontSize: 10, color: "var(--faint)" }}>at risk</span></span>
            </div>
          </div>
        ))}
      </div>

      {/* monthly chart */}
      <div className="tf-panel tf-fade" style={{ padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <CalendarDays size={16} color="var(--amber)" /><span style={{ fontWeight: 600, fontSize: 14 }}>Monthly forecast</span>
          <span style={{ marginLeft: "auto" }} className="tf-mono">
            <span style={{ color: "var(--green)", fontSize: 11 }}>■ committed</span> &nbsp; <span style={{ color: "var(--red)", fontSize: 11 }}>■ at risk</span>
          </span>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={monthData} margin={{ top: 6, right: 8, left: 4, bottom: 0 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "var(--faint)", fontSize: 10.5, fontFamily: "var(--mono)" }} />
            <YAxis tickFormatter={(v) => fmtMoney(v)} tick={{ fill: "var(--faint)", fontSize: 10, fontFamily: "var(--mono)" }} width={52} />
            <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--line2)", borderRadius: 8, fontSize: 12 }} formatter={(v, n) => [fmtMoney(v), n === "committed" ? "Committed" : "At risk"]} cursor={{ fill: "rgba(255,255,255,.03)" }} />
            <Bar dataKey="committed" stackId="a" fill="var(--green)" />
            <Bar dataKey="atrisk" stackId="a" fill="var(--red)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState("home");
  const [assetStage, setAssetStage] = useState("all");
  const [tier, setTier] = useState({ assets: "free", contracts: "free", requirements: "free", thread: "free", directspend: "free" });
  const [chats, setChats] = useState(EMPTY_CHATS);
  const [dockOpen, setDockOpen] = useState(false);
  const [tStack, setTStack] = useState([]);
  const [blockers, setBlockers] = useState(SEED_BLOCKERS);
  const [bView, setBView] = useState(null);
  const [bForm, setBForm] = useState(null);
  const [soView, setSoView] = useState(null);
  const [delivSite, setDelivSite] = useState("All");
  const [delivWeek, setDelivWeek] = useState(() => mondayOf(D(SALES_ORDERS.map((s) => s.promise).sort()[0])));
  const dataVal = {
    sos: SALES_ORDERS, blockers, people: PEOPLE, sites: SITES,
    delivSite, setDelivSite, delivWeek, setDelivWeek,
    addBlocker: (p) => { const id = "BLK-" + (2001 + blockers.length); setBlockers((b) => [...b, { id, created: new Date().toISOString(), openedBy: CURRENT_USER, closedAt: null, closedBy: null, newPromise: null, comments: [], ...p }]); setBForm(null); setBView(id); },
    closeBlocker: (id) => setBlockers((b) => b.map((x) => (x.id === id ? { ...x, status: "closed", closedAt: x.closedAt || new Date().toISOString(), closedBy: x.closedBy || CURRENT_USER } : x))),
    assignBlocker: (id, who) => setBlockers((b) => b.map((x) => (x.id === id ? { ...x, assignee: who, status: x.status === "closed" ? "closed" : who ? "assigned" : "open" } : x))),
    setBlockerStatus: (id, status) => setBlockers((b) => b.map((x) => { if (x.id !== id) return x; if (status === "closed") return { ...x, status, closedAt: x.closedAt || new Date().toISOString(), closedBy: x.closedBy || CURRENT_USER }; return { ...x, status, closedAt: null, closedBy: null }; })),
    setNewPromise: (id, date) => setBlockers((b) => b.map((x) => (x.id === id ? { ...x, newPromise: date || null } : x))),
    addComment: (id, text) => setBlockers((b) => b.map((x) => (x.id === id ? { ...x, comments: [...(x.comments || []), { ts: new Date().toISOString(), who: CURRENT_USER, text }] } : x))),
    openBlocker: (id) => setBView(id), closeView: () => setBView(null),
    openForm: (pre = []) => setBForm({ sos: pre }), closeForm: () => setBForm(null),
    openSO: (id) => setSoView(id), closeSO: () => setSoView(null),
  };

  // live context so the offline assistant can give real numbers
  const botCtx = (() => {
    const blkVal = (b) => b.sos.reduce((a, id) => a + (SALES_ORDERS.find((s) => s.id === id)?.value || 0), 0);
    if (route === "visibility") {
      const f = delivSite === "All" ? SALES_ORDERS : SALES_ORDERS.filter((s) => s.site === delivSite);
      const isos = Array.from({ length: 7 }, (_, i) => isoOf(addDays(delivWeek, i)));
      const wk = f.filter((s) => isos.includes(effPromise(blockers, s)));
      const blocked = wk.filter((s) => openBlockerForSO(blockers, s.id)).reduce((a, s) => a + s.value, 0);
      const total = wk.reduce((a, s) => a + s.value, 0);
      return { site: delivSite, weekLabel: fmtMD(delivWeek) + "–" + fmtMD(addDays(delivWeek, 6)), committed: total - blocked, blocked, expected: total, orders: wk.length, atRisk: wk.filter((s) => openBlockerForSO(blockers, s.id)).length };
    }
    if (route === "finance") {
      const blocked = SALES_ORDERS.filter((s) => openBlockerForSO(blockers, s.id)).reduce((a, s) => a + s.value, 0);
      const total = SALES_ORDERS.reduce((a, s) => a + s.value, 0);
      return { committed: total - blocked, blocked, expected: total };
    }
    if (route === "blockers") {
      const openB = blockers.filter((b) => b.status !== "closed");
      const top = [...openB].sort((a, b) => blkVal(b) - blkVal(a))[0];
      return { open: openB.length, atRisk: openB.reduce((a, b) => a + blkVal(b), 0), top: top ? { title: top.title, val: blkVal(top) } : null };
    }
    return null;
  })();
  const go = (r) => { setRoute(r); window.scrollTo?.({ top: 0, behavior: "instant" }); };
  const setT = (page) => (v) => setTier((t) => ({ ...t, [page]: v }));
  const updateChat = (r, fn) => setChats((c) => ({ ...c, [r]: fn(c[r]) }));

  return (
    <ThreadCtx.Provider value={{ open: (id) => setTStack((s) => [...s, id]) }}>
    <DataCtx.Provider value={dataVal}>
    <div className="tf">
      <Styles />
      <style>{`
        @media(max-width:820px){.tf-cols{grid-template-columns:1fr !important}.hide-sm{display:none !important}.tf-nav{display:none !important}}
      `}</style>
      <TopNav route={route} go={go} tier={Object.values(tier).includes("paid") ? "paid" : "free"} />
      {route === "home" && <Home go={go} />}
      {route === "assets" && <AssetsPage tier={tier.assets} setTier={setT("assets")} stage={assetStage} setStage={setAssetStage} />}
      {route === "contracts" && <ContractsPage tier={tier.contracts} setTier={setT("contracts")} />}
      {route === "requirements" && <RequirementsPage tier={tier.requirements} setTier={setT("requirements")} />}
      {route === "thread" && <ThreadPage tier={tier.thread} setTier={setT("thread")} />}
      {route === "roi" && <ROIPage />}
      {route === "directspend" && <DirectSpendPage tier={tier.directspend} setTier={setT("directspend")} />}
      {route === "blockers" && <BlockersPage />}
      {route === "visibility" && <DeliveryPage />}
      {route === "finance" && <FinancePage />}

      <div style={{ borderTop: "1px solid var(--line)", marginTop: 30, paddingBottom: 70 }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "22px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Workflow size={15} color="var(--amber)" />
          <span className="tf-mono" style={{ fontSize: 12, color: "var(--faint)" }}>{BRAND} — digital thread for manufacturing · concept prototype</span>
          <span className="tf-mono" style={{ fontSize: 12, color: "var(--faint)", marginLeft: "auto" }}>Free sample data · Connected tier for live integrations</span>
        </div>
      </div>

      {/* subject-aware assistant, docked on every page */}
      <DockedAssistant route={route} chat={chats[route]} update={updateChat} open={dockOpen} setOpen={setDockOpen} botCtx={botCtx} />
      <ThreadModal stack={tStack} setStack={setTStack} />
      {bView && <BlockerModal id={bView} />}
      {bForm && <BlockerForm pre={bForm} />}
      {soView && <SalesOrderModal id={soView} />}
    </div>
    </DataCtx.Provider>
    </ThreadCtx.Provider>
  );
}

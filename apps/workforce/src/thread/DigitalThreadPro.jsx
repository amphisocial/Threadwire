import React, { useState, useEffect, useMemo } from "react";
import {
  GitBranch, Layers, PackageSearch, ChevronDown, ChevronRight, Boxes,
  AlertTriangle, CircleDot, Sparkles, ArrowUp, ArrowDown, Zap, ShieldCheck,
} from "lucide-react";

/* =========================================================================
   Digital Thread Pro — two sub-tabs for the Digital Thread page
     1. PeggingExplorerPro  — SCM-05 Multi-Level Pegging Explorer
        · left pane: multi-level BOM tree (explode down / where-used up)
        · center pane: part header, weekly Demand / Supply / Hard / Soft / Gap
          grid, active pegs with Harden / Expedite actions, risk triage
     2. EcoImpactAnalyzerPro — ENG-06 ECO Impact Analyzer
        · ECO content (affected items / drawings / IMS refs / reason)
        · inventory orphan exposure + mitigation
        · schedule-slip risk by IMS task (score donuts + factor bars)
        · program rollup
   Both start from a search (BOM/part or ECO), try the live /api/thread
   endpoints, and fall back to rich sample data. The current analysis is
   published to window.__twDigitalThreadCtx so the docked page assistant can
   answer questions about exactly what is on screen.
   ========================================================================= */

/* ------------------------------ helpers --------------------------------- */
const money = (n) => "$" + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
const qty = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });

const TONE = {
  red:   { fg: "var(--red)",    bg: "rgba(242,98,73,.14)",  bd: "rgba(242,98,73,.4)" },
  amber: { fg: "var(--amber)",  bg: "rgba(255,154,77,.13)", bd: "rgba(255,154,77,.38)" },
  yellow:{ fg: "var(--yellow)", bg: "rgba(232,188,80,.13)", bd: "rgba(232,188,80,.38)" },
  green: { fg: "var(--green)",  bg: "rgba(77,203,128,.13)", bd: "rgba(77,203,128,.38)" },
  blue:  { fg: "var(--blue)",   bg: "rgba(106,180,255,.13)",bd: "rgba(106,180,255,.38)" },
  thread:{ fg: "var(--thread)", bg: "rgba(77,216,202,.12)", bd: "rgba(77,216,202,.38)" },
  faint: { fg: "var(--faint)",  bg: "rgba(255,255,255,.04)",bd: "var(--line2)" },
};
const Chip = ({ tone = "faint", children, style }) => {
  const t = TONE[tone] || TONE.faint;
  return <span className="tf-mono" style={{ fontSize: 10.5, letterSpacing: ".03em", padding: "3px 9px", borderRadius: 999, color: t.fg, background: t.bg, border: `1px solid ${t.bd}`, whiteSpace: "nowrap", ...style }}>{children}</span>;
};
const Badge = ({ tone = "faint", children }) => {
  const t = TONE[tone] || TONE.faint;
  return <span className="tf-mono" style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".06em", padding: "3px 8px", borderRadius: 6, color: t.fg, background: t.bg, border: `1px solid ${t.bd}`, textTransform: "uppercase" }}>{children}</span>;
};
const Dot = ({ tone }) => <span style={{ width: 8, height: 8, borderRadius: "50%", display: "inline-block", flexShrink: 0, background: (TONE[tone] || TONE.faint).fg }} />;
const Eyebrow = ({ children, style }) => <div className="tf-eyebrow" style={{ fontSize: 10.5, marginBottom: 10, ...style }}>{children}</div>;
const MetaCell = ({ label, children }) => (
  <div>
    <div className="tf-mono" style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--faint)" }}>{label}</div>
    <div className="tf-mono" style={{ marginTop: 5, fontSize: 12.5, color: "var(--ink)", lineHeight: 1.45 }}>{children}</div>
  </div>
);
const Donut = ({ score, tone, size = 66 }) => {
  const r = size / 2 - 5, c = 2 * Math.PI * r, f = Math.max(0, Math.min(100, score)) / 100;
  const col = (TONE[tone] || TONE.amber).fg;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="5" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={`${c * f} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="53%" dominantBaseline="middle" textAnchor="middle" fill="var(--ink)" fontFamily="var(--mono)" fontWeight="700" fontSize={size * .3}>{score}</text>
    </svg>
  );
};
const FactorBar = ({ label, value, color }) => (
  <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 30px", alignItems: "center", gap: 10, padding: "3px 0" }}>
    <span style={{ fontSize: 12, color: "var(--muted)" }}>{label}</span>
    <div style={{ height: 6, borderRadius: 4, background: "var(--line)", overflow: "hidden" }}>
      <div style={{ width: `${value}%`, height: "100%", borderRadius: 4, background: color }} />
    </div>
    <span className="tf-mono" style={{ fontSize: 11.5, textAlign: "right", color: "var(--muted)" }}>{value}</span>
  </div>
);

async function api(url, opts = {}) {
  const res = await fetch(url, { credentials: "include", ...opts, headers: { "Content-Type": "application/json", ...(opts.headers || {}) } });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
/* publish the on-screen analysis so the docked page assistant can see it */
function publishCtx(kind, text) {
  try {
    window.__twDigitalThreadCtx = window.__twDigitalThreadCtx || {};
    window.__twDigitalThreadCtx[kind] = text;
    window.__twDigitalThreadCtx.combined =
      "CURRENT DIGITAL-THREAD SCREEN STATE (answer from this first):\n" +
      Object.entries(window.__twDigitalThreadCtx).filter(([k]) => k !== "combined").map(([, v]) => v).join("\n\n");
  } catch (e) { /* no-op */ }
}

/* =========================================================================
   SAMPLE DATA — Falcon-LRU program (mirrors the SCM-05 / ENG-06 mockups)
   ========================================================================= */
const WEEKS = ["W18", "W19", "W20", "W21", "W22", "W23", "W24", "W25", "W26", "W27", "W28", "W29"];

const SAMPLE_TREE = [
  { id: "AVCM-7800-A", lvl: 0, type: "A", star: true, pn: "AVCM-7800-A", desc: "Falcon-LRU Avionics Computer", qtyPer: 1, dot: null, kids: [
    { id: "PWR-SUPPLY-2200", lvl: 1, type: "A", pn: "PWR-SUPPLY-2200", desc: "Power Supply Assembly", qtyPer: 1, dot: null, kids: [
      { id: "PCB-PWR-A1", lvl: 2, type: "S", pn: "PCB-PWR-A1", desc: "Power Board Assembly", qtyPer: 1, dot: null, kids: [
        { id: "PCB-PWR-A1-EMC", lvl: 3, type: "P", pn: "PCB-PWR-A1-EMC", desc: "EMC Filter Stage", qtyPer: 1, dot: null, kids: [
          { id: "AFE-MOD-08", lvl: 4, type: "S", pn: "AFE-MOD-08", desc: "Analog Front-End Module", qtyPer: 1, dot: null, kids: [
            { id: "MAX14001AAP+@pwr", lvl: 5, type: "C", pn: "MAX14001AAP+", desc: "Functional Safety AFE", qtyPer: 2, dot: "amber", kids: [] },
            { id: "LT3045-1", lvl: 5, type: "C", pn: "LT3045-1", desc: "Linear Reg, ultra-low-noise", qtyPer: 4, dot: "green", kids: [] },
            { id: "ISO7741DWR", lvl: 5, type: "C", pn: "ISO7741DWR", desc: "Quad Digital Isolator", qtyPer: 2, dot: "green", kids: [] },
          ]},
          { id: "CAP-FILM-10UF-100V", lvl: 4, type: "C", pn: "CAP-FILM-10UF-100V", desc: "Film Cap 10uF 100V", qtyPer: 8, dot: "green", kids: [] },
        ]},
        { id: "CONN-DSUB-37HD", lvl: 3, type: "C", pn: "CONN-DSUB-37HD", desc: "D-Sub HD 37-pin", qtyPer: 1, dot: "amber", kids: [] },
      ]},
    ]},
    { id: "SBC-ARM-7800", lvl: 1, type: "A", pn: "SBC-ARM-7800", desc: "Single-Board Computer", qtyPer: 1, dot: null, kids: [
      { id: "PCB-CPU-R3", lvl: 2, type: "S", pn: "PCB-CPU-R3", desc: "CPU Board, Rev 3", qtyPer: 1, dot: null, kids: [
        { id: "RTG-XILINX-5VFX130", lvl: 3, type: "C", pn: "RTG-XILINX-5VFX130", desc: "Rad-tolerant FPGA", qtyPer: 1, dot: "amber", kids: [] },
        { id: "DDR3L-2GB-AERO", lvl: 3, type: "C", pn: "DDR3L-2GB-AERO", desc: "Rad-hard SDRAM", qtyPer: 4, dot: "green", kids: [] },
      ]},
    ]},
    { id: "IO-BOARD-440", lvl: 1, type: "A", pn: "IO-BOARD-440", desc: "I/O Board Subassembly", qtyPer: 1, dot: null, kids: [
      { id: "PCB-IO-440", lvl: 2, type: "S", pn: "PCB-IO-440", desc: "I/O PCB", qtyPer: 1, dot: null, kids: [
        { id: "MAX14001AAP+@io", lvl: 3, type: "C", pn: "MAX14001AAP+", desc: "Functional Safety AFE", qtyPer: 4, dot: "red", kids: [] },
        { id: "OPA188IDR", lvl: 3, type: "C", pn: "OPA188IDR", desc: "Precision OpAmp", qtyPer: 2, dot: "green", kids: [] },
      ]},
    ]},
  ]},
];

/* rich detail for the hero part; other parts get generated plausible detail */
const SAMPLE_DETAIL = {
  "MAX14001AAP+": {
    pn: "MAX14001AAP+", desc: "Functional Safety AFE, isolated 24-bit Σ-Δ ADC, Maxim/ADI · BOM Level 5–7 across 4 assemblies",
    tags: [
      { t: "red", label: "▲ KC-014 Functional Safety" }, { t: "amber", label: "Single source" },
      { t: "yellow", label: "EOL · LTB by 2026-10-15" }, { t: "blue", label: "ITAR · USML XII(d)" },
      { t: "thread", label: "Lead 22 wk" },
    ],
    meta: {
      "Manufacturer P/N": "MAX14001AAP+", "Approved mfrs (AVL)": "ADI · Rochester (LTB)",
      "On-hand inventory": "412 EA", "Open commitments": "1,170 EA",
      "Where used": "17 BOMs · 4 end items", "Next dock": "2026-06-04 · PO 4500219881-30 · 600 EA",
      "Last PCN": "2026-03-12 · ADI PDN-220314A", "Pegging confidence": "0.81 · review queue",
    },
    buckets: {
      demand: [42, 42, 96, 96, 120, 120, 132, 132, 132, 120, 96, 42],
      supply: [412, 0, 600, 0, 0, 300, 0, 0, 0, 200, 0, 0],
      hard:   [42, 42, 96, 96, 96, 96, 96, 0, 0, 0, 0, 0],
      soft:   [0, 0, 0, 0, 24, 24, 36, 96, 120, 96, 0, 0],
      gap:    [0, 0, 0, 0, 0, 0, 0, 36, 12, 24, 96, 42],
    },
    pegs: [
      { src: "PO 4500219881-20", dest: "WO 7200915-A · AVCM-7800 · Falcon-LRU S/N 0125–0140", ea: 96, when: "dock W20", kind: "hard" },
      { src: "On-hand · Bin C-14", dest: "WO 7200915-B · AVCM-7800 · Falcon-LRU S/N 0141–0152", ea: 42, when: "W18", kind: "hard" },
      { src: "PO 4500220115-10", dest: "WO 7201118 · IO-BOARD-440 · Stinger-IRU", ea: 120, when: "soft · ranked 1/3", kind: "soft", why: "Ranked by need-date proximity and program priority. Two other WOs compete for this receipt; hardening locks it to WO 7201118." },
      { src: "Planned receipt PR-44021", dest: "WO 7201219 · PWR-SUPPLY-2200 · Falcon-LRU", ea: 96, when: "soft · ranked 1/2", kind: "soft", why: "Planned receipt not yet firmed with the supplier. If PR-44021 is canceled the peg re-ranks to PO 4500219881-30." },
      { src: "— no supply found —", dest: "WO 7201501 · AVCM-7800 · Falcon-LRU S/N 0153–0164", ea: 96, when: "need W28", kind: "gap" },
      { src: "— no supply found —", dest: "WO 7201609 · AVCM-7800 · Falcon-LRU S/N 0165–0170", ea: 42, when: "need W29", kind: "gap" },
    ],
    pegTotal: 47,
    whereUsed: [
      { pn: "AFE-MOD-08", desc: "Analog Front-End Module · 2 EA", end: "AVCM-7800-A · Falcon-LRU" },
      { pn: "PCB-IO-440", desc: "I/O PCB · 4 EA", end: "IO-BOARD-440 · Stinger-IRU" },
      { pn: "SNS-ACQ-220", desc: "Sensor Acquisition Board · 2 EA", end: "P-8120 Stinger-IRU" },
      { pn: "TST-FIXTURE-88", desc: "ATE Fixture (non-deliverable) · 1 EA", end: "Factory test" },
    ],
    pcn: [
      { date: "2026-03-12", ref: "ADI PDN-220314A", note: "Product discontinuance — last-time-buy by 2026-10-15, FFF substitute ADAQ7980BCPZ-RL7 offered." },
      { date: "2025-08-02", ref: "ADI PCN-250802", note: "Assembly site transfer Penang → Cavite; no form/fit/function change." },
      { date: "2024-11-19", ref: "ADI PCN-241119", note: "Mold compound change; qualification data attached." },
    ],
    audit: [
      { at: "09:41", who: "Pegging engine", note: "Re-ranked 3 soft pegs after PO 4500219881-30 date change (W23 → W23, qty confirm 600)." },
      { at: "09:12", who: "M. Walker", note: "Override request on WO 7200915-A hard peg withdrawn." },
      { at: "08:55", who: "ERP sync", note: "Lake refresh — Oracle EBS R12 on-hand 412 EA, open commitments 1,170 EA." },
    ],
    triage: [
      { pair: "MAX14001AAP+ → WO 7201118", score: 87 },
      { pair: "LT3045-1 → WO 7201219", score: 74 },
      { pair: "RTG-XILINX-5VFX130 → WO 7201407", score: 71 },
    ],
  },
};

/* generated fallback detail so every BOM node opens something sensible */
function genDetail(node) {
  const seed = [...node.pn].reduce((a, c) => a + c.charCodeAt(0), 0);
  const base = 20 + (seed % 90);
  const demand = WEEKS.map((_, i) => Math.round(base * (1 + Math.sin((i + seed) / 2) * 0.4)));
  const onHand = base * 6, po = base * 4;
  let pool = onHand + (po ? po : 0);
  const hard = [], soft = [], gap = [], supply = WEEKS.map((_, i) => (i === 0 ? onHand : i === 4 ? po : 0));
  demand.forEach((d, i) => {
    if (pool >= d) { hard.push(i < 6 ? d : Math.round(d * .6)); soft.push(i < 6 ? 0 : d - Math.round(d * .6)); gap.push(0); pool -= d; }
    else { hard.push(Math.max(pool, 0)); soft.push(0); gap.push(d - Math.max(pool, 0)); pool = 0; }
  });
  const risky = node.dot === "red" || node.dot === "amber";
  return {
    pn: node.pn, desc: node.desc + " · generated demo detail (connect ERP/PLM for live rows)",
    tags: [{ t: risky ? "amber" : "green", label: risky ? "Coverage watch" : "Coverage OK" }, { t: "faint", label: `Lead ${4 + (seed % 18)} wk` }],
    meta: {
      "Manufacturer P/N": node.pn, "Approved mfrs (AVL)": seed % 2 ? "2 approved sources" : "Single source",
      "On-hand inventory": `${onHand} EA`, "Open commitments": `${po} EA`,
      "Where used": `${1 + (seed % 6)} BOMs`, "Next dock": po ? `${WEEKS[4]} · ${po} EA` : "—",
      "Last PCN": "—", "Pegging confidence": (0.7 + (seed % 25) / 100).toFixed(2),
    },
    buckets: { demand, supply, hard, soft, gap },
    pegs: [
      { src: "On-hand", dest: `WO 72${(seed % 900) + 100}0 · ${node.pn}`, ea: hard[0] || base, when: "W18", kind: "hard" },
      ...(soft.some(Boolean) ? [{ src: "Planned receipt", dest: `WO 72${(seed % 900) + 101}1`, ea: soft.find(Boolean), when: "soft · ranked 1/2", kind: "soft", why: "Algorithmic peg — planned supply not yet firmed." }] : []),
      ...(gap.some(Boolean) ? [{ src: "— no supply found —", dest: `WO 72${(seed % 900) + 102}2`, ea: gap.reduce((a, b) => a + b, 0), when: "uncovered", kind: "gap" }] : []),
    ],
    pegTotal: 3, whereUsed: [{ pn: "AVCM-7800-A", desc: "Falcon-LRU Avionics Computer", end: "P-8104 Falcon-LRU" }],
    pcn: [], audit: [{ at: "08:55", who: "ERP sync", note: "Lake refresh — demo rows generated for this part." }],
    triage: [],
  };
}

const SAMPLE_ECO = {
  header: {
    id: "ECO-2026-0418",
    title: "Substitute MAX14001AAP+ → ADAQ7980BCPZ-RL7 (FFF) per ADI PDN-220314A",
    tags: [
      { t: "yellow", label: "Pending CRB Approval" }, { t: "red", label: "Priority · Urgent" },
      { t: "green", label: "Form-Fit-Function" }, { t: "blue", label: "Effectivity · Block 20-ON (S/N 0153+)" },
      { t: "faint", label: "ITAR · USML XII(d)" }, { t: "faint", label: "P-8104 Falcon-LRU" }, { t: "faint", label: "P-8120 Stinger-IRU" },
    ],
  },
  counts: [["4", "Affected items"], ["2", "Affected drawings"], ["2", "IMS task refs"], ["FFF", "Qual impact"]],
  extractor: "extracted by ECO-Extractor v1.0.0 · conf 0.93",
  items: [
    { act: "REVISE", tone: "blue", pn: "PCB-PWR-A1", desc: "Power Board · Rev D → Rev E", note: "FFF preserved" },
    { act: "REVISE", tone: "blue", pn: "PCB-IO-440", desc: "I/O PCB · Rev C → Rev D", note: "FFF preserved" },
    { act: "REMOVE", tone: "red", pn: "MAX14001AAP+", desc: "Functional Safety AFE (ADI PDN)", note: "on Block 20-ON" },
    { act: "ADD", tone: "green", pn: "ADAQ7980BCPZ-RL7", desc: "AFE replacement, FFF", note: "on Block 20-ON" },
  ],
  drawings: [
    { pn: "DWG-A1234-PCB-PWR-A1", desc: "Rev D → Rev E · replace U7 footprint" },
    { pn: "DWG-A1234-PCB-IO-440", desc: "Rev C → Rev D · same" },
  ],
  imsRefs: [
    { sys: "COBRA", tone: "amber", id: "P8104.AS.040.05", desc: "PCB-PWR-A1 Build & Test", note: "CP=Yes · TF 4d" },
    { sys: "MSPROJ", tone: "blue", id: "7821", desc: "AVCM-7800-A Final Assembly", note: "CP=No · TF 12d" },
  ],
  reason: "ADI PDN-220314A discontinues MAX14001AAP+. Substitute with form-fit-function replacement ADAQ7980BCPZ-RL7 across all affected configuration items.",
  exposure: {
    total: 84210, full: 1, partial: 2, none: 1, scorer: "scored by Impact-Scorer · safety-of-flight floor active",
    rows: [
      { dot: "red", pn: "MAX14001AAP+", note: "Removed by ECO; no remaining demand on Block 20+", onHand: 412, openPo: 600, exp: 58420, mit: true },
      { dot: "amber", pn: "PCB-PWR-A1 (Rev D)", note: "Surplus: 1,000 EA on hand vs 200 EA remaining demand", onHand: 1200, openPo: 0, exp: 18540, mit: true },
      { dot: "amber", pn: "PCB-IO-440 (Rev C)", note: "Surplus: 400 EA vs 90 EA remaining demand", onHand: 490, openPo: 0, exp: 7250, mit: true },
      { dot: "green", pn: "ADAQ7980BCPZ-RL7", note: "Newly added; no orphan possible", onHand: 0, openPo: 300, exp: 0, mit: false },
    ],
  },
  slipNote: "Weighted across 5 factors (CP proximity 30, qual burden 25, long-lead in new config 20, approval-path latency 15, build-up inventory 10).",
  slips: [
    { score: 73, tone: "red", sys: "Cobra", id: "P8104.AS.040.05", name: "PCB-PWR-A1 Build & Test",
      sub: "P-8104 Falcon-LRU · Critical path · TF 4d", rec: "Restage",
      factors: [["Critical-path proximity", 90, "var(--red)"], ["Qualification burden", 55, "var(--amber)"], ["Long lead in new config", 70, "var(--blue)"], ["Approval-path latency", 62, "#a78bfa"], ["Build-up inventory", 48, "var(--green)"]] },
    { score: 47, tone: "amber", sys: "MS Project", id: "7821", name: "AVCM-7800-A Final Assembly",
      sub: "P-8104 Falcon-LRU · Off CP · TF 12d", rec: "Add inventory buffer",
      factors: [["Critical-path proximity", 30, "var(--red)"], ["Qualification burden", 40, "var(--amber)"], ["Long lead in new config", 55, "var(--blue)"], ["Approval-path latency", 60, "#a78bfa"], ["Build-up inventory", 65, "var(--green)"]] },
  ],
  rollup: [
    { prog: "P-8104 Falcon-LRU", note: "Milestones at risk: RFP-4 Lot Acceptance (2026-08-22)", risk: "73 high", tone: "red", exp: 84210 },
    { prog: "P-8120 Stinger-IRU", note: "No milestones at risk in current scope", risk: "12 low", tone: "green", exp: 0 },
  ],
};

/* =========================================================================
   1 · SUPPLY CHAIN PEGGING EXPLORER
   ========================================================================= */
export function PeggingExplorerPro() {
  const [q, setQ] = useState("MAX14001AAP+");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("Demo data shown until matching live rows are imported.");
  const [tree, setTree] = useState(SAMPLE_TREE);
  const [detailMap, setDetailMap] = useState(SAMPLE_DETAIL);
  const [selId, setSelId] = useState("MAX14001AAP+@io");
  const [collapsed, setCollapsed] = useState({});
  const [dir, setDir] = useState("down");
  const [tab, setTab] = useState("pegging");
  const [pegState, setPegState] = useState({});   // idx -> "hardened" | "expedited"
  const [whyOpen, setWhyOpen] = useState(null);

  const flat = useMemo(() => {
    const out = [];
    const walk = (nodes, parentHidden) => nodes.forEach((n) => {
      out.push({ ...n, hidden: parentHidden });
      walk(n.kids || [], parentHidden || collapsed[n.id]);
    });
    walk(tree, false);
    return out;
  }, [tree, collapsed]);
  const visible = flat.filter((n) => !n.hidden);
  const selNode = flat.find((n) => n.id === selId) || flat[0];
  const detail = useMemo(() => (selNode ? (detailMap[selNode.pn] || genDetail(selNode)) : null), [selNode, detailMap]);

  /* try live API; map the legacy pegging shape into this layout; else keep demo */
  async function search(query = q) {
    setBusy(true); setNote("");
    try {
      const s = await api(`/api/thread/bom/search?q=${encodeURIComponent(query)}`);
      const first = (s.items || [])[0];
      if (!first?.part_number) throw new Error("no match");
      const d = await api(`/api/thread/bom/${encodeURIComponent(first.part_number)}/pegging`);
      if (!d.bom_tree?.length) throw new Error("no rows");
      const root = { id: first.part_number, lvl: 0, type: "A", star: true, pn: first.part_number, desc: d.part?.description || "Top assembly", qtyPer: 1, dot: null, kids: [] };
      const dm = {};
      root.kids = d.bom_tree.map((r) => ({ id: r.part_number, lvl: 1, type: "C", pn: r.part_number, desc: r.description || "", qtyPer: r.qty_per || 1, dot: r.tone === "red" ? "red" : r.tone === "green" ? "green" : "amber", kids: [] }));
      d.bom_tree.forEach((r) => {
        const inv = (d.inventory || {})[r.part_number] || {};
        const hardPegs = (d.hard_pegs || []).filter((p) => p.part_number === r.part_number);
        const softPegs = (d.soft_pegs || []).filter((p) => p.part_number === r.part_number);
        dm[r.part_number] = {
          pn: r.part_number, desc: r.description || "",
          tags: [{ t: r.gap ? "red" : "green", label: r.gap ? `Short ${qty(r.gap)}` : "Covered" }],
          meta: {
            "On-hand inventory": `${qty(inv.on_hand ?? r.on_hand)} EA`, "Available": `${qty(inv.available ?? r.available)} EA`,
            "Allocated": `${qty(inv.allocated ?? r.allocated)} EA`, "Inbound": `${qty(r.inbound)} EA`,
            "Required": `${qty(r.required_qty)} EA`, "Qty / assy": qty(r.qty_per),
            "Safety stock": qty(inv.safety_stock || 0), "Pegging confidence": "live",
          },
          buckets: { demand: [r.required_qty], supply: [(r.on_hand || 0) + (r.inbound || 0)], hard: [Math.min(r.on_hand || 0, r.required_qty || 0)], soft: [r.inbound || 0], gap: [r.gap || 0] },
          weeks: ["Total"],
          pegs: [
            ...hardPegs.map((p) => ({ src: p.source, dest: p.demand || "", ea: p.pegged_qty, when: p.date || "", kind: "hard" })),
            ...softPegs.map((p) => ({ src: p.source, dest: p.supplier || "", ea: p.pegged_qty, when: p.date || "", kind: "soft", why: "Soft peg from planned/inbound supply." })),
            ...(r.gap ? [{ src: "— no supply found —", dest: "uncovered demand", ea: r.gap, when: "gap", kind: "gap" }] : []),
          ],
          pegTotal: hardPegs.length + softPegs.length, whereUsed: [{ pn: root.pn, desc: root.desc, end: root.pn }], pcn: [], audit: [], triage: [],
        };
      });
      setTree([root]); setDetailMap(dm); setSelId(root.kids[0]?.id || root.id);
      setNote("Live pegging data loaded from backend APIs.");
    } catch (e) {
      setTree(SAMPLE_TREE); setDetailMap(SAMPLE_DETAIL);
      const hit = [];
      const walk = (ns) => ns.forEach((n) => { if (n.pn.toLowerCase().includes(query.toLowerCase())) hit.push(n.id); walk(n.kids || []); });
      walk(SAMPLE_TREE);
      if (hit.length) setSelId(hit[hit.length - 1]);
      setNote("No live BOM match yet — showing demo pegging analysis.");
    } finally { setBusy(false); }
  }
  useEffect(() => { search(q); /* eslint-disable-line */ }, []);

  /* publish screen state for the docked assistant */
  useEffect(() => {
    if (!detail) return;
    const weeks = detail.weeks || WEEKS;
    const line = (k) => weeks.map((w, i) => `${w}:${(detail.buckets[k] || [])[i] || 0}`).join(" ");
    publishCtx("pegging",
      `PEGGING EXPLORER — selected part ${detail.pn} (${detail.desc}).\n` +
      Object.entries(detail.meta).map(([k, v]) => `${k}: ${v}`).join(" · ") + "\n" +
      `Demand ${line("demand")}\nSupply ${line("supply")}\nHard pegs ${line("hard")}\nSoft pegs ${line("soft")}\nGap ${line("gap")}\n` +
      `Active pegs: ` + detail.pegs.map((p) => `[${p.kind}] ${p.src} → ${p.dest} ${p.ea} EA ${p.when}`).join("; ") +
      (detail.triage.length ? `\nRisk triage (soft pegs to harden): ` + detail.triage.map((t) => `${t.pair} score ${t.score}`).join("; ") : ""));
  }, [detail]);

  const bucketRows = [
    ["Demand", "demand", { bg: "rgba(255,255,255,.05)", fg: "var(--ink)" }, "EA — across BOMs"],
    ["Supply", "supply", { bg: "rgba(106,180,255,.12)", fg: "var(--blue)" }, "POs + on-hand"],
    ["Hard pegs", "hard", { bg: "rgba(77,203,128,.13)", fg: "var(--green)" }, "firm-allocated"],
    ["Soft pegs", "soft", { bg: "rgba(255,154,77,.13)", fg: "var(--amber)" }, "algorithmic"],
    ["Gap", "gap", { bg: "rgba(242,98,73,.14)", fg: "var(--red)" }, "uncovered"],
  ];
  const weeks = detail?.weeks || WEEKS;
  const typeTone = { A: "blue", S: "thread", C: "faint", P: "amber" };
  const pegActions = (p, i) => {
    const st = pegState[i];
    if (p.kind === "hard") return <Chip tone="green">firm</Chip>;
    if (p.kind === "soft") return (
      <span style={{ display: "inline-flex", gap: 6 }}>
        {st === "hardened"
          ? <Chip tone="green">hardened ✓</Chip>
          : <button className="tf-btn" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => setPegState((s) => ({ ...s, [i]: "hardened" }))}>Harden</button>}
        <button className="tf-btn tf-btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => setWhyOpen(whyOpen === i ? null : i)}>Why?</button>
      </span>
    );
    return st === "expedited"
      ? <Chip tone="amber">expedite requested ✓</Chip>
      : <span style={{ display: "inline-flex", gap: 6 }}>
          <button className="tf-btn tf-btn-primary" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => setPegState((s) => ({ ...s, [i]: "expedited" }))}><Zap size={12} />Expedite</button>
          <button className="tf-btn tf-btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }}>Alt MPN</button>
        </span>;
  };

  return (
    <div className="tf-fade">
      {/* search bar */}
      <div className="tf-panel" style={{ padding: 14, marginBottom: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span className="tf-mono" style={{ fontSize: 11, color: "var(--faint)", letterSpacing: ".18em" }}>SCM-05 · MULTI-LEVEL PEGGING</span>
        <input className="tf-input" style={{ flex: 1, minWidth: 220 }} value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()} placeholder="Search BOM / part, e.g. MAX14001AAP+" />
        <button className="tf-btn tf-btn-primary" onClick={() => search()} disabled={busy}><PackageSearch size={15} />{busy ? "Searching…" : "Analyze"}</button>
        <Chip>{note}</Chip>
      </div>

      <div className="tf-cols" style={{ display: "grid", gridTemplateColumns: "330px 1fr", gap: 14, alignItems: "start" }}>
        {/* ------------------------- BOM tree ------------------------- */}
        <div className="tf-panel" style={{ overflow: "hidden" }}>
          <div style={{ padding: "11px 14px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8 }}>
            <Boxes size={15} color="var(--thread)" /><b style={{ fontSize: 13.5 }}>BOM tree</b>
            <span style={{ marginLeft: "auto", display: "inline-flex", gap: 6 }}>
              <button className={`tf-btn ${dir === "down" ? "" : "tf-btn-ghost"}`} style={{ padding: "3px 9px", fontSize: 11 }} onClick={() => setDir("down")}><ArrowDown size={12} />Down</button>
              <button className={`tf-btn ${dir === "up" ? "" : "tf-btn-ghost"}`} style={{ padding: "3px 9px", fontSize: 11 }} onClick={() => setDir("up")}><ArrowUp size={12} />Up</button>
            </span>
          </div>
          {dir === "down" ? (
            <div className="tf-scroll" style={{ maxHeight: 620, overflowY: "auto", padding: "6px 0" }}>
              {visible.map((n) => (
                <div key={n.id} className="tf-row" onClick={() => setSelId(n.id)}
                  style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 12px 6px " + (10 + n.lvl * 14) + "px", cursor: "pointer", background: selId === n.id ? "var(--panel2)" : "transparent", borderLeft: selId === n.id ? "2px solid var(--amber)" : "2px solid transparent" }}>
                  {n.kids?.length
                    ? <span onClick={(e) => { e.stopPropagation(); setCollapsed((c) => ({ ...c, [n.id]: !c[n.id] })); }} style={{ display: "inline-flex", cursor: "pointer", color: "var(--faint)" }}>{collapsed[n.id] ? <ChevronRight size={13} /> : <ChevronDown size={13} />}</span>
                    : <span style={{ width: 13 }} />}
                  <Badge tone="faint">L{n.lvl}</Badge>
                  <Badge tone={typeTone[n.type] || "faint"}>{n.type}</Badge>
                  <span className="tf-mono" style={{ fontSize: 11.5, color: n.star ? "var(--amber)" : "var(--thread)", fontWeight: n.star ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.pn}</span>
                  <span style={{ fontSize: 11, color: "var(--faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{n.desc}</span>
                  <span className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)" }}>{n.qtyPer} EA</span>
                  {n.dot && <Dot tone={n.dot} />}
                </div>
              ))}
              <div className="tf-mono" style={{ padding: "10px 14px", fontSize: 10.5, color: "var(--faint)", borderTop: "1px solid var(--line)", display: "flex", gap: 12 }}>
                <span>{flat.length} of {flat.length} nodes shown</span>
                <span style={{ marginLeft: "auto", display: "inline-flex", gap: 8, alignItems: "center" }}><Dot tone="green" />hard <Dot tone="amber" />soft <Dot tone="red" />gap</span>
              </div>
            </div>
          ) : (
            <div style={{ padding: 14 }}>
              <Eyebrow style={{ color: "var(--thread)" }}>Where-used (up) · {selNode?.pn}</Eyebrow>
              {(detail?.whereUsed || []).map((w, i) => (
                <div key={i} style={{ padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
                  <div className="tf-mono" style={{ fontSize: 12, color: "var(--thread)" }}>{w.pn}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}>{w.desc}</div>
                  <div className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 2 }}>{w.end}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ------------------------ part detail ------------------------ */}
        {detail && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
            <div className="tf-panel" style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span className="tf-disp" style={{ fontSize: 21, fontWeight: 800 }}>{detail.pn}</span>
                {detail.tags.map((t, i) => <Chip key={i} tone={t.t}>{t.label}</Chip>)}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 7 }}>{detail.desc}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "14px 18px", marginTop: 16 }}>
                {Object.entries(detail.meta).map(([k, v]) => <MetaCell key={k} label={k}>{v}</MetaCell>)}
              </div>
            </div>

            <div className="tf-panel" style={{ overflow: "hidden" }}>
              <div style={{ display: "flex", gap: 2, padding: "0 12px", borderBottom: "1px solid var(--line)", overflowX: "auto" }}>
                {[["pegging", "Pegging"], ["ds", "Demand & Supply"], ["wu", "Where used (up)"], ["pcn", "PCN / EOL history"], ["audit", "Audit log"]].map(([k, label]) => (
                  <button key={k} onClick={() => setTab(k)} className="tf-mono"
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "12px 13px", fontSize: 12, whiteSpace: "nowrap", color: tab === k ? "var(--ink)" : "var(--faint)", borderBottom: tab === k ? "2px solid var(--amber)" : "2px solid transparent" }}>{label}</button>
                ))}
              </div>

              {(tab === "pegging" || tab === "ds") && (
                <div className="tf-scroll" style={{ overflowX: "auto", padding: "14px 16px" }}>
                  <table style={{ borderCollapse: "separate", borderSpacing: 3, width: "100%" }}>
                    <thead>
                      <tr>
                        <th style={{ minWidth: 130 }} />
                        {weeks.map((w) => <th key={w} className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)", fontWeight: 500, padding: "0 2px 6px", minWidth: 52 }}>{w}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {bucketRows.filter(([, key]) => tab === "pegging" || key === "demand" || key === "supply").map(([label, key, sty, sub]) => (
                        <tr key={key}>
                          <td style={{ paddingRight: 10 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{label}</div>
                            <div className="tf-mono" style={{ fontSize: 9.5, color: "var(--faint)" }}>{sub}</div>
                          </td>
                          {weeks.map((w, i) => {
                            const v = (detail.buckets[key] || [])[i] || 0;
                            return <td key={w} className="tf-mono" style={{ textAlign: "center", fontSize: 12, padding: "8px 4px", borderRadius: 7, background: v ? sty.bg : "rgba(255,255,255,.02)", color: v ? sty.fg : "var(--line2)" }}>{v || "·"}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {tab === "pegging" && (
                    <div style={{ marginTop: 18 }}>
                      <Eyebrow style={{ color: "var(--thread)" }}>Active pegs (showing {detail.pegs.length} of {detail.pegTotal})</Eyebrow>
                      {detail.pegs.map((p, i) => (
                        <div key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", flexWrap: "wrap" }}>
                            <span className="tf-mono" style={{ fontSize: 11.5, color: p.kind === "gap" ? "var(--red)" : "var(--muted)", minWidth: 160 }}>{p.src}</span>
                            <span style={{ color: "var(--faint)" }}>→</span>
                            <span className="tf-mono" style={{ fontSize: 11.5, color: "var(--ink)", flex: 1, minWidth: 200 }}>{p.dest}</span>
                            <span className="tf-mono" style={{ fontSize: 11.5 }}><b>{qty(p.ea)}</b> EA</span>
                            <Chip tone={p.kind === "hard" ? "green" : p.kind === "soft" ? "amber" : "red"}>{p.when}</Chip>
                            {pegActions(p, i)}
                          </div>
                          {whyOpen === i && p.why && <div style={{ fontSize: 12, color: "var(--muted)", padding: "0 0 10px 4px", maxWidth: 640 }}>{p.why}</div>}
                        </div>
                      ))}
                    </div>
                  )}

                  {tab === "pegging" && !!detail.triage.length && (
                    <div style={{ marginTop: 16, border: `1px solid ${TONE.yellow.bd}`, background: TONE.yellow.bg, borderRadius: 10, padding: 14 }}>
                      <div className="tf-mono" style={{ fontSize: 10.5, letterSpacing: ".16em", color: "var(--yellow)", marginBottom: 8 }}>RISK TRIAGE · SOFT PEGS THAT SHOULD BE HARDENED</div>
                      {detail.triage.map((t, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
                          <span className="tf-mono" style={{ fontSize: 12, color: "var(--ink)" }}>{t.pair}</span>
                          <span className="tf-mono" style={{ fontSize: 12.5, fontWeight: 700, color: t.score >= 80 ? "var(--red)" : "var(--amber)" }}>{t.score}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === "wu" && <div style={{ padding: 16 }}>{(detail.whereUsed || []).map((w, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "9px 0", borderBottom: "1px solid var(--line)", flexWrap: "wrap" }}>
                  <span className="tf-mono" style={{ fontSize: 12, color: "var(--thread)", minWidth: 150 }}>{w.pn}</span>
                  <span style={{ fontSize: 12, color: "var(--muted)", flex: 1 }}>{w.desc}</span>
                  <span className="tf-mono" style={{ fontSize: 11, color: "var(--faint)" }}>{w.end}</span>
                </div>))}
              </div>}

              {tab === "pcn" && <div style={{ padding: 16 }}>{detail.pcn.length ? detail.pcn.map((p, i) => (
                <div key={i} style={{ padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
                  <span className="tf-mono" style={{ fontSize: 11.5, color: "var(--amber)" }}>{p.date} · {p.ref}</span>
                  <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>{p.note}</div>
                </div>)) : <div style={{ fontSize: 12.5, color: "var(--faint)" }}>No PCN / EOL notices on file for this part.</div>}
              </div>}

              {tab === "audit" && <div style={{ padding: 16 }}>{detail.audit.length ? detail.audit.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                  <span className="tf-mono" style={{ fontSize: 11, color: "var(--faint)", minWidth: 44 }}>{a.at}</span>
                  <span className="tf-mono" style={{ fontSize: 11.5, color: "var(--thread)", minWidth: 110 }}>{a.who}</span>
                  <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{a.note}</span>
                </div>)) : <div style={{ fontSize: 12.5, color: "var(--faint)" }}>No audit entries yet.</div>}
              </div>}
            </div>

            <div className="tf-panel" style={{ padding: "11px 16px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <Sparkles size={14} color="var(--amber)" />
              <span style={{ fontSize: 12.5, color: "var(--muted)" }}>Ask the page assistant (bottom-right):</span>
              {["What slips if this part is delayed 4 weeks?", "Which soft pegs should be hardened?", "Where is the LTB stock pegged?"].map((s) => <Chip key={s}>{s}</Chip>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   2 · ECO IMPACT ANALYZER
   ========================================================================= */
export function EcoImpactAnalyzerPro() {
  const [q, setQ] = useState("ECO-2026-0418");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("Demo data shown until matching live rows are imported.");
  const [eco, setEco] = useState(SAMPLE_ECO);
  const [mit, setMit] = useState({});
  const [applied, setApplied] = useState({});

  async function search(query = q) {
    setBusy(true); setNote("");
    try {
      const s = await api(`/api/thread/eco/search?q=${encodeURIComponent(query)}`);
      const first = (s.items || [])[0];
      if (!first?.eco_number) throw new Error("no match");
      const d = await api(`/api/thread/eco/${encodeURIComponent(first.eco_number)}/impact`);
      if (!d.affected_items?.length) throw new Error("no rows");
      const totalExp = (d.orphan_inventory || []).reduce((a, x) => a + (x.exposure_value || 0), 0);
      setEco({
        header: {
          id: d.eco?.eco_number || first.eco_number, title: d.eco?.title || "",
          tags: [
            { t: "yellow", label: d.eco?.status || "In Review" },
            ...(d.eco?.owner ? [{ t: "faint", label: d.eco.owner }] : []),
            ...(d.eco?.effective_date ? [{ t: "blue", label: `Effectivity · ${d.eco.effective_date}` }] : []),
          ],
        },
        counts: [[String(d.affected_items.length), "Affected items"], [String((d.affected_drawings || []).length), "Affected drawings"], [String((d.ims_tasks || []).length), "IMS task refs"], ["—", "Qual impact"]],
        extractor: "live ECO impact rows from backend",
        items: d.affected_items.map((x) => ({ act: "REVISE", tone: "blue", pn: x.part_number, desc: `${x.old_revision || "-"} → ${x.new_revision || "-"}`, note: x.disposition || x.impact || "" })),
        drawings: (d.affected_drawings || []).map((x) => ({ pn: x.drawing_number, desc: `${x.old_revision || "-"} → ${x.new_revision || "-"} · ${x.status || ""}` })),
        imsRefs: (d.ims_tasks || []).map((x) => ({ sys: "IMS", tone: "amber", id: x.task_number, desc: x.task_name || "", note: `${x.owner || ""} · due ${x.due_date || "—"}` })),
        reason: d.eco?.title || "",
        exposure: {
          total: totalExp, full: (d.orphan_inventory || []).length, partial: 0, none: 0, scorer: "live orphan rows",
          rows: (d.orphan_inventory || []).map((x) => ({ dot: "amber", pn: x.part_number, note: x.recommended_action || "", onHand: x.quantity, openPo: 0, exp: x.exposure_value || 0, mit: true })),
        },
        slipNote: "Live schedule-slip rows from backend.",
        slips: (d.schedule_slip_risks || []).map((x) => ({
          score: 65, tone: "amber", sys: "SO", id: `${x.so_number || "SO"}-L${x.line_number || 10}`, name: `${x.customer || ""} · ${x.part_number || ""}`,
          sub: `qty ${qty(x.quantity)} · due ${x.promise_date || "—"} · ${money(x.value)}`, rec: "Review re-promise",
          factors: [["Promise-date proximity", 70, "var(--red)"], ["Order value at risk", 60, "var(--amber)"], ["Coverage after ECO", 55, "var(--blue)"]],
        })),
        rollup: (d.program_rollup || []).map((m) => ({ prog: m.metric, note: "", risk: String(m.value), tone: m.tone === "red" ? "red" : m.tone === "amber" ? "amber" : "green", exp: null })),
      });
      setNote("Live ECO impact data loaded from backend APIs.");
    } catch (e) { setEco(SAMPLE_ECO); setNote("No live ECO match yet — showing demo ECO impact analysis."); }
    finally { setBusy(false); }
  }
  useEffect(() => { search(q); /* eslint-disable-line */ }, []);

  useEffect(() => {
    publishCtx("eco",
      `ECO IMPACT ANALYZER — ${eco.header.id}: ${eco.header.title}. Tags: ${eco.header.tags.map((t) => t.label).join(", ")}.\n` +
      `Affected items: ` + eco.items.map((x) => `${x.act} ${x.pn} (${x.desc}; ${x.note})`).join("; ") + "\n" +
      `Drawings: ` + eco.drawings.map((x) => `${x.pn} ${x.desc}`).join("; ") + "\n" +
      `IMS refs: ` + eco.imsRefs.map((x) => `${x.sys} ${x.id} ${x.desc} (${x.note})`).join("; ") + "\n" +
      `Reason: ${eco.reason}\n` +
      `Orphan exposure total ${money(eco.exposure.total)} (${eco.exposure.full} full / ${eco.exposure.partial} partial / ${eco.exposure.none} not orphaned): ` +
      eco.exposure.rows.map((r) => `${r.pn} on-hand ${r.onHand} openPO ${r.openPo} exposure ${money(r.exp)} (${r.note})`).join("; ") + "\n" +
      `Schedule-slip risk: ` + eco.slips.map((s) => `${s.sys} ${s.id} ${s.name} score ${s.score} rec ${s.rec}`).join("; ") + "\n" +
      `Program rollup: ` + eco.rollup.map((r) => `${r.prog} ${r.risk}${r.exp != null ? " " + money(r.exp) : ""} ${r.note}`).join("; "));
  }, [eco]);

  return (
    <div className="tf-fade">
      <div className="tf-panel" style={{ padding: 14, marginBottom: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span className="tf-mono" style={{ fontSize: 11, color: "var(--faint)", letterSpacing: ".18em" }}>ENG-06 · ECO IMPACT</span>
        <input className="tf-input" style={{ flex: 1, minWidth: 220 }} value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()} placeholder="Search ECO, e.g. ECO-2026-0418" />
        <button className="tf-btn tf-btn-primary" onClick={() => search()} disabled={busy}><PackageSearch size={15} />{busy ? "Searching…" : "Analyze"}</button>
        <Chip>{note}</Chip>
      </div>

      {/* ECO header */}
      <div className="tf-panel" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <span className="tf-disp tf-mono" style={{ fontSize: 22, fontWeight: 800, color: "var(--ink)" }}>{eco.header.id}</span>
          <span style={{ fontSize: 13.5, color: "var(--muted)" }}>{eco.header.title}</span>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 11, flexWrap: "wrap" }}>
          {eco.header.tags.map((t, i) => <Chip key={i} tone={t.t}>{t.label}</Chip>)}
        </div>
      </div>

      <div className="tf-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1.15fr", gap: 14, alignItems: "start" }}>
        {/* ------------------------- ECO content ------------------------- */}
        <div className="tf-panel" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <GitBranch size={15} color="var(--blue)" /><b style={{ fontSize: 14 }}>ECO content</b>
            <span className="tf-mono" style={{ marginLeft: "auto", fontSize: 10, color: "var(--faint)" }}>{eco.extractor}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, margin: "14px 0 4px" }}>
            {eco.counts.map(([v, l]) => (
              <div key={l}>
                <div className="tf-mono" style={{ fontSize: 20, fontWeight: 800, color: "var(--ink)" }}>{v}</div>
                <div className="tf-mono" style={{ fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--faint)", marginTop: 3 }}>{l}</div>
              </div>
            ))}
          </div>

          <Eyebrow style={{ marginTop: 16 }}>Affected items</Eyebrow>
          {eco.items.map((x, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--line)", flexWrap: "wrap" }}>
              <Badge tone={x.tone}>{x.act}</Badge>
              <span className="tf-mono" style={{ fontSize: 12, color: "var(--thread)" }}>{x.pn}</span>
              <span style={{ fontSize: 12, color: "var(--muted)", flex: 1, minWidth: 140 }}>{x.desc}</span>
              <span className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)" }}>{x.note}</span>
            </div>
          ))}

          <Eyebrow style={{ marginTop: 16 }}>Affected drawings</Eyebrow>
          {eco.drawings.map((x, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--line)", flexWrap: "wrap" }}>
              <Badge tone="blue">REVISE</Badge>
              <span className="tf-mono" style={{ fontSize: 12, color: "var(--thread)" }}>{x.pn}</span>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{x.desc}</span>
            </div>
          ))}

          <Eyebrow style={{ marginTop: 16 }}>IMS task references</Eyebrow>
          {eco.imsRefs.map((x, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--line)", flexWrap: "wrap" }}>
              <Badge tone={x.tone}>{x.sys}</Badge>
              <span className="tf-mono" style={{ fontSize: 12, color: "var(--ink)" }}>{x.id}</span>
              <span style={{ fontSize: 12, color: "var(--muted)", flex: 1, minWidth: 140 }}>{x.desc}</span>
              <span className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)" }}>{x.note}</span>
            </div>
          ))}

          <Eyebrow style={{ marginTop: 16 }}>Reason for change</Eyebrow>
          <p style={{ fontSize: 13, margin: 0 }}>{eco.reason}</p>
        </div>

        {/* -------------------- orphan exposure + risk -------------------- */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <div className="tf-panel" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={15} color="var(--amber)" /><b style={{ fontSize: 14 }}>Inventory orphan exposure</b>
              <span className="tf-mono" style={{ marginLeft: "auto", fontSize: 10, color: "var(--faint)" }}>{eco.exposure.scorer}</span>
            </div>
            <div style={{ display: "flex", gap: 26, margin: "14px 0 6px", flexWrap: "wrap", alignItems: "baseline" }}>
              <div><div className="tf-mono" style={{ fontSize: 24, fontWeight: 800, color: "var(--red)" }}>{money(eco.exposure.total)}</div><div className="tf-mono" style={{ fontSize: 9.5, letterSpacing: ".1em", color: "var(--faint)", textTransform: "uppercase", marginTop: 3 }}>Total exposure</div></div>
              {[["full", eco.exposure.full, "Full orphan", "red"], ["partial", eco.exposure.partial, "Partial orphan", "amber"], ["none", eco.exposure.none, "Not orphaned", "green"]].map(([k, v, l, t]) => (
                <div key={k}><div className="tf-mono" style={{ fontSize: 20, fontWeight: 800, color: (TONE[t]).fg }}>{v}</div><div className="tf-mono" style={{ fontSize: 9.5, letterSpacing: ".1em", color: "var(--faint)", textTransform: "uppercase", marginTop: 3 }}>{l}</div></div>
              ))}
            </div>
            <div className="tf-scroll" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
                <thead><tr>{["Part", "On hand", "Open PO", "Exposure", "Mitigation"].map((h) => <th key={h} className="tf-mono" style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--faint)", textAlign: h === "Part" ? "left" : "right", padding: "8px 6px", borderBottom: "1px solid var(--line)" }}>{h}</th>)}</tr></thead>
                <tbody>
                  {eco.exposure.rows.map((r, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: "10px 6px" }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Dot tone={r.dot} /><span className="tf-mono" style={{ fontSize: 12, color: "var(--ink)" }}>{r.pn}</span></div>
                        <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 3, paddingLeft: 16 }}>{r.note}</div>
                      </td>
                      <td className="tf-mono" style={{ textAlign: "right", fontSize: 12, padding: "10px 6px" }}>{qty(r.onHand)}</td>
                      <td className="tf-mono" style={{ textAlign: "right", fontSize: 12, padding: "10px 6px" }}>{qty(r.openPo)}</td>
                      <td className="tf-mono" style={{ textAlign: "right", fontSize: 12, fontWeight: 700, color: r.exp ? "var(--amber)" : "var(--faint)", padding: "10px 6px" }}>{money(r.exp)}</td>
                      <td style={{ textAlign: "right", padding: "10px 6px" }}>
                        {r.mit ? (
                          <select className="tf-input" style={{ width: 190, padding: "6px 9px", fontSize: 11 }} value={mit[i] || "use"} onChange={(e) => setMit((m) => ({ ...m, [i]: e.target.value }))}>
                            <option value="use">Use up before effectivity</option>
                            <option value="stage">Stage effectivity by S/N</option>
                            <option value="rework">Rework to new config</option>
                            <option value="mrb">MRB disposition / scrap</option>
                            <option value="return">Return / resell (LTB)</option>
                          </select>
                        ) : <span className="tf-mono" style={{ fontSize: 11, color: "var(--faint)" }}>— No mitigation required</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="tf-panel" style={{ padding: 16 }}>
            <b style={{ fontSize: 14 }}>Schedule-slip risk by IMS task</b>
            <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 5 }}>{eco.slipNote}</div>
            {eco.slips.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 16, padding: "16px 0", borderBottom: i < eco.slips.length - 1 ? "1px solid var(--line)" : "none", flexWrap: "wrap" }}>
                <Donut score={s.score} tone={s.tone} />
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <Badge tone={s.tone === "red" ? "amber" : "blue"}>{s.sys}</Badge>
                    <span className="tf-mono" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)" }}>{s.id} — {s.name}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--faint)", margin: "4px 0 8px" }}>{s.sub} · Recommendation: <b style={{ color: "var(--ink)" }}>{s.rec}</b></div>
                  {s.factors.map(([l, v, c]) => <FactorBar key={l} label={l} value={v} color={c} />)}
                </div>
                <div>
                  {applied[i]
                    ? <Chip tone="green">{s.rec} queued ✓</Chip>
                    : <button className="tf-btn tf-btn-primary" style={{ padding: "6px 13px", fontSize: 11.5 }} onClick={() => setApplied((a) => ({ ...a, [i]: true }))}>{s.rec}</button>}
                </div>
              </div>
            ))}
          </div>

          <div className="tf-panel" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><ShieldCheck size={15} color="var(--thread)" /><b style={{ fontSize: 14 }}>Program rollup</b></div>
            {eco.rollup.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: i < eco.rollup.length - 1 ? "1px solid var(--line)" : "none", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{r.prog}</div>
                  {r.note && <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 3 }}>{r.note}</div>}
                </div>
                <Chip tone={r.tone}>{r.risk}</Chip>
                {r.exp != null && <span className="tf-mono" style={{ fontSize: 13, fontWeight: 700, color: r.exp ? "var(--amber)" : "var(--faint)" }}>{money(r.exp)}</span>}
              </div>
            ))}
          </div>

          <div className="tf-panel" style={{ padding: "11px 16px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Sparkles size={14} color="var(--amber)" />
            <span style={{ fontSize: 12.5, color: "var(--muted)" }}>Ask the page assistant (bottom-right):</span>
            {["What does this ECO do to the RFP-4 milestone?", "Show $ exposure if approved as-is", "Which IMS tasks slip > 5 days?"].map((s) => <Chip key={s}>{s}</Chip>)}
          </div>
        </div>
      </div>
    </div>
  );
}

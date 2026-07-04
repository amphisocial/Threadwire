from pathlib import Path

TARGET = Path('frontend/src/ThreadWire.jsx')
START = '/* --------------------------- DIGITAL THREAD ----------------------------- */\nfunction ThreadPage'
END = '/* ============================ ROI CALCULATOR ============================= */'

REPLACEMENT = r'''/* --------------------------- DIGITAL THREAD ----------------------------- */
function ThreadPage({ tier, setTier }) {
  const [subtab, setSubtab] = useState("pegging");
  return (
    <div style={{ maxWidth: 1480, margin: "0 auto", padding: "34px 16px 70px" }}>
      <PageHead icon={GitBranch} eyebrow="Manufacturing Delivery Control · Digital thread" title="Digital thread control tower"
        sub="Two operator-grade digital-thread views: supply-chain pegging from BOM to end-item demand, and ECO impact analysis from engineering change to inventory, program milestones and schedule slip."
        tier={tier} setTier={setTier} />

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          ["pegging", "Supply Chain Pegging", PackageSearch, "BOM / supply / demand"],
          ["eco", "ECO Impact", GitBranch, "change / orphan / schedule"],
        ].map(([k, label, Icon, hint]) => {
          const on = subtab === k;
          return (
            <button key={k} onClick={() => setSubtab(k)}
              style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10, border: `1px solid ${on ? "var(--amber)" : "var(--line)"}`, borderRadius: 12, padding: "10px 14px", background: on ? "var(--panel2)" : "var(--bg2)", color: on ? "var(--ink)" : "var(--muted)" }}>
              <Icon size={16} color={on ? "var(--amber)" : "var(--faint)"} />
              <span style={{ fontWeight: 700, fontSize: 13 }}>{label}</span>
              <span className="tf-mono" style={{ fontSize: 10.5, color: "var(--faint)" }}>{hint}</span>
            </button>
          );
        })}
      </div>

      {subtab === "pegging" ? <SupplyChainPeggingExplorer tier={tier} /> : <EcoImpactAnalyzer tier={tier} />}

      {tier === "paid" && (
        <div style={{ marginTop: 22 }}>
          <ConnectGate title="Wire up the live digital thread"
            lines={[
              "BOM, AML, inventory and PO commitments from ERP/PLM for hard/soft pegging.",
              "ECO packages, affected items, effectivity and CRB workflow from Teamcenter/Windchill.",
              "Program tasks and milestones from IMS tools so impact analysis quantifies schedule slip, not just part impact.",
            ]}
            connectors={[
              { name: "ERP / MRP", desc: "Inventory, supply, demand", icon: Database },
              { name: "PLM", desc: "BOM, ECO, effectivity", icon: Layers },
              { name: "IMS / MS Project", desc: "Milestones + critical path", icon: Workflow },
            ]} />
        </div>
      )}
    </div>
  );
}

function SupplyChainPeggingExplorer() {
  const [query, setQuery] = useState("MAX14001AAP+");
  const [loaded, setLoaded] = useState(true);
  const [selected, setSelected] = useState("MAX14001AAP+");
  const [tab, setTab] = useState("pegging");
  const weeks = ["W18", "W19", "W20", "W21", "W22", "W23", "W24", "W25", "W26", "W27", "W28", "W29"];
  const nodes = [
    { level: 0, pn: "AVCM-7800-A", desc: "Falcon-LRU Avionics", qty: "1 EA", kind: "A", tone: "#dbeafe" },
    { level: 1, pn: "PWR-SUPPLY-2200", desc: "Power Supply", qty: "1 EA", kind: "A", tone: "#dbeafe" },
    { level: 2, pn: "PCB-PWR-A1", desc: "Power Board Assembly", qty: "1 EA", kind: "S", tone: "#ede9fe" },
    { level: 3, pn: "PCB-PWR-A1-EMC", desc: "EMC Filter", qty: "1 EA", kind: "P", tone: "#fef3c7" },
    { level: 4, pn: "AFE-MOD-08", desc: "Analog Front End", qty: "1 EA", kind: "S", tone: "#ede9fe" },
    { level: 5, pn: "MAX14001AAP+", desc: "Functional Safety AFE", qty: "2 EA", kind: "C", tone: "#dcfce7" },
    { level: 5, pn: "LT3045-1", desc: "Linear Regulator", qty: "4 EA", kind: "C", tone: "#dcfce7" },
    { level: 5, pn: "ISO7741DWR", desc: "Quad Digital Isolator", qty: "2 EA", kind: "C", tone: "#dcfce7" },
    { level: 4, pn: "CAP-FILM-10UF-100V", desc: "Film Capacitor", qty: "8 EA", kind: "C", tone: "#dcfce7" },
    { level: 1, pn: "SBC-ARM-7800", desc: "Single-Board Computer", qty: "1 EA", kind: "A", tone: "#dbeafe" },
    { level: 2, pn: "PCB-CPU-R3", desc: "CPU Board", qty: "1 EA", kind: "S", tone: "#ede9fe" },
    { level: 1, pn: "IO-BOARD-440", desc: "I/O Board", qty: "1 EA", kind: "A", tone: "#dbeafe" },
    { level: 2, pn: "PCB-IO-440", desc: "I/O PCB", qty: "1 EA", kind: "S", tone: "#ede9fe" },
    { level: 3, pn: "MAX14001AAP+", desc: "Functional Safety AFE", qty: "4 EA", kind: "C", tone: "#dcfce7" },
    { level: 3, pn: "OPA188IDR", desc: "Precision OpAmp", qty: "2 EA", kind: "C", tone: "#dcfce7" },
  ];
  const parts = {
    "MAX14001AAP+": { title: "MAX14001AAP+", subtitle: "Functional Safety AFE, isolated 24-bit Σ-Δ ADC, Maxim/ADI", source: "single source", eol: "LTB by 2026-10-15", lead: "22 wk", onHand: 412, open: 1170, lastPcn: "2026-03-12 · ADI PDN-220314A", where: "17 BOMs · 4 end items", hard: [42, 42, 96, 96, 96, 96, 96, 0, 0, 0, 0, 0], soft: [0, 0, 0, 0, 24, 24, 36, 96, 120, 96, 0, 0], gap: [0, 0, 0, 0, 0, 0, 0, 36, 12, 24, 96, 42] },
    "LT3045-1": { title: "LT3045-1", subtitle: "Low-noise linear regulator", source: "dual source", eol: "active", lead: "14 wk", onHand: 890, open: 420, lastPcn: "2025-12-04 · package label update", where: "9 BOMs · 3 end items", hard: [80, 80, 110, 110, 110, 0, 0, 0, 0, 0, 0, 0], soft: [0, 0, 0, 0, 20, 30, 30, 60, 0, 0, 0, 0], gap: [0, 0, 0, 0, 0, 0, 12, 24, 0, 0, 0, 0] },
    "ISO7741DWR": { title: "ISO7741DWR", subtitle: "Quad digital isolator", source: "approved alternate", eol: "active", lead: "18 wk", onHand: 520, open: 780, lastPcn: "2026-01-18 · die revision", where: "11 BOMs · 4 end items", hard: [50, 50, 75, 75, 75, 75, 0, 0, 0, 0, 0, 0], soft: [0, 0, 0, 0, 18, 18, 40, 74, 82, 0, 0, 0], gap: [0, 0, 0, 0, 0, 0, 0, 18, 48, 52, 0, 0] },
  };
  const part = parts[selected] || parts["MAX14001AAP+"];
  const demand = [42, 42, 96, 96, 120, 120, 132, 132, 132, 120, 96, 42];
  const supply = [412, 0, 600, 0, 0, 300, 0, 0, 0, 200, 0, 0];
  const pegs = [
    ["PO 4500219881-20", "WO 7200915-A · AVCM-7800 Falcon-LRU S/N 0125-0140", "96 EA", "hard W20", "View", "Override"],
    ["On-hand · Bin C-14", "WO 7200915-B · AVCM-7800 Falcon-LRU S/N 0141-0152", "42 EA", "hard W18", "View", "Override"],
    ["PO 4500220115-10", "WO 7201118 · IO-BOARD-440 Stinger-IRU", "120 EA", "soft · ranked 1/3", "Harden", "Why?"],
    ["Planned receipt PR-44021", "WO 7201219 · PWR-SUPPLY-2200 Falcon-LRU", "96 EA", "soft · ranked 1/2", "Harden", "Why?"],
    ["-- no supply found --", "WO 7201501 · AVCM-7800 Falcon-LRU S/N 0153-0164", "96 EA", "need W28", "Expedite", "Alt MPN"],
    ["-- no supply found --", "WO 7201609 · AVCM-7800 Falcon-LRU S/N 0165-0170", "42 EA", "need W29", "Expedite", "Alt MPN"],
  ];
  const cell = (v, tone) => (
    <td key={Math.random()} style={{ padding: 4, textAlign: "center" }}>
      {v ? <span style={{ display: "block", borderRadius: 6, padding: "7px 4px", fontWeight: 700, fontSize: 11, background: tone.bg, color: tone.fg, border: `1px solid ${tone.bd}` }}>{v}</span> : <span style={{ color: "#cbd5e1" }}>·</span>}
    </td>
  );
  const ui = lightUi();

  return (
    <div style={ui.shell}>
      <div style={ui.appbar}>
        <div style={{ fontWeight: 800 }}>SCM-05</div>
        <div style={{ opacity: .78 }}>Multi-Level Pegging Explorer</div>
        <div style={ui.searchBox}><PackageSearch size={14} /> <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") setLoaded(true); }} placeholder="Search BOM / part / MPN" style={ui.searchInput} /></div>
        <button onClick={() => { setSelected(query || "MAX14001AAP+"); setLoaded(true); }} style={ui.primaryBtn}>Analyze BOM</button>
        <div style={{ marginLeft: "auto", opacity: .8 }}>Program <b>P-8104 Falcon-LRU</b> · ERP Oracle EBS R12 · Lake refresh <b>2 min ago</b></div>
      </div>
      {!loaded ? <SearchEmpty title="Search for a BOM or part number" text="Enter a part, MPN or BOM root to load the multi-level pegging view." /> : (
        <div style={{ display: "grid", gridTemplateColumns: "290px minmax(640px,1fr) 320px", gap: 10, padding: 10 }}>
          <div style={ui.panel}>
            <div style={ui.panelHead}><b>BOM tree</b><span style={ui.toggle}>Down ↓</span><span style={ui.toggleOff}>Up ↑</span></div>
            <div style={{ padding: "8px 8px 0" }}>
              {nodes.map((n, i) => {
                const on = n.pn === selected;
                return (
                  <div key={i} onClick={() => setSelected(n.pn)} style={{ display: "grid", gridTemplateColumns: "24px 24px 1fr 42px 8px", alignItems: "center", gap: 5, padding: "6px 6px", borderRadius: 6, cursor: "pointer", background: on ? "#dbeafe" : "transparent", color: "#1f2937" }}>
                    <span style={{ paddingLeft: n.level * 10, color: "#64748b", fontSize: 10 }}>L{n.level}</span>
                    <span style={{ width: 18, height: 18, borderRadius: 5, background: n.tone, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 10 }}>{n.kind}</span>
                    <span style={{ fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}><b>{n.pn}</b> <span style={{ color: "#64748b" }}>{n.desc}</span></span>
                    <span style={{ fontSize: 10, color: "#64748b", textAlign: "right" }}>{n.qty}</span>
                    <span style={{ width: 7, height: 7, borderRadius: 99, background: n.pn === "MAX14001AAP+" ? "#f59e0b" : "#34d399" }} />
                  </div>
                );
              })}
            </div>
            <div style={{ position: "sticky", bottom: 0, marginTop: 12, borderTop: "1px solid #e5e7eb", padding: 8, color: "#64748b", fontSize: 10 }}>15-level depth · 4 of 5,228 nodes shown <span style={{ float: "right" }}>hard · soft · gap</span></div>
          </div>

          <div style={ui.panel}>
            <div style={{ padding: 16, borderBottom: "1px solid #e5e7eb" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h2 style={{ margin: 0, fontSize: 17, color: "#0f172a" }}>{part.title}</h2>
                <span style={ui.redChip}>KC-014 Functional Safety</span><span style={ui.pinkChip}>{part.source}</span><span style={ui.goldChip}>EOL · {part.eol}</span><span style={ui.blueChip}>Lead {part.lead}</span>
              </div>
              <div style={{ color: "#64748b", marginTop: 5, fontSize: 12 }}>{part.subtitle} · BOM Level 5-7 across 4 assemblies</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginTop: 16 }}>
                {[ ["Manufacturer / PN", part.title], ["Approved MFRS", "ADI · Rochester (LTB)"], ["On-hand inventory", `${part.onHand.toLocaleString()} EA`], ["Open commitments", `${part.open.toLocaleString()} EA`], ["Pegging confidence", "0.81 · review queue"] ].map(([k, v]) => <div key={k}><div style={ui.kpiLabel}>{k}</div><div style={ui.kpiVal}>{v}</div></div>)}
              </div>
            </div>
            <div style={{ padding: "0 16px", display: "flex", gap: 18, borderBottom: "1px solid #e5e7eb" }}>
              {["pegging", "demand & supply", "where used", "PCN / EOL history", "audit log"].map((t) => <button key={t} onClick={() => setTab(t)} style={{ border: 0, background: "transparent", padding: "12px 0", fontWeight: tab === t ? 800 : 600, color: tab === t ? "#14365d" : "#64748b", borderBottom: tab === t ? "2px solid #14365d" : "2px solid transparent", cursor: "pointer" }}>{t}</button>)}
              <div style={{ marginLeft: "auto", fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 9 }}><span>● hard</span><span style={{ color: "#f59e0b" }}>● soft</span><span style={{ color: "#ef4444" }}>● gap</span></div>
            </div>
            {tab === "pegging" ? (
              <div style={{ padding: 16 }}>
                <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 7px", color: "#0f172a" }}>
                  <thead><tr><th style={{ width: 126 }}></th>{weeks.map((w) => <th key={w} style={ui.weekHead}>{w}</th>)}</tr></thead>
                  <tbody>
                    <tr><th style={ui.rowHead}>Demand<br/><span>EA — across 17 BOMs</span></th>{demand.map((v) => cell(v, { bg: "#f1f5f9", fg: "#0f172a", bd: "#eef2f7" }))}</tr>
                    <tr><th style={ui.rowHead}>Supply<br/><span>POs + on-hand</span></th>{supply.map((v) => cell(v, { bg: "#e6fffb", fg: "#0f766e", bd: "#ccfbf1" }))}</tr>
                    <tr><th style={ui.rowHead}>Hard pegs<br/><span>firm-allocated</span></th>{part.hard.map((v) => cell(v, { bg: "#ecfdf5", fg: "#065f46", bd: "#a7f3d0" }))}</tr>
                    <tr><th style={ui.rowHead}>Soft pegs<br/><span>algorithmic</span></th>{part.soft.map((v) => cell(v, { bg: "#fffbeb", fg: "#92400e", bd: "#fde68a" }))}</tr>
                    <tr><th style={ui.rowHead}>Gap<br/><span>uncovered</span></th>{part.gap.map((v) => cell(v, { bg: "#fef2f2", fg: "#991b1b", bd: "#fecaca" }))}</tr>
                  </tbody>
                </table>
                <div style={{ marginTop: 18, color: "#0f172a" }}>
                  <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>Active pegs <span style={{ color: "#64748b", fontWeight: 500 }}>(showing 6 of 47)</span></h3>
                  {pegs.map((p, i) => <div key={i} style={{ display: "grid", gridTemplateColumns: "210px 1fr 70px 100px 72px 74px", gap: 10, alignItems: "center", borderTop: "1px solid #e5e7eb", padding: "10px 0", fontSize: 12 }}>
                    <span style={{ fontFamily: "var(--mono)", color: "#334155" }}>{p[0]}</span><span style={{ color: "#64748b" }}>{p[1]}</span><b>{p[2]}</b><span style={{ color: p[3].includes("need") ? "#b91c1c" : p[3].includes("soft") ? "#b45309" : "#64748b" }}>{p[3]}</span><button style={p[4] === "Harden" || p[4] === "Expedite" ? ui.darkBtn : ui.smallBtn}>{p[4]}</button><button style={ui.smallBtn}>{p[5]}</button>
                  </div>)}
                </div>
              </div>
            ) : <ThreadPlaceholder tab={tab} />}
          </div>

          <div style={{ display: "grid", gridTemplateRows: "1fr auto", gap: 10 }}>
            <div style={ui.panel}>
              <div style={ui.panelHead}><b>Pegging Copilot</b><span style={{ color: "#10b981" }}>● ITAR · Bedrock Claude</span></div>
              <div style={{ padding: 12 }}>
                <Bubble who="Michael · 09:41" text="If MAX14001AAP+ is delayed 4 weeks, what end items slip?" />
                <div style={ui.answer}><b>Across 4 end items,</b> a 4-week delay on PO 4500219881-30 cascades as follows:<br/><br/>
                  <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}><tbody>{[["AVCM-7800-A Falcon-LRU", "WO 7201501, 7201609", "+3 wk", ".89"], ["IO-BOARD-440 Stinger-IRU", "WO 7201118", "+2 wk", ".84"], ["PWR-SUPPLY-2200", "WO 7201219", "+1 wk", ".82"], ["SBC-ARM-7800", "WO 7201407", "+0 wk", ".95"]].map((r) => <tr key={r[0]}>{r.map((c) => <td key={c} style={{ borderTop: "1px solid #e5e7eb", padding: "7px 3px" }}>{c}</td>)}</tr>)}</tbody></table>
                  <p style={{ margin: "10px 0 0", color: "#475569" }}>Two WOs are already in gap state; the delay extends the existing exposure rather than creating net-new slip.</p>
                </div>
              </div>
            </div>
            <div style={{ ...ui.panel, background: "#fffbeb" }}>
              <div style={{ padding: 12, color: "#92400e", fontWeight: 800, fontSize: 12 }}>RISK TRIAGE · SOFT PEGS THAT SHOULD BE HARDENED</div>
              {[ ["MAX14001AAP+ → WO 7201118", 87], ["LT3045-1 → WO 7201219", 74], ["RTG-XILINX-5VFX130 → WO 7201407", 71] ].map((r) => <div key={r[0]} style={{ display: "flex", padding: "7px 12px", fontSize: 12, color: "#78350f" }}><span>{r[0]}</span><b style={{ marginLeft: "auto" }}>{r[1]}</b></div>)}
              <div style={{ padding: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>{["Show all soft pegs > 60 risk", "What slips if PR-44021 is canceled?", "Where is Rochester LTB stock pegged?"].map((q) => <button key={q} style={ui.pillBtn}>{q}</button>)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EcoImpactAnalyzer() {
  const [query, setQuery] = useState("ECO-2026-0418");
  const [loaded, setLoaded] = useState(true);
  const [view, setView] = useState("proposed");
  const ui = lightUi();
  const items = [
    ["REVISE", "PCB-PWR-A1", "Power Board · Rev D → Rev E", "FFF preserved", "#eff6ff", "#1d4ed8"],
    ["REVISE", "PCB-IO-440", "I/O PCB · Rev C → Rev D", "FFF preserved", "#eff6ff", "#1d4ed8"],
    ["REMOVE", "MAX14001AAP+", "Functional Safety AFE (ADI PDN)", "on Block 20-ON", "#fef2f2", "#b91c1c"],
    ["ADD", "ADAQ7980BCPZ-RL7", "AFE replacement, FFF", "on Block 20-ON", "#ecfdf5", "#047857"],
  ];
  const exposure = [
    ["MAX14001AAP+", "Removed by ECO; no remaining demand on Block 20+", "412", "600", "$58,420", "Use up before effectivity", "#ef4444"],
    ["PCB-PWR-A1 (Rev D)", "Surplus 1,000 EA on hand vs 200 EA remaining demand", "1,200", "0", "$18,540", "Use up before effectivity", "#f59e0b"],
    ["PCB-IO-440 (Rev C)", "Surplus 400 EA vs 90 EA remaining demand", "490", "0", "$7,250", "Use up before effectivity", "#f59e0b"],
    ["ADAQ7980BCPZ-RL7", "Newly added; no orphan possible", "0", "300", "—", "No mitigation required", "#10b981"],
  ];
  return (
    <div style={ui.shell}>
      <div style={ui.appbar}>
        <div style={{ fontWeight: 800 }}>ENG-06</div>
        <div style={{ opacity: .78 }}>ECO Impact Analyzer</div>
        <div style={ui.searchBox}><GitBranch size={14} /> <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") setLoaded(true); }} placeholder="Search ECO / CRB / change number" style={ui.searchInput} /></div>
        <button onClick={() => setLoaded(true)} style={ui.primaryBtn}>Analyze ECO</button>
        <div style={{ marginLeft: "auto", opacity: .8 }}>Source <b>Teamcenter</b> · Lake refresh <b>3 min ago</b> · IMS Cobra + MS Project</div>
      </div>
      {!loaded ? <SearchEmpty title="Search for an ECO" text="Enter an ECO or CRB package to analyze affected items, orphan exposure and program slip." /> : (
        <div style={{ padding: 12 }}>
          <div style={{ ...ui.panel, marginBottom: 10, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: 17, color: "#0f172a" }}>{query}</h2><span style={{ color: "#64748b" }}>Substitute MAX14001AAP+ → ADAQ7980BCPZ-RL7 (FFF) per ADI PDN-220314A</span>
              <span style={ui.goldChip}>Pending CRB Approval</span><span style={ui.redChip}>Priority · Urgent</span><span style={ui.greenChip}>Form-Fit-Function</span><span style={ui.blueChip}>Effectivity · Block 20-ON</span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>{["Proposed", "Baseline", "Δ Diff"].map((v) => <button key={v} onClick={() => setView(v.toLowerCase())} style={view === v.toLowerCase() ? ui.darkBtn : ui.smallBtn}>{v}</button>)}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 310px", gap: 10 }}>
            <div style={ui.panel}>
              <div style={ui.panelHead}><b>ECO content</b><span>extracted by ENG-06-ECO-Extractor · conf .93</span></div>
              <div style={{ padding: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
                  {[ ["4", "affected items"], ["2", "affected drawings"], ["2", "IMS task refs"], ["FFF", "qual impact"] ].map(([v, l]) => <div key={l}><div style={{ fontSize: 24, fontWeight: 900, color: "#0f172a" }}>{v}</div><div style={ui.kpiLabel}>{l}</div></div>)}
                </div>
                <h3 style={ui.sectionTitle}>Affected items</h3>
                {items.map((it) => <div key={it[1]} style={{ display: "grid", gridTemplateColumns: "80px 150px 1fr 105px", gap: 8, padding: "10px 0", borderTop: "1px solid #e5e7eb", color: "#334155", alignItems: "center" }}>
                  <span style={{ ...ui.statusBadge, background: it[4], color: it[5] }}>{it[0]}</span><b style={{ color: "#0f172a" }}>{it[1]}</b><span>{it[2]}</span><span style={{ color: "#64748b", fontSize: 12 }}>{it[3]}</span>
                </div>)}
                <h3 style={ui.sectionTitle}>Affected drawings</h3>
                {["DWG-A1234-PCB-PWR-A1 · Rev D → Rev E · replace U7 footprint", "DWG-A1234-PCB-IO-440 · Rev C → Rev D · same"].map((d) => <div key={d} style={{ padding: "9px 0", borderTop: "1px solid #e5e7eb", color: "#334155" }}><span style={{ ...ui.statusBadge, background: "#eff6ff", color: "#1d4ed8", marginRight: 10 }}>REVISE</span>{d}</div>)}
                <h3 style={ui.sectionTitle}>IMS task references</h3>
                <div style={{ display: "grid", gap: 8 }}>{[["COBRA", "P8104.AS.040.05 · PCB-PWR-A1 Build & Test", "CP=Yes · TF 4d"], ["MSPROJ", "7821 · AVCM-7800-A Final Assembly", "CP=No · TF 12d"]].map((r) => <div key={r[0]} style={{ display: "grid", gridTemplateColumns: "80px 1fr 110px", padding: "8px 0", borderTop: "1px solid #e5e7eb" }}><span style={ui.goldChip}>{r[0]}</span><b>{r[1]}</b><span style={{ color: "#64748b" }}>{r[2]}</span></div>)}</div>
                <h3 style={ui.sectionTitle}>Reason</h3><p style={{ color: "#334155" }}>ADI PDN-220314A discontinues MAX14001AAP+. Substitute with form-fit-function replacement ADAQ7980BCPZ-RL7 across all affected configuration items.</p>
              </div>
            </div>
            <div style={ui.panel}>
              <div style={ui.panelHead}><b>Inventory orphan exposure</b><span>scored by ENG-06 Impact-Scorer</span></div>
              <div style={{ padding: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 12 }}>
                  {[ ["$84,210", "total exposure"], ["1", "full orphan"], ["2", "partial orphan"], ["1", "not orphaned"] ].map(([v, l]) => <div key={l}><div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>{v}</div><div style={ui.kpiLabel}>{l}</div></div>)}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "20px 1.6fr 70px 70px 90px 140px", gap: 8, padding: "8px 0", color: "#64748b", fontSize: 11, fontWeight: 800, borderBottom: "1px solid #e5e7eb" }}><span></span><span>PART</span><span>ON HAND</span><span>OPEN PO</span><span>EXPOSURE</span><span>MITIGATION</span></div>
                {exposure.map((r) => <div key={r[0]} style={{ display: "grid", gridTemplateColumns: "20px 1.6fr 70px 70px 90px 140px", gap: 8, padding: "12px 0", borderBottom: "1px solid #e5e7eb", alignItems: "center" }}><span style={{ width: 9, height: 9, background: r[6], borderRadius: 99 }}></span><span><b style={{ color: "#0f172a" }}>{r[0]}</b><br/><span style={{ color: "#64748b", fontSize: 11 }}>{r[1]}</span></span><b>{r[2]}</b><b>{r[3]}</b><b>{r[4]}</b><button style={ui.smallBtn}>{r[5]}</button></div>)}
                <h3 style={ui.sectionTitle}>Schedule-slip risk by IMS task</h3>
                <SlipRisk title="Cobra · P8104.AS.040.05 — PCB-PWR-A1 Build & Test" score={73} action="Restage" values={[90,55,70,62,48]} />
                <SlipRisk title="MS Project · 7821 — AVCM-7800-A Final Assembly" score={47} action="Buffer" values={[30,40,55,60,65]} />
                <h3 style={ui.sectionTitle}>Program rollup</h3>
                <div style={{ display: "flex", padding: "9px 0", borderTop: "1px solid #e5e7eb" }}><b>P-8104 Falcon-LRU</b><span style={{ marginLeft: "auto", color: "#b91c1c" }}>73 high · $84,210</span></div>
                <div style={{ display: "flex", padding: "9px 0", borderTop: "1px solid #e5e7eb" }}><b>P-8120 Stinger-IRU</b><span style={{ marginLeft: "auto", color: "#047857" }}>12 low · $0</span></div>
              </div>
            </div>
            <div style={ui.panel}>
              <div style={ui.panelHead}><b>ECO Impact Copilot</b><span style={{ color: "#10b981" }}>● ITAR · Bedrock Claude</span></div>
              <div style={{ padding: 12 }}>
                <Bubble who="Michael · 09:52" text="What does ECO-2026-0418 do to Falcon-LRU's RFP-4 milestone?" />
                <div style={ui.answer}>On the current proposed effectivity, <b>RFP-4 Lot Acceptance</b> has a <b>150-day forecast slip</b>, driven primarily by FFF-substitution qualification path and orphan exposure on the old component.<br/><br/>
                  <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}><tbody>{[["Critical-path PCB-PWR-A1 build & test", "+8 d"], ["Long-lead ADAQ7980 supplier qual", "+55 d"], ["Approval path / customer concurrence", "+2 d"]].map((r) => <tr key={r[0]}><td style={{ borderTop: "1px solid #e5e7eb", padding: 7 }}>{r[0]}</td><td style={{ borderTop: "1px solid #e5e7eb", padding: 7, textAlign: "right" }}><b>{r[1]}</b></td></tr>)}</tbody></table>
                  <p style={{ margin: "10px 0 0", color: "#475569" }}>Mitigation on the table: stage effectivity by serial range, use older inventory before cutoff, and pre-buy ADAQ7980 against the supplier sample window.</p>
                </div>
                <div style={{ marginTop: "auto", display: "flex", flexWrap: "wrap", gap: 6, paddingTop: 16 }}>{["Show $ exposure if approved as-is", "Which IMS tasks slip > 5 days?", "Walk dependencies upstream", "Compare to ECO-2025-0972"].map((q) => <button key={q} style={ui.pillBtn}>{q}</button>)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function lightUi() {
  return {
    shell: { background: "#f7f9fc", color: "#0f172a", border: "1px solid #dfe7f1", borderRadius: 14, overflow: "hidden", boxShadow: "0 20px 80px -50px rgba(0,0,0,.45)", fontFamily: "var(--body)" },
    appbar: { minHeight: 46, background: "#17385f", color: "#fff", display: "flex", alignItems: "center", gap: 14, padding: "8px 14px", fontSize: 12 },
    searchBox: { minWidth: 300, flex: "0 1 410px", height: 30, borderRadius: 7, background: "rgba(255,255,255,.12)", display: "flex", alignItems: "center", gap: 8, padding: "0 10px" },
    searchInput: { flex: 1, border: 0, outline: 0, background: "transparent", color: "#fff", fontWeight: 700 },
    primaryBtn: { border: 0, borderRadius: 7, padding: "7px 11px", background: "#0f2d4f", color: "#fff", fontWeight: 800, cursor: "pointer" },
    panel: { background: "#fff", border: "1px solid #dfe7f1", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,23,42,.06)" },
    panelHead: { minHeight: 44, display: "flex", alignItems: "center", gap: 10, padding: "0 12px", borderBottom: "1px solid #e5e7eb", color: "#334155", fontSize: 12 },
    toggle: { marginLeft: "auto", background: "#17385f", color: "#fff", borderRadius: 5, padding: "4px 8px", fontSize: 11 },
    toggleOff: { background: "#f8fafc", color: "#64748b", border: "1px solid #e5e7eb", borderRadius: 5, padding: "3px 7px", fontSize: 11 },
    redChip: { background: "#fee2e2", color: "#991b1b", borderRadius: 999, padding: "5px 8px", fontSize: 11, fontWeight: 800 },
    pinkChip: { background: "#fce7f3", color: "#9d174d", borderRadius: 999, padding: "5px 8px", fontSize: 11, fontWeight: 800 },
    goldChip: { background: "#fef3c7", color: "#92400e", borderRadius: 999, padding: "5px 8px", fontSize: 11, fontWeight: 800 },
    greenChip: { background: "#dcfce7", color: "#166534", borderRadius: 999, padding: "5px 8px", fontSize: 11, fontWeight: 800 },
    blueChip: { background: "#dbeafe", color: "#1d4ed8", borderRadius: 999, padding: "5px 8px", fontSize: 11, fontWeight: 800 },
    kpiLabel: { textTransform: "uppercase", fontSize: 10, color: "#94a3b8", fontWeight: 800 },
    kpiVal: { fontFamily: "var(--mono)", fontSize: 12, color: "#0f172a", fontWeight: 800, marginTop: 4 },
    weekHead: { fontSize: 10, color: "#64748b", fontWeight: 800, paddingBottom: 2 },
    rowHead: { textAlign: "left", fontSize: 12, color: "#334155", fontWeight: 800, lineHeight: 1.15 },
    smallBtn: { border: "1px solid #dfe7f1", background: "#fff", color: "#334155", borderRadius: 6, padding: "5px 8px", fontWeight: 700, fontSize: 11, cursor: "pointer" },
    darkBtn: { border: "1px solid #17385f", background: "#17385f", color: "#fff", borderRadius: 6, padding: "5px 8px", fontWeight: 800, fontSize: 11, cursor: "pointer" },
    pillBtn: { border: "1px solid #e5e7eb", background: "#fff", color: "#334155", borderRadius: 999, padding: "5px 9px", fontSize: 11, cursor: "pointer" },
    answer: { border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, marginTop: 10, color: "#334155", fontSize: 12, lineHeight: 1.55, background: "#fff" },
    statusBadge: { display: "inline-flex", justifyContent: "center", borderRadius: 999, padding: "4px 8px", fontWeight: 900, fontSize: 11 },
    sectionTitle: { margin: "18px 0 8px", fontSize: 12, textTransform: "uppercase", letterSpacing: ".04em", color: "#334155" },
  };
}

function SearchEmpty({ title, text }) {
  return <div style={{ minHeight: 320, display: "grid", placeItems: "center", color: "#64748b" }}><div style={{ textAlign: "center" }}><PackageSearch size={34} /><h3 style={{ color: "#0f172a" }}>{title}</h3><p>{text}</p></div></div>;
}

function Bubble({ who, text }) {
  return <div style={{ display: "grid", gridTemplateColumns: "72px 1fr", gap: 8, alignItems: "start", marginBottom: 8 }}><span style={{ color: "#64748b", fontSize: 11 }}>{who}</span><span style={{ background: "#eff6ff", border: "1px solid #dbeafe", borderRadius: 10, padding: 10, fontSize: 12, color: "#334155" }}>{text}</span></div>;
}

function ThreadPlaceholder({ tab }) {
  return <div style={{ padding: 24, color: "#64748b" }}><b style={{ color: "#0f172a" }}>{tab}</b><p>This tab is reserved for the live backend drilldown. The current mock focuses on pegging, hardening decisions and copilot response flow.</p></div>;
}

function SlipRisk({ title, score, action, values }) {
  const colors = ["#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#10b981"];
  return <div style={{ borderTop: "1px solid #e5e7eb", padding: "12px 0", display: "grid", gridTemplateColumns: "80px 1fr 72px", gap: 12, alignItems: "center" }}>
    <div style={{ width: 58, height: 58, borderRadius: 99, border: `7px solid ${score >= 70 ? "#ef4444" : "#f59e0b"}`, display: "grid", placeItems: "center", color: "#0f172a", fontWeight: 900 }}>{score}</div>
    <div><b style={{ color: "#0f172a" }}>{title}</b><div style={{ color: "#64748b", fontSize: 11, marginTop: 3 }}>Critical-path proximity · long lead in new config · approval-path latency · build-up inventory</div>{values.map((v, i) => <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 34px", gap: 7, alignItems: "center", marginTop: 5 }}><span style={{ height: 6, background: "#e5e7eb", borderRadius: 99, overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${v}%`, background: colors[i], borderRadius: 99 }} /></span><b style={{ fontSize: 11 }}>{v}</b></div>)}</div>
    <button style={{ border: "1px solid #17385f", background: "#17385f", color: "#fff", borderRadius: 6, padding: "7px 8px", fontWeight: 800, fontSize: 11 }}>{action}</button>
  </div>;
}

'''

def main():
    if not TARGET.exists():
        raise SystemExit(f"Could not find {TARGET}. Run this script from the Threadwire repo root.")
    text = TARGET.read_text(encoding='utf-8')
    start = text.find(START)
    if start == -1:
        raise SystemExit('Could not find Digital Thread section marker. Is frontend/src/ThreadWire.jsx from main?')
    end = text.find(END, start)
    if end == -1:
        raise SystemExit('Could not find ROI section marker after Digital Thread section.')
    updated = text[:start] + REPLACEMENT + text[end:]
    TARGET.write_text(updated, encoding='utf-8')
    print('Updated frontend/src/ThreadWire.jsx')
    print('Replaced Digital Thread page with Supply Chain Pegging + ECO Impact sub-tabs.')

if __name__ == '__main__':
    main()

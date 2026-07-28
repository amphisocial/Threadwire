import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Bot, Plus, Play, Save, Trash2, Pause, PlayCircle, Clock, Inbox, X,
  Database, FileText, Boxes, Table2, Globe, GitBranch, Sparkles, UserCheck,
  Flag, CheckCircle2, AlertTriangle, CircleDot, ChevronRight, ArrowLeft,
  Zap, StopCircle, ListChecks, LayoutGrid, ShieldQuestion, CornerDownRight,
  RefreshCw,
} from "lucide-react";
import {
  agentsCatalog, listAgents, getAgent, createAgent, saveAgent, deleteAgent,
  setAgentStatus, runAgent, listAgentRuns, getAgentRun, stopAgentRun,
  agentInbox, resolveInbox,
} from "../lib/api.js";

/* ---------------------------------------------------------------- node kinds */
const NODE_W = 208;
const PORT = { in: 34, out: 34, condTrue: 28, condFalse: 60 };

const NODE_TYPES = {
  trigger: { label: "Trigger", icon: Zap, color: "var(--amber)",
    blurb: "How the agent starts", defaults: { label: "Start", mode: "manual" } },
  source: { label: "Data source", icon: Database, color: "var(--thread)",
    blurb: "Pull in files, entities or tables", defaults: { label: "Load data", sourceType: "table", ref: "", limit: 25, outputKey: "data" } },
  condition: { label: "If / else", icon: GitBranch, color: "var(--yellow)",
    blurb: "Branch on a value", defaults: { label: "Check", left: "data.count", op: ">", right: "0" } },
  web: { label: "Web query", icon: Globe, color: "#2D7C6D",
    blurb: "Fetch external data to merge", defaults: { label: "Fetch web", url: "https://", outputKey: "web" } },
  ai: { label: "AI decision", icon: Sparkles, color: "#7A4BB7",
    blurb: "Let the model decide", defaults: { label: "Decide", prompt: "Given {{data}}, decide…", outputKey: "decision" } },
  assign: { label: "Assign to person", icon: UserCheck, color: "var(--red)",
    blurb: "Human in the loop", defaults: { label: "Assign", assignee: "", kind: "approval", title: "Action required", detail: "", pause: true } },
  output: { label: "Output", icon: Flag, color: "var(--green)",
    blurb: "Final result", defaults: { label: "Done", template: "Agent finished. {{decision}}" } },
};

const STATUS_TONE = {
  active: "var(--green)", paused: "var(--yellow)", draft: "var(--faint)",
  success: "var(--green)", failed: "var(--red)", running: "var(--thread)",
  needs_input: "var(--yellow)", stopped: "var(--faint)",
};

const uid = (p) => p + Math.random().toString(36).slice(2, 8);
const fmt = (iso) => (iso ? new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");

/* ================================================================ studio */
export default function AgentStudio({ user, onBack }) {
  const [agents, setAgents] = useState([]);
  const [catalog, setCatalog] = useState({ documents: [], entities: [], tables: [], people: [] });
  const [selId, setSelId] = useState(null);
  const [draft, setDraft] = useState(null);          // working copy of the selected agent
  const [tab, setTab] = useState("build");           // build | runs | inbox
  const [selNode, setSelNode] = useState(null);
  const [runs, setRuns] = useState([]);
  const [runResult, setRunResult] = useState(null);  // last run's step statuses by node id
  const [inbox, setInbox] = useState({ items: [], openCount: 0 });
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const dirty = useRef(false);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2600); };

  const reloadAgents = useCallback(() => listAgents().then((r) => setAgents(r.agents || [])).catch(() => {}), []);
  const reloadInbox = useCallback(() => agentInbox().then(setInbox).catch(() => {}), []);

  useEffect(() => {
    reloadAgents();
    reloadInbox();
    agentsCatalog().then(setCatalog).catch(() => {});
  }, [reloadAgents, reloadInbox]);

  const open = async (id) => {
    const a = await getAgent(id);
    setSelId(id); setDraft(a); setSelNode(null); setRunResult(null); setTab("build");
    dirty.current = false;
    listAgentRuns(id).then((r) => setRuns(r.runs || [])).catch(() => {});
  };

  const newAgent = async () => {
    const graph = { nodes: [{ id: uid("n_"), type: "trigger", x: 80, y: 120, config: { ...NODE_TYPES.trigger.defaults } }], edges: [] };
    const a = await createAgent({ name: "New agent", description: "", graph, schedule: "manual", status: "draft" });
    await reloadAgents();
    open(a.id);
  };

  const patchGraph = (fn) => {
    setDraft((d) => { const g = fn(structuredClone(d.graph)); dirty.current = true; return { ...d, graph: g }; });
  };
  const setMeta = (k, v) => { setDraft((d) => ({ ...d, [k]: v })); dirty.current = true; };

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      const saved = await saveAgent(draft.id, {
        name: draft.name, description: draft.description, graph: draft.graph,
        schedule: draft.schedule, status: draft.status,
      });
      dirty.current = false;
      setDraft((d) => ({ ...d, updatedAt: saved.updatedAt }));
      await reloadAgents();
      flash("Saved");
    } catch (e) { flash(e.message || "Couldn't save"); }
    setBusy(false);
  };

  const run = async () => {
    if (!draft) return;
    if (dirty.current) await save();
    setBusy(true); setRunResult(null);
    try {
      const res = await runAgent(draft.id);
      const byNode = {};
      (res.log || []).forEach((s) => { byNode[s.node] = s.status; });
      setRunResult({ byNode, summary: res.summary, status: res.status });
      const label = res.status === "needs_input" ? "Waiting on a person — check the Inbox"
        : res.status === "success" ? "Run complete" : res.status === "failed" ? "Run failed" : res.status;
      flash(label);
      listAgentRuns(draft.id).then((r) => setRuns(r.runs || [])).catch(() => {});
      reloadInbox(); reloadAgents();
    } catch (e) { flash(e.message || "Run failed"); }
    setBusy(false);
  };

  const toggleSchedule = async () => {
    const next = draft.status === "active" ? "paused" : "active";
    await setAgentStatus(draft.id, next);
    setMeta("status", next); dirty.current = false;
    reloadAgents();
    flash(next === "active" ? `Scheduled ${draft.schedule}` : "Scheduling paused");
  };

  const removeAgent = async () => {
    if (!draft) return;
    if (!window.confirm(`Delete “${draft.name}”? Its runs and inbox items are removed too.`)) return;
    await deleteAgent(draft.id);
    setSelId(null); setDraft(null);
    reloadAgents(); reloadInbox();
    flash("Agent deleted");
  };

  /* ------------------------------------------------------------- add nodes */
  const addNode = (type, preset = {}) => {
    const id = uid("n_");
    patchGraph((g) => {
      const y = 120 + (g.nodes.length % 5) * 120;
      const x = 320 + Math.floor(g.nodes.length / 5) * 250;
      g.nodes.push({ id, type, x, y, config: { ...NODE_TYPES[type].defaults, ...preset } });
      return g;
    });
    setSelNode(id);
  };

  const addSourceFromCatalog = (sourceType, ref, label) =>
    addNode("source", { sourceType, ref, outputKey: (label || sourceType).toLowerCase().replace(/\W+/g, "_").slice(0, 18) || "data", label });

  return (
    <div className="as-root">
      <StudioCss />
      {/* ---- left rail ---- */}
      <aside className="as-rail">
        <div className="as-rail-head">
          <button className="as-icbtn" title="Back to Operations" onClick={onBack}><ArrowLeft size={16} /></button>
          <div>
            <div className="as-brand"><Bot size={16} color="var(--amber)" /> AI Studio</div>
            <div className="as-sub">Agent builder</div>
          </div>
        </div>

        <button className="as-btn as-btn-primary as-full" onClick={newAgent}><Plus size={15} /> New agent</button>

        <button className={"as-inbox-btn" + (inbox.openCount ? " has" : "")} onClick={() => { setTab("inbox"); reloadInbox(); }}>
          <Inbox size={15} /> Inbox
          {inbox.openCount > 0 && <span className="as-badge">{inbox.openCount}</span>}
        </button>

        <div className="as-rail-label">Your agents</div>
        <div className="as-agent-list as-scroll">
          {agents.length === 0 && <div className="as-empty-mini">No agents yet. Create one to get going.</div>}
          {agents.map((a) => (
            <button key={a.id} className={"as-agent-item" + (a.id === selId ? " sel" : "")} onClick={() => open(a.id)}>
              <span className="as-dot" style={{ background: STATUS_TONE[a.status] }} />
              <span className="as-agent-name">{a.name}</span>
              <span className="as-agent-when">{a.lastRunAt ? fmt(a.lastRunAt) : "never run"}</span>
            </button>
          ))}
        </div>
        <div className="as-rail-foot">{user?.full_name || user?.email}</div>
      </aside>

      {/* ---- main ---- */}
      <main className="as-main">
        {!draft ? (
          <Welcome onNew={newAgent} count={agents.length} />
        ) : (
          <>
            <header className="as-topbar">
              <input className="as-name-input" value={draft.name} onChange={(e) => setMeta("name", e.target.value)} />
              <span className="as-id-chip">{draft.id}</span>
              <div className="as-tabs">
                {[["build", "Build", LayoutGrid], ["runs", "Runs", ListChecks], ["inbox", "Inbox", Inbox]].map(([k, lbl, Ic]) => (
                  <button key={k} className={"as-tab" + (tab === k ? " on" : "")} onClick={() => { setTab(k); if (k === "runs") listAgentRuns(draft.id).then((r) => setRuns(r.runs || [])); if (k === "inbox") reloadInbox(); }}>
                    <Ic size={14} /> {lbl}
                  </button>
                ))}
              </div>
              <div className="as-actions">
                <select className="as-select" value={draft.schedule} onChange={(e) => setMeta("schedule", e.target.value)} title="Schedule cadence">
                  <option value="manual">Manual</option>
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
                <button className="as-btn" onClick={toggleSchedule} title="Turn scheduling on/off" disabled={draft.schedule === "manual"}>
                  {draft.status === "active" ? <><Pause size={14} /> Pause</> : <><PlayCircle size={14} /> Activate</>}
                </button>
                <button className="as-btn" onClick={save} disabled={busy}><Save size={14} /> Save</button>
                <button className="as-btn as-btn-primary" onClick={run} disabled={busy}><Play size={14} /> Run once</button>
                <button className="as-icbtn-danger" onClick={removeAgent} title="Delete agent"><Trash2 size={15} /></button>
              </div>
            </header>

            {tab === "build" && (
              <Builder
                draft={draft} catalog={catalog} selNode={selNode} setSelNode={setSelNode}
                patchGraph={patchGraph} addNode={addNode} addSourceFromCatalog={addSourceFromCatalog}
                runResult={runResult}
              />
            )}
            {tab === "runs" && <RunsView agentId={draft.id} runs={runs} reload={() => listAgentRuns(draft.id).then((r) => setRuns(r.runs || []))} />}
            {tab === "inbox" && <InboxView inbox={inbox} reload={reloadInbox} me={user} />}
          </>
        )}
      </main>

      {toast && <div className="as-toast">{toast}</div>}
    </div>
  );
}

/* ================================================================ builder */
function Builder({ draft, catalog, selNode, setSelNode, patchGraph, addNode, addSourceFromCatalog, runResult }) {
  const graph = draft.graph;
  const canvasRef = useRef(null);
  const [connect, setConnect] = useState(null);   // { from, branch }
  const drag = useRef(null);

  const node = graph.nodes.find((n) => n.id === selNode) || null;

  /* drag nodes */
  useEffect(() => {
    const move = (e) => {
      if (!drag.current || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + canvasRef.current.scrollLeft - drag.current.dx;
      const y = e.clientY - rect.top + canvasRef.current.scrollTop - drag.current.dy;
      patchGraph((g) => {
        const n = g.nodes.find((n) => n.id === drag.current.id);
        if (n) { n.x = Math.max(8, x); n.y = Math.max(8, y); }
        return g;
      });
    };
    const up = () => { drag.current = null; };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [patchGraph]);

  const startDrag = (e, n) => {
    if (e.target.closest(".as-port")) return;
    const rect = canvasRef.current.getBoundingClientRect();
    drag.current = { id: n.id, dx: e.clientX - rect.left + canvasRef.current.scrollLeft - n.x, dy: e.clientY - rect.top + canvasRef.current.scrollTop - n.y };
    setSelNode(n.id);
  };

  const clickOut = (nodeId, branch) => setConnect({ from: nodeId, branch });
  const clickIn = (nodeId) => {
    if (!connect || connect.from === nodeId) { setConnect(null); return; }
    patchGraph((g) => {
      g.edges = g.edges.filter((e) => !(e.from === connect.from && e.to === nodeId && (e.branch || null) === (connect.branch || null)));
      g.edges.push({ id: uid("e_"), from: connect.from, to: nodeId, ...(connect.branch ? { branch: connect.branch } : {}) });
      return g;
    });
    setConnect(null);
  };

  const removeNode = (id) => {
    patchGraph((g) => { g.nodes = g.nodes.filter((n) => n.id !== id); g.edges = g.edges.filter((e) => e.from !== id && e.to !== id); return g; });
    if (selNode === id) setSelNode(null);
  };
  const removeEdge = (id) => patchGraph((g) => { g.edges = g.edges.filter((e) => e.id !== id); return g; });

  const portPos = (n, side, branch) => {
    if (side === "in") return { x: n.x, y: n.y + PORT.in };
    if (n.type === "condition") return { x: n.x + NODE_W, y: n.y + (branch === "false" ? PORT.condFalse : PORT.condTrue) };
    return { x: n.x + NODE_W, y: n.y + PORT.out };
  };

  return (
    <div className="as-build">
      {/* palette */}
      <div className="as-palette as-scroll">
        <div className="as-pal-label">Steps</div>
        {Object.entries(NODE_TYPES).map(([k, m]) => {
          const Ic = m.icon;
          return (
            <button key={k} className="as-pal-item" onClick={() => addNode(k)} title={m.blurb}>
              <span className="as-pal-ic" style={{ background: m.color }}><Ic size={14} color="#fff" /></span>
              <span><span className="as-pal-name">{m.label}</span><span className="as-pal-blurb">{m.blurb}</span></span>
              <Plus size={13} className="as-pal-add" />
            </button>
          );
        })}

        <div className="as-pal-label">Your data</div>
        <DataGroup icon={Table2} title="Tables" items={catalog.tables.map((t) => ({ key: t.table, label: t.label, meta: `${t.rows} rows` }))}
          onPick={(it) => addSourceFromCatalog("table", it.key, it.label)} />
        <DataGroup icon={FileText} title="Uploaded files" items={catalog.documents.map((d) => ({ key: d.id, label: d.title, meta: d.docType }))}
          onPick={(it) => addSourceFromCatalog("document", it.key, it.label)} />
        <DataGroup icon={Boxes} title="Entities" items={catalog.entities.map((e) => ({ key: e.key, label: e.label, meta: e.sourceKind }))}
          onPick={(it) => addSourceFromCatalog("entity", it.key, it.label)} />
      </div>

      {/* canvas */}
      <div className="as-canvas as-scroll tf-grid-bg" ref={canvasRef} onClick={(e) => { if (e.target === e.currentTarget) { setSelNode(null); setConnect(null); } }}>
        <svg className="as-wires">
          {graph.edges.map((e) => {
            const a = graph.nodes.find((n) => n.id === e.from), b = graph.nodes.find((n) => n.id === e.to);
            if (!a || !b) return null;
            const p1 = portPos(a, "out", e.branch), p2 = portPos(b, "in");
            const d = `M ${p1.x} ${p1.y} C ${p1.x + 60} ${p1.y}, ${p2.x - 60} ${p2.y}, ${p2.x} ${p2.y}`;
            const stroke = e.branch === "true" ? "var(--green)" : e.branch === "false" ? "var(--red)" : "var(--line2)";
            return (
              <g key={e.id} className="as-wire" onClick={() => removeEdge(e.id)}>
                <path d={d} fill="none" stroke={stroke} strokeWidth="2" />
                <path d={d} fill="none" stroke="transparent" strokeWidth="12" />
                {e.branch && <text x={(p1.x + p2.x) / 2} y={(p1.y + p2.y) / 2 - 6} className="as-wire-tag" fill={stroke}>{e.branch}</text>}
              </g>
            );
          })}
        </svg>

        {graph.nodes.map((n) => (
          <NodeCard
            key={n.id} n={n} selected={selNode === n.id} runStatus={runResult?.byNode?.[n.id]}
            onDown={(e) => startDrag(e, n)} onSelect={() => setSelNode(n.id)} onDelete={() => removeNode(n.id)}
            connect={connect} onOut={clickOut} onIn={clickIn}
          />
        ))}

        {graph.nodes.length <= 1 && (
          <div className="as-canvas-hint"><CornerDownRight size={15} /> Add steps from the left, then drag from a step's right dot to another step's left dot to connect them.</div>
        )}
      </div>

      {/* config */}
      <div className="as-config as-scroll">
        {node ? <NodeConfig node={node} catalog={catalog} patchGraph={patchGraph} /> : <ConfigEmpty draft={draft} setDesc={(v) => patchGraph} />}
      </div>
    </div>
  );
}

function DataGroup({ icon: Ic, title, items, onPick }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="as-dgroup">
      <button className="as-dgroup-head" onClick={() => setOpen((o) => !o)}>
        <Ic size={13} /> {title} <span className="as-dgroup-n">{items.length}</span>
        <ChevronRight size={13} style={{ marginLeft: "auto", transform: open ? "rotate(90deg)" : "none", transition: ".15s" }} />
      </button>
      {open && (
        <div className="as-dgroup-body">
          {items.length === 0 && <div className="as-dgroup-empty">Nothing here yet</div>}
          {items.map((it) => (
            <button key={it.key} className="as-data-item" onClick={() => onPick(it)} title={`Add as a data source`}>
              <span className="as-data-name">{it.label}</span>
              <span className="as-data-meta">{it.meta}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- node card */
function NodeCard({ n, selected, runStatus, onDown, onSelect, onDelete, connect, onOut, onIn }) {
  const meta = NODE_TYPES[n.type] || NODE_TYPES.output;
  const Ic = meta.icon;
  const title = n.config?.label || meta.label;
  const sub = nodeSubtitle(n);
  const runTone = runStatus === "ok" ? "var(--green)" : runStatus === "error" ? "var(--red)"
    : runStatus === "warn" ? "var(--yellow)" : null;
  return (
    <div className={"as-node" + (selected ? " sel" : "")} style={{ left: n.x, top: n.y, width: NODE_W, borderColor: selected ? meta.color : "var(--line2)" }}
      onMouseDown={onDown} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
      <div className="as-node-head" style={{ background: meta.color }}>
        <Ic size={13} color="#fff" />
        <span className="as-node-type">{meta.label}</span>
        {runTone && <span className="as-run-pip" style={{ background: runTone }} title={runStatus} />}
        <button className="as-node-x" onClick={(e) => { e.stopPropagation(); onDelete(); }}><X size={12} /></button>
      </div>
      <div className="as-node-body">
        <div className="as-node-title">{title}</div>
        {sub && <div className="as-node-sub">{sub}</div>}
      </div>

      {/* input port (all but trigger) */}
      {n.type !== "trigger" && (
        <button className={"as-port as-port-in" + (connect ? " live" : "")} style={{ top: PORT.in - 6 }}
          onClick={(e) => { e.stopPropagation(); onIn(n.id); }} title="Input" />
      )}
      {/* output ports */}
      {n.type === "condition" ? (
        <>
          <button className="as-port as-port-out true" style={{ top: PORT.condTrue - 6 }} onClick={(e) => { e.stopPropagation(); onOut(n.id, "true"); }} title="If true" />
          <span className="as-port-lbl" style={{ top: PORT.condTrue - 8, color: "var(--green)" }}>T</span>
          <button className="as-port as-port-out false" style={{ top: PORT.condFalse - 6 }} onClick={(e) => { e.stopPropagation(); onOut(n.id, "false"); }} title="If false" />
          <span className="as-port-lbl" style={{ top: PORT.condFalse - 8, color: "var(--red)" }}>F</span>
        </>
      ) : n.type !== "output" ? (
        <button className={"as-port as-port-out" + (connect?.from === n.id ? " active" : "")} style={{ top: PORT.out - 6 }} onClick={(e) => { e.stopPropagation(); onOut(n.id, null); }} title="Output" />
      ) : null}
    </div>
  );
}

function nodeSubtitle(n) {
  const c = n.config || {};
  if (n.type === "trigger") return c.mode === "schedule" ? "On schedule" : "Run manually";
  if (n.type === "source") return `${c.sourceType} → ${c.outputKey || "data"}`;
  if (n.type === "condition") return `${c.left} ${c.op} ${c.right}`;
  if (n.type === "web") return (c.url || "").replace(/^https?:\/\//, "").slice(0, 26);
  if (n.type === "ai") return (c.prompt || "").slice(0, 34);
  if (n.type === "assign") return `${c.kind} → ${c.assignee || "unassigned"}`;
  if (n.type === "output") return "Final summary";
  return "";
}

/* ---------------------------------------------------------------- config */
function NodeConfig({ node, catalog, patchGraph }) {
  const meta = NODE_TYPES[node.type];
  const set = (k, v) => patchGraph((g) => { const n = g.nodes.find((x) => x.id === node.id); if (n) n.config[k] = v; return g; });
  const c = node.config || {};
  const Ic = meta.icon;
  return (
    <div className="as-cfg">
      <div className="as-cfg-head"><span className="as-pal-ic" style={{ background: meta.color }}><Ic size={13} color="#fff" /></span>{meta.label}</div>
      <label className="as-field"><span>Step name</span>
        <input className="as-input" value={c.label || ""} onChange={(e) => set("label", e.target.value)} />
      </label>

      {node.type === "trigger" && (
        <label className="as-field"><span>Start when</span>
          <select className="as-input" value={c.mode} onChange={(e) => set("mode", e.target.value)}>
            <option value="manual">I press Run once</option>
            <option value="schedule">On the schedule above</option>
          </select>
        </label>
      )}

      {node.type === "source" && (
        <>
          <label className="as-field"><span>Source type</span>
            <select className="as-input" value={c.sourceType} onChange={(e) => { set("sourceType", e.target.value); set("ref", ""); }}>
              <option value="table">Operational table</option>
              <option value="document">Uploaded file</option>
              <option value="entity">Entity you created</option>
              <option value="web">Web URL</option>
            </select>
          </label>
          {c.sourceType === "web" ? (
            <label className="as-field"><span>URL</span>
              <input className="as-input" value={c.ref || ""} placeholder="https://…" onChange={(e) => set("ref", e.target.value)} />
            </label>
          ) : (
            <label className="as-field"><span>Which one</span>
              <select className="as-input" value={c.ref || ""} onChange={(e) => set("ref", e.target.value)}>
                <option value="">Select…</option>
                {c.sourceType === "table" && catalog.tables.map((t) => <option key={t.table} value={t.table}>{t.label} ({t.rows})</option>)}
                {c.sourceType === "document" && catalog.documents.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
                {c.sourceType === "entity" && catalog.entities.map((e) => <option key={e.key} value={e.key}>{e.label}</option>)}
              </select>
            </label>
          )}
          {(c.sourceType === "table" || c.sourceType === "entity") && (
            <label className="as-field"><span>Row limit</span>
              <input className="as-input" type="number" min="1" max="200" value={c.limit || 25} onChange={(e) => set("limit", Number(e.target.value))} />
            </label>
          )}
          <label className="as-field"><span>Save result as</span>
            <input className="as-input" value={c.outputKey || ""} onChange={(e) => set("outputKey", e.target.value.replace(/\W+/g, "_"))} />
            <span className="as-hint">Reference later with {"{{" + (c.outputKey || "data") + "}}"}</span>
          </label>
        </>
      )}

      {node.type === "condition" && (
        <>
          <label className="as-field"><span>Left value</span>
            <input className="as-input" value={c.left || ""} onChange={(e) => set("left", e.target.value)} placeholder="data.count" />
            <span className="as-hint">A field path like <code>data.count</code> or <code>{"{{web.status}}"}</code></span>
          </label>
          <label className="as-field"><span>Operator</span>
            <select className="as-input" value={c.op} onChange={(e) => set("op", e.target.value)}>
              {[["=", "equals"], ["!=", "not equal"], [">", "greater than"], ["<", "less than"], ["contains", "contains"], ["not_empty", "is not empty"], ["empty", "is empty"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          {c.op !== "empty" && c.op !== "not_empty" && (
            <label className="as-field"><span>Right value</span>
              <input className="as-input" value={c.right || ""} onChange={(e) => set("right", e.target.value)} />
            </label>
          )}
          <div className="as-hint as-branchnote"><span style={{ color: "var(--green)" }}>T</span> wire runs when true · <span style={{ color: "var(--red)" }}>F</span> wire runs when false</div>
        </>
      )}

      {node.type === "web" && (
        <>
          <label className="as-field"><span>URL</span>
            <input className="as-input" value={c.url || ""} onChange={(e) => set("url", e.target.value)} placeholder="https://api.example.com/…" />
            <span className="as-hint">Supports {"{{placeholders}}"}. Only public http(s) endpoints.</span>
          </label>
          <label className="as-field"><span>Save result as</span>
            <input className="as-input" value={c.outputKey || ""} onChange={(e) => set("outputKey", e.target.value.replace(/\W+/g, "_"))} />
          </label>
        </>
      )}

      {node.type === "ai" && (
        <>
          <label className="as-field"><span>Instruction</span>
            <textarea className="as-input as-textarea" rows={5} value={c.prompt || ""} onChange={(e) => set("prompt", e.target.value)} />
            <span className="as-hint">Insert data with {"{{data}}"}. Ask for one clear decision to branch on.</span>
          </label>
          <label className="as-field"><span>Save answer as</span>
            <input className="as-input" value={c.outputKey || ""} onChange={(e) => set("outputKey", e.target.value.replace(/\W+/g, "_"))} />
          </label>
        </>
      )}

      {node.type === "assign" && (
        <>
          <label className="as-field"><span>Item type</span>
            <select className="as-input" value={c.kind} onChange={(e) => set("kind", e.target.value)}>
              <option value="approval">Approval (gates the run)</option>
              <option value="action">Action item</option>
              <option value="blocker">Blocker</option>
              <option value="review">Review</option>
            </select>
          </label>
          <label className="as-field"><span>Assign to</span>
            <select className="as-input" value={c.assignee || ""} onChange={(e) => set("assignee", e.target.value)}>
              <option value="">Anyone in the org</option>
              {catalog.people.map((p) => <option key={p.email} value={p.email}>{p.name}</option>)}
            </select>
          </label>
          <label className="as-field"><span>Title</span>
            <input className="as-input" value={c.title || ""} onChange={(e) => set("title", e.target.value)} />
          </label>
          <label className="as-field"><span>Details</span>
            <textarea className="as-input as-textarea" rows={3} value={c.detail || ""} onChange={(e) => set("detail", e.target.value)} placeholder="Supports {{placeholders}}" />
          </label>
          <label className="as-check">
            <input type="checkbox" checked={!!c.pause} onChange={(e) => set("pause", e.target.checked)} />
            <span>Pause the run until this person responds</span>
          </label>
        </>
      )}

      {node.type === "output" && (
        <label className="as-field"><span>Summary template</span>
          <textarea className="as-input as-textarea" rows={4} value={c.template || ""} onChange={(e) => set("template", e.target.value)} />
          <span className="as-hint">This text (with {"{{placeholders}}"} filled in) becomes the run summary.</span>
        </label>
      )}
    </div>
  );
}

function ConfigEmpty({ draft }) {
  return (
    <div className="as-cfg-empty">
      <ShieldQuestion size={22} color="var(--faint)" />
      <p>Select a step to configure it, or add one from the left.</p>
      <div className="as-cfg-legend">
        <div><span className="as-lg" style={{ background: "var(--amber)" }} /> Trigger — how it starts</div>
        <div><span className="as-lg" style={{ background: "var(--thread)" }} /> Data source — files, entities, tables</div>
        <div><span className="as-lg" style={{ background: "var(--yellow)" }} /> If / else — branch on a value</div>
        <div><span className="as-lg" style={{ background: "#2D7C6D" }} /> Web query — pull external data</div>
        <div><span className="as-lg" style={{ background: "#7A4BB7" }} /> AI decision — let the model choose</div>
        <div><span className="as-lg" style={{ background: "var(--red)" }} /> Assign — human in the loop</div>
        <div><span className="as-lg" style={{ background: "var(--green)" }} /> Output — the result</div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- runs */
function RunsView({ runs, reload }) {
  const [open, setOpen] = useState(null);
  const [detail, setDetail] = useState(null);
  const expand = async (id) => {
    if (open === id) { setOpen(null); return; }
    setOpen(id);
    const d = await getAgentRun(id);
    setDetail(d);
  };
  const stop = async (id) => { await stopAgentRun(id); reload(); };
  return (
    <div className="as-runs as-scroll">
      <div className="as-runs-head">
        <h3>Run history & audit</h3>
        <button className="as-btn" onClick={reload}><RefreshCw size={13} /> Refresh</button>
      </div>
      {runs.length === 0 && <div className="as-empty">No runs yet. Press <b>Run once</b> to try the agent.</div>}
      {runs.map((r) => (
        <div key={r.id} className="as-run">
          <button className="as-run-row" onClick={() => expand(r.id)}>
            <span className="as-dot" style={{ background: STATUS_TONE[r.status] }} />
            <span className="as-run-status">{r.status.replace("_", " ")}</span>
            <span className="as-run-trigger">{r.trigger}</span>
            <span className="as-run-summary">{r.summary || "—"}</span>
            <span className="as-run-when">{fmt(r.startedAt)}</span>
            {(r.status === "running" || r.status === "needs_input") && (
              <span className="as-run-stop" onClick={(e) => { e.stopPropagation(); stop(r.id); }} title="Stop this run"><StopCircle size={15} /></span>
            )}
            <ChevronRight size={14} style={{ transform: open === r.id ? "rotate(90deg)" : "none", transition: ".15s" }} />
          </button>
          {open === r.id && detail && detail.id === r.id && (
            <div className="as-run-log">
              {(detail.log || []).map((s, i) => (
                <div key={i} className="as-log-step">
                  <span className="as-dot" style={{ background: s.status === "ok" ? "var(--green)" : s.status === "error" ? "var(--red)" : s.status === "warn" ? "var(--yellow)" : "var(--faint)" }} />
                  <span className="as-log-type">{s.type}</span>
                  <span className="as-log-detail">{s.detail}</span>
                  <span className="as-log-at">{s.at ? new Date(s.at).toLocaleTimeString() : ""}</span>
                </div>
              ))}
              {(detail.log || []).length === 0 && <div className="as-empty-mini">No steps recorded.</div>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- inbox */
function InboxView({ inbox, reload, me }) {
  const [busyId, setBusyId] = useState(null);
  const act = async (id, status, decision) => {
    setBusyId(id);
    try { await resolveInbox(id, { status, decision }); await reload(); } catch { /* noop */ }
    setBusyId(null);
  };
  const items = inbox.items || [];
  const open = items.filter((i) => i.status === "open");
  const done = items.filter((i) => i.status !== "open");
  const kindIcon = { approval: ShieldQuestion, action: ListChecks, blocker: Flag, review: CheckCircle2 };
  const row = (it) => {
    const Ic = kindIcon[it.kind] || ListChecks;
    return (
      <div key={it.id} className={"as-inbox-item k-" + it.kind}>
        <div className="as-inbox-ic"><Ic size={15} /></div>
        <div className="as-inbox-main">
          <div className="as-inbox-title">{it.title}</div>
          {it.detail && <div className="as-inbox-detail">{it.detail}</div>}
          <div className="as-inbox-meta">
            <span className="as-chip">{it.kind}</span>
            <span>{it.agentId}</span>
            <span>· for {it.assignee || "anyone"}</span>
            <span>· {fmt(it.createdAt)}</span>
            {it.status !== "open" && <span className="as-resolved">{it.decision || it.status} · {it.resolvedBy}</span>}
          </div>
        </div>
        {it.status === "open" && (
          <div className="as-inbox-actions">
            {it.kind === "approval" ? (
              <>
                <button className="as-btn as-btn-primary" disabled={busyId === it.id} onClick={() => act(it.id, "done", "approve")}>Approve</button>
                <button className="as-btn" disabled={busyId === it.id} onClick={() => act(it.id, "done", "reject")}>Reject</button>
              </>
            ) : (
              <>
                <button className="as-btn as-btn-primary" disabled={busyId === it.id} onClick={() => act(it.id, "done", "")}>Mark done</button>
                <button className="as-btn" disabled={busyId === it.id} onClick={() => act(it.id, "dismissed", "")}>Dismiss</button>
              </>
            )}
          </div>
        )}
      </div>
    );
  };
  return (
    <div className="as-inbox as-scroll">
      <div className="as-runs-head">
        <h3>Inbox — items agents assigned to people</h3>
        <button className="as-btn" onClick={reload}><RefreshCw size={13} /> Refresh</button>
      </div>
      {open.length === 0 && <div className="as-empty">Nothing needs a person right now.</div>}
      {open.map(row)}
      {done.length > 0 && <div className="as-inbox-divider">Resolved</div>}
      {done.map(row)}
    </div>
  );
}

/* ---------------------------------------------------------------- welcome */
function Welcome({ onNew, count }) {
  return (
    <div className="as-welcome">
      <div className="as-welcome-card">
        <div className="as-welcome-ic"><Bot size={26} color="var(--amber)" /></div>
        <h2>Build an agent</h2>
        <p>Compose a workflow from your own files, entities and tables. Add if/else branches, query the web to merge in data, let AI decide, and put a person in the loop for approvals. Every run is audited, and assignments land in the Inbox.</p>
        <button className="as-btn as-btn-primary" onClick={onNew}><Plus size={15} /> New agent</button>
        {count > 0 && <div className="as-welcome-hint">…or pick one of your {count} agent{count > 1 ? "s" : ""} on the left.</div>}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- styles */
function StudioCss() {
  return (
    <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
    .as-root{position:fixed;inset:0;z-index:60;display:flex;background:var(--bg);color:var(--ink);
      font-family:var(--body);--r:12px;
      /* self-contained tokens — Studio can render while ThreadWire (.tf) is unmounted */
      --bg:#F4F6FA; --bg2:#EEF2F7; --panel:#FFFFFF; --panel2:#F5F8FC;
      --line:#DCE3EC; --line2:#C6D2E0;
      --ink:#15222D; --muted:#47606F; --faint:#8093A0; --inset:#EEF2F7;
      --amber:#2A46C4; --amber-d:#1B2E8C;
      --thread:#3E6FE0; --thread-d:#1B2E8C;
      --green:#12784E; --red:#AC3247; --yellow:#B27C12; --blue:#2A46C4;
      --disp:'Bricolage Grotesque',sans-serif;
      --body:'Inter',sans-serif;
      --mono:'IBM Plex Mono',monospace}
    .as-root *{box-sizing:border-box}
    .as-scroll{overflow:auto}.as-scroll::-webkit-scrollbar{width:9px;height:9px}
    .as-scroll::-webkit-scrollbar-thumb{background:var(--line2);border-radius:8px}
    /* rail */
    .as-rail{width:240px;flex:0 0 240px;background:var(--panel);border-right:1px solid var(--line);
      display:flex;flex-direction:column;padding:14px;gap:10px}
    .as-rail-head{display:flex;gap:10px;align-items:center}
    .as-brand{font-family:var(--disp);font-weight:700;font-size:16px;display:flex;gap:7px;align-items:center;letter-spacing:-.01em}
    .as-sub{font-family:var(--mono);font-size:10.5px;color:var(--faint);letter-spacing:.14em;text-transform:uppercase}
    .as-icbtn,.as-icbtn-danger,.as-icbtn-danger{background:var(--panel2);border:1px solid var(--line2);border-radius:9px;
      width:30px;height:30px;display:grid;place-items:center;cursor:pointer;color:var(--muted)}
    .as-icbtn:hover{color:var(--amber);border-color:var(--amber)}
    .as-icbtn-danger:hover{color:var(--red);border-color:var(--red)}
    .as-full{width:100%;justify-content:center}
    .as-inbox-btn{display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:10px;border:1px solid var(--line2);
      background:var(--panel2);color:var(--muted);font-family:var(--mono);font-size:12.5px;cursor:pointer;position:relative}
    .as-inbox-btn.has{color:var(--ink);border-color:var(--yellow)}
    .as-badge{margin-left:auto;background:var(--red);color:#fff;border-radius:999px;font-size:11px;font-weight:700;padding:1px 7px}
    .as-rail-label,.as-pal-label{font-family:var(--mono);font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--faint);margin-top:6px}
    .as-agent-list{flex:1;display:flex;flex-direction:column;gap:4px;margin:-2px -4px;padding:2px 4px}
    .as-agent-item{display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:10px;border:1px solid transparent;
      background:transparent;cursor:pointer;text-align:left;width:100%;color:var(--ink)}
    .as-agent-item:hover{background:var(--panel2)}
    .as-agent-item.sel{background:var(--panel2);border-color:var(--line2)}
    .as-dot{width:8px;height:8px;border-radius:50%;flex:0 0 8px}
    .as-agent-name{font-size:13px;font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .as-agent-when{font-family:var(--mono);font-size:10px;color:var(--faint)}
    .as-empty-mini{font-size:12px;color:var(--faint);padding:8px 4px}
    .as-rail-foot{font-family:var(--mono);font-size:10.5px;color:var(--faint);border-top:1px solid var(--line);padding-top:9px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    /* buttons */
    .as-btn{display:inline-flex;align-items:center;gap:6px;font-family:var(--mono);font-size:12.5px;font-weight:600;
      border-radius:9px;padding:8px 12px;border:1px solid var(--line2);background:var(--panel);color:var(--ink);cursor:pointer;transition:.15s;white-space:nowrap}
    .as-btn:hover{border-color:var(--amber);color:var(--amber)}
    .as-btn:disabled{opacity:.5;cursor:default}
    .as-btn-primary{background:linear-gradient(180deg,var(--amber),var(--amber-d));border-color:transparent;color:#fff}
    .as-btn-primary:hover{color:#fff;filter:brightness(1.05)}
    /* main */
    .as-main{flex:1;display:flex;flex-direction:column;min-width:0}
    .as-topbar{display:flex;align-items:center;gap:10px;padding:11px 16px;border-bottom:1px solid var(--line);background:var(--panel);flex-wrap:wrap}
    .as-name-input{font-family:var(--disp);font-weight:700;font-size:17px;border:1px solid transparent;background:transparent;
      color:var(--ink);border-radius:8px;padding:4px 8px;min-width:120px;max-width:260px}
    .as-name-input:hover{border-color:var(--line2)}.as-name-input:focus{border-color:var(--amber);outline:none;background:var(--panel2)}
    .as-id-chip{font-family:var(--mono);font-size:10px;color:var(--faint);border:1px solid var(--line2);border-radius:999px;padding:2px 8px}
    .as-tabs{display:flex;gap:3px;margin-left:6px;background:var(--panel2);border:1px solid var(--line2);border-radius:10px;padding:3px}
    .as-tab{display:flex;align-items:center;gap:6px;font-family:var(--mono);font-size:12px;border:0;background:transparent;
      color:var(--muted);padding:6px 11px;border-radius:8px;cursor:pointer}
    .as-tab.on{background:var(--panel);color:var(--ink);box-shadow:0 1px 3px rgba(21,34,45,.08)}
    .as-actions{display:flex;align-items:center;gap:7px;margin-left:auto;flex-wrap:wrap}
    .as-select,.as-input{font-family:var(--mono);font-size:12.5px;border:1px solid var(--line2);border-radius:9px;padding:8px 10px;background:var(--panel);color:var(--ink);width:100%}
    .as-select{width:auto}
    .as-input:focus,.as-select:focus{border-color:var(--amber);outline:none}
    /* build layout */
    .as-build{flex:1;display:grid;grid-template-columns:224px 1fr 300px;min-height:0}
    .as-palette{border-right:1px solid var(--line);background:var(--panel);padding:12px;display:flex;flex-direction:column;gap:6px}
    .as-pal-item{display:flex;align-items:center;gap:9px;padding:8px;border-radius:10px;border:1px solid var(--line);background:var(--panel);cursor:pointer;text-align:left}
    .as-pal-item:hover{border-color:var(--amber);background:var(--panel2)}
    .as-pal-ic{width:26px;height:26px;border-radius:8px;display:grid;place-items:center;flex:0 0 26px}
    .as-pal-name{display:block;font-size:12.5px;font-weight:600}
    .as-pal-blurb{display:block;font-size:10.5px;color:var(--faint)}
    .as-pal-add{margin-left:auto;color:var(--faint)}
    .as-dgroup{border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--panel)}
    .as-dgroup-head{width:100%;display:flex;align-items:center;gap:7px;padding:8px 10px;background:var(--panel2);border:0;
      font-family:var(--mono);font-size:11.5px;color:var(--muted);cursor:pointer}
    .as-dgroup-n{background:var(--line2);color:var(--ink);border-radius:999px;font-size:10px;padding:0 6px}
    .as-dgroup-body{padding:4px;display:flex;flex-direction:column;gap:2px;max-height:180px;overflow:auto}
    .as-dgroup-empty{font-size:11px;color:var(--faint);padding:6px}
    .as-data-item{display:flex;flex-direction:column;padding:6px 8px;border-radius:7px;border:0;background:transparent;cursor:pointer;text-align:left}
    .as-data-item:hover{background:var(--panel2)}
    .as-data-name{font-size:12px;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .as-data-meta{font-family:var(--mono);font-size:9.5px;color:var(--faint)}
    /* canvas */
    .as-canvas{position:relative;overflow:auto;min-height:0;background:var(--bg2)}
    .as-wires{position:absolute;inset:0;width:2600px;height:1600px;pointer-events:none}
    .as-wire{pointer-events:stroke;cursor:pointer}
    .as-wire:hover path:first-child{stroke:var(--amber)!important}
    .as-wire-tag{font:600 10px var(--mono);pointer-events:none}
    .as-node{position:absolute;background:var(--panel);border:1px solid var(--line2);border-radius:12px;
      box-shadow:0 2px 8px rgba(21,34,45,.08);user-select:none;cursor:grab}
    .as-node.sel{box-shadow:0 8px 26px -10px rgba(42,70,196,.5)}
    .as-node-head{display:flex;align-items:center;gap:6px;padding:6px 9px;border-radius:11px 11px 0 0;color:#fff}
    .as-node-type{font-family:var(--mono);font-size:10.5px;font-weight:600;letter-spacing:.03em}
    .as-run-pip{width:8px;height:8px;border-radius:50%;margin-left:2px;box-shadow:0 0 0 2px rgba(255,255,255,.5)}
    .as-node-x{margin-left:auto;background:rgba(255,255,255,.2);border:0;color:#fff;border-radius:6px;width:18px;height:18px;display:grid;place-items:center;cursor:pointer}
    .as-node-x:hover{background:rgba(255,255,255,.38)}
    .as-node-body{padding:8px 10px 10px}
    .as-node-title{font-size:12.5px;font-weight:600;color:var(--ink)}
    .as-node-sub{font-family:var(--mono);font-size:10px;color:var(--faint);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .as-port{position:absolute;width:13px;height:13px;border-radius:50%;background:var(--panel);border:2px solid var(--line2);cursor:crosshair;padding:0}
    .as-port-in{left:-7px}.as-port-out{right:-7px}
    .as-port-in.live{border-color:var(--amber);box-shadow:0 0 0 3px rgba(42,70,196,.18)}
    .as-port-out:hover,.as-port-out.active{border-color:var(--amber);background:var(--amber)}
    .as-port-out.true{border-color:var(--green)}.as-port-out.false{border-color:var(--red)}
    .as-port-lbl{position:absolute;right:8px;font:700 9px var(--mono)}
    .as-canvas-hint{position:absolute;left:50%;top:30px;transform:translateX(-50%);display:flex;gap:7px;align-items:center;
      background:var(--panel);border:1px dashed var(--line2);border-radius:999px;padding:7px 14px;font-size:12px;color:var(--muted);max-width:520px}
    /* config */
    .as-config{border-left:1px solid var(--line);background:var(--panel);padding:14px}
    .as-cfg-head{display:flex;align-items:center;gap:8px;font-family:var(--disp);font-weight:700;font-size:14px;margin-bottom:12px}
    .as-field{display:flex;flex-direction:column;gap:5px;margin-bottom:12px}
    .as-field>span:first-child{font-family:var(--mono);font-size:11px;color:var(--muted);letter-spacing:.02em}
    .as-textarea{resize:vertical;line-height:1.5;font-family:var(--mono)}
    .as-hint{font-size:10.5px;color:var(--faint);line-height:1.4}
    .as-hint code{background:var(--panel2);border:1px solid var(--line2);border-radius:4px;padding:0 4px;font-size:10px}
    .as-branchnote{margin-top:2px}.as-branchnote span{font-weight:700}
    .as-check{display:flex;align-items:flex-start;gap:8px;font-size:12px;color:var(--muted);cursor:pointer}
    .as-check input{margin-top:2px}
    .as-cfg-empty{color:var(--muted);font-size:13px;display:flex;flex-direction:column;gap:10px}
    .as-cfg-empty p{margin:0}
    .as-cfg-legend{display:flex;flex-direction:column;gap:6px;font-size:11.5px;color:var(--muted);border-top:1px solid var(--line);padding-top:10px}
    .as-cfg-legend div{display:flex;align-items:center;gap:8px}
    .as-lg{width:10px;height:10px;border-radius:3px;flex:0 0 10px}
    /* runs + inbox */
    .as-runs,.as-inbox{flex:1;padding:18px 22px;min-height:0}
    .as-runs-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
    .as-runs-head h3{font-family:var(--disp);font-size:16px;margin:0}
    .as-empty{color:var(--faint);font-size:13px;padding:22px;text-align:center;border:1px dashed var(--line2);border-radius:12px}
    .as-run{border:1px solid var(--line);border-radius:11px;margin-bottom:8px;overflow:hidden;background:var(--panel)}
    .as-run-row{width:100%;display:flex;align-items:center;gap:11px;padding:11px 13px;background:transparent;border:0;cursor:pointer;text-align:left}
    .as-run-row:hover{background:var(--panel2)}
    .as-run-status{font-family:var(--mono);font-size:11.5px;font-weight:600;text-transform:capitalize;min-width:78px}
    .as-run-trigger{font-family:var(--mono);font-size:10.5px;color:var(--faint);min-width:60px}
    .as-run-summary{flex:1;font-size:12.5px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .as-run-when{font-family:var(--mono);font-size:10.5px;color:var(--faint)}
    .as-run-stop{color:var(--red);display:grid;place-items:center}
    .as-run-log{border-top:1px solid var(--line);padding:8px 13px;background:var(--panel2);display:flex;flex-direction:column;gap:5px}
    .as-log-step{display:flex;align-items:center;gap:9px;font-size:12px}
    .as-log-type{font-family:var(--mono);font-size:10.5px;color:var(--muted);min-width:70px}
    .as-log-detail{flex:1;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .as-log-at{font-family:var(--mono);font-size:10px;color:var(--faint)}
    .as-inbox-item{display:flex;gap:12px;align-items:flex-start;border:1px solid var(--line);border-left:3px solid var(--line2);
      border-radius:11px;padding:12px 14px;margin-bottom:8px;background:var(--panel)}
    .as-inbox-item.k-approval{border-left-color:var(--yellow)}
    .as-inbox-item.k-blocker{border-left-color:var(--red)}
    .as-inbox-item.k-action{border-left-color:var(--thread)}
    .as-inbox-item.k-review{border-left-color:var(--green)}
    .as-inbox-ic{color:var(--muted);margin-top:1px}
    .as-inbox-main{flex:1;min-width:0}
    .as-inbox-title{font-size:13.5px;font-weight:600}
    .as-inbox-detail{font-size:12px;color:var(--muted);margin-top:2px}
    .as-inbox-meta{display:flex;gap:7px;flex-wrap:wrap;align-items:center;font-family:var(--mono);font-size:10.5px;color:var(--faint);margin-top:6px}
    .as-chip{background:var(--panel2);border:1px solid var(--line2);border-radius:999px;padding:1px 8px;color:var(--muted)}
    .as-resolved{color:var(--green)}
    .as-inbox-actions{display:flex;gap:6px;flex:0 0 auto}
    .as-inbox-divider{font-family:var(--mono);font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--faint);margin:16px 0 8px}
    /* welcome */
    .as-welcome{flex:1;display:grid;place-items:center;padding:24px}
    .as-welcome-card{max-width:460px;text-align:center;background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:32px}
    .as-welcome-ic{width:56px;height:56px;border-radius:16px;background:var(--panel2);border:1px solid var(--line2);display:grid;place-items:center;margin:0 auto 14px}
    .as-welcome-card h2{font-family:var(--disp);font-size:22px;margin:0 0 8px}
    .as-welcome-card p{font-size:13.5px;color:var(--muted);line-height:1.6;margin:0 0 18px}
    .as-welcome-hint{margin-top:12px;font-size:12px;color:var(--faint)}
    /* toast */
    .as-toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);z-index:80;background:var(--ink);color:#fff;
      font-family:var(--mono);font-size:12.5px;padding:10px 18px;border-radius:999px;box-shadow:0 10px 30px rgba(21,34,45,.3)}
    @media(max-width:1080px){.as-build{grid-template-columns:200px 1fr}.as-config{display:none}}
    @media(max-width:720px){.as-rail{display:none}.as-palette{display:none}.as-build{grid-template-columns:1fr}}
    `}</style>
  );
}

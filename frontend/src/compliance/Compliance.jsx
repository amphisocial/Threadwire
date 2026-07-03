import React, { useEffect, useState } from "react";
import { getLots, traceLot, aiTraceLot, searchDocuments, docDownloadUrl } from "../lib/api.js";

const C = {
  bg: "#0a0e15", panel: "#121a26", panel2: "#172132", bg2: "#0d121c",
  line: "#243245", line2: "#2f4259", ink: "#e7eef6", muted: "#8d9fb5", faint: "#5d6f86",
  amber: "#ff8a3d", thread: "#48d6c8", green: "#43c277", red: "#f0563a", blue: "#5aa9ff",
};
const mono = "'IBM Plex Mono',monospace";
const btn = { fontFamily: mono, fontSize: 12.5, fontWeight: 600, borderRadius: 9, padding: "9px 13px", cursor: "pointer", border: `1px solid ${C.line2}`, background: C.panel2, color: C.ink };
const btnP = { ...btn, background: `linear-gradient(180deg,${C.amber},#cc6a26)`, border: "none", color: "#1a0f06" };
const tone = { pass: C.green, released: C.green, closed: C.green, fail: C.red, hold: C.red, quarantine: C.red, open: C.amber, conditional: C.amber };
const Tag = ({ children, t }) => <span style={{ fontFamily: mono, fontSize: 10.5, fontWeight: 700, padding: "2px 7px", borderRadius: 6, color: tone[String(children).toLowerCase()] || C.muted, background: (tone[String(children).toLowerCase()] || C.muted) + "22" }}>{children}</span>;
const Eyebrow = ({ children }) => <div style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: ".2em", textTransform: "uppercase", color: C.amber, margin: "18px 0 8px" }}>{children}</div>;

function Section({ title, count, children }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <Eyebrow>{title}{count != null ? ` (${count})` : ""}</Eyebrow>
      <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden" }}>{children}</div>
    </div>
  );
}

export default function Compliance({ user, onClose }) {
  const [lots, setLots] = useState(null);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState("");
  const [trace, setTrace] = useState(null);
  const [loading, setLoading] = useState(false);
  const [narrative, setNarrative] = useState("");
  const [narrating, setNarrating] = useState(false);
  const [docQ, setDocQ] = useState("");
  const [docHits, setDocHits] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => { getLots().then(setLots).catch(() => setLots([])); }, []);

  const openLot = async (lot) => {
    setSel(lot); setTrace(null); setNarrative(""); setErr(""); setLoading(true);
    try { setTrace(await traceLot(lot)); }
    catch (e) { setErr(e.message || "No trace data for " + lot); }
    finally { setLoading(false); }
  };
  const compile = async () => {
    setNarrating(true); setNarrative("");
    try { const r = await aiTraceLot(sel); setNarrative(r.narrative || "No narrative returned."); }
    catch (e) { setNarrative("Could not compile: " + (e.message || "error")); }
    finally { setNarrating(false); }
  };
  const runDocSearch = async () => {
    if (!docQ.trim()) return;
    try { const r = await searchDocuments(docQ); setDocHits(r.results || []); }
    catch { setDocHits([]); }
  };
  const exportMap = () => {
    if (!trace) return;
    const lines = [];
    const L = trace.lot;
    lines.push("# Trace map — lot " + L.lot_number, "");
    lines.push(`Part: ${L.part_number}   Work order: ${L.work_order || "—"}   Qty: ${L.quantity ?? "—"}`);
    lines.push(`Site: ${L.site || "—"}   Company: ${L.company_ref || "—"}   Mfg date: ${L.mfg_date || "—"}`);
    lines.push(`Status: ${L.status || "—"}   Disposition: ${L.disposition || "—"}`, "");
    if (trace.bom.length) { lines.push("## BOM components"); trace.bom.forEach((b) => lines.push(`- L${b.find_number || "?"} ${b.child_part_number} ×${b.quantity ?? "?"} (${b.child_description || ""}) ref ${b.ref_designators || "—"}`)); lines.push(""); }
    if (trace.inspections.length) { lines.push("## Inspections"); trace.inspections.forEach((i) => lines.push(`- ${i.inspected_at || "—"} ${i.inspection_type} → ${i.result}${i.ncr_number ? " (NCR " + i.ncr_number + ")" : ""} — ${i.inspector}`)); lines.push(""); }
    if (trace.ncrs.length) { lines.push("## NCRs / CAPA"); trace.ncrs.forEach((n) => lines.push(`- ${n.ncr_number} [${n.status}] ${n.description} → ${n.disposition}${n.capa_number ? " / " + n.capa_number : ""}`)); lines.push(""); }
    if (trace.documents.length) { lines.push("## Documents"); trace.documents.forEach((d) => lines.push(`- [${d.doc_type}] ${d.title || d.filename}`)); lines.push(""); }
    if (narrative) lines.push("## Audit narrative", "", narrative);
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "trace_" + sel + ".md"; a.click();
  };

  const filtered = (lots || []).filter((l) => !q || (l.lot_number + " " + l.part_number + " " + l.company_ref).toLowerCase().includes(q.toLowerCase()));

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: "'IBM Plex Sans',sans-serif", padding: "28px 32px" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');`}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 26 }}>Compliance & Traceability</span>
        <button onClick={onClose} style={{ ...btn, marginLeft: "auto" }}>← Back to app</button>
      </div>
      <div style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>{user.org?.legal_name} · lot genealogy, DHR trace maps, and supplier certifications</div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 22, alignItems: "start" }}>
        {/* left: lots + doc search */}
        <div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter lots…"
            style={{ ...btn, width: "100%", boxSizing: "border-box", background: C.bg2, marginBottom: 10, cursor: "text" }} />
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden", maxHeight: 340, overflowY: "auto" }}>
            {lots === null ? <div style={{ padding: 14, color: C.muted, fontSize: 12.5 }}>Loading lots…</div>
              : filtered.length === 0 ? <div style={{ padding: 14, color: C.faint, fontSize: 12.5 }}>No lots. Import Lots in Admin → Data import.</div>
              : filtered.map((l) => (
                <div key={l.lot_number} onClick={() => openLot(l.lot_number)} style={{ padding: "10px 12px", borderBottom: `1px solid ${C.line}`, cursor: "pointer", background: sel === l.lot_number ? C.panel2 : "transparent" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="tf-mono" style={{ fontFamily: mono, fontSize: 13, color: C.thread }}>{l.lot_number}</span>
                    {l.status && <Tag>{l.status}</Tag>}
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 10.5, color: C.faint, marginTop: 2 }}>{l.part_number} · {l.company_ref || "—"} · {l.mfg_date || "—"}</div>
                </div>
              ))}
          </div>

          <Eyebrow>Search documents</Eyebrow>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={docQ} onChange={(e) => setDocQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runDocSearch()} placeholder="e.g. anodize thickness"
              style={{ ...btn, flex: 1, background: C.bg2, cursor: "text" }} />
            <button style={btn} onClick={runDocSearch}>Search</button>
          </div>
          {docHits && (
            <div style={{ marginTop: 10 }}>
              {docHits.length === 0 ? <div style={{ fontSize: 12, color: C.faint }}>No matches.</div>
                : docHits.map((h) => (
                  <a key={h.id} href={docDownloadUrl(h.id)} style={{ display: "block", padding: "9px 11px", background: C.panel, border: `1px solid ${C.line}`, borderRadius: 8, marginBottom: 6, textDecoration: "none", color: C.ink }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{h.title || h.filename} <span style={{ fontFamily: mono, fontSize: 10, color: C.faint }}>· {h.doc_type}</span></div>
                    <div style={{ fontSize: 11.5, color: C.muted }} dangerouslySetInnerHTML={{ __html: h.snippet || "" }} />
                  </a>
                ))}
            </div>
          )}
        </div>

        {/* right: trace map */}
        <div>
          {!sel ? (
            <div style={{ padding: 40, textAlign: "center", color: C.faint, border: `1px dashed ${C.line2}`, borderRadius: 12 }}>Select a lot to compile its trace map.</div>
          ) : loading ? (
            <div style={{ padding: 40, color: C.muted }}>Assembling trace map for {sel}…</div>
          ) : err ? (
            <div style={{ padding: 20, color: C.red }}>{err}</div>
          ) : trace ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 22 }}>Lot {trace.lot.lot_number}</span>
                {trace.lot.status && <Tag>{trace.lot.status}</Tag>}
                <button style={{ ...btnP, marginLeft: "auto" }} onClick={compile} disabled={narrating}>{narrating ? "Compiling…" : "Compile audit narrative"}</button>
                <button style={btn} onClick={exportMap}>Export .md</button>
              </div>
              <div style={{ fontFamily: mono, fontSize: 12, color: C.muted, marginBottom: 6 }}>
                {trace.lot.part_number} · WO {trace.lot.work_order || "—"} · qty {trace.lot.quantity ?? "—"} · {trace.lot.site || "—"} · {trace.lot.company_ref || "—"} · {trace.lot.mfg_date || "—"}
                {trace.lot.disposition ? " · disp: " + trace.lot.disposition : ""}
              </div>

              {narrative && (
                <div style={{ background: "linear-gradient(180deg,#141d2b,#0f1622)", border: `1px solid ${C.thread}44`, borderRadius: 12, padding: 16, margin: "8px 0 4px", whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.55 }}>
                  <div style={{ fontFamily: mono, fontSize: 10, color: C.thread, marginBottom: 6, letterSpacing: ".15em" }}>AI AUDIT NARRATIVE</div>
                  {narrative}
                </div>
              )}

              <Section title="BOM components" count={trace.bom.length}>
                {trace.bom.length === 0 ? <Empty>No BOM on file for {trace.lot.part_number}.</Empty> : trace.bom.map((b, i) => (
                  <Row key={i} last={i === trace.bom.length - 1}>
                    <span style={{ fontFamily: mono, width: 42, color: C.muted }}>L{b.find_number || "?"}</span>
                    <span style={{ flex: 1 }}><span style={{ fontFamily: mono, color: C.green }}>{b.child_part_number}</span>{b.child_description ? <span style={{ color: C.faint }}> · {b.child_description}</span> : null}</span>
                    <span style={{ fontFamily: mono, width: 44, textAlign: "right" }}>×{b.quantity ?? "?"}</span>
                    <span style={{ fontFamily: mono, width: 110, textAlign: "right", color: C.muted, fontSize: 11 }}>{b.ref_designators || "—"}</span>
                  </Row>
                ))}
              </Section>

              <Section title="Inspections" count={trace.inspections.length}>
                {trace.inspections.length === 0 ? <Empty>No inspections recorded.</Empty> : trace.inspections.map((ins, i) => (
                  <Row key={i} last={i === trace.inspections.length - 1}>
                    <span style={{ fontFamily: mono, width: 92, color: C.muted, fontSize: 11 }}>{ins.inspected_at || "—"}</span>
                    <span style={{ flex: 1 }}>{ins.inspection_type} <span style={{ color: C.faint, fontSize: 11.5 }}>· {ins.inspector}</span>{ins.notes ? <div style={{ fontSize: 11, color: C.faint }}>{ins.notes}</div> : null}</span>
                    {ins.ncr_number && <span style={{ fontFamily: mono, fontSize: 10.5, color: C.red, marginRight: 8 }}>{ins.ncr_number}</span>}
                    <Tag>{ins.result}</Tag>
                  </Row>
                ))}
              </Section>

              <Section title="NCRs / CAPA" count={trace.ncrs.length}>
                {trace.ncrs.length === 0 ? <Empty>No non-conformances — clean lot.</Empty> : trace.ncrs.map((n, i) => (
                  <Row key={i} last={i === trace.ncrs.length - 1}>
                    <span style={{ fontFamily: mono, width: 90, color: C.red }}>{n.ncr_number}</span>
                    <span style={{ flex: 1 }}>{n.description}<div style={{ fontSize: 11, color: C.faint }}>disp: {n.disposition || "—"}{n.capa_number ? " · " + n.capa_number : ""} · opened {n.opened_at || "—"}</div></span>
                    <Tag>{n.status}</Tag>
                  </Row>
                ))}
              </Section>

              <Section title="Supplier certifications & documents" count={trace.documents.length}>
                {trace.documents.length === 0 ? <Empty>No linked documents. Upload or load samples in Admin.</Empty> : trace.documents.map((d, i) => (
                  <Row key={d.id} last={i === trace.documents.length - 1}>
                    <span style={{ fontFamily: mono, fontSize: 10.5, width: 74, color: C.amber, textTransform: "uppercase" }}>{d.doc_type}</span>
                    <span style={{ flex: 1 }}>{d.title || d.filename}{d.vendor_code ? <span style={{ color: C.faint, fontFamily: mono, fontSize: 11 }}> · {d.vendor_code}</span> : null}</span>
                    <a href={docDownloadUrl(d.id)} style={{ fontFamily: mono, fontSize: 11.5, color: C.thread }}>download ↓</a>
                  </Row>
                ))}
              </Section>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Row({ children, last }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: last ? "none" : `1px solid ${C.line}`, fontSize: 12.5 }}>{children}</div>;
}
function Empty({ children }) {
  return <div style={{ padding: "12px", fontSize: 12, color: C.faint }}>{children}</div>;
}

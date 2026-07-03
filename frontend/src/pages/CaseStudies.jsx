// Case Studies / whitepapers library — public page at /case-studies.
//
// Layout: a chronological "thread" index on the left (whitepapers as nodes on
// the teal thread line, grouped by year — the same visual language as the
// Digital Thread) and a reader pane on the right. PDFs render in the browser's
// viewer; .docx files are converted to HTML server-side and read inline.
//
// Site admin (users.role === 'superadmin' — the platform owner, NOT customer
// org_admins) gets CMS controls: upload, edit, publish/unpublish, delete.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Workflow, FileText, Search, Download, Plus, Pencil, Trash2, X, ArrowLeft, UploadCloud, Eye, EyeOff } from "lucide-react";
import {
  listCaseStudies, getCaseStudy, caseStudyFileUrl,
  uploadCaseStudy, updateCaseStudy, deleteCaseStudy,
} from "../lib/api.js";

const BRAND = "Threadwire";

const Styles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
    .cs {
      --bg:#08090d; --bg2:#0e1117; --panel:#13181f; --panel2:#1a2030;
      --line:#252d3d; --line2:#303d52;
      --ink:#f0f4f8; --muted:#b8c5d6; --faint:#7a8fa8;
      --amber:#ff9a4d; --amber-d:#cc7530;
      --thread:#4dd8ca; --thread-d:#2a8f86;
      --red:#f26249;
      --disp:'Bricolage Grotesque',sans-serif; --body:'Inter',sans-serif; --mono:'IBM Plex Mono',monospace;
      color:var(--ink); font-family:var(--body); letter-spacing:.1px;
      background:
        radial-gradient(900px 500px at 85% -10%, rgba(255,154,77,.08), transparent 60%),
        radial-gradient(800px 600px at 0% 110%, rgba(77,216,202,.07), transparent 55%),
        var(--bg);
      min-height:100vh;
    }
    .cs *{box-sizing:border-box}
    .cs-disp{font-family:var(--disp);letter-spacing:-.02em;line-height:1.05;color:var(--ink)}
    .cs-mono{font-family:var(--mono)}
    .cs-eyebrow{font-family:var(--mono);font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:var(--amber)}
    .cs-btn{font-family:var(--mono);font-size:13px;font-weight:600;border-radius:10px;padding:9px 14px;border:1px solid var(--line2);background:var(--panel2);color:var(--ink);cursor:pointer;transition:.16s;display:inline-flex;align-items:center;gap:8px}
    .cs-btn:hover{border-color:var(--amber);transform:translateY(-1px)}
    .cs-btn:focus-visible{outline:2px solid var(--amber);outline-offset:2px}
    .cs-btn-primary{background:linear-gradient(180deg,var(--amber),var(--amber-d));border-color:transparent;color:#150b02;font-weight:700}
    .cs-btn-primary:hover{filter:brightness(1.08)}
    .cs-btn-danger:hover{border-color:var(--red);color:var(--red)}
    .cs-input{font-family:var(--mono);font-size:13px;background:rgba(255,255,255,.04);border:1px solid var(--line2);border-radius:10px;padding:10px 13px;color:var(--ink);width:100%;outline:none}
    .cs-input:focus{border-color:var(--amber);background:rgba(255,255,255,.06)}
    .cs-input::placeholder{color:var(--faint)}
    .cs-tag{font-family:var(--mono);font-size:10px;letter-spacing:.06em;padding:2px 7px;border-radius:6px;border:1px solid var(--line2);color:var(--faint)}
    .cs-node{position:relative;padding:12px 14px 12px 30px;border-radius:12px;cursor:pointer;border:1px solid transparent;transition:.15s}
    .cs-node:hover{background:var(--panel);border-color:var(--line)}
    .cs-node.sel{background:var(--panel);border-color:var(--line2)}
    .cs-node::before{content:"";position:absolute;left:9px;top:20px;width:9px;height:9px;border-radius:50%;background:var(--bg2);border:2px solid var(--thread-d);transition:.15s}
    .cs-node.sel::before,.cs-node:hover::before{background:var(--thread);border-color:var(--thread);box-shadow:0 0 10px rgba(77,216,202,.5)}
    .cs-thread{position:absolute;left:12.5px;top:0;bottom:0;width:0;border-left:1.5px dashed rgba(77,216,202,.35)}
    .cs-scroll::-webkit-scrollbar{width:8px}
    .cs-scroll::-webkit-scrollbar-thumb{background:var(--line2);border-radius:8px}
    .cs-fade{animation:csIn .4s ease both}
    @keyframes csIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
    @media (prefers-reduced-motion: reduce){.cs-fade{animation:none}.cs-btn:hover{transform:none}}
    /* rendered .docx prose */
    .cs-prose{font-family:var(--body);color:var(--muted);line-height:1.75;font-size:15.5px;max-width:760px}
    .cs-prose h1,.cs-prose h2,.cs-prose h3{font-family:var(--disp);color:var(--ink);line-height:1.2;margin:1.6em 0 .5em}
    .cs-prose h1{font-size:26px}.cs-prose h2{font-size:21px}.cs-prose h3{font-size:17px}
    .cs-prose p{margin:.8em 0}
    .cs-prose a{color:var(--thread)}
    .cs-prose table{border-collapse:collapse;margin:1em 0;width:100%}
    .cs-prose td,.cs-prose th{border:1px solid var(--line2);padding:7px 10px;font-size:14px}
    .cs-prose img{max-width:100%;border-radius:10px}
    .cs-prose ul,.cs-prose ol{padding-left:1.3em}
    @media(max-width:860px){
      .cs-cols{grid-template-columns:1fr !important}
      .cs-index.reading{display:none}
      .cs-reader.browsing{display:none}
      .cs-back{display:inline-flex !important}
    }
  `}</style>
);

const fmtDate = (iso) => new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
const fmtSize = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB");
const kindLabel = { pdf: "PDF", docx: "DOCX", doc: "DOC" };

/* --------------------------------- page ---------------------------------- */
export default function CaseStudies({ user }) {
  const [data, setData] = useState({ loading: true, items: [], isAdmin: false, error: null });
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null); // { id, html_content, ... }
  const [query, setQuery] = useState("");
  const [editItem, setEditItem] = useState(null);   // item being edited
  const [uploadOpen, setUploadOpen] = useState(false);
  const [mobileReading, setMobileReading] = useState(false);

  const refresh = () =>
    listCaseStudies()
      .then((r) => {
        setData({ loading: false, items: r.items, isAdmin: r.is_site_admin, error: null });
        return r.items;
      })
      .catch((e) => { setData((d) => ({ ...d, loading: false, error: e.message })); return []; });

  useEffect(() => {
    refresh().then((items) => { if (items.length && !selectedId) setSelectedId(items[0].id); });
  }, []);

  // Load reader detail (html for docx) when the selection changes.
  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    let alive = true;
    setDetail(null);
    getCaseStudy(selectedId).then((d) => { if (alive) setDetail(d); }).catch(() => {});
    return () => { alive = false; };
  }, [selectedId]);

  const items = data.items;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => (i.title + " " + i.summary).toLowerCase().includes(q));
  }, [items, query]);

  // Group chronologically by year (items already arrive newest-first).
  const byYear = useMemo(() => {
    const g = [];
    for (const it of filtered) {
      const y = new Date(it.published_at).getFullYear();
      if (!g.length || g[g.length - 1].year !== y) g.push({ year: y, items: [] });
      g[g.length - 1].items.push(it);
    }
    return g;
  }, [filtered]);

  const selected = items.find((i) => i.id === selectedId) || null;
  const pick = (id) => { setSelectedId(id); setMobileReading(true); };

  return (
    <div className="cs">
      <Styles />

      {/* top bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(10,14,21,.75)", backdropFilter: "blur(10px)", borderBottom: "1px solid var(--line)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "13px 22px", display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg,var(--amber),var(--thread))", display: "grid", placeItems: "center" }}>
              <Workflow size={17} color="#0a0e15" strokeWidth={2.4} />
            </div>
            <div>
              <span className="cs-disp" style={{ fontWeight: 800, fontSize: 19 }}>{BRAND}</span>
              <span className="cs-mono" style={{ fontSize: 9, color: "var(--amber)", display: "block", letterSpacing: ".12em", textTransform: "uppercase", lineHeight: 1, marginTop: 1 }}>Delivery Control</span>
            </div>
          </a>
          <span className="cs-mono" style={{ fontSize: 12, color: "var(--faint)", marginLeft: 4 }}>/ Case studies</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
            {data.isAdmin && (
              <>
                <span className="cs-tag" style={{ color: "var(--thread)", borderColor: "var(--thread-d)" }}>SITE ADMIN</span>
                <button className="cs-btn cs-btn-primary" onClick={() => setUploadOpen(true)}><Plus size={15} /> New case study</button>
              </>
            )}
            <a href="/" className="cs-btn" style={{ textDecoration: "none" }}>← Back to app</a>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "30px 22px 60px" }}>
        {/* page head */}
        <div className="cs-fade" style={{ marginBottom: 26 }}>
          <div className="cs-eyebrow" style={{ marginBottom: 10 }}>Resources</div>
          <h1 className="cs-disp" style={{ fontSize: "clamp(30px,4vw,44px)", fontWeight: 800, margin: 0 }}>Case studies &amp; whitepapers</h1>
          <p style={{ color: "var(--muted)", maxWidth: 640, lineHeight: 1.65, marginTop: 10 }}>
            Field results and research from mid-market manufacturing floors — how teams protect
            promise dates, surface blockers early and recover revenue at risk. Newest first.
          </p>
        </div>

        {data.error && <div className="cs-mono" style={{ color: "var(--red)", fontSize: 13, marginBottom: 16 }}>Couldn’t load case studies: {data.error}</div>}

        <div className="cs-cols" style={{ display: "grid", gridTemplateColumns: "330px 1fr", gap: 26, alignItems: "start" }}>
          {/* ------------------------------ index ------------------------------ */}
          <div className={"cs-index cs-fade" + (mobileReading ? " reading" : "")}>
            <div style={{ position: "relative", marginBottom: 14 }}>
              <Search size={14} style={{ position: "absolute", left: 12, top: 12, color: "var(--faint)" }} />
              <input className="cs-input" style={{ paddingLeft: 34 }} placeholder="Search titles…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>

            <div className="cs-scroll" style={{ maxHeight: "calc(100vh - 240px)", overflowY: "auto", paddingRight: 4 }}>
              {data.loading && <div className="cs-mono" style={{ color: "var(--faint)", fontSize: 13, padding: 12 }}>Loading…</div>}
              {!data.loading && !filtered.length && (
                <div className="cs-mono" style={{ color: "var(--faint)", fontSize: 13, padding: 12, lineHeight: 1.6 }}>
                  {items.length ? "No titles match your search." : "No case studies published yet. Check back soon."}
                </div>
              )}
              {byYear.map((grp) => (
                <div key={grp.year} style={{ marginBottom: 6 }}>
                  <div className="cs-mono" style={{ fontSize: 11, letterSpacing: ".2em", color: "var(--faint)", padding: "10px 0 6px 30px" }}>{grp.year}</div>
                  <div style={{ position: "relative" }}>
                    <div className="cs-thread" aria-hidden="true" />
                    {grp.items.map((it) => (
                      <div key={it.id} className={"cs-node" + (it.id === selectedId ? " sel" : "")} onClick={() => pick(it.id)}
                        role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && pick(it.id)}>
                        <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                          <span className="cs-mono" style={{ fontSize: 11, color: "var(--thread)", whiteSpace: "nowrap" }}>{fmtDate(it.published_at)}</span>
                          <span className="cs-tag">{kindLabel[it.file_kind] || "FILE"}</span>
                          {data.isAdmin && it.published === false && <span className="cs-tag" style={{ color: "var(--amber)", borderColor: "var(--amber-d)" }}>DRAFT</span>}
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 14.5, marginTop: 4, color: it.id === selectedId ? "var(--ink)" : "var(--muted)", lineHeight: 1.35 }}>{it.title}</div>
                        {it.summary && <div style={{ fontSize: 12.5, color: "var(--faint)", marginTop: 4, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{it.summary}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ------------------------------ reader ----------------------------- */}
          <div className={"cs-reader cs-fade" + (!mobileReading ? " browsing" : "")} style={{ minWidth: 0 }}>
            <button className="cs-btn cs-back" style={{ display: "none", marginBottom: 14 }} onClick={() => setMobileReading(false)}>
              <ArrowLeft size={15} /> All case studies
            </button>

            {!selected ? (
              <EmptyReader hasItems={!!items.length} isAdmin={data.isAdmin} onUpload={() => setUploadOpen(true)} />
            ) : (
              <div style={{ background: "linear-gradient(180deg,var(--panel),var(--bg2))", border: "1px solid var(--line)", borderRadius: 18, overflow: "hidden" }}>
                {/* reader header */}
                <div style={{ padding: "22px 24px", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <span className="cs-mono" style={{ fontSize: 12, color: "var(--thread)" }}>{fmtDate(selected.published_at)}</span>
                    <span className="cs-tag">{kindLabel[selected.file_kind]}</span>
                    <span className="cs-mono" style={{ fontSize: 11, color: "var(--faint)" }}>{fmtSize(selected.size_bytes)}</span>
                    {data.isAdmin && selected.published === false && <span className="cs-tag" style={{ color: "var(--amber)", borderColor: "var(--amber-d)" }}>DRAFT — only you can see this</span>}
                    <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                      {data.isAdmin && (
                        <>
                          <button className="cs-btn" title={selected.published === false ? "Publish" : "Unpublish"}
                            onClick={() => updateCaseStudy(selected.id, { published: !(selected.published !== false) }).then(refresh)}>
                            {selected.published === false ? <Eye size={14} /> : <EyeOff size={14} />}
                            {selected.published === false ? "Publish" : "Unpublish"}
                          </button>
                          <button className="cs-btn" onClick={() => setEditItem(selected)}><Pencil size={14} /> Edit</button>
                          <button className="cs-btn cs-btn-danger" onClick={() => {
                            if (!window.confirm(`Delete “${selected.title}”? This removes the file too.`)) return;
                            deleteCaseStudy(selected.id).then(() => { setSelectedId(null); refresh(); });
                          }}><Trash2 size={14} /></button>
                        </>
                      )}
                      <a className="cs-btn" href={caseStudyFileUrl(selected.id, true)} style={{ textDecoration: "none" }}>
                        <Download size={14} /> Download
                      </a>
                    </div>
                  </div>
                  <h2 className="cs-disp" style={{ fontSize: "clamp(20px,2.6vw,28px)", fontWeight: 700, margin: "12px 0 0" }}>{selected.title}</h2>
                  {selected.summary && <p style={{ color: "var(--muted)", lineHeight: 1.65, marginTop: 10, marginBottom: 0, maxWidth: 760 }}>{selected.summary}</p>}
                </div>

                {/* reader body */}
                <ReaderBody item={selected} detail={detail} />
              </div>
            )}
          </div>
        </div>
      </div>

      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} onDone={(created) => { setUploadOpen(false); refresh(); if (created?.id) setSelectedId(created.id); }} />}
      {editItem && <EditModal item={editItem} onClose={() => setEditItem(null)} onDone={() => { setEditItem(null); refresh(); }} />}
    </div>
  );
}

/* ------------------------------ reader body ------------------------------ */
function ReaderBody({ item, detail }) {
  if (item.file_kind === "pdf") {
    return (
      <iframe
        title={item.title}
        src={caseStudyFileUrl(item.id) + "#view=FitH"}
        style={{ display: "block", width: "100%", height: "calc(100vh - 220px)", minHeight: 520, border: "none", background: "#20242b" }}
      />
    );
  }
  if (item.file_kind === "docx" && item.has_html) {
    if (!detail) return <div className="cs-mono" style={{ padding: 24, color: "var(--faint)", fontSize: 13 }}>Loading document…</div>;
    return (
      <div className="cs-scroll" style={{ padding: "26px 28px", maxHeight: "calc(100vh - 220px)", overflowY: "auto" }}>
        {/* html_content is produced server-side from the admin's .docx and sanitized there */}
        <div className="cs-prose" dangerouslySetInnerHTML={{ __html: detail.html_content || "" }} />
      </div>
    );
  }
  // legacy .doc, or a docx that could not be converted — offer the file itself
  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <FileText size={34} color="var(--faint)" style={{ marginBottom: 12 }} />
      <p style={{ color: "var(--muted)", maxWidth: 420, margin: "0 auto 18px", lineHeight: 1.6 }}>
        This document can’t be previewed in the browser. Download it to read the full text.
      </p>
      <a className="cs-btn cs-btn-primary" href={caseStudyFileUrl(item.id, true)} style={{ textDecoration: "none" }}>
        <Download size={15} /> Download {item.filename}
      </a>
    </div>
  );
}

function EmptyReader({ hasItems, isAdmin, onUpload }) {
  return (
    <div style={{ border: "1px dashed var(--line2)", borderRadius: 18, padding: 60, textAlign: "center" }}>
      <FileText size={34} color="var(--faint)" style={{ marginBottom: 12 }} />
      <p style={{ color: "var(--muted)", maxWidth: 420, margin: "0 auto", lineHeight: 1.6 }}>
        {hasItems ? "Select a case study from the index to start reading."
          : isAdmin ? "The library is empty. Upload the first whitepaper to publish it here."
          : "No case studies published yet — check back soon."}
      </p>
      {isAdmin && !hasItems && (
        <button className="cs-btn cs-btn-primary" style={{ marginTop: 18 }} onClick={onUpload}><Plus size={15} /> New case study</button>
      )}
    </div>
  );
}

/* ------------------------------- modals ---------------------------------- */
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(5,7,10,.7)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", padding: 16 }} onClick={onClose}>
      <div className="cs-fade" style={{ width: "min(560px,100%)", background: "var(--panel)", border: "1px solid var(--line2)", borderRadius: 18, padding: 24 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
          <div className="cs-disp" style={{ fontSize: 19, fontWeight: 700 }}>{title}</div>
          <button className="cs-btn" style={{ marginLeft: "auto", padding: 7 }} onClick={onClose} aria-label="Close"><X size={15} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const Field = ({ label, children }) => (
  <label style={{ display: "block", marginBottom: 14 }}>
    <div className="cs-mono" style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 6 }}>{label}</div>
    {children}
  </label>
);

function UploadModal({ onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [published, setPublished] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef(null);

  const chooseFile = (f) => {
    if (!f) return;
    if (!/\.(pdf|docx?|doc)$/i.test(f.name)) { setErr("Only .pdf, .docx and .doc files are supported."); return; }
    setErr(""); setFile(f);
    if (!title) setTitle(f.name.replace(/\.(pdf|docx?|doc)$/i, "").replace(/[_-]+/g, " "));
  };

  const submit = () => {
    if (!file) { setErr("Choose a PDF or Word file first."); return; }
    setBusy(true); setErr("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", title.trim());
    fd.append("summary", summary.trim());
    fd.append("published_at", date);
    fd.append("published", published);
    uploadCaseStudy(fd).then(onDone).catch((e) => { setErr(e.message); setBusy(false); });
  };

  return (
    <Modal title="New case study" onClose={onClose}>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); chooseFile(e.dataTransfer.files?.[0]); }}
        onClick={() => inputRef.current?.click()}
        style={{ border: "1.5px dashed var(--line2)", borderRadius: 14, padding: 22, textAlign: "center", cursor: "pointer", marginBottom: 16, background: file ? "rgba(77,216,202,.05)" : "transparent" }}>
        <UploadCloud size={22} color={file ? "var(--thread)" : "var(--faint)"} style={{ marginBottom: 6 }} />
        <div className="cs-mono" style={{ fontSize: 12.5, color: file ? "var(--thread)" : "var(--muted)" }}>
          {file ? `${file.name} · ${fmtSize(file.size)}` : "Drop a PDF or Word file here, or click to browse"}
        </div>
        <div className="cs-mono" style={{ fontSize: 11, color: "var(--faint)", marginTop: 4 }}>.pdf · .docx · .doc — max 30 MB</div>
        <input ref={inputRef} type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }} onChange={(e) => chooseFile(e.target.files?.[0])} />
      </div>

      <Field label="Title"><input className="cs-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="How Acme Machining recovered $1.2M of blocked revenue" /></Field>
      <Field label="Summary (shown in the index)"><textarea className="cs-input" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="One or two sentences readers see before opening it." style={{ resize: "vertical", fontFamily: "var(--body)" }} /></Field>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 170 }}><Field label="Publication date"><input type="date" className="cs-input" value={date} onChange={(e) => setDate(e.target.value)} /></Field></div>
        <label className="cs-mono" style={{ fontSize: 12.5, color: "var(--muted)", display: "flex", gap: 8, alignItems: "center", marginBottom: 14, cursor: "pointer" }}>
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} /> Publish immediately
        </label>
      </div>
      {err && <div className="cs-mono" style={{ color: "var(--red)", fontSize: 12.5, marginBottom: 12 }}>{err}</div>}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button className="cs-btn" onClick={onClose}>Cancel</button>
        <button className="cs-btn cs-btn-primary" disabled={busy} onClick={submit}>{busy ? "Uploading…" : published ? "Upload & publish" : "Save as draft"}</button>
      </div>
    </Modal>
  );
}

function EditModal({ item, onClose, onDone }) {
  const [title, setTitle] = useState(item.title);
  const [summary, setSummary] = useState(item.summary || "");
  const [date, setDate] = useState(item.published_at.slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = () => {
    setBusy(true); setErr("");
    updateCaseStudy(item.id, { title: title.trim(), summary: summary.trim(), published_at: date })
      .then(onDone).catch((e) => { setErr(e.message); setBusy(false); });
  };

  return (
    <Modal title="Edit case study" onClose={onClose}>
      <Field label="Title"><input className="cs-input" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      <Field label="Summary"><textarea className="cs-input" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} style={{ resize: "vertical", fontFamily: "var(--body)" }} /></Field>
      <Field label="Publication date"><input type="date" className="cs-input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <div className="cs-mono" style={{ fontSize: 11.5, color: "var(--faint)", marginBottom: 14, lineHeight: 1.6 }}>
        File: {item.filename}. To replace the file, delete this entry and upload the new version.
      </div>
      {err && <div className="cs-mono" style={{ color: "var(--red)", fontSize: 12.5, marginBottom: 12 }}>{err}</div>}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button className="cs-btn" onClick={onClose}>Cancel</button>
        <button className="cs-btn cs-btn-primary" disabled={busy} onClick={submit}>{busy ? "Saving…" : "Save changes"}</button>
      </div>
    </Modal>
  );
}

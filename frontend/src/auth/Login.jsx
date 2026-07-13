import React, { useState, useEffect, useRef } from "react";
import { login, register, verifyMfa, searchCompanies } from "../lib/api.js";

const wrap = {
  minHeight: "100vh", display: "grid", placeItems: "center",
  fontFamily: "'IBM Plex Sans',system-ui,sans-serif", color: "#15222D",
  background:
    "radial-gradient(900px 500px at 85% -10%, rgba(255,138,61,.10), transparent 60%)," +
    "radial-gradient(800px 600px at 0% 110%, rgba(42,70,196,.06), transparent 55%), #F4F6FA",
  padding: 20,
};
const card = {
  width: "100%", maxWidth: 430, background: "#FFFFFF",
  border: "1px solid #DCE3EC", borderRadius: 16, padding: 28,
};
const input = {
  fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, background: "#FFFFFF",
  border: "1px solid #DCE3EC", borderRadius: 10, padding: "11px 13px", color: "#15222D",
  width: "100%", outline: "none", marginBottom: 10, boxSizing: "border-box",
};
const btn = {
  fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 600, width: "100%",
  border: "none", borderRadius: 10, padding: "12px", cursor: "pointer",
  background: "linear-gradient(180deg,#2A46C4,#1B2E8C)", color: "#ffffff",
};
const muted = { color: "#47606F" };

/* ---- type-ahead company picker with "add new company" ---- */
function CompanyCombobox({ name, onChange }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState([]);
  const [hi, setHi] = useState(-1);
  const debounce = useRef(null);
  const boxRef = useRef(null);

  useEffect(() => {
    const q = name || "";
    clearTimeout(debounce.current);
    if (q.trim().length < 2) { setOpts([]); return; }
    debounce.current = setTimeout(() => {
      searchCompanies(q).then((r) => { setOpts(r); setOpen(true); });
    }, 200);
    return () => clearTimeout(debounce.current);
  }, [name]);

  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const exact = opts.some((o) => o.name.toLowerCase() === (name || "").trim().toLowerCase());
  const showAdd = (name || "").trim().length >= 2 && !exact;
  const rows = [...opts.map((o) => ({ type: "co", ...o })), ...(showAdd ? [{ type: "add" }] : [])];

  const pick = (row) => {
    if (!row) return;
    if (row.type === "add") onChange(name.trim(), "");
    else onChange(row.name, row.state || "");
    setOpen(false); setHi(-1);
  };

  const onKey = (e) => {
    if (!open || rows.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, rows.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter" && hi >= 0) { e.preventDefault(); pick(rows[hi]); }
    else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={boxRef} style={{ position: "relative", marginBottom: 10 }}>
      <input
        style={{ ...input, marginBottom: 0 }}
        placeholder="Company legal name (US registered)"
        value={name}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value, "")}
        onFocus={() => opts.length && setOpen(true)}
        onKeyDown={onKey}
      />
      {open && rows.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20,
          background: "#FFFFFF", border: "1px solid #C6D2E0", borderRadius: 10, overflow: "hidden",
          maxHeight: 230, overflowY: "auto", boxShadow: "0 20px 50px -20px rgba(0,0,0,.9)",
        }}>
          {rows.map((row, i) => (
            <div key={i}
              onMouseEnter={() => setHi(i)}
              onMouseDown={(e) => { e.preventDefault(); pick(row); }}
              style={{
                padding: "10px 13px", cursor: "pointer", fontSize: 13,
                background: hi === i ? "#EEF2F7" : "transparent",
                display: "flex", alignItems: "center", gap: 8,
                borderTop: row.type === "add" ? "1px solid #DCE3EC" : "none",
              }}>
              {row.type === "add" ? (
                <>
                  <span style={{ color: "#2A46C4", fontWeight: 700 }}>＋</span>
                  <span>Add “<span style={{ color: "#15222D" }}>{name.trim()}</span>” as a new company</span>
                </>
              ) : (
                <>
                  <span style={{ flex: 1 }}>{row.name}</span>
                  {row.registered
                    ? <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10.5, color: "#43c277" }}>✓ on ThreadWire</span>
                    : <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, ...muted }}>{row.state}</span>}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Login({ onAuthed, onCancel }) {
  const [mode, setMode] = useState("login");      // login | register
  const [step, setStep] = useState("form");        // form | mfa
  const [f, setF] = useState({ company_legal_name: "", state_of_incorporation: "", full_name: "", email: "", password: "" });
  const [mfaSetup, setMfaSetup] = useState(null);
  const [regInfo, setRegInfo] = useState(null);    // {role, joined, org}
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const upd = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submitForm = async () => {
    setErr(""); setBusy(true);
    try {
      if (mode === "login") {
        const r = await login(f.email, f.password);
        if (r.mfa_required) { setMfaSetup(null); setRegInfo(null); setStep("mfa"); }
        else onAuthed();
      } else {
        const r = await register({
          company_legal_name: f.company_legal_name,
          state_of_incorporation: f.state_of_incorporation || null,
          full_name: f.full_name || null,
          email: f.email, password: f.password,
        });
        setMfaSetup(r.mfa_setup);
        setRegInfo({ role: r.role, joined: r.joined, org: r.org });
        setStep("mfa");
      }
    } catch (e) { setErr(e.message || "Something went wrong"); }
    finally { setBusy(false); }
  };

  const submitCode = async () => {
    setErr(""); setBusy(true);
    try { await verifyMfa(code); onAuthed(); }
    catch (e) { setErr(e.message || "Invalid code"); }
    finally { setBusy(false); }
  };

  const Brand = (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
      <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg,#2A46C4,#3E6FE0)" }} />
      <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 20 }}>ThreadWire</span>
    </div>
  );
  const fonts = <style>{`@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');`}</style>;

  // -------------------------------- MFA step -------------------------------
  if (step === "mfa") {
    return (
      <div style={wrap}>{fonts}
        <div style={card}>
          {Brand}
          {regInfo && (
            <div style={{ fontSize: 12.5, ...muted, marginBottom: 12, padding: "8px 11px", background: "#FFFFFF", border: "1px solid #DCE3EC", borderRadius: 9 }}>
              {regInfo.joined
                ? <>Joining <b style={{ color: "#15222D" }}>{regInfo.org.legal_name}</b> as a <b style={{ color: "#3E6FE0" }}>member</b>. Your admin manages connectors.</>
                : <>Workspace <b style={{ color: "#15222D" }}>{regInfo.org.legal_name}</b> created — you're the <b style={{ color: "#2A46C4" }}>admin</b>.</>}
            </div>
          )}
          <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 23, fontWeight: 800, margin: "0 0 4px" }}>
            {mfaSetup ? "Set up two-factor auth" : "Two-factor verification"}
          </h1>
          <p style={{ ...muted, fontSize: 13.5, margin: "0 0 18px", lineHeight: 1.5 }}>
            {mfaSetup
              ? "Scan this with Google Authenticator, Authy or 1Password, then enter the 6-digit code to finish."
              : "Enter the 6-digit code from your authenticator app."}
          </p>

          {mfaSetup && (
            <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16, padding: 14, background: "#FFFFFF", border: "1px solid #DCE3EC", borderRadius: 12 }}>
              <div style={{ width: 132, height: 132, background: "#fff", borderRadius: 8, padding: 6, flexShrink: 0 }}
                   dangerouslySetInnerHTML={{ __html: mfaSetup.qr_svg }} />
              <div>
                <div style={{ fontSize: 11, ...muted, marginBottom: 4 }}>Can't scan? Enter this key:</div>
                <code style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11.5, color: "#3E6FE0", wordBreak: "break-all" }}>{mfaSetup.secret}</code>
              </div>
            </div>
          )}

          <input style={{ ...input, letterSpacing: 6, textAlign: "center", fontSize: 18 }} inputMode="numeric"
                 placeholder="000000" value={code} maxLength={6}
                 onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                 onKeyDown={(e) => e.key === "Enter" && submitCode()} autoFocus />
          {err && <div style={{ color: "#f0563a", fontSize: 12.5, margin: "2px 0 12px" }}>{err}</div>}
          <button style={{ ...btn, opacity: busy ? 0.7 : 1 }} onClick={submitCode} disabled={busy || code.length < 6}>
            {busy ? "Verifying…" : "Verify & continue"}
          </button>
          <div style={{ textAlign: "center", marginTop: 14 }}>
            <span style={{ color: "#5d6f86", cursor: "pointer", fontSize: 12.5 }}
                  onClick={() => { setStep("form"); setErr(""); setCode(""); }}>← Back</span>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------- form step ------------------------------
  return (
    <div style={wrap}>{fonts}
      <div style={card}>
        {Brand}
        <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>
          {mode === "login" ? "Sign in" : "Create your workspace"}
        </h1>
        <p style={{ ...muted, fontSize: 13.5, margin: "0 0 20px" }}>
          {mode === "login" ? "Welcome back to your digital thread." : "First to register a company becomes its admin; teammates join as members."}
        </p>

        {mode === "register" && (
          <>
            <CompanyCombobox
              name={f.company_legal_name}
              onChange={(name, state) => setF((s) => ({ ...s, company_legal_name: name, state_of_incorporation: state || s.state_of_incorporation }))}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <input style={input} placeholder="State (e.g. DE)" value={f.state_of_incorporation} onChange={upd("state_of_incorporation")} />
              <input style={input} placeholder="Your full name" value={f.full_name} onChange={upd("full_name")} />
            </div>
          </>
        )}
        <input style={input} type="email" placeholder="Work email" value={f.email} onChange={upd("email")} />
        <input style={input} type="password" placeholder={mode === "login" ? "Password" : "Password (min 10 characters)"}
               value={f.password} onChange={upd("password")} onKeyDown={(e) => e.key === "Enter" && submitForm()} />

        {err && <div style={{ color: "#f0563a", fontSize: 12.5, margin: "2px 0 12px" }}>{err}</div>}

        <button style={{ ...btn, opacity: busy ? 0.7 : 1 }} onClick={submitForm} disabled={busy}>
          {busy ? "Please wait…" : mode === "login" ? "Continue" : "Create workspace"}
        </button>

        {mode === "register" && (
          <div style={{ fontSize: 11, ...muted, textAlign: "center", marginTop: 10 }}>
            Next: you'll set up an authenticator app for two-factor security.
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, ...muted }}>
          {mode === "login" ? "New here? " : "Already have an account? "}
          <span style={{ color: "#2A46C4", cursor: "pointer" }}
                onClick={() => { setErr(""); setMode(mode === "login" ? "register" : "login"); }}>
            {mode === "login" ? "Register your company" : "Sign in"}
          </span>
        </div>
        {onCancel && (
          <div style={{ textAlign: "center", marginTop: 14 }}>
            <span style={{ color: "#5d6f86", cursor: "pointer", fontSize: 12.5 }} onClick={onCancel}>← Back to preview</span>
          </div>
        )}
      </div>
    </div>
  );
}

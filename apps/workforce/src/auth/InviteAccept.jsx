import React, { useEffect, useState } from "react";
import { lookupInvite, acceptInvite, verifyMfa } from "../lib/api.js";

const C = { ink: "#15222D", muted: "#47606F", faint: "#5d6f86", amber: "#2A46C4", thread: "#3E6FE0", red: "#f0563a" };
const wrap = {
  minHeight: "100vh", display: "grid", placeItems: "center", color: C.ink,
  fontFamily: "'IBM Plex Sans',sans-serif", padding: 20,
  background: "radial-gradient(900px 500px at 85% -10%, rgba(255,138,61,.10), transparent 60%)," +
    "radial-gradient(800px 600px at 0% 110%, rgba(42,70,196,.06), transparent 55%), #F4F6FA",
};
const card = { width: "100%", maxWidth: 430, background: "#FFFFFF", border: "1px solid #DCE3EC", borderRadius: 16, padding: 28 };
const input = { fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, background: "#FFFFFF", border: "1px solid #DCE3EC", borderRadius: 10, padding: "11px 13px", color: C.ink, width: "100%", outline: "none", marginBottom: 10, boxSizing: "border-box" };
const btn = { fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 600, width: "100%", border: "none", borderRadius: 10, padding: "12px", cursor: "pointer", background: "linear-gradient(180deg,#2A46C4,#1B2E8C)", color: "#ffffff" };

export default function InviteAccept({ token }) {
  const [info, setInfo] = useState(null);
  const [err, setErr] = useState("");
  const [step, setStep] = useState("loading"); // loading | form | mfa | dead
  const [f, setF] = useState({ first_name: "", last_name: "", password: "" });
  const [mfaSetup, setMfaSetup] = useState(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const fonts = <style>{`@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');`}</style>;

  useEffect(() => {
    lookupInvite(token).then((i) => { setInfo(i); setStep("form"); })
      .catch((e) => { setErr(e.message || "Invalid invite"); setStep("dead"); });
  }, [token]);

  const submit = async () => {
    setErr(""); setBusy(true);
    try {
      const r = await acceptInvite({ token, first_name: f.first_name, last_name: f.last_name, password: f.password });
      setMfaSetup(r.mfa_setup); setStep("mfa");
    } catch (e) { setErr(e.message || "Could not accept invite"); }
    finally { setBusy(false); }
  };
  const submitCode = async () => {
    setErr(""); setBusy(true);
    try { await verifyMfa(code); window.location.href = "/"; }
    catch (e) { setErr(e.message || "Invalid code"); setBusy(false); }
  };

  const Brand = (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
      <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg,#2A46C4,#3E6FE0)" }} />
      <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 20 }}>ThreadWire</span>
    </div>
  );

  if (step === "loading") return <div style={wrap}>{fonts}<div style={{ ...card, textAlign: "center", color: C.muted, fontFamily: "'IBM Plex Mono',monospace" }}>Loading invite…</div></div>;

  if (step === "dead") return (
    <div style={wrap}>{fonts}<div style={card}>{Brand}
      <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>Invite unavailable</h1>
      <p style={{ color: C.muted, fontSize: 13.5 }}>{err}</p>
      <a href="/" style={{ ...btn, display: "block", textAlign: "center", textDecoration: "none", marginTop: 12 }}>Go to ThreadWire</a>
    </div></div>
  );

  if (step === "mfa") return (
    <div style={wrap}>{fonts}<div style={card}>{Brand}
      <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Set up two-factor auth</h1>
      <p style={{ color: C.muted, fontSize: 13.5, margin: "0 0 18px", lineHeight: 1.5 }}>Scan with your authenticator app, then enter the 6-digit code.</p>
      {mfaSetup && (
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16, padding: 14, background: "#FFFFFF", border: "1px solid #DCE3EC", borderRadius: 12 }}>
          <div style={{ width: 132, height: 132, background: "#fff", borderRadius: 8, padding: 6, flexShrink: 0 }}
            dangerouslySetInnerHTML={{ __html: (mfaSetup.qr_svg || "").replace(/svg:/g, "") }} />
          <div><div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Can't scan? Key:</div>
            <code style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11.5, color: C.thread, wordBreak: "break-all" }}>{mfaSetup.secret}</code></div>
        </div>
      )}
      <input style={{ ...input, letterSpacing: 6, textAlign: "center", fontSize: 18 }} inputMode="numeric" placeholder="000000" value={code} maxLength={6}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => e.key === "Enter" && submitCode()} autoFocus />
      {err && <div style={{ color: C.red, fontSize: 12.5, margin: "2px 0 12px" }}>{err}</div>}
      <button style={{ ...btn, opacity: busy ? 0.7 : 1 }} onClick={submitCode} disabled={busy || code.length < 6}>{busy ? "Verifying…" : "Verify & join"}</button>
    </div></div>
  );

  // form
  return (
    <div style={wrap}>{fonts}<div style={card}>{Brand}
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 12, padding: "8px 11px", background: "#FFFFFF", border: "1px solid #DCE3EC", borderRadius: 9 }}>
        Joining <b style={{ color: C.ink }}>{info.org.legal_name}</b> as a <b style={{ color: C.thread }}>member</b>, invited to <b style={{ color: C.ink }}>{info.email}</b>.
      </div>
      <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 23, fontWeight: 800, margin: "0 0 16px" }}>Accept your invite</h1>
      <div style={{ display: "flex", gap: 10 }}>
        <input style={input} placeholder="First name" value={f.first_name} onChange={(e) => setF((s) => ({ ...s, first_name: e.target.value }))} />
        <input style={input} placeholder="Last name" value={f.last_name} onChange={(e) => setF((s) => ({ ...s, last_name: e.target.value }))} />
      </div>
      <input style={input} type="password" placeholder="Choose a password (min 10 characters)" value={f.password}
        onChange={(e) => setF((s) => ({ ...s, password: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && submit()} />
      {err && <div style={{ color: C.red, fontSize: 12.5, margin: "2px 0 12px" }}>{err}</div>}
      <button style={{ ...btn, opacity: busy ? 0.7 : 1 }} onClick={submit} disabled={busy || !f.first_name || !f.last_name || f.password.length < 10}>
        {busy ? "Please wait…" : "Continue"}
      </button>
      <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 10 }}>Next: set up an authenticator app for two-factor security.</div>
    </div></div>
  );
}

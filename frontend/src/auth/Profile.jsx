import React, { useState } from "react";
import { billingCheckout, billingPortal } from "../lib/api.js";

const C = {
  bg: "#0a0e15", panel: "#121a26", panel2: "#172132", bg2: "#0d121c",
  line: "#243245", line2: "#2f4259", ink: "#e7eef6", muted: "#8d9fb5", faint: "#5d6f86",
  amber: "#ff8a3d", thread: "#48d6c8", green: "#43c277", red: "#f0563a", blue: "#5aa9ff",
};
const mono = "'IBM Plex Mono',monospace";
const btn = { fontFamily: mono, fontSize: 12.5, fontWeight: 600, borderRadius: 9, padding: "10px 14px", cursor: "pointer", border: `1px solid ${C.line2}`, background: C.panel2, color: C.ink };
const btnP = { ...btn, background: `linear-gradient(180deg,${C.amber},#cc6a26)`, border: "none", color: "#1a0f06" };

const PLAN_META = {
  free: { label: "Free", tone: C.muted, blurb: "5 assistant messages per day, reset daily." },
  pro: { label: "Pro", tone: C.amber, blurb: "Unlimited assistant access · $4.99/mo." },
  enterprise: { label: "Enterprise", tone: C.thread, blurb: "Unlimited access for everyone in your company · $29.99/mo." },
};

export function PlanBadge({ plan }) {
  const m = PLAN_META[plan] || PLAN_META.free;
  return <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6, color: m.tone, background: m.tone + "22" }}>★ {m.label}</span>;
}

export default function Profile({ user, onClose }) {
  const isAdmin = user.role === "org_admin" || user.role === "superadmin";
  const plan = user.plan || "free";
  const m = PLAN_META[plan] || PLAN_META.free;
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  const go = async (fn, key) => {
    setBusy(key); setErr("");
    try { const r = await fn(); if (r?.url) window.location.href = r.url; else setBusy(""); }
    catch (e) { setErr(e.message || "Something went wrong"); setBusy(""); }
  };

  const used = user.tokens_used_today ?? 0;
  const limit = user.daily_limit;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(4,7,12,.74)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", padding: 18, fontFamily: "'IBM Plex Sans',sans-serif", color: C.ink }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');`}</style>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, background: `linear-gradient(180deg,${C.panel},${C.bg2})`, border: `1px solid ${C.line2}`, borderRadius: 16, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 20 }}>{user.full_name || user.email}</span>
          <PlanBadge plan={plan} />
          {user.billing_mode === "test" && <span style={{ fontFamily: mono, fontSize: 9.5, fontWeight: 700, padding: "2px 6px", borderRadius: 6, color: C.blue, background: C.blue + "22" }}>TEST MODE</span>}
          <span onClick={onClose} style={{ marginLeft: "auto", cursor: "pointer", color: C.faint, fontSize: 18 }}>✕</span>
        </div>
        <div style={{ color: C.muted, fontSize: 12.5, marginBottom: 18 }}>{user.email} · {user.org?.legal_name}</div>

        <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: m.tone }}>{m.label} plan</span>
          </div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4, marginBottom: 12 }}>{m.blurb}</div>
          {user.unlimited
            ? <div style={{ fontFamily: mono, fontSize: 12, color: C.green }}>✓ Unlimited assistant access</div>
            : <div>
                <div style={{ fontFamily: mono, fontSize: 12, color: C.muted, marginBottom: 6 }}>Today: {used} / {limit} messages used</div>
                <div style={{ height: 8, borderRadius: 99, background: C.bg2, overflow: "hidden" }}>
                  <div style={{ width: Math.min(100, (used / (limit || 1)) * 100) + "%", height: "100%", background: used >= (limit || 5) ? C.red : C.amber }} />
                </div>
              </div>}
        </div>

        {err && <div style={{ color: C.red, fontSize: 12.5, marginBottom: 12 }}>✕ {err}</div>}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {plan === "free" && (
            <button style={btnP} disabled={busy === "pro"} onClick={() => go(() => billingCheckout("pro"), "pro")}>
              {busy === "pro" ? "Opening…" : "Upgrade to Pro · $4.99/mo"}
            </button>
          )}
          {isAdmin && plan !== "enterprise" && (
            <button style={{ ...btn, borderColor: C.thread, color: C.thread }} disabled={busy === "ent"} onClick={() => go(() => billingCheckout("enterprise"), "ent")}>
              {busy === "ent" ? "Opening…" : "Company → Enterprise · $29.99/mo"}
            </button>
          )}
          {plan !== "free" && (
            <button style={btn} disabled={busy === "portal"} onClick={() => go(billingPortal, "portal")}>
              {busy === "portal" ? "Opening…" : "Manage subscription"}
            </button>
          )}
        </div>
        {isAdmin && (
          <div style={{ fontSize: 11.5, color: C.faint, marginTop: 14, lineHeight: 1.5 }}>
            Enterprise gives unlimited access to everyone in {user.org?.legal_name}. Per-user usage is in Admin → Membership &amp; usage.
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { billingCheckout, billingPortal } from "../lib/api.js";

const C = {
  bg: "#F4F6FA", panel: "#F5F8FC", panel2: "#EEF2F7", bg2: "#FFFFFF",
  line: "#DCE3EC", line2: "#C6D2E0", ink: "#15222D", muted: "#47606F", faint: "#5d6f86",
  amber: "#2A46C4", thread: "#3E6FE0", green: "#43c277", red: "#f0563a", blue: "#5aa9ff",
};
const mono = "'IBM Plex Mono',monospace";
const btn = { fontFamily: mono, fontSize: 12.5, fontWeight: 600, borderRadius: 9, padding: "10px 14px", cursor: "pointer", border: `1px solid ${C.line2}`, background: C.panel2, color: C.ink };
const btnP = { ...btn, background: `linear-gradient(180deg,${C.amber},#1B2E8C)`, border: "none", color: "#ffffff" };

const PLAN_META = {
  free: { label: "Free", tone: C.muted, blurb: "5 assistant messages per day, reset daily." },
  pro: { label: "Pro", tone: C.amber, blurb: "Unlimited assistant access · $4.99/mo." },
  enterprise: { label: "Enterprise", tone: C.thread, blurb: "Unlimited access for everyone in your company · $29.99/mo." },
};

export function PlanBadge({ plan }) {
  const m = PLAN_META[plan] || PLAN_META.free;
  return <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6, color: m.tone, background: m.tone + "22" }}>★ {m.label}</span>;
}

export function PlanCompare({ onClose, isAdmin }) {
  const [busy, setBusy] = useState("");
  const go = async (plan) => {
    setBusy(plan);
    try { const r = await billingCheckout(plan); if (r?.url) window.location.href = r.url; else setBusy(""); }
    catch { setBusy(""); }
  };
  const cols = [
    { key: "free", label: "Free", tone: C.muted, price: "$0" },
    { key: "pro", label: "Pro", tone: C.amber, price: "$4.99 / user · mo" },
    { key: "enterprise", label: "Enterprise", tone: C.thread, price: "$29.99 / mo" },
  ];
  const rows = [
    ["Assistant messages", "5 / day per user", "Unlimited", "Unlimited"],
    ["Who's covered", "Everyone (capped)", "Just you", "Everyone in the company"],
    ["Future invited members", "Capped at 5 / day", "—", "Included, unlimited"],
    ["Billing", "—", "Per user", "One subscription (admin pays)"],
    ["Best for", "Trying it out", "A single heavy user", "The whole team"],
  ];
  const cell = { padding: "10px 12px", fontSize: 12.5, borderTop: `1px solid ${C.line}` };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 420, background: "rgba(4,7,12,.78)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", padding: 18, fontFamily: "'IBM Plex Sans',sans-serif", color: C.ink }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');`}</style>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 720, background: `linear-gradient(180deg,${C.panel},${C.bg2})`, border: `1px solid ${C.line2}`, borderRadius: 16, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 20 }}>Compare plans</span>
          <span onClick={onClose} style={{ marginLeft: "auto", cursor: "pointer", color: C.faint, fontSize: 18 }}>✕</span>
        </div>
        <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr 1fr" }}>
            <div style={{ padding: "12px" }} />
            {cols.map((c) => (
              <div key={c.key} style={{ padding: "12px", textAlign: "center" }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: c.tone }}>★ {c.label}</div>
                <div style={{ fontFamily: mono, fontSize: 11, color: C.muted, marginTop: 3 }}>{c.price}</div>
              </div>
            ))}
            {rows.map((r, ri) => (
              <React.Fragment key={ri}>
                <div style={{ ...cell, color: C.muted, fontWeight: 600 }}>{r[0]}</div>
                <div style={{ ...cell, textAlign: "center", color: C.faint }}>{r[1]}</div>
                <div style={{ ...cell, textAlign: "center", color: C.ink }}>{r[2]}</div>
                <div style={{ ...cell, textAlign: "center", color: C.ink }}>{r[3]}</div>
              </React.Fragment>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18, flexWrap: "wrap" }}>
          <button style={btnP} disabled={busy === "pro"} onClick={() => go("pro")}>{busy === "pro" ? "Opening…" : "Get Pro · $4.99/mo"}</button>
          {isAdmin && <button style={{ ...btn, borderColor: C.thread, color: C.thread }} disabled={busy === "enterprise"} onClick={() => go("enterprise")}>{busy === "enterprise" ? "Opening…" : "Get Enterprise · $29.99/mo"}</button>}
        </div>
      </div>
    </div>
  );
}

export default function Profile({ user, onClose }) {
  const isAdmin = user.role === "org_admin" || user.role === "superadmin";
  const plan = user.plan || "free";
  const m = PLAN_META[plan] || PLAN_META.free;
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [compare, setCompare] = useState(false);

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
          <button style={{ ...btn, background: "transparent", borderColor: C.line }} onClick={() => setCompare(true)}>Compare plans</button>
        </div>
        {compare && <PlanCompare onClose={() => setCompare(false)} isAdmin={isAdmin} />}
        {isAdmin && (
          <div style={{ fontSize: 11.5, color: C.faint, marginTop: 14, lineHeight: 1.5 }}>
            Enterprise gives unlimited access to everyone in {user.org?.legal_name}. Per-user usage is in Admin → Membership &amp; usage.
          </div>
        )}
      </div>
    </div>
  );
}

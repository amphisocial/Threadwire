import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./ThreadWire.jsx";
import Login from "./auth/Login.jsx";
import Admin from "./auth/Admin.jsx";
import InviteAccept from "./auth/InviteAccept.jsx";
import Profile, { PlanBadge } from "./auth/Profile.jsx";
import CaseStudies from "./pages/CaseStudies.jsx";
import OntologyStudio from "./ontology/OntologyStudio.jsx";
import AgentStudio from "./agents/AgentStudio.jsx";
import { getMe, logout, billingConfirm } from "./lib/api.js";

const center = { minHeight: "100vh", display: "grid", placeItems: "center", background: "#F4F6FA", color: "#47606F", fontFamily: "'IBM Plex Mono',monospace" };

function Root() {
  const params = new URLSearchParams(window.location.search);
  const inviteToken = (window.location.pathname === "/invite" && params.get("token")) || params.get("invite");

  const [state, setState] = useState({ loading: true, user: null });
  const [showAuth, setShowAuth] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [workspace, setWorkspace] = useState("operations");

  const refresh = () =>
    getMe().then((u) => setState({ loading: false, user: u })).catch(() => setState({ loading: false, user: null }));

  useEffect(() => { if (!inviteToken) refresh(); }, []);

  // Stripe Checkout return: confirm the session, then clean the URL and refresh.
  useEffect(() => {
    if (params.get("billing") === "success" && params.get("session_id")) {
      billingConfirm(params.get("session_id")).catch(() => {}).finally(() => {
        window.history.replaceState({}, "", "/");
        refresh();
      });
    } else if (params.get("billing")) {
      window.history.replaceState({}, "", "/");
    }
  }, []);

  // Invite link always wins — public accept flow.
  if (inviteToken) return <InviteAccept token={inviteToken} />;

  if (state.loading) return <div style={center}>Loading…</div>;
  // Public case-studies / whitepapers library (also usable by the signed-in site admin CMS).
  if (window.location.pathname === "/case-studies") return <CaseStudies user={state.user} />;
  if (showAuth && !state.user) return <Login onAuthed={() => { setShowAuth(false); refresh(); }} onCancel={() => setShowAuth(false)} />;
  if (adminOpen && state.user) return <Admin user={state.user} onClose={() => setAdminOpen(false)} />;

  const pill = { position: "fixed", bottom: 16, zIndex: 70, fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, borderRadius: 999, padding: "8px 14px", cursor: "pointer", backdropFilter: "blur(8px)" };
  const workspaceButton = (active) => ({
    border: 0, borderRadius: 8, padding: "7px 11px", cursor: "pointer",
    color: active ? "#fff" : "#47606F", background: active ? "#2A46C4" : "transparent",
    font: "600 11px 'IBM Plex Mono',monospace",
  });

  return (
    <>
      {state.user && workspace === "operations" && (
        <div aria-label="Threadwire workspace tabs" style={{ position: "fixed", top: 10, left: "50%", transform: "translateX(-50%)", zIndex: 95, display: "flex", gap: 3, padding: 4, borderRadius: 11, background: "rgba(255,255,255,.94)", border: "1px solid #DCE3EC", boxShadow: "0 8px 30px rgba(21,34,45,.12)", backdropFilter: "blur(10px)" }}>
          <button onClick={() => setWorkspace("operations")} style={workspaceButton(workspace === "operations")}>Operations</button>
          <button onClick={() => setWorkspace("ontology")} style={workspaceButton(workspace === "ontology")}>Ontology</button>
          <button onClick={() => setWorkspace("studio")} style={workspaceButton(workspace === "studio")}>AI Studio</button>
        </div>
      )}

      {workspace === "ontology" && state.user
        ? <OntologyStudio user={state.user} onBack={() => setWorkspace("operations")} />
        : workspace === "studio" && state.user
        ? <AgentStudio user={state.user} onBack={() => setWorkspace("operations")} />
        : <App user={state.user} />}

      {state.user ? (
        <>
          <button onClick={() => setAdminOpen(true)}
            style={{ ...pill, left: 16, color: "#fff", background: "linear-gradient(180deg,#2A46C4,#1B2E8C)", border: "none", fontWeight: 600 }}>
            {state.user.role === "org_admin" || state.user.role === "superadmin" ? "⚙ Admin" : "⚙ Connections"}
          </button>

          <button onClick={() => logout().then(() => { setWorkspace("operations"); refresh(); })} title={`Signed in as ${state.user.email}`}
            style={{ ...pill, left: 132, color: "#47606F", background: "rgba(255,255,255,.9)", border: "1px solid #DCE3EC" }}>
            Sign out
          </button>
          <button onClick={() => setProfileOpen(true)} title="Profile & subscription"
            style={{ ...pill, left: 214, color: "#15222D", background: "rgba(255,255,255,.9)", border: "1px solid #DCE3EC", display: "flex", alignItems: "center", gap: 7 }}>
            {state.user.full_name || state.user.email} <PlanBadge plan={state.user.plan} />
          </button>
          {profileOpen && <Profile user={state.user} onClose={() => setProfileOpen(false)} />}
        </>
      ) : (
        <button onClick={() => setShowAuth(true)}
          style={{ ...pill, left: 16, color: "#fff", background: "linear-gradient(180deg,#2A46C4,#1B2E8C)", border: "none", fontWeight: 600 }}>
          Sign up / Log in
        </button>
      )}
    </>
  );
}

createRoot(document.getElementById("root")).render(<Root />);

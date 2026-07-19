#!/usr/bin/env python3
# Apply the Threadwire signed-in AI/Postgres context fix without git apply.
#
# Run from the Threadwire repository root:
#   python3 apply_threadwire_ai_fix.py --check
#   python3 apply_threadwire_ai_fix.py
#   git diff --check
#   git diff --stat

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(
            f"{label}: expected exactly one matching source block, found {count}. "
            "No files were changed."
        )
    return text.replace(old, new, 1)


def update_config(text: str) -> str:
    old = '''    ai_provider = os.environ.get("AI_MODEL", "anthropic").strip().lower()
'''
    new = '''    # AI_MODEL is the documented setting. Accept older aliases as well so
    # existing deployments do not silently fall back to Anthropic.
    ai_provider = (
        os.environ.get("AI_MODEL")
        or os.environ.get("AI_PROVIDER")
        or os.environ.get("AI_Provider")
        or "anthropic"
    ).strip().lower()
'''
    return replace_once(text, old, new, "backend/app/config.py provider setting")


def update_backend(text: str) -> str:
    old = '''class ChatIn(BaseModel):
    system: Optional[str] = Field(default=None, max_length=120000)
    messages: list[ChatMessage] = Field(min_length=1, max_length=16)
'''
    new = '''class ChatIn(BaseModel):
    system: Optional[str] = Field(default=None, max_length=120000)
    messages: list[ChatMessage] = Field(min_length=1, max_length=16)
    page: Optional[str] = Field(default=None, max_length=40)
'''
    text = replace_once(text, old, new, "backend/app/main.py ChatIn")

    marker = '''    return "\\n".join(parts)


@app.post("/api/ai/chat")
'''
    insertion = '''    return "\\n".join(parts)


PAGE_CONTEXT_TABLES = {
    "visibility": ("sales_orders", "blockers"),
    "blockers": ("blockers", "sales_orders", "work_orders"),
    "finance": ("sales_orders", "blockers"),
    "thread": ("parts", "boms", "work_orders", "sales_orders", "vendors", "vendor_parts"),
    "directspend": ("parts", "boms", "vendors", "vendor_parts"),
    "quotes": ("quotes",),
    "compliance": ("lots", "inspections", "ncrs", "documents"),
    "workforce": ("wf_people", "wf_projects", "wf_allocations", "wf_requests", "wf_baselines"),
}


async def _page_db_context(con, org_id, page: Optional[str]) -> str:
    # Return bounded, organization-scoped rows for the active application page.
    # Table names come only from PAGE_CONTEXT_TABLES.
    tables = PAGE_CONTEXT_TABLES.get((page or "").strip().lower(), ())
    if not tables:
        return ""

    sections = [
        "SERVER DATABASE CONTEXT (Postgres, organization-scoped, authoritative). "
        "This data overrides sample/demo records embedded in the client prompt."
    ]
    for table in tables:
        try:
            rows = await con.fetch(
                f"SELECT to_jsonb(t) - 'org_id' - 'content_text' AS payload "
                f"FROM {table} AS t WHERE org_id=$1 LIMIT 60",
                org_id,
            )
        except Exception:
            # Optional product tables may not be installed for every tenant.
            continue
        if rows:
            payload = [r["payload"] for r in rows]
            sections.append(f"{table.upper()} = {json.dumps(payload, default=str)}")

    if len(sections) == 1:
        return ""
    return "\\n".join(sections)[:60000]


@app.post("/api/ai/chat")
'''
    text = replace_once(text, marker, insertion, "backend/app/main.py page context insertion")

    old = '''@app.post("/api/ai/chat")
async def ai_chat(body: ChatIn, user: dict = Depends(current_user)):
    messages = [{"role": ("assistant" if m.role == "assistant" else "user"), "content": m.content}
                for m in body.messages]
    system = body.system or ""
    unlimited = is_unlimited(user)
    async with db.pool().acquire() as con:
        if not unlimited:
            used = await usage_today(con, user["user_id"])
            if used >= settings.free_daily_tokens:
                return {"text": ("You've used all %d free assistant messages for today. "
                                 "Upgrade to ThreadWire Pro for unlimited access from your profile "
                                 "(your name, bottom-left), or check back tomorrow when your free "
                                 "messages reset." % settings.free_daily_tokens),
                        "limit": True, "tokens_used_today": used, "daily_limit": settings.free_daily_tokens}
        try:
            summary = await importer.org_data_summary(con, user["org_id"])
            if summary:
                system = (system + "\\n\\n" + summary) if system else summary
        except Exception:
            pass
        try:
            csum = await _compliance_context(con, user["org_id"], messages[-1]["content"] if messages else "")
            if csum:
                system = (system + "\\n\\n" + csum) if system else csum
        except Exception:
            pass
        await bump_usage(con, user["user_id"], user["org_id"])
    text = await ai_complete(system, messages)
    return {"text": text}
'''
    new = '''@app.post("/api/ai/chat")
async def ai_chat(body: ChatIn, user: dict = Depends(current_user)):
    messages = [{"role": ("assistant" if m.role == "assistant" else "user"), "content": m.content}
                for m in body.messages]
    system = body.system or ""
    question = messages[-1]["content"] if messages else ""
    unlimited = is_unlimited(user)

    async with db.pool().acquire() as con:
        if not unlimited:
            used = await usage_today(con, user["user_id"])
            if used >= settings.free_daily_tokens:
                return {"text": ("You've used all %d free assistant messages for today. "
                                 "Upgrade to ThreadWire Pro for unlimited access from your profile "
                                 "(your name, bottom-left), or check back tomorrow when your free "
                                 "messages reset." % settings.free_daily_tokens),
                        "limit": True, "tokens_used_today": used, "daily_limit": settings.free_daily_tokens}
        try:
            summary = await importer.org_data_summary(con, user["org_id"])
            if summary:
                system = (system + "\\n\\n" + summary) if system else summary
        except Exception:
            pass
        try:
            csum = await _compliance_context(con, user["org_id"], question)
            if csum:
                system = (system + "\\n\\n" + csum) if system else csum
        except Exception:
            pass
        try:
            page_context = await _page_db_context(con, user["org_id"], body.page)
            if page_context:
                system = (system + "\\n\\n" + page_context) if system else page_context
        except Exception:
            pass

    text = await ai_complete(system, messages)
    if not text:
        raise HTTPException(
            status_code=503,
            detail=(
                "AI provider returned no answer. Check AI_MODEL/AI_PROVIDER, "
                "the provider API key, model name, billing/quota, and threadwire-api logs."
            ),
        )

    # Count only successful model responses.
    async with db.pool().acquire() as con:
        await bump_usage(con, user["user_id"], user["org_id"])

    return {"text": text}
'''
    return replace_once(text, old, new, "backend/app/main.py ai_chat")


def update_frontend(text: str) -> str:
    old = '''async function askClaude(system, userText, history = []) {
  try {
    const messages = [...(history || []), { role: "user", content: userText }];
    const res = await fetch("/api/ai/chat", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ messages: messages.map((m) => ({ role: m.role, content: m.content })), system: system || "" }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data && typeof data.text === "string") ? data.text : null;
  } catch (e) { return null; }
}
'''
    new = '''async function askClaude(system, userText, history = [], page = "home") {
  const messages = [...(history || []), { role: "user", content: userText }];
  const res = await fetch("/api/ai/chat", {
    method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
    body: JSON.stringify({
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      system: system || "",
      page,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || `AI request failed (${res.status})`);
  if (!data || typeof data.text !== "string" || !data.text.trim()) {
    throw new Error("AI provider returned an empty response");
  }
  return data.text.trim();
}
'''
    text = replace_once(text, old, new, "frontend askClaude")

    text = replace_once(
        text,
        'function DockedAssistant({ route, chat, update, open, setOpen, botCtx, snapshot }) {',
        'function DockedAssistant({ route, chat, update, open, setOpen, botCtx, snapshot, backend }) {',
        "frontend DockedAssistant signature",
    )

    old = '''    const sys = cfg.system + (snapshot ? "\\n\\n" + snapshot : "") + screenCtx + wfCtx;
    const reply = await askClaude(sys, q, hist);
    const out = reply || cfg.fallback(q, botCtx);
    update(route, (c) => ({
      msgs: [...c.msgs, { role: "bot", text: out, offline: !reply }],
      hist: [...c.hist, { role: "user", content: q }, { role: "assistant", content: out }].slice(-8),
    }));
'''
    new = '''    const liveGuard = backend
      ? "\\n\\nSIGNED-IN MODE: Ignore sample/demo records embedded earlier. "
        + "Use SERVER DATABASE CONTEXT and LIVE THREADWIRE DATA as authoritative. "
        + "If the requested information is absent, say it is unavailable; do not invent it."
      : "";
    const sys = cfg.system + liveGuard + (snapshot ? "\\n\\n" + snapshot : "") + screenCtx + wfCtx;
    let out;
    let offline = false;
    try {
      out = await askClaude(sys, q, hist, route);
    } catch (e) {
      if (backend) {
        out = `AI assistant unavailable: ${e?.message || "provider error"}`;
      } else {
        out = cfg.fallback(q, botCtx);
        offline = true;
      }
    }
    update(route, (c) => ({
      msgs: [...c.msgs, { role: "bot", text: out, offline }],
      hist: [...c.hist, { role: "user", content: q }, { role: "assistant", content: out }].slice(-8),
    }));
'''
    text = replace_once(text, old, new, "frontend assistant send block")

    text = replace_once(
        text,
        '>offline reasoning over sample data</div>}',
        '>offline demo reasoning</div>}',
        "frontend offline label",
    )

    old = '''          <span className="tf-mono" style={{ fontSize: 12, color: "var(--faint)", marginLeft: "auto" }}>Sample data · Connect your ERP to go live</span>
'''
    new = '''          <span className="tf-mono" style={{ fontSize: 12, color: "var(--faint)", marginLeft: "auto" }}>
            {backend ? "Signed in · organization-scoped data" : "Sample data · Connect your ERP to go live"}
          </span>
'''
    text = replace_once(text, old, new, "frontend footer")

    old = '''      <DockedAssistant route={route} chat={chats[route]} update={updateChat} open={dockOpen} setOpen={setDockOpen} botCtx={botCtx} snapshot={aiContext} />
'''
    new = '''      <DockedAssistant route={route} chat={chats[route]} update={updateChat} open={dockOpen} setOpen={setDockOpen} botCtx={botCtx} snapshot={aiContext} backend={backend} />
'''
    return replace_once(text, old, new, "frontend DockedAssistant invocation")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--check",
        action="store_true",
        help="Verify expected source blocks, but do not write files.",
    )
    args = parser.parse_args()

    root = Path.cwd()
    paths = {
        "config": root / "backend/app/config.py",
        "backend": root / "backend/app/main.py",
        "frontend": root / "frontend/src/ThreadWire.jsx",
    }

    missing = [str(p) for p in paths.values() if not p.is_file()]
    if missing:
        print("Run this script from the Threadwire repository root.", file=sys.stderr)
        print("Missing:", *missing, sep="\\n  ", file=sys.stderr)
        return 2

    original = {name: path.read_text(encoding="utf-8") for name, path in paths.items()}

    try:
        updated = {
            "config": update_config(original["config"]),
            "backend": update_backend(original["backend"]),
            "frontend": update_frontend(original["frontend"]),
        }
    except RuntimeError as exc:
        print(f"CHECK FAILED: {exc}", file=sys.stderr)
        return 1

    print("All expected source blocks matched.")
    for name, path in paths.items():
        delta = len(updated[name]) - len(original[name])
        print(f"  {path.relative_to(root)}: ready ({delta:+d} bytes)")

    if args.check:
        print("Check only: no files changed.")
        return 0

    for name, path in paths.items():
        backup = path.with_name(path.name + ".bak-before-ai-fix")
        if not backup.exists():
            shutil.copy2(path, backup)
        path.write_text(updated[name], encoding="utf-8")

    print("Fix applied.")
    print("Next:")
    print("  git diff --check")
    print("  git diff --stat")
    print("  bash redeploy.sh")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

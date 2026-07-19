#!/usr/bin/env python3
# Fix Threadwire /api/ai/chat 422 errors after the Postgres-context update.
#
# Run from the Threadwire repository root:
#   python3 fix_threadwire_ai_422.py --check
#   python3 fix_threadwire_ai_422.py
#   git diff --check
#   bash redeploy.sh

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 match, found {count}; no file changed")
    return text.replace(old, new, 1)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    path = Path.cwd() / "frontend/src/ThreadWire.jsx"
    if not path.is_file():
        print("Run from the Threadwire repository root.", file=sys.stderr)
        return 2

    original = path.read_text(encoding="utf-8")
    updated = original

    old = '''  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || `AI request failed (${res.status})`);
  if (!data || typeof data.text !== "string" || !data.text.trim()) {
'''
    new = '''  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((e) => `${(e.loc || []).join(".")}: ${e.msg || JSON.stringify(e)}`).join("; ")
          : detail
            ? JSON.stringify(detail)
            : `AI request failed (${res.status})`;
    throw new Error(message);
  }
  if (!data || typeof data.text !== "string" || !data.text.trim()) {
'''
    updated = replace_once(updated, old, new, "structured FastAPI error display")

    old = '''    const screenCtx = (route === "thread" && typeof window !== "undefined" && window.__twDigitalThreadCtx && window.__twDigitalThreadCtx.combined) ? "\\n\\n" + window.__twDigitalThreadCtx.combined : "";
    const wfCtx = (route === "workforce" && typeof window !== "undefined" && window.__twWorkforceCtx) ? "\\n\\n" + window.__twWorkforceCtx : "";
'''
    new = '''    // Signed-in requests receive organization-scoped context from Postgres in
    // /api/ai/chat. Do not resend the complete browser snapshot: it can exceed
    // ChatIn.system's validation limit and is not the authoritative data source.
    const screenCtx = (!backend && route === "thread" && typeof window !== "undefined" && window.__twDigitalThreadCtx && window.__twDigitalThreadCtx.combined) ? "\\n\\n" + window.__twDigitalThreadCtx.combined : "";
    const wfCtx = (!backend && route === "workforce" && typeof window !== "undefined" && window.__twWorkforceCtx) ? "\\n\\n" + window.__twWorkforceCtx : "";
'''
    updated = replace_once(updated, old, new, "signed-in page context suppression")

    old = '''    const sys = cfg.system + liveGuard + (snapshot ? "\\n\\n" + snapshot : "") + screenCtx + wfCtx;
'''
    new = '''    const clientSnapshot = !backend && snapshot ? "\\n\\n" + snapshot : "";
    const sys = cfg.system + liveGuard + clientSnapshot + screenCtx + wfCtx;
'''
    updated = replace_once(updated, old, new, "signed-in snapshot suppression")

    if args.check:
        print("All expected blocks matched. No file changed.")
        return 0

    backup = path.with_name(path.name + ".bak-before-422-fix")
    if not backup.exists():
        shutil.copy2(path, backup)
    path.write_text(updated, encoding="utf-8")

    print("Applied frontend 422 fix.")
    print("Next:")
    print("  git diff --check")
    print("  git diff -- frontend/src/ThreadWire.jsx")
    print("  bash redeploy.sh")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

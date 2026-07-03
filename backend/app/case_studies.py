"""Case Studies / whitepapers library.

Public, site-level content (not tenant data):

  GET    /api/case-studies                 -> published items, newest first
                                              (site admin also sees drafts)
  GET    /api/case-studies/{id}            -> one item incl. extracted HTML (docx)
  GET    /api/case-studies/{id}/file       -> the original file, served inline
                                              (?download=1 forces attachment)
  POST   /api/case-studies                 -> upload (site admin only, multipart)
  PATCH  /api/case-studies/{id}            -> edit metadata / publish toggle
  DELETE /api/case-studies/{id}            -> remove row + stored file

"Site admin" = users.role == 'superadmin' (the platform owner). This is
deliberately distinct from 'org_admin', which is a *customer's* admin and has
no access here. Files go through storage.py (S3 or local dir) under the
site-level prefix "site/case_studies/…" so they never mix with org documents.

.docx uploads are converted to HTML with mammoth at upload time so visitors
can read them in the browser; PDFs are rendered by the browser's own viewer.
"""
import io
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from . import db, storage

router = APIRouter()

COOKIE = "tw_session"
MAX_BYTES = 30 * 1024 * 1024  # 30 MB

_KIND_BY_EXT = {".pdf": "pdf", ".docx": "docx", ".doc": "doc"}
_CTYPE_BY_KIND = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "doc": "application/msword",
}


# --------------------------------------------------------------------------- #
# auth helpers (local copies — main.py imports this module, so we can't import
# main.py back without a cycle)
# --------------------------------------------------------------------------- #
async def _session_user(request: Request) -> Optional[dict]:
    raw = request.cookies.get(COOKIE)
    if not raw:
        return None
    try:
        sid = uuid.UUID(raw)
    except ValueError:
        return None
    async with db.pool().acquire() as con:
        row = await con.fetchrow(
            """
            SELECT u.id AS user_id, u.email, u.full_name, u.role,
                   u.mfa_enabled, s.mfa_passed
            FROM sessions s JOIN users u ON u.id = s.user_id
            WHERE s.id = $1 AND s.expires_at > now()
            """, sid)
    if not row:
        return None
    if row["mfa_enabled"] and not row["mfa_passed"]:
        return None
    return dict(row)


async def _require_site_admin(request: Request) -> dict:
    user = await _session_user(request)
    if not user:
        raise HTTPException(401, "Not authenticated")
    if user["role"] != "superadmin":
        # org_admin is a customer-side admin and explicitly NOT enough here.
        raise HTTPException(403, "Site admin access required")
    return user


def _is_site_admin(user: Optional[dict]) -> bool:
    return bool(user and user.get("role") == "superadmin")


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #
def _kind_for(filename: str) -> str:
    name = (filename or "").lower()
    for ext, kind in _KIND_BY_EXT.items():
        if name.endswith(ext):
            return kind
    raise HTTPException(400, "Only PDF (.pdf) and Word (.docx, .doc) files are supported")


def _safe_filename(filename: str) -> str:
    safe = "".join(c for c in (filename or "upload") if c.isalnum() or c in "._- ").strip()
    return safe.replace(" ", "_") or "upload"


def _docx_to_html(data: bytes) -> Optional[str]:
    """Convert a .docx to clean HTML for in-browser reading. Best-effort."""
    try:
        import mammoth
        html = mammoth.convert_to_html(io.BytesIO(data)).value or ""
    except Exception:
        return None
    # Defence in depth: the file comes from the site admin, but strip anything
    # executable before it is ever injected into the reader pane.
    html = re.sub(r"(?is)<script.*?>.*?</script>", "", html)
    html = re.sub(r"(?is)\son\w+\s*=\s*(\"[^\"]*\"|'[^']*'|[^\s>]+)", "", html)
    html = re.sub(r"(?i)javascript\s*:", "", html)
    return html.strip() or None


def _parse_date(value: str) -> datetime:
    """Accept YYYY-MM-DD or full ISO; default to now."""
    v = (value or "").strip()
    if not v:
        return datetime.now(timezone.utc)
    try:
        if len(v) == 10:
            return datetime.strptime(v, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        return datetime.fromisoformat(v.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(400, "published_at must be an ISO date (YYYY-MM-DD)")


def _row_out(r, admin: bool) -> dict:
    out = {
        "id": str(r["id"]),
        "title": r["title"],
        "summary": r["summary"],
        "filename": r["filename"],
        "file_kind": r["file_kind"],
        "size_bytes": r["size_bytes"],
        "published_at": r["published_at"].isoformat(),
        "has_html": bool(r.get("has_html")),
    }
    if admin:
        out["published"] = r["published"]
    return out


# --------------------------------------------------------------------------- #
# public read
# --------------------------------------------------------------------------- #
@router.get("/api/case-studies")
async def list_case_studies(request: Request):
    user = await _session_user(request)
    admin = _is_site_admin(user)
    q = ("SELECT id, title, summary, filename, file_kind, size_bytes, published, "
         "published_at, (html_content IS NOT NULL) AS has_html FROM case_studies ")
    if not admin:
        q += "WHERE published "
    q += "ORDER BY published_at DESC, created_at DESC"
    async with db.pool().acquire() as con:
        rows = await con.fetch(q)
    return {"is_site_admin": admin, "items": [_row_out(r, admin) for r in rows]}


@router.get("/api/case-studies/{cs_id}")
async def get_case_study(cs_id: uuid.UUID, request: Request):
    user = await _session_user(request)
    admin = _is_site_admin(user)
    async with db.pool().acquire() as con:
        r = await con.fetchrow(
            "SELECT id, title, summary, filename, file_kind, size_bytes, published, "
            "published_at, html_content, (html_content IS NOT NULL) AS has_html "
            "FROM case_studies WHERE id = $1", cs_id)
    if not r or (not r["published"] and not admin):
        raise HTTPException(404, "Case study not found")
    out = _row_out(r, admin)
    out["html_content"] = r["html_content"]
    return out


@router.get("/api/case-studies/{cs_id}/file")
async def case_study_file(cs_id: uuid.UUID, request: Request, download: int = 0):
    user = await _session_user(request)
    async with db.pool().acquire() as con:
        r = await con.fetchrow(
            "SELECT filename, content_type, storage_key, published FROM case_studies WHERE id = $1",
            cs_id)
    if not r or (not r["published"] and not _is_site_admin(user)):
        raise HTTPException(404, "Case study not found")
    data = storage.get_object(r["storage_key"])
    if data is None:
        raise HTTPException(404, "File missing from storage")
    disposition = "attachment" if download else "inline"
    return StreamingResponse(
        io.BytesIO(data),
        media_type=r["content_type"] or "application/octet-stream",
        headers={"Content-Disposition": '%s; filename="%s"' % (disposition, r["filename"])})


# --------------------------------------------------------------------------- #
# site-admin write
# --------------------------------------------------------------------------- #
@router.post("/api/case-studies")
async def create_case_study(
    request: Request,
    file: UploadFile = File(...),
    title: str = Form(""),
    summary: str = Form(""),
    published_at: str = Form(""),
    published: bool = Form(True),
):
    user = await _require_site_admin(request)
    kind = _kind_for(file.filename or "")
    data = await file.read()
    if not data:
        raise HTTPException(400, "Empty file")
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "File too large (max 30 MB)")

    safe = _safe_filename(file.filename)
    key = "site/case_studies/%s/%s" % (uuid.uuid4(), safe)
    ctype = _CTYPE_BY_KIND[kind]
    storage.put_object(key, data, ctype)

    html = _docx_to_html(data) if kind == "docx" else None
    when = _parse_date(published_at)

    async with db.pool().acquire() as con:
        row = await con.fetchrow(
            "INSERT INTO case_studies (title, summary, filename, content_type, file_kind, "
            "storage_key, storage, size_bytes, html_content, published, published_at, uploaded_by) "
            "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) "
            "RETURNING id, title, summary, filename, file_kind, size_bytes, published, "
            "published_at, (html_content IS NOT NULL) AS has_html",
            (title or "").strip() or safe, (summary or "").strip(), safe, ctype, kind,
            key, storage.backend_name(), len(data), html, published, when, user["user_id"])
    return _row_out(row, admin=True)


class CaseStudyPatch(BaseModel):
    title: Optional[str] = Field(default=None, max_length=300)
    summary: Optional[str] = Field(default=None, max_length=4000)
    published: Optional[bool] = None
    published_at: Optional[str] = None


@router.patch("/api/case-studies/{cs_id}")
async def update_case_study(cs_id: uuid.UUID, body: CaseStudyPatch, request: Request):
    await _require_site_admin(request)
    sets, args = [], []
    if body.title is not None and body.title.strip():
        args.append(body.title.strip()); sets.append("title = $%d" % len(args))
    if body.summary is not None:
        args.append(body.summary.strip()); sets.append("summary = $%d" % len(args))
    if body.published is not None:
        args.append(body.published); sets.append("published = $%d" % len(args))
    if body.published_at is not None:
        args.append(_parse_date(body.published_at)); sets.append("published_at = $%d" % len(args))
    if not sets:
        raise HTTPException(400, "Nothing to update")
    args.append(cs_id)
    async with db.pool().acquire() as con:
        row = await con.fetchrow(
            "UPDATE case_studies SET %s, updated_at = now() WHERE id = $%d "
            "RETURNING id, title, summary, filename, file_kind, size_bytes, published, "
            "published_at, (html_content IS NOT NULL) AS has_html"
            % (", ".join(sets), len(args)), *args)
    if not row:
        raise HTTPException(404, "Case study not found")
    return _row_out(row, admin=True)


@router.delete("/api/case-studies/{cs_id}")
async def delete_case_study(cs_id: uuid.UUID, request: Request):
    await _require_site_admin(request)
    async with db.pool().acquire() as con:
        row = await con.fetchrow(
            "DELETE FROM case_studies WHERE id = $1 RETURNING storage_key", cs_id)
    if not row:
        raise HTTPException(404, "Case study not found")
    try:
        storage.delete_object(row["storage_key"])
    except Exception:
        pass  # row is gone; a stray file is harmless
    return {"ok": True}

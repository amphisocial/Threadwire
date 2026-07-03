import json
import secrets
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.responses import StreamingResponse
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

from . import billing, connectors_rest, db, emailer, importer, mfa, storage
from .ai import ai_complete
from .config import settings
from .crypto import decrypt_bytes, encrypt_str
from .security import hash_password, verify_password

COOKIE = "tw_session"
CONNECTOR_TYPES = {"jama", "jira", "doors", "jamf", "intune"}

# Starter list of US-registered companies for signup autocomplete.
try:
    COMPANIES = json.loads((Path(__file__).parent / "companies.json").read_text())
except Exception:
    COMPANIES = []


@asynccontextmanager
async def lifespan(_: FastAPI):
    await db.init_pool()
    yield
    await db.close_pool()


app = FastAPI(title="ThreadWire API", lifespan=lifespan)


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #
def normalize_name(name: str) -> str:
    return " ".join(name.lower().split())


def set_session_cookie(resp: Response, sid: str) -> None:
    resp.set_cookie(COOKIE, sid, max_age=settings.session_days * 86400,
                    httponly=True, secure=settings.cookie_secure, samesite="lax", path="/")


async def create_session(con, user_id: uuid.UUID, mfa_passed: bool = True) -> str:
    expires = datetime.now(timezone.utc) + timedelta(days=settings.session_days)
    sid = await con.fetchval(
        "INSERT INTO sessions (user_id, expires_at, mfa_passed) VALUES ($1, $2, $3) RETURNING id",
        user_id, expires, mfa_passed)
    return str(sid)


async def load_session(request: Request):
    """Return the session+user row (including mfa fields) or None. Does NOT
    enforce the MFA gate — used by the verify endpoint and current_user."""
    raw = request.cookies.get(COOKIE)
    if not raw:
        return None
    try:
        sid = uuid.UUID(raw)
    except ValueError:
        return None
    async with db.pool().acquire() as con:
        return await con.fetchrow(
            """
            SELECT s.id AS session_id, s.mfa_passed,
                   u.id AS user_id, u.email, u.full_name, u.role, u.mfa_enabled, u.mfa_secret,
                   u.plan, u.stripe_customer_id,
                   o.id AS org_id, o.legal_name,
                   o.enterprise, o.stripe_customer_id AS org_stripe_customer_id
            FROM sessions s
            JOIN users u ON u.id = s.user_id
            JOIN organizations o ON o.id = u.org_id
            WHERE s.id = $1 AND s.expires_at > now()
            """, sid)


async def current_user(request: Request) -> dict:
    row = await load_session(request)
    if not row:
        raise HTTPException(401, "Not authenticated")
    if row["mfa_enabled"] and not row["mfa_passed"]:
        raise HTTPException(401, "MFA required")
    return dict(row)


def user_public(row) -> dict:
    return {"email": row["email"], "full_name": row["full_name"],
            "role": row["role"], "org": {"legal_name": row["legal_name"]}}


def is_unlimited(user) -> bool:
    return bool(user.get("enterprise")) or (user.get("plan") == "pro")


def plan_label(user) -> str:
    if user.get("enterprise"):
        return "enterprise"
    return user.get("plan") or "free"


async def usage_today(con, user_id) -> int:
    row = await con.fetchrow(
        "SELECT tokens FROM usage_daily WHERE user_id = $1 AND usage_date = CURRENT_DATE", user_id)
    return row["tokens"] if row else 0


async def bump_usage(con, user_id, org_id) -> None:
    await con.execute(
        "INSERT INTO usage_daily (user_id, org_id, usage_date, tokens) VALUES ($1,$2,CURRENT_DATE,1) "
        "ON CONFLICT (user_id, usage_date) DO UPDATE SET tokens = usage_daily.tokens + 1",
        user_id, org_id)


# --------------------------------------------------------------------------- #
# schemas
# --------------------------------------------------------------------------- #
class RegisterIn(BaseModel):
    company_legal_name: str = Field(min_length=2, max_length=200)
    state_of_incorporation: Optional[str] = Field(default=None, max_length=60)
    full_name: Optional[str] = Field(default=None, max_length=120)
    email: EmailStr
    password: str = Field(min_length=10, max_length=200)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class CodeIn(BaseModel):
    code: str = Field(min_length=4, max_length=12)


class ConnectorIn(BaseModel):
    auth_method: str = Field(default="api_token")
    config: dict = Field(default_factory=dict)
    secret: Optional[str] = None


class ChatMessage(BaseModel):
    role: str
    content: str = Field(max_length=8000)


class ChatIn(BaseModel):
    system: Optional[str] = Field(default=None, max_length=120000)
    messages: list[ChatMessage] = Field(min_length=1, max_length=16)


# --------------------------------------------------------------------------- #
# health + company lookup
# --------------------------------------------------------------------------- #
@app.get("/api/health")
async def health():
    return {"ok": True}


class ContactIn(BaseModel):
    company: str = Field(..., min_length=1, max_length=200)
    name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    phone: str = Field("", max_length=50)
    preferred_contact: str = Field("Email", max_length=50)
    website: str = Field("", max_length=300)
    captcha_token: str = Field(..., min_length=1)  # client-side honeypot value; "ok" means passed


@app.post("/api/contact")
async def contact(body: ContactIn):
    # Simple honeypot check — real bots fill hidden fields; JS sets this to "ok"
    if body.captcha_token != "ok":
        raise HTTPException(status_code=400, detail="Captcha check failed")
    sent = emailer.send_contact_email(
        company=body.company,
        name=body.name,
        email=body.email,
        phone=body.phone,
        preferred_contact=body.preferred_contact,
        website=body.website,
    )
    # Always return success to the user — if SMTP isn't configured the submission is lost
    # gracefully rather than showing an error (add logging here if needed).
    return {"ok": True, "delivered": sent}


async def companies_search(q: str = ""):
    ql = q.strip().lower()
    if len(ql) < 2:
        return []
    out, seen = [], set()
    # Companies already registered on ThreadWire come first (so teammates pick them).
    async with db.pool().acquire() as con:
        rows = await con.fetch(
            "SELECT legal_name, state_of_incorporation FROM organizations "
            "WHERE normalized_name LIKE '%' || $1 || '%' ORDER BY legal_name LIMIT 10", ql)
    for r in rows:
        norm = " ".join(r["legal_name"].lower().split())
        if norm in seen:
            continue
        seen.add(norm)
        out.append({"name": r["legal_name"], "state": r["state_of_incorporation"] or "", "registered": True})
    # Then the well-known seed list.
    for c in COMPANIES:
        norm = " ".join(c["name"].lower().split())
        if ql in c["name"].lower() and norm not in seen:
            seen.add(norm)
            out.append({"name": c["name"], "state": c.get("state", ""), "registered": False})
    return out[:10]


# --------------------------------------------------------------------------- #
# auth + MFA
# --------------------------------------------------------------------------- #
@app.post("/api/auth/register")
async def register(body: RegisterIn, resp: Response):
    norm = normalize_name(body.company_legal_name)
    secret = mfa.new_secret()
    async with db.pool().acquire() as con:
        async with con.transaction():
            if await con.fetchval("SELECT 1 FROM users WHERE lower(email) = lower($1)", body.email):
                raise HTTPException(409, "That email is already in use")

            org = await con.fetchrow(
                "SELECT id, legal_name FROM organizations WHERE normalized_name = $1", norm)
            if org:
                # Company already exists: this person joins as a member (not admin).
                org_id, org_name, role, joined = org["id"], org["legal_name"], "member", True
            else:
                # New company: this person creates it and becomes its admin.
                org_id = await con.fetchval(
                    "INSERT INTO organizations (legal_name, normalized_name, state_of_incorporation) "
                    "VALUES ($1, $2, $3) RETURNING id",
                    body.company_legal_name.strip(), norm, body.state_of_incorporation)
                org_name, role, joined = body.company_legal_name.strip(), "org_admin", False

            user_id = await con.fetchval(
                "INSERT INTO users (org_id, email, full_name, password_hash, role, mfa_secret, mfa_enabled) "
                "VALUES ($1, $2, $3, $4, $5, $6, false) RETURNING id",
                org_id, body.email, body.full_name, hash_password(body.password), role, encrypt_str(secret))
            sid = await create_session(con, user_id, mfa_passed=False)

    set_session_cookie(resp, sid)
    uri = mfa.provisioning_uri(secret, body.email)
    return {
        "mfa_setup": {"otpauth_uri": uri, "qr_svg": mfa.qr_svg(uri), "secret": secret},
        "email": body.email, "role": role, "joined": joined, "org": {"legal_name": org_name},
    }


@app.post("/api/auth/mfa/verify")
async def mfa_verify(body: CodeIn, request: Request):
    row = await load_session(request)
    if not row:
        raise HTTPException(401, "Not authenticated")
    secret = decrypt_bytes(row["mfa_secret"]) if row["mfa_secret"] else None
    if not secret or not mfa.verify(secret, body.code):
        raise HTTPException(401, "Invalid authentication code")
    async with db.pool().acquire() as con:
        await con.execute("UPDATE users SET mfa_enabled = true WHERE id = $1", row["user_id"])
        await con.execute("UPDATE sessions SET mfa_passed = true WHERE id = $1", row["session_id"])
    return user_public(row)


@app.post("/api/auth/login")
async def login(body: LoginIn, resp: Response):
    async with db.pool().acquire() as con:
        row = await con.fetchrow(
            "SELECT u.id, u.email, u.full_name, u.role, u.password_hash, u.mfa_enabled, o.legal_name "
            "FROM users u JOIN organizations o ON o.id = u.org_id WHERE lower(u.email) = lower($1)",
            body.email)
        if not row or not verify_password(row["password_hash"], body.password):
            raise HTTPException(401, "Invalid email or password")
        sid = await create_session(con, row["id"], mfa_passed=not row["mfa_enabled"])

    set_session_cookie(resp, sid)
    if row["mfa_enabled"]:
        return {"mfa_required": True}
    return user_public(row)


@app.post("/api/auth/logout")
async def logout(request: Request, resp: Response):
    raw = request.cookies.get(COOKIE)
    if raw:
        try:
            sid = uuid.UUID(raw)
            async with db.pool().acquire() as con:
                await con.execute("DELETE FROM sessions WHERE id = $1", sid)
        except ValueError:
            pass
    resp.delete_cookie(COOKIE, path="/")
    return {"ok": True}


@app.get("/api/me")
async def me(user: dict = Depends(current_user)):
    async with db.pool().acquire() as con:
        used = await usage_today(con, user["user_id"])
    pub = user_public(user)
    unlimited = is_unlimited(user)
    pub["plan"] = plan_label(user)
    pub["unlimited"] = unlimited
    pub["tokens_used_today"] = used
    pub["daily_limit"] = None if unlimited else settings.free_daily_tokens
    pub["billing_configured"] = bool(settings.stripe_secret_key)
    pub["billing_mode"] = "live" if settings._payment_live else "test"
    return pub


# --------------------------------------------------------------------------- #
# connector credentials (org-scoped; secrets encrypted, never returned)
# --------------------------------------------------------------------------- #
@app.get("/api/connectors")
async def list_connectors(user: dict = Depends(current_user)):
    async with db.pool().acquire() as con:
        rows = await con.fetch(
            "SELECT type, auth_method, config, secret_last4, updated_at, "
            "(secret_ciphertext IS NOT NULL) AS has_secret "
            "FROM connector_credentials WHERE org_id = $1 ORDER BY type", user["org_id"])
    return [{"type": r["type"], "auth_method": r["auth_method"], "config": r["config"],
             "has_secret": r["has_secret"], "secret_last4": r["secret_last4"],
             "updated_at": r["updated_at"].isoformat()} for r in rows]


@app.put("/api/connectors/{ctype}")
async def upsert_connector(ctype: str, body: ConnectorIn, user: dict = Depends(current_user)):
    if user["role"] not in ("org_admin", "superadmin"):
        raise HTTPException(403, "Only an org admin can configure connectors")
    if ctype not in CONNECTOR_TYPES:
        raise HTTPException(400, "Unknown connector type")
    cipher = encrypt_str(body.secret) if body.secret else None
    last4 = body.secret[-4:] if body.secret else None
    async with db.pool().acquire() as con:
        await con.execute(
            """
            INSERT INTO connector_credentials
                (org_id, type, auth_method, config, secret_ciphertext, secret_last4, updated_by, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, now())
            ON CONFLICT (org_id, type) DO UPDATE SET
                auth_method = EXCLUDED.auth_method,
                config = EXCLUDED.config,
                secret_ciphertext = COALESCE(EXCLUDED.secret_ciphertext, connector_credentials.secret_ciphertext),
                secret_last4 = COALESCE(EXCLUDED.secret_last4, connector_credentials.secret_last4),
                updated_by = EXCLUDED.updated_by, updated_at = now()
            """,
            user["org_id"], ctype, body.auth_method, body.config, cipher, last4, user["user_id"])
    return {"ok": True, "type": ctype}


@app.delete("/api/connectors/{ctype}")
async def delete_connector(ctype: str, user: dict = Depends(current_user)):
    if user["role"] not in ("org_admin", "superadmin"):
        raise HTTPException(403, "Only an org admin can remove connectors")
    async with db.pool().acquire() as con:
        await con.execute("DELETE FROM connector_credentials WHERE org_id = $1 AND type = $2",
                          user["org_id"], ctype)
    return {"ok": True}


# --------------------------------------------------------------------------- #
# AI proxy — requires a valid (MFA-passed) session
# --------------------------------------------------------------------------- #
async def _compliance_context(con, org_id, user_text: str) -> str:
    """Summary of compliance data for the assistant, plus the full trace of any lot
    the user mentions — so 'compile the trace map for lot X' works in chat."""
    lot_count = await con.fetchval("SELECT count(*) FROM lots WHERE org_id=$1", org_id)
    if not lot_count:
        return ""
    open_ncrs = await con.fetchval("SELECT count(*) FROM ncrs WHERE org_id=$1 AND status='open'", org_id)
    doc_count = await con.fetchval("SELECT count(*) FROM documents WHERE org_id=$1", org_id)
    parts = ["COMPLIANCE DATA: %d lots, %d open NCR/CAPA, %d documents on file. "
             "A Device History Record (DHR) trace map can be compiled per lot." % (lot_count, open_ncrs, doc_count)]
    rows = await con.fetch("SELECT lot_number FROM lots WHERE org_id=$1", org_id)
    text_up = (user_text or "").upper()
    matched = [r["lot_number"] for r in rows if r["lot_number"] and r["lot_number"].upper() in text_up][:2]
    if matched:
        parts.insert(0, "The user references specific lot(s). Compile a concise DHR trace summary; cite "
                        "documents by title in [brackets]; flag any open NCR/CAPA or hold as a compliance "
                        "risk; do not invent data beyond what is provided.")
    for lot in matched:
        lr = await con.fetchrow(
            "SELECT part_number, work_order, quantity, site, company_ref, mfg_date, status, disposition "
            "FROM lots WHERE org_id=$1 AND lot_number=$2", org_id, lot)
        insp = await con.fetch(
            "SELECT inspection_type, result, inspector, inspected_at, ncr_number, notes "
            "FROM inspections WHERE org_id=$1 AND lot_number=$2 ORDER BY inspected_at NULLS LAST", org_id, lot)
        ncrs = await con.fetch(
            "SELECT ncr_number, description, disposition, capa_number, status FROM ncrs "
            "WHERE org_id=$1 AND lot_number=$2", org_id, lot)
        docs = await con.fetch(
            "SELECT title, doc_type, left(content_text, 500) AS excerpt FROM documents "
            "WHERE org_id=$1 AND (lot_number=$2 OR (part_number<>'' AND part_number=$3)) LIMIT 6",
            org_id, lot, (lr["part_number"] if lr else ""))
        b = ["\nTRACE for lot %s:" % lot]
        if lr:
            b.append("  part=%s wo=%s qty=%s site=%s company=%s mfg=%s status=%s disposition=%s" % (
                lr["part_number"], lr["work_order"], lr["quantity"], lr["site"], lr["company_ref"],
                lr["mfg_date"], lr["status"], lr["disposition"]))
        for i in insp:
            b.append("  inspection %s %s result=%s by %s ncr=%s note=%s" % (
                i["inspected_at"], i["inspection_type"], i["result"], i["inspector"], i["ncr_number"], i["notes"]))
        for n in ncrs:
            b.append("  NCR %s [%s] %s disp=%s capa=%s" % (
                n["ncr_number"], n["status"], n["description"], n["disposition"], n["capa_number"]))
        for d in docs:
            b.append("  DOC [%s] %s :: %s" % (d["doc_type"], d["title"], (d["excerpt"] or "").replace("\n", " ")))
        parts.append("\n".join(b))
    return "\n".join(parts)


@app.post("/api/ai/chat")
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
                system = (system + "\n\n" + summary) if system else summary
        except Exception:
            pass
        try:
            csum = await _compliance_context(con, user["org_id"], messages[-1]["content"] if messages else "")
            if csum:
                system = (system + "\n\n" + csum) if system else csum
        except Exception:
            pass
        await bump_usage(con, user["user_id"], user["org_id"])
    text = await ai_complete(system, messages)
    return {"text": text}


# --------------------------------------------------------------------------- #
# billing (Stripe) + usage
# --------------------------------------------------------------------------- #
class CheckoutIn(BaseModel):
    plan: str  # "pro" | "enterprise"


@app.post("/api/billing/checkout")
async def billing_checkout(body: CheckoutIn, user: dict = Depends(current_user)):
    base = settings.app_base_url.rstrip("/")
    success = base + "/?billing=success&session_id={CHECKOUT_SESSION_ID}"
    cancel = base + "/?billing=cancel"
    if body.plan == "pro":
        price = settings.stripe_price_pro
    elif body.plan == "enterprise":
        if user["role"] not in ("org_admin", "superadmin"):
            raise HTTPException(403, "Only an org admin can purchase Enterprise")
        price = settings.stripe_price_enterprise
    else:
        raise HTTPException(400, "Unknown plan")
    if not settings.stripe_secret_key or not price:
        raise HTTPException(400, "Billing is not configured on the server")
    meta = {"plan": body.plan, "user_id": str(user["user_id"]), "org_id": str(user["org_id"])}
    sess = await billing.create_checkout(price, success, cancel,
                                         customer_email=user["email"],
                                         client_ref=str(user["user_id"]), metadata=meta)
    if not sess or not sess.get("url"):
        raise HTTPException(502, "Could not start checkout")
    return {"url": sess["url"]}


@app.get("/api/billing/confirm")
async def billing_confirm(session_id: str, user: dict = Depends(current_user)):
    sess = await billing.retrieve_session(session_id)
    if not sess:
        raise HTTPException(400, "Could not verify the checkout session")
    paid = sess.get("payment_status") == "paid" or sess.get("status") == "complete"
    if not paid:
        return {"ok": False, "status": sess.get("status")}
    meta = sess.get("metadata") or {}
    plan = meta.get("plan")
    customer = sess.get("customer")
    sub = sess.get("subscription")
    async with db.pool().acquire() as con:
        if plan == "pro" and meta.get("user_id") == str(user["user_id"]):
            await con.execute(
                "UPDATE users SET plan='pro', plan_status='active', stripe_customer_id=$2, "
                "stripe_subscription_id=$3 WHERE id=$1", user["user_id"], customer, sub)
        elif plan == "enterprise" and user["role"] in ("org_admin", "superadmin") \
                and meta.get("org_id") == str(user["org_id"]):
            await con.execute(
                "UPDATE organizations SET enterprise=true, enterprise_status='active', "
                "stripe_customer_id=$2, stripe_subscription_id=$3 WHERE id=$1",
                user["org_id"], customer, sub)
        else:
            raise HTTPException(403, "This checkout session does not belong to your account")
    return {"ok": True, "plan": plan}


@app.post("/api/billing/portal")
async def billing_portal(user: dict = Depends(current_user)):
    base = settings.app_base_url.rstrip("/")
    cust = None
    if user["role"] in ("org_admin", "superadmin") and user.get("enterprise"):
        cust = user.get("org_stripe_customer_id")
    if not cust:
        cust = user.get("stripe_customer_id")
    if not cust:
        raise HTTPException(400, "No active subscription to manage")
    url = await billing.create_portal(cust, base + "/")
    if not url:
        raise HTTPException(502, "Could not open the billing portal")
    return {"url": url}


@app.get("/api/admin/usage")
async def admin_usage(user: dict = Depends(current_user)):
    if user["role"] not in ("org_admin", "superadmin"):
        raise HTTPException(403, "Admins only")
    async with db.pool().acquire() as con:
        rows = await con.fetch(
            "SELECT u.id, u.email, u.full_name, u.role, u.plan, u.is_active, "
            "COALESCE(d.tokens,0) AS tokens_today "
            "FROM users u LEFT JOIN usage_daily d ON d.user_id = u.id AND d.usage_date = CURRENT_DATE "
            "WHERE u.org_id = $1 ORDER BY u.full_name NULLS LAST, u.email", user["org_id"])
    ent = bool(user.get("enterprise"))
    members = []
    for r in rows:
        members.append({
            "id": str(r["id"]), "email": r["email"], "full_name": r["full_name"],
            "role": r["role"], "is_active": r["is_active"] if r["is_active"] is not None else True,
            "plan": "enterprise" if ent else (r["plan"] or "free"),
            "tokens_today": r["tokens_today"],
            "unlimited": ent or r["plan"] == "pro",
        })
    return {"enterprise": ent, "free_limit": settings.free_daily_tokens, "members": members}


@app.patch("/api/admin/members/{member_id}")
async def update_member(member_id: str, body: dict, user: dict = Depends(current_user)):
    if user["role"] not in ("org_admin", "superadmin"):
        raise HTTPException(403, "Admins only")
    # Only allow toggling is_active for now
    if "is_active" not in body:
        raise HTTPException(400, "Nothing to update")
    async with db.pool().acquire() as con:
        row = await con.fetchrow(
            "SELECT id FROM users WHERE id = $1 AND org_id = $2",
            member_id, user["org_id"])
        if not row:
            raise HTTPException(404, "Member not found")
        await con.execute(
            "UPDATE users SET is_active = $1 WHERE id = $2",
            bool(body["is_active"]), member_id)
    return {"ok": True}


class SourceImportIn(BaseModel):
    source: str          # "odoo" | "mrpeasy"
    entity: str          # "parts" | "vendors" | etc.
    base_url: str = ""
    api_key: str = ""
    db_name: str = ""    # Odoo only
    username: str = ""   # Odoo only


@app.post("/api/import/source")
async def import_from_source(body: SourceImportIn, user: dict = Depends(current_user)):
    if user["role"] not in ("org_admin", "superadmin"):
        raise HTTPException(403, "Admins only")

    rows = []
    error = None

    try:
        if body.source == "odoo":
            # Odoo JSON-RPC — publicly documented at https://www.odoo.com/documentation/17.0/developer/reference/external_api.html
            import urllib.request, json as _json
            base = body.base_url.rstrip("/")
            db, user_od, key = body.db_name, body.username, body.api_key

            # Authenticate
            auth_payload = _json.dumps({"jsonrpc":"2.0","method":"call","params":{
                "service":"common","method":"authenticate",
                "args":[db, user_od, key, {}]}}).encode()
            req = urllib.request.Request(f"{base}/jsonrpc", data=auth_payload,
                                         headers={"Content-Type":"application/json"})
            uid = _json.loads(urllib.request.urlopen(req, timeout=10).read())["result"]
            if not uid:
                raise ValueError("Odoo authentication failed — check URL, database, username and API key")

            def odoo_search_read(model, domain, fields):
                payload = _json.dumps({"jsonrpc":"2.0","method":"call","params":{
                    "service":"object","method":"execute_kw",
                    "args":[db, uid, key, model, "search_read", [domain], {"fields": fields, "limit": 2000}]
                }}).encode()
                r = urllib.request.Request(f"{base}/jsonrpc", data=payload,
                                           headers={"Content-Type":"application/json"})
                return _json.loads(urllib.request.urlopen(r, timeout=15).read())["result"]

            entity_map = {
                "parts":        ("product.template", [], ["default_code","name","type","list_price","standard_price","uom_id"]),
                "vendors":      ("res.partner",       [["supplier_rank",">",0]], ["name","email","phone","website","street","city","country_id"]),
                "vendor_parts": ("product.supplierinfo",[], ["product_tmpl_id","partner_id","price","delay","min_qty","product_code"]),
                "work_orders":  ("mrp.production",    [], ["name","product_id","product_qty","date_planned_start","date_planned_finished","state"]),
                "sales_orders": ("sale.order",        [["state","not in",["cancel","draft"]]], ["name","partner_id","date_order","commitment_date","amount_total","state"]),
                "customers":    ("res.partner",       [["customer_rank",">",0]], ["name","email","phone","website","street","city","country_id"]),
                "operators":    ("res.users",         [["active","=",True]], ["name","email","login","groups_id"]),
            }
            if body.entity not in entity_map:
                raise ValueError(f"Unsupported entity: {body.entity}")
            model, domain, fields = entity_map[body.entity]
            rows = odoo_search_read(model, domain, fields)

        elif body.source == "mrpeasy":
            # MRPeasy REST API — documented at https://www.mrpeasy.com/help/api/
            import urllib.request, json as _json
            base = "https://app.mrpeasy.com/rest/v1"
            headers = {"Authorization": f"Bearer {body.api_key}", "Content-Type": "application/json"}
            entity_map = {
                "parts":        "items",
                "vendors":      "suppliers",
                "vendor_parts": "supplier-items",
                "work_orders":  "manufacturing-orders",
                "sales_orders": "customer-orders",
                "customers":    "customers",
                "operators":    "users",
            }
            if body.entity not in entity_map:
                raise ValueError(f"Unsupported entity: {body.entity}")
            endpoint = entity_map[body.entity]
            req = urllib.request.Request(f"{base}/{endpoint}?per_page=500", headers=headers)
            resp = urllib.request.urlopen(req, timeout=15).read()
            data = _json.loads(resp)
            rows = data if isinstance(data, list) else data.get("data", data.get("items", []))

        else:
            raise ValueError(f"Unsupported source: {body.source}. Supported: odoo, mrpeasy")

    except Exception as e:
        error = str(e)

    if error:
        return {"ok": False, "error": error, "rows": [], "count": 0}
    return {"ok": True, "rows": rows[:500], "count": len(rows), "error": None}




async def _downgrade_subscription(con, sub_id):
    """Revoke access tied to a Stripe subscription (Pro user or Enterprise org)."""
    if not sub_id:
        return
    await con.execute(
        "UPDATE users SET plan='free', plan_status='canceled' WHERE stripe_subscription_id = $1", sub_id)
    await con.execute(
        "UPDATE organizations SET enterprise=false, enterprise_status='canceled' WHERE stripe_subscription_id = $1", sub_id)


@app.post("/api/billing/webhook")
async def billing_webhook(request: Request):
    """Stripe → us. Verifies signature, then keeps plans in sync on cancel/lapse.
    Not authenticated (called by Stripe), so signature verification is the gate."""
    secret = settings.stripe_webhook_secret
    raw = await request.body()
    if not secret:
        raise HTTPException(400, "Webhook signing secret not configured")
    sig = request.headers.get("stripe-signature", "")
    if not billing.verify_signature(raw, sig, secret):
        raise HTTPException(400, "Invalid signature")
    try:
        event = json.loads(raw.decode("utf-8"))
    except Exception:
        raise HTTPException(400, "Bad payload")

    etype = event.get("type", "")
    obj = (event.get("data") or {}).get("object") or {}
    async with db.pool().acquire() as con:
        if etype == "customer.subscription.deleted":
            await _downgrade_subscription(con, obj.get("id"))
        elif etype == "customer.subscription.updated":
            if obj.get("status") in ("canceled", "unpaid", "incomplete_expired"):
                await _downgrade_subscription(con, obj.get("id"))
            elif obj.get("cancel_at_period_end"):
                # scheduled to cancel — keep access until period end, just note status
                sid = obj.get("id")
                await con.execute("UPDATE users SET plan_status='canceling' WHERE stripe_subscription_id=$1", sid)
                await con.execute("UPDATE organizations SET enterprise_status='canceling' WHERE stripe_subscription_id=$1", sid)
        elif etype == "invoice.payment_failed":
            sid = obj.get("subscription")
            if sid:
                await con.execute("UPDATE users SET plan_status='past_due' WHERE stripe_subscription_id=$1", sid)
                await con.execute("UPDATE organizations SET enterprise_status='past_due' WHERE stripe_subscription_id=$1", sid)
    return {"received": True}


# --------------------------------------------------------------------------- #
# CSV data import (org admin only)
# --------------------------------------------------------------------------- #
class ImportIn(BaseModel):
    csv: str = Field(min_length=1, max_length=4_000_000)


@app.get("/api/import/entities")
async def import_entities(user: dict = Depends(current_user)):
    return importer.entities_meta()


@app.get("/api/import/sample/{entity}")
async def import_sample(entity: str, user: dict = Depends(current_user)):
    if entity not in importer.SPEC:
        raise HTTPException(404, "Unknown entity")
    text = importer.sample_csv(entity)
    return Response(content=text, media_type="text/csv",
                    headers={"Content-Disposition": 'attachment; filename="%s_sample.csv"' % entity})


@app.post("/api/import/{entity}")
async def import_csv(entity: str, body: ImportIn, user: dict = Depends(current_user)):
    if user["role"] not in ("org_admin", "superadmin"):
        raise HTTPException(403, "Only an org admin can import data")
    if entity not in importer.SPEC:
        raise HTTPException(404, "Unknown entity")
    rows, headers = importer.parse_csv(body.csv)
    if not rows:
        raise HTTPException(400, "No data rows found (need a header row plus at least one record)")
    async with db.pool().acquire() as con:
        result = await importer.do_import(con, user["org_id"], entity, rows)
        await con.execute(
            "INSERT INTO import_events (org_id, entity, inserted, updated, errors, by_user) "
            "VALUES ($1,$2,$3,$4,$5,$6)",
            user["org_id"], entity, result["inserted"], result["updated"],
            result["error_count"], user["user_id"])
    return result


@app.get("/api/events")
async def list_events(limit: int = 20, user: dict = Depends(current_user)):
    limit = max(1, min(limit, 100))
    async with db.pool().acquire() as con:
        rows = await con.fetch(
            "SELECT entity, inserted, updated, errors, created_at FROM import_events "
            "WHERE org_id = $1 ORDER BY created_at DESC LIMIT $2", user["org_id"], limit)
    return [dict(r) for r in rows]


# --------------------------------------------------------------------------- #
# digital-thread reads (members drive the UI from these tables)
# --------------------------------------------------------------------------- #
@app.get("/api/sales_orders")
async def get_sales_orders(user: dict = Depends(current_user)):
    async with db.pool().acquire() as con:
        rows = await con.fetch(
            "SELECT so_number, line_number, customer, site, promise_date, part_number, quantity, value, status "
            "FROM sales_orders WHERE org_id = $1 ORDER BY promise_date NULLS LAST, so_number, line_number", user["org_id"])
    out = []
    for r in rows:
        out.append({
            "so_number": r["so_number"], "line_number": r["line_number"] or 10,
            "customer": r["customer"], "site": r["site"] or "",
            "promise_date": r["promise_date"].isoformat() if r["promise_date"] else None,
            "part_number": r["part_number"] or "",
            "quantity": float(r["quantity"]) if r["quantity"] is not None else 0,
            "value": float(r["value"]) if r["value"] is not None else 0,
            "status": r["status"] or "",
        })
    return out


@app.get("/api/part_detail")
async def get_part_detail(part: str, user: dict = Depends(current_user)):
    async with db.pool().acquire() as con:
        prow = await con.fetchrow(
            "SELECT part_number, description, unit_cost, uom, commodity, revision, lifecycle, classification "
            "FROM parts WHERE org_id = $1 AND part_number = $2", user["org_id"], part)
        bom = await con.fetch(
            "SELECT b.child_part_number, b.quantity, b.find_number, b.ref_designators, "
            "p.description AS child_description "
            "FROM boms b LEFT JOIN parts p ON p.org_id = b.org_id AND p.part_number = b.child_part_number "
            "WHERE b.org_id = $1 AND b.parent_part_number = $2 "
            "ORDER BY NULLIF(b.find_number,'')::int NULLS LAST, b.child_part_number", user["org_id"], part)
        vendors = await con.fetch(
            "SELECT vp.vendor_part_number, vp.unit_cost, vp.lead_time_days, vp.vendor AS vendor_code, "
            "v.name AS vendor_name "
            "FROM vendor_parts vp LEFT JOIN vendors v ON v.org_id = vp.org_id AND v.vendor_code = vp.vendor "
            "WHERE vp.org_id = $1 AND vp.part_number = $2 ORDER BY v.name NULLS LAST, vp.vendor_part_number",
            user["org_id"], part)
    part_obj = None
    if prow:
        part_obj = {
            "part_number": prow["part_number"], "description": prow["description"] or "",
            "unit_cost": float(prow["unit_cost"]) if prow["unit_cost"] is not None else None,
            "uom": prow["uom"] or "", "commodity": prow["commodity"] or "",
            "revision": prow["revision"] or "", "lifecycle": prow["lifecycle"] or "",
            "classification": prow["classification"] or "",
        }
    else:
        part_obj = {"part_number": part, "description": "", "unit_cost": None, "uom": "",
                    "commodity": "", "revision": "", "lifecycle": "", "classification": ""}
    return {
        "part": part_obj,
        "bom": [{"child_part_number": r["child_part_number"], "child_description": r["child_description"] or "",
                 "quantity": float(r["quantity"]) if r["quantity"] is not None else None,
                 "find_number": r["find_number"] or "", "ref_designators": r["ref_designators"] or ""} for r in bom],
        "vendors": [{"vendor_part_number": r["vendor_part_number"], "vendor_code": r["vendor_code"] or "",
                     "vendor_name": r["vendor_name"] or "",
                     "unit_cost": float(r["unit_cost"]) if r["unit_cost"] is not None else None,
                     "lead_time_days": r["lead_time_days"]} for r in vendors],
    }


# --------------------------------------------------------------------------- #
# data sources + document store (S3 or local) + compliance / traceability
# --------------------------------------------------------------------------- #
_DOC_TYPES = {"cert", "coc", "coa", "sop", "inspection", "dhr", "other"}


def _extract_text(filename: str, data: bytes) -> str:
    name = (filename or "").lower()
    if name.endswith((".txt", ".md", ".csv", ".json")):
        try:
            return data.decode("utf-8", "ignore")
        except Exception:
            return ""
    if name.endswith(".pdf"):
        try:
            import io as _io
            from pypdf import PdfReader
            r = PdfReader(_io.BytesIO(data))
            return "\n".join((p.extract_text() or "") for p in r.pages)
        except Exception:
            return ""
    return ""


class DataSourceIn(BaseModel):
    kind: str
    name: str
    config: dict = {}


@app.get("/api/data_sources")
async def list_data_sources(user: dict = Depends(current_user)):
    async with db.pool().acquire() as con:
        rows = await con.fetch(
            "SELECT id, kind, name, config, status, last_sync, last_result, created_at "
            "FROM data_sources WHERE org_id = $1 ORDER BY created_at DESC", user["org_id"])
    return [{"id": str(r["id"]), "kind": r["kind"], "name": r["name"], "config": r["config"],
             "status": r["status"], "last_sync": r["last_sync"].isoformat() if r["last_sync"] else None,
             "last_result": r["last_result"] or "",
             "created_at": r["created_at"].isoformat()} for r in rows]


@app.post("/api/data_sources")
async def create_data_source(body: DataSourceIn, user: dict = Depends(current_user)):
    if user["role"] not in ("org_admin", "superadmin"):
        raise HTTPException(403, "Admins only")
    async with db.pool().acquire() as con:
        row = await con.fetchrow(
            "INSERT INTO data_sources (org_id, kind, name, config, created_by) "
            "VALUES ($1,$2,$3,$4,$5) RETURNING id", user["org_id"], body.kind, body.name,
            json.dumps(body.config or {}), user["full_name"] or user["email"])
    return {"id": str(row["id"])}


@app.post("/api/data_sources/{source_id}/sync")
async def sync_data_source(source_id: str, user: dict = Depends(current_user)):
    """For an S3 source, list objects under its prefix and register any not-yet-indexed
    files as documents (metadata only; text extraction happens for text/PDF)."""
    if user["role"] not in ("org_admin", "superadmin"):
        raise HTTPException(403, "Admins only")
    async with db.pool().acquire() as con:
        src = await con.fetchrow("SELECT id, kind, name, config FROM data_sources WHERE id=$1 AND org_id=$2",
                                 source_id, user["org_id"])
        if not src:
            raise HTTPException(404, "Data source not found")
        if src["kind"] != "s3" or not settings.s3_enabled:
            await con.execute("UPDATE data_sources SET last_sync=now(), status='connected', last_result=$2 WHERE id=$1",
                              src["id"], "Sync is only available for S3 sources on an S3-configured server")
            return {"indexed": 0, "note": "S3 not configured on server; use Upload instead"}
        cfg = src["config"] or {}
        prefix = cfg.get("prefix", "org_%s/" % user["org_id"])
        indexed = 0
        for obj in storage.list_objects(prefix):
            key = obj["key"]
            exists = await con.fetchval("SELECT 1 FROM documents WHERE org_id=$1 AND storage_key=$2", user["org_id"], key)
            if exists:
                continue
            data = storage.get_object(key)
            fn = key.split("/")[-1]
            text = _extract_text(fn, data) if data else ""
            await con.execute(
                "INSERT INTO documents (org_id, company_ref, doc_type, title, filename, storage_key, storage, "
                "source_id, content_text, size_bytes, uploaded_by) "
                "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
                user["org_id"], cfg.get("company_ref", ""), cfg.get("doc_type", "cert"), fn, fn, key,
                storage.backend_name(), src["id"], text, obj.get("size", 0), "s3-sync")
            indexed += 1
        await con.execute("UPDATE data_sources SET last_sync=now(), status='connected', last_result=$2 WHERE id=$1",
                          src["id"], "Indexed %d new document(s)" % indexed)
    return {"indexed": indexed}


@app.post("/api/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    doc_type: str = Form("cert"),
    company_ref: str = Form(""),
    lot_number: str = Form(""),
    part_number: str = Form(""),
    vendor_code: str = Form(""),
    title: str = Form(""),
    user: dict = Depends(current_user),
):
    if doc_type not in _DOC_TYPES:
        doc_type = "other"
    data = await file.read()
    if len(data) > 25 * 1024 * 1024:
        raise HTTPException(413, "File too large (max 25 MB)")
    safe = "".join(c for c in (file.filename or "upload") if c.isalnum() or c in "._- ").strip().replace(" ", "_")
    key = "org_%s/%s/%s" % (user["org_id"], doc_type, safe)
    locator = storage.put_object(key, data, file.content_type or "application/octet-stream")
    text = _extract_text(file.filename or safe, data)
    async with db.pool().acquire() as con:
        row = await con.fetchrow(
            "INSERT INTO documents (org_id, company_ref, doc_type, title, filename, storage_key, storage, "
            "lot_number, part_number, vendor_code, content_text, size_bytes, uploaded_by) "
            "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id",
            user["org_id"], company_ref, doc_type, title or (file.filename or safe), file.filename or safe,
            key, storage.backend_name(), lot_number, part_number, vendor_code, text, len(data),
            user["full_name"] or user["email"])
    return {"id": str(row["id"]), "storage": storage.backend_name(), "locator": locator, "indexed_text": bool(text)}


@app.get("/api/documents")
async def list_documents(lot_number: str = "", part_number: str = "", doc_type: str = "",
                         user: dict = Depends(current_user)):
    q = "SELECT id, company_ref, doc_type, title, filename, storage, lot_number, part_number, vendor_code, " \
        "size_bytes, uploaded_by, uploaded_at FROM documents WHERE org_id = $1"
    args = [user["org_id"]]
    if lot_number:
        args.append(lot_number); q += " AND lot_number = $%d" % len(args)
    if part_number:
        args.append(part_number); q += " AND part_number = $%d" % len(args)
    if doc_type:
        args.append(doc_type); q += " AND doc_type = $%d" % len(args)
    q += " ORDER BY uploaded_at DESC"
    async with db.pool().acquire() as con:
        rows = await con.fetch(q, *args)
    return [{"id": str(r["id"]), "company_ref": r["company_ref"], "doc_type": r["doc_type"],
             "title": r["title"], "filename": r["filename"], "storage": r["storage"],
             "lot_number": r["lot_number"], "part_number": r["part_number"], "vendor_code": r["vendor_code"],
             "size_bytes": r["size_bytes"], "uploaded_by": r["uploaded_by"],
             "uploaded_at": r["uploaded_at"].isoformat()} for r in rows]


@app.get("/api/documents/search")
async def search_documents(q: str, user: dict = Depends(current_user)):
    if not q.strip():
        return {"results": []}
    async with db.pool().acquire() as con:
        rows = await con.fetch(
            "SELECT id, title, filename, doc_type, company_ref, lot_number, part_number, "
            "ts_headline('english', content_text, plainto_tsquery('english',$2), "
            "'MaxFragments=2,MinWords=5,MaxWords=18') AS snippet, "
            "ts_rank(content_tsv, plainto_tsquery('english',$2)) AS rank "
            "FROM documents WHERE org_id=$1 AND content_tsv @@ plainto_tsquery('english',$2) "
            "ORDER BY rank DESC LIMIT 12", user["org_id"], q)
    return {"results": [{"id": str(r["id"]), "title": r["title"], "filename": r["filename"],
                         "doc_type": r["doc_type"], "company_ref": r["company_ref"],
                         "lot_number": r["lot_number"], "part_number": r["part_number"],
                         "snippet": r["snippet"]} for r in rows]}


@app.get("/api/documents/{doc_id}/download")
async def download_document(doc_id: str, user: dict = Depends(current_user)):
    async with db.pool().acquire() as con:
        row = await con.fetchrow("SELECT filename, storage_key FROM documents WHERE id=$1 AND org_id=$2",
                                 doc_id, user["org_id"])
    if not row:
        raise HTTPException(404, "Document not found")
    data = storage.get_object(row["storage_key"])
    if data is None:
        raise HTTPException(404, "File not found in storage")
    import io as _io
    return StreamingResponse(_io.BytesIO(data), media_type="application/octet-stream",
                             headers={"Content-Disposition": 'attachment; filename="%s"' % row["filename"]})


@app.post("/api/documents/load_samples")
async def load_sample_documents(user: dict = Depends(current_user)):
    """Seed a handful of sample supplier certs/SOPs for the demo (idempotent by filename)."""
    if user["role"] not in ("org_admin", "superadmin"):
        raise HTTPException(403, "Admins only")
    sample_dir = Path(__file__).resolve().parent / "sample_certs"
    loaded = 0
    if not sample_dir.exists():
        return {"loaded": 0, "note": "no sample certs bundled"}
    async with db.pool().acquire() as con:
        for f in sorted(sample_dir.glob("*")):
            if not f.is_file():
                continue
            meta = {"doc_type": "cert", "company_ref": "NextPhase", "lot": "", "part": "", "vendor": ""}
            # filename convention: <doctype>__<company>__<lot>__<part>__<name>
            parts = f.stem.split("__")
            if len(parts) >= 2:
                meta["doc_type"] = parts[0] if parts[0] in _DOC_TYPES else "cert"
                meta["company_ref"] = parts[1]
            if len(parts) >= 3:
                meta["lot"] = parts[2]
            if len(parts) >= 4:
                meta["part"] = parts[3]
            data = f.read_bytes()
            key = "org_%s/%s/%s" % (user["org_id"], meta["doc_type"], f.name)
            exists = await con.fetchval("SELECT 1 FROM documents WHERE org_id=$1 AND storage_key=$2",
                                        user["org_id"], key)
            if exists:
                continue
            storage.put_object(key, data, "text/plain")
            text = _extract_text(f.name, data)
            await con.execute(
                "INSERT INTO documents (org_id, company_ref, doc_type, title, filename, storage_key, storage, "
                "lot_number, part_number, content_text, size_bytes, uploaded_by) "
                "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
                user["org_id"], meta["company_ref"], meta["doc_type"], f.stem.replace("__", " · "), f.name,
                key, storage.backend_name(), meta["lot"], meta["part"], text, len(data), "sample-loader")
            loaded += 1
    return {"loaded": loaded, "storage": storage.backend_name()}


@app.get("/api/lots")
async def list_lots(user: dict = Depends(current_user)):
    async with db.pool().acquire() as con:
        rows = await con.fetch(
            "SELECT lot_number, part_number, work_order, quantity, site, company_ref, mfg_date, status, disposition "
            "FROM lots WHERE org_id=$1 ORDER BY mfg_date DESC NULLS LAST, lot_number", user["org_id"])
    return [{"lot_number": r["lot_number"], "part_number": r["part_number"] or "", "work_order": r["work_order"] or "",
             "quantity": float(r["quantity"]) if r["quantity"] is not None else None, "site": r["site"] or "",
             "company_ref": r["company_ref"] or "", "mfg_date": r["mfg_date"].isoformat() if r["mfg_date"] else None,
             "status": r["status"] or "", "disposition": r["disposition"] or ""} for r in rows]


@app.get("/api/trace/lot/{lot_number}")
async def trace_lot(lot_number: str, user: dict = Depends(current_user)):
    """Assemble a Device-History-Record style trace map for a lot: the lot, its part and
    BOM components, work order, inspections, NCRs/CAPA, and linked supplier certs/docs."""
    org = user["org_id"]
    async with db.pool().acquire() as con:
        lot = await con.fetchrow(
            "SELECT lot_number, part_number, work_order, quantity, site, company_ref, mfg_date, status, disposition "
            "FROM lots WHERE org_id=$1 AND lot_number=$2", org, lot_number)
        insp = await con.fetch(
            "SELECT inspection_type, result, inspector, inspected_at, ncr_number, notes "
            "FROM inspections WHERE org_id=$1 AND lot_number=$2 ORDER BY inspected_at NULLS LAST", org, lot_number)
        ncrs = await con.fetch(
            "SELECT ncr_number, part_number, description, disposition, capa_number, status, opened_at, closed_at "
            "FROM ncrs WHERE org_id=$1 AND lot_number=$2 ORDER BY opened_at NULLS LAST", org, lot_number)
        part_number = lot["part_number"] if lot else ""
        bom = []
        if part_number:
            bom = await con.fetch(
                "SELECT b.child_part_number, b.quantity, b.find_number, b.ref_designators, p.description AS child_description "
                "FROM boms b LEFT JOIN parts p ON p.org_id=b.org_id AND p.part_number=b.child_part_number "
                "WHERE b.org_id=$1 AND b.parent_part_number=$2 ORDER BY b.child_part_number", org, part_number)
        docs = await con.fetch(
            "SELECT id, title, filename, doc_type, company_ref, vendor_code, part_number "
            "FROM documents WHERE org_id=$1 AND (lot_number=$2 OR (part_number<>'' AND part_number=$3)) "
            "ORDER BY doc_type, uploaded_at DESC", org, lot_number, part_number)
    if not lot and not insp and not ncrs and not docs:
        raise HTTPException(404, "No trace data found for lot %s" % lot_number)
    return {
        "lot": ({"lot_number": lot["lot_number"], "part_number": lot["part_number"] or "",
                 "work_order": lot["work_order"] or "", "quantity": float(lot["quantity"]) if lot["quantity"] is not None else None,
                 "site": lot["site"] or "", "company_ref": lot["company_ref"] or "",
                 "mfg_date": lot["mfg_date"].isoformat() if lot["mfg_date"] else None,
                 "status": lot["status"] or "", "disposition": lot["disposition"] or ""} if lot else
                {"lot_number": lot_number, "part_number": "", "status": "unknown"}),
        "bom": [{"child_part_number": r["child_part_number"], "child_description": r["child_description"] or "",
                 "quantity": float(r["quantity"]) if r["quantity"] is not None else None,
                 "find_number": r["find_number"] or "", "ref_designators": r["ref_designators"] or ""} for r in bom],
        "inspections": [{"inspection_type": r["inspection_type"] or "", "result": r["result"] or "",
                         "inspector": r["inspector"] or "", "inspected_at": r["inspected_at"].isoformat() if r["inspected_at"] else None,
                         "ncr_number": r["ncr_number"] or "", "notes": r["notes"] or ""} for r in insp],
        "ncrs": [{"ncr_number": r["ncr_number"], "part_number": r["part_number"] or "", "description": r["description"] or "",
                  "disposition": r["disposition"] or "", "capa_number": r["capa_number"] or "", "status": r["status"] or "",
                  "opened_at": r["opened_at"].isoformat() if r["opened_at"] else None,
                  "closed_at": r["closed_at"].isoformat() if r["closed_at"] else None} for r in ncrs],
        "documents": [{"id": str(r["id"]), "title": r["title"], "filename": r["filename"], "doc_type": r["doc_type"],
                       "company_ref": r["company_ref"], "vendor_code": r["vendor_code"], "part_number": r["part_number"]} for r in docs],
    }


@app.post("/api/ai/trace/{lot_number}")
async def ai_trace_lot(lot_number: str, user: dict = Depends(current_user)):
    """Compile a cited audit narrative for a lot using the trace map + document snippets."""
    trace = await trace_lot(lot_number, user)  # reuse assembly (raises 404 if empty)
    async with db.pool().acquire() as con:
        docs = await con.fetch(
            "SELECT title, filename, doc_type, left(content_text, 800) AS excerpt "
            "FROM documents WHERE org_id=$1 AND (lot_number=$2 OR part_number=$3) LIMIT 8",
            user["org_id"], lot_number, trace["lot"].get("part_number", ""))
    doc_ctx = "\n\n".join("DOCUMENT: %s (%s)\n%s" % (d["title"] or d["filename"], d["doc_type"], d["excerpt"] or "") for d in docs)
    system = (
        "You are a quality/regulatory audit assistant for a medical-device manufacturer under FDA 21 CFR Part 820 "
        "and Part 11. Compile a concise, factual Device History Record trace summary for the given lot. "
        "Cite documents by title in [brackets] when a statement is supported by one. Note any open NCR/CAPA or hold "
        "as a compliance risk. Do not invent data not present in the trace.\n\n"
        "TRACE_MAP = " + json.dumps(trace) + ("\n\nDOCUMENTS:\n" + doc_ctx if doc_ctx else ""))
    text = await ai_complete(system, [{"role": "user", "content": "Compile the compliance trace map for lot %s." % lot_number}])
    return {"lot_number": lot_number, "narrative": text, "trace": trace}


@app.get("/api/work_orders")
async def get_work_orders(user: dict = Depends(current_user)):
    async with db.pool().acquire() as con:
        rows = await con.fetch(
            "SELECT wo_number, part_number, description, site, status FROM work_orders "
            "WHERE org_id = $1 ORDER BY wo_number", user["org_id"])
    return [{"wo_number": r["wo_number"], "part_number": r["part_number"] or "",
             "description": r["description"] or "", "site": r["site"] or "", "status": r["status"] or ""}
            for r in rows]


@app.get("/api/parts")
async def get_parts(user: dict = Depends(current_user)):
    async with db.pool().acquire() as con:
        rows = await con.fetch(
            "SELECT part_number, description, unit_cost, commodity, revision, lifecycle, classification FROM parts "
            "WHERE org_id = $1 ORDER BY part_number", user["org_id"])
    return [dict(r) | {"unit_cost": float(r["unit_cost"]) if r["unit_cost"] is not None else None} for r in rows]


# --------------------------------------------------------------------------- #
# persistent blockers
# --------------------------------------------------------------------------- #
class BlockerIn(BaseModel):
    title: str = Field(min_length=1, max_length=400)
    sos: list = Field(default_factory=list)
    parts: list = Field(default_factory=list)
    wo: Optional[str] = None
    assignee: Optional[str] = None
    action: str = Field(default="", max_length=2000)
    status: Optional[str] = None


class BlockerPatch(BaseModel):
    status: Optional[str] = None
    assignee: Optional[str] = None
    new_promise: Optional[str] = None  # YYYY-MM-DD or "" to clear


class CommentIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


def _blocker_out(r) -> dict:
    return {
        "id": r["id"], "title": r["title"], "status": r["status"], "assignee": r["assignee"],
        "opened_by": r["opened_by"], "action": r["action"] or "", "wo": r["wo"],
        "sos": r["sos"] or [], "parts": r["parts"] or [], "comments": r["comments"] or [],
        "new_promise": r["new_promise"].isoformat() if r["new_promise"] else None,
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        "closed_at": r["closed_at"].isoformat() if r["closed_at"] else None,
        "closed_by": r["closed_by"],
    }


async def _log_activity(con, org_id, who, atype, detail):
    await con.execute(
        "INSERT INTO activity_events (org_id, type, detail, by_user) VALUES ($1,$2,$3,$4)",
        org_id, atype, detail[:300], who)


@app.get("/api/blockers")
async def list_blockers(user: dict = Depends(current_user)):
    async with db.pool().acquire() as con:
        rows = await con.fetch("SELECT * FROM blockers WHERE org_id = $1 ORDER BY created_at", user["org_id"])
    return [_blocker_out(r) for r in rows]


@app.post("/api/blockers")
async def create_blocker(body: BlockerIn, user: dict = Depends(current_user)):
    who = user.get("full_name") or user["email"]
    status = "assigned" if body.assignee else (body.status or "open")
    if status not in ("open", "assigned", "closed"):
        status = "open"
    async with db.pool().acquire() as con:
        n = await con.fetchval("SELECT count(*) FROM blockers WHERE org_id = $1", user["org_id"])
        bid = "BLK-" + str(2001 + int(n))
        row = await con.fetchrow(
            "INSERT INTO blockers (id, org_id, title, status, assignee, opened_by, action, wo, sos, parts, comments) "
            "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'[]'::jsonb) RETURNING *",
            bid, user["org_id"], body.title, status, body.assignee, who, body.action, body.wo,
            body.sos, body.parts)
        await _log_activity(con, user["org_id"], who, "blocker.created", bid + " · " + body.title)
    return _blocker_out(row)


@app.patch("/api/blockers/{bid}")
async def patch_blocker(bid: str, body: BlockerPatch, user: dict = Depends(current_user)):
    who = user.get("full_name") or user["email"]
    async with db.pool().acquire() as con:
        cur = await con.fetchrow("SELECT * FROM blockers WHERE org_id = $1 AND id = $2", user["org_id"], bid)
        if not cur:
            raise HTTPException(404, "Blocker not found")
        status = cur["status"]
        assignee = cur["assignee"]
        closed_at = cur["closed_at"]
        closed_by = cur["closed_by"]
        new_promise = cur["new_promise"]
        detail_bits = []
        if body.assignee is not None:
            assignee = body.assignee or None
            if status != "closed":
                status = "assigned" if assignee else "open"
            detail_bits.append("assignee=" + (assignee or "unassigned"))
        if body.status is not None and body.status in ("open", "assigned", "closed"):
            status = body.status
            detail_bits.append("status=" + status)
        if status == "closed":
            if closed_at is None:
                closed_at = datetime.now(timezone.utc)
                closed_by = who
        else:
            closed_at = None
            closed_by = None
        if body.new_promise is not None:
            if body.new_promise == "":
                new_promise = None
            else:
                from datetime import date as _date
                new_promise = _date.fromisoformat(body.new_promise)
            detail_bits.append("revisedPromise=" + (body.new_promise or "cleared"))
        row = await con.fetchrow(
            "UPDATE blockers SET status=$3, assignee=$4, closed_at=$5, closed_by=$6, new_promise=$7 "
            "WHERE org_id=$1 AND id=$2 RETURNING *",
            user["org_id"], bid, status, assignee, closed_at, closed_by, new_promise)
        await _log_activity(con, user["org_id"], who, "blocker.update", bid + " · " + ", ".join(detail_bits))
    return _blocker_out(row)


@app.post("/api/blockers/{bid}/comments")
async def add_blocker_comment(bid: str, body: CommentIn, user: dict = Depends(current_user)):
    who = user.get("full_name") or user["email"]
    entry = {"ts": datetime.now(timezone.utc).isoformat(), "who": who, "text": body.text}
    async with db.pool().acquire() as con:
        row = await con.fetchrow(
            "UPDATE blockers SET comments = comments || $3::jsonb WHERE org_id=$1 AND id=$2 RETURNING *",
            user["org_id"], bid, [entry])
        if not row:
            raise HTTPException(404, "Blocker not found")
        await _log_activity(con, user["org_id"], who, "blocker.comment", bid + ": " + body.text[:70])
    return _blocker_out(row)


# --------------------------------------------------------------------------- #
# connector catalog + test
# --------------------------------------------------------------------------- #
@app.get("/api/connectors/catalog")
async def connector_catalog(user: dict = Depends(current_user)):
    async with db.pool().acquire() as con:
        rows = await con.fetch(
            "SELECT type, label, category, enabled, auth_method, fields, doc_url "
            "FROM connector_catalog ORDER BY sort, label")
    return [dict(r) for r in rows]


@app.post("/api/connectors/{ctype}/test")
async def test_connector(ctype: str, user: dict = Depends(current_user)):
    if user["role"] not in ("org_admin", "superadmin"):
        raise HTTPException(403, "Only an org admin can test connectors")
    async with db.pool().acquire() as con:
        row = await con.fetchrow(
            "SELECT config, secret_ciphertext FROM connector_credentials WHERE org_id = $1 AND type = $2",
            user["org_id"], ctype)
    if not row or not row["secret_ciphertext"]:
        raise HTTPException(400, "Save the connector configuration first")
    secret = decrypt_bytes(row["secret_ciphertext"])
    cfg = row["config"] or {}
    ok, message = await connectors_rest.test_connection(ctype, cfg.get("base_url", ""), secret, cfg)
    return {"ok": ok, "message": message}


# --------------------------------------------------------------------------- #
# invites
# --------------------------------------------------------------------------- #
class InviteIn(BaseModel):
    email: EmailStr


class AcceptIn(BaseModel):
    token: str
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=10, max_length=200)


@app.post("/api/invites")
async def create_invite(body: InviteIn, user: dict = Depends(current_user)):
    if user["role"] not in ("org_admin", "superadmin"):
        raise HTTPException(403, "Only an org admin can invite people")
    token = secrets.token_urlsafe(24)
    expires = datetime.now(timezone.utc) + timedelta(days=7)
    async with db.pool().acquire() as con:
        if await con.fetchval("SELECT 1 FROM users WHERE lower(email) = lower($1)", body.email):
            raise HTTPException(409, "That email already has an account")
        await con.execute(
            "INSERT INTO invites (org_id, email, token, invited_by, role, expires_at) "
            "VALUES ($1, $2, $3, $4, 'member', $5)",
            user["org_id"], body.email, token, user["user_id"], expires)
    accept_url = settings.app_base_url.rstrip("/") + "/invite?token=" + token
    org_name = user.get("legal_name") or "Your organization"
    inviter = user.get("full_name") or user.get("email") or "An admin"
    sent = emailer.send_invite_email(body.email, org_name, inviter, accept_url)
    return {"ok": True, "invite_url": accept_url, "emailed": sent}


@app.get("/api/invites")
async def list_invites(user: dict = Depends(current_user)):
    if user["role"] not in ("org_admin", "superadmin"):
        raise HTTPException(403, "Admins only")
    async with db.pool().acquire() as con:
        rows = await con.fetch(
            "SELECT id, email, status, created_at, expires_at FROM invites "
            "WHERE org_id = $1 ORDER BY created_at DESC", user["org_id"])
    return [{"id": str(r["id"]), "email": r["email"], "status": r["status"],
             "created_at": r["created_at"].isoformat(), "expires_at": r["expires_at"].isoformat()} for r in rows]


@app.delete("/api/invites/{invite_id}")
async def revoke_invite(invite_id: str, user: dict = Depends(current_user)):
    if user["role"] not in ("org_admin", "superadmin"):
        raise HTTPException(403, "Admins only")
    try:
        iid = uuid.UUID(invite_id)
    except ValueError:
        raise HTTPException(400, "Bad invite id")
    async with db.pool().acquire() as con:
        await con.execute(
            "UPDATE invites SET status='revoked' WHERE id=$1 AND org_id=$2 AND status='pending'",
            iid, user["org_id"])
    return {"ok": True}


@app.get("/api/invites/lookup")
async def lookup_invite(token: str):
    async with db.pool().acquire() as con:
        r = await con.fetchrow(
            "SELECT i.email, i.status, i.expires_at, o.legal_name FROM invites i "
            "JOIN organizations o ON o.id = i.org_id WHERE i.token = $1", token)
    if not r:
        raise HTTPException(404, "Invite not found")
    if r["status"] != "pending":
        raise HTTPException(410, "This invite is no longer valid")
    if r["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(410, "This invite has expired")
    return {"email": r["email"], "org": {"legal_name": r["legal_name"]}}


@app.post("/api/invites/accept")
async def accept_invite(body: AcceptIn, resp: Response):
    secret = mfa.new_secret()
    async with db.pool().acquire() as con:
        async with con.transaction():
            inv = await con.fetchrow(
                "SELECT id, org_id, email, status, expires_at FROM invites WHERE token = $1 FOR UPDATE",
                body.token)
            if not inv or inv["status"] != "pending":
                raise HTTPException(410, "This invite is no longer valid")
            if inv["expires_at"] < datetime.now(timezone.utc):
                raise HTTPException(410, "This invite has expired")
            if await con.fetchval("SELECT 1 FROM users WHERE lower(email) = lower($1)", inv["email"]):
                raise HTTPException(409, "That email already has an account")
            full = (body.first_name.strip() + " " + body.last_name.strip()).strip()
            user_id = await con.fetchval(
                "INSERT INTO users (org_id, email, full_name, password_hash, role, mfa_secret, mfa_enabled) "
                "VALUES ($1, $2, $3, $4, 'member', $5, false) RETURNING id",
                inv["org_id"], inv["email"], full, hash_password(body.password), encrypt_str(secret))
            await con.execute("UPDATE invites SET status='accepted', accepted_at=now() WHERE id=$1", inv["id"])
            sid = await create_session(con, user_id, mfa_passed=False)
    set_session_cookie(resp, sid)
    uri = mfa.provisioning_uri(secret, inv["email"])
    return {"mfa_setup": {"otpauth_uri": uri, "qr_svg": mfa.qr_svg(uri), "secret": secret}, "email": inv["email"]}

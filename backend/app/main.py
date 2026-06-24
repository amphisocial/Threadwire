import json
import secrets
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

from . import billing, connectors_rest, db, emailer, importer, mfa
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


@app.get("/api/companies/search")
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
            "SELECT u.email, u.full_name, u.role, u.plan, COALESCE(d.tokens,0) AS tokens_today "
            "FROM users u LEFT JOIN usage_daily d ON d.user_id = u.id AND d.usage_date = CURRENT_DATE "
            "WHERE u.org_id = $1 ORDER BY u.full_name NULLS LAST, u.email", user["org_id"])
    ent = bool(user.get("enterprise"))
    members = []
    for r in rows:
        members.append({
            "email": r["email"], "full_name": r["full_name"], "role": r["role"],
            "plan": "enterprise" if ent else (r["plan"] or "free"),
            "tokens_today": r["tokens_today"],
            "unlimited": ent or r["plan"] == "pro",
        })
    return {"enterprise": ent, "free_limit": settings.free_daily_tokens, "members": members}


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
    sent = emailer.send_invite_email(body.email, user["legal_name"], user.get("full_name") or "An admin", accept_url)
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

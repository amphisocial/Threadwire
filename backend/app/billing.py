"""Minimal Stripe client (httpx, form-encoded). The card flow happens on
Stripe's hosted Checkout — we only create sessions and read their status.
The secret key stays server-side and never reaches the browser.
"""
from typing import Optional
import hashlib
import hmac
import time

import httpx

from .config import settings

BASE = "https://api.stripe.com/v1"


def verify_signature(payload: bytes, sig_header: str, secret: str, tolerance: int = 300) -> bool:
    """Verify Stripe's Stripe-Signature header (scheme: t=...,v1=...)."""
    try:
        parts = dict(p.split("=", 1) for p in sig_header.split(",") if "=" in p)
        t = parts.get("t")
        v1 = parts.get("v1")
        if not t or not v1:
            return False
        signed = ("%s." % t).encode("utf-8") + payload
        expected = hmac.new(secret.encode("utf-8"), signed, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, v1):
            return False
        if tolerance and abs(time.time() - int(t)) > tolerance:
            return False
        return True
    except Exception:
        return False


def _auth():
    return (settings.stripe_secret_key, "")


async def create_checkout(price_id: str, success_url: str, cancel_url: str,
                          customer_email: Optional[str] = None,
                          client_ref: Optional[str] = None,
                          metadata: Optional[dict] = None) -> Optional[dict]:
    if not settings.stripe_secret_key or not price_id:
        return None
    data = {
        "mode": "subscription",
        "line_items[0][price]": price_id,
        "line_items[0][quantity]": "1",
        "success_url": success_url,
        "cancel_url": cancel_url,
        "allow_promotion_codes": "true",
    }
    if customer_email:
        data["customer_email"] = customer_email
    if client_ref:
        data["client_reference_id"] = client_ref
    for k, v in (metadata or {}).items():
        data["metadata[%s]" % k] = str(v)
    try:
        async with httpx.AsyncClient(timeout=30.0) as c:
            r = await c.post(BASE + "/checkout/sessions", data=data, auth=_auth())
        if r.status_code != 200:
            return None
        j = r.json()
        return {"id": j.get("id"), "url": j.get("url")}
    except Exception:
        return None


async def retrieve_session(session_id: str) -> Optional[dict]:
    if not settings.stripe_secret_key:
        return None
    try:
        async with httpx.AsyncClient(timeout=30.0) as c:
            r = await c.get(BASE + "/checkout/sessions/" + session_id, auth=_auth())
        if r.status_code != 200:
            return None
        return r.json()
    except Exception:
        return None


async def create_portal(customer_id: str, return_url: str) -> Optional[str]:
    if not settings.stripe_secret_key or not customer_id:
        return None
    try:
        async with httpx.AsyncClient(timeout=30.0) as c:
            r = await c.post(BASE + "/billing_portal/sessions",
                             data={"customer": customer_id, "return_url": return_url}, auth=_auth())
        if r.status_code != 200:
            return None
        return r.json().get("url")
    except Exception:
        return None

from __future__ import annotations

import httpx


async def test_connection(ctype: str, base_url: str, secret: str, config: dict):
    """Validate stored credentials by calling the connector's public REST API.
    Returns (ok: bool, message: str)."""
    base = (base_url or "").rstrip("/")
    if not base:
        return False, "Base URL is required"
    try:
        if ctype == "jira":
            email = (config or {}).get("email", "")
            async with httpx.AsyncClient(timeout=15.0) as c:
                r = await c.get(base + "/rest/api/3/myself", auth=(email, secret))
            if r.status_code == 200:
                name = r.json().get("displayName", "Jira user")
                return True, f"Connected to Jira as {name}"
            if r.status_code in (401, 403):
                return False, "Jira rejected the credentials (401/403)"
            return False, f"Jira returned HTTP {r.status_code}"

        if ctype == "jama":
            client_id = (config or {}).get("client_id", "")
            async with httpx.AsyncClient(timeout=15.0) as c:
                r = await c.post(base + "/rest/oauth/token",
                                 data={"grant_type": "client_credentials"},
                                 auth=(client_id, secret))
            if r.status_code == 200 and r.json().get("access_token"):
                return True, "Jama OAuth token acquired successfully"
            if r.status_code in (400, 401, 403):
                return False, "Jama rejected the client credentials"
            return False, f"Jama returned HTTP {r.status_code}"

        return False, "Connection test not implemented for this connector yet"
    except httpx.RequestError:
        return False, "Could not reach the host — check the base URL / network"
    except Exception:
        return False, "Connection test failed"

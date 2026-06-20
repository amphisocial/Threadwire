from typing import Optional
import httpx

from .config import settings

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"


async def anthropic_chat(system: Optional[str], messages: list[dict]) -> Optional[str]:
    """Proxy a chat completion to Anthropic using the server-side key.

    Returns the assistant text, or None on any failure (the frontend then
    shows its offline fallback). The API key never leaves the server.
    """
    if not settings.anthropic_api_key:
        return None

    payload: dict = {
        "model": settings.anthropic_model,
        "max_tokens": settings.anthropic_max_tokens,
        "messages": messages,
    }
    if system:
        payload["system"] = system

    headers = {
        "x-api-key": settings.anthropic_api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(ANTHROPIC_URL, json=payload, headers=headers)
        if r.status_code != 200:
            return None
        data = r.json()
        parts = [b.get("text", "") for b in data.get("content", []) if b.get("type") == "text"]
        text = "\n".join(parts).strip()
        return text or None
    except Exception:
        return None

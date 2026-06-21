from typing import Optional
import httpx

from .config import settings

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
OPENAI_URL = "https://api.openai.com/v1/chat/completions"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


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


async def openai_chat(system: Optional[str], messages: list) -> Optional[str]:
    """Proxy a chat completion to OpenAI (Chat Completions API)."""
    if not settings.openai_api_key:
        return None
    msgs = []
    if system:
        msgs.append({"role": "system", "content": system})
    msgs.extend(messages)
    payload = {
        "model": settings.openai_model,
        "messages": msgs,
        "max_tokens": settings.anthropic_max_tokens,
    }
    headers = {
        "Authorization": "Bearer " + settings.openai_api_key,
        "content-type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(OPENAI_URL, json=payload, headers=headers)
        if r.status_code != 200:
            return None
        data = r.json()
        choices = data.get("choices", [])
        if not choices:
            return None
        text = (choices[0].get("message", {}).get("content") or "").strip()
        return text or None
    except Exception:
        return None


async def gemini_chat(system: Optional[str], messages: list) -> Optional[str]:
    """Proxy a chat completion to Google Gemini (generateContent API)."""
    if not settings.gemini_api_key:
        return None
    contents = []
    for m in messages:
        role = "model" if m.get("role") == "assistant" else "user"
        contents.append({"role": role, "parts": [{"text": m.get("content", "")}]})
    payload = {
        "contents": contents,
        "generationConfig": {"maxOutputTokens": settings.anthropic_max_tokens},
    }
    if system:
        payload["systemInstruction"] = {"parts": [{"text": system}]}
    url = GEMINI_URL.format(model=settings.gemini_model)
    headers = {
        "content-type": "application/json",
        "x-goog-api-key": settings.gemini_api_key,  # key in header, never in the URL
    }
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(url, json=payload, headers=headers)
        if r.status_code != 200:
            return None
        data = r.json()
        cands = data.get("candidates", [])
        if not cands:
            return None
        parts = cands[0].get("content", {}).get("parts", [])
        text = "".join(p.get("text", "") for p in parts).strip()
        return text or None
    except Exception:
        return None


async def ai_complete(system: Optional[str], messages: list) -> Optional[str]:
    """Dispatch to the provider configured via AI_MODEL. Returns text or None
    (frontend falls back to its offline answer on None)."""
    provider = settings.ai_provider
    if provider == "openai":
        return await openai_chat(system, messages)
    if provider == "gemini":
        return await gemini_chat(system, messages)
    return await anthropic_chat(system, messages)

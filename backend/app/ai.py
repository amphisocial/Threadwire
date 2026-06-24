import logging
from typing import Optional

import httpx

from .config import settings

log = logging.getLogger("threadwire.ai")

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
OPENAI_URL = "https://api.openai.com/v1/chat/completions"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


def _fail(provider: str, msg: str):
    """Log why a provider returned no text, then return None so the UI falls back."""
    log.warning("AI[%s] no answer: %s", provider, str(msg)[:600])
    return None


async def anthropic_chat(system: Optional[str], messages: list) -> Optional[str]:
    if not settings.anthropic_api_key:
        return _fail("anthropic", "ANTHROPIC_API_KEY is blank")
    payload = {"model": settings.anthropic_model, "max_tokens": settings.anthropic_max_tokens, "messages": messages}
    if system:
        payload["system"] = system
    headers = {"x-api-key": settings.anthropic_api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(ANTHROPIC_URL, json=payload, headers=headers)
        if r.status_code != 200:
            return _fail("anthropic", "HTTP %s: %s" % (r.status_code, r.text))
        data = r.json()
        parts = [b.get("text", "") for b in data.get("content", []) if b.get("type") == "text"]
        text = "\n".join(parts).strip()
        return text or _fail("anthropic", "empty content; stop_reason=%s" % data.get("stop_reason"))
    except Exception as e:
        return _fail("anthropic", "exception: %r" % e)


async def openai_chat(system: Optional[str], messages: list) -> Optional[str]:
    if not settings.openai_api_key:
        return _fail("openai", "OPENAI_API_KEY is blank")
    msgs = []
    if system:
        msgs.append({"role": "system", "content": system})
    msgs.extend(messages)
    payload = {"model": settings.openai_model, "messages": msgs, "max_tokens": max(settings.anthropic_max_tokens, 1024)}
    headers = {"Authorization": "Bearer " + settings.openai_api_key, "content-type": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(OPENAI_URL, json=payload, headers=headers)
        if r.status_code != 200:
            return _fail("openai", "HTTP %s: %s" % (r.status_code, r.text))
        data = r.json()
        choices = data.get("choices", [])
        if not choices:
            return _fail("openai", "no choices: %s" % data)
        text = (choices[0].get("message", {}).get("content") or "").strip()
        return text or _fail("openai", "empty text; finish_reason=%s" % choices[0].get("finish_reason"))
    except Exception as e:
        return _fail("openai", "exception: %r" % e)


async def gemini_chat(system: Optional[str], messages: list) -> Optional[str]:
    if not settings.gemini_api_key:
        return _fail("gemini", "GEMINI_API_KEY is blank")
    contents = []
    for m in messages:
        role = "model" if m.get("role") == "assistant" else "user"
        contents.append({"role": role, "parts": [{"text": m.get("content", "")}]})
    # 2.5 models spend part of the budget on "thinking"; give enough room to emit text
    payload = {
        "contents": contents,
        "generationConfig": {"maxOutputTokens": max(settings.anthropic_max_tokens, 2048)},
    }
    if system:
        payload["systemInstruction"] = {"parts": [{"text": system}]}
    url = GEMINI_URL.format(model=settings.gemini_model)
    headers = {"content-type": "application/json", "x-goog-api-key": settings.gemini_api_key}
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(url, json=payload, headers=headers)
        if r.status_code != 200:
            return _fail("gemini", "HTTP %s (model=%s): %s" % (r.status_code, settings.gemini_model, r.text))
        data = r.json()
        if data.get("promptFeedback", {}).get("blockReason"):
            return _fail("gemini", "prompt blocked: %s" % data["promptFeedback"])
        cands = data.get("candidates", [])
        if not cands:
            return _fail("gemini", "no candidates: %s" % data)
        cand = cands[0]
        parts = cand.get("content", {}).get("parts", [])
        text = "".join(p.get("text", "") for p in parts).strip()
        if text:
            return text
        return _fail("gemini", "empty text; finishReason=%s" % cand.get("finishReason"))
    except Exception as e:
        return _fail("gemini", "exception: %r" % e)


async def ai_complete(system: Optional[str], messages: list) -> Optional[str]:
    """Dispatch to the provider configured via AI_MODEL. Returns text or None."""
    provider = settings.ai_provider
    log.info("AI dispatch provider=%s model=%s", provider,
             settings.gemini_model if provider == "gemini" else
             settings.openai_model if provider == "openai" else settings.anthropic_model)
    if provider == "openai":
        return await openai_chat(system, messages)
    if provider == "gemini":
        return await gemini_chat(system, messages)
    return await anthropic_chat(system, messages)

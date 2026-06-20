from __future__ import annotations

import base64
import os


class Settings:
    database_url = os.environ.get(
        "DATABASE_URL", "postgresql://threadwire:threadwire@localhost:5432/threadwire")
    secret_key_b64 = os.environ.get("TW_SECRET_KEY", "")
    anthropic_api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    anthropic_model = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-6")
    anthropic_max_tokens = int(os.environ.get("ANTHROPIC_MAX_TOKENS", "1024"))
    cookie_secure = os.environ.get("COOKIE_SECURE", "true").lower() == "true"
    session_days = int(os.environ.get("SESSION_DAYS", "14"))

    # Public base URL used in invite links / emails
    app_base_url = os.environ.get("APP_BASE_URL", "https://threadwire.ai")

    # SMTP for invite emails (optional — if unset, invite link is returned to the admin to share)
    smtp_host = os.environ.get("SMTP_HOST", "")
    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_user = os.environ.get("SMTP_USER", "")
    smtp_pass = os.environ.get("SMTP_PASS", "")
    smtp_from = os.environ.get("SMTP_FROM", "")

    def secret_key(self) -> bytes:
        if not self.secret_key_b64:
            raise RuntimeError("TW_SECRET_KEY is not set")
        key = base64.b64decode(self.secret_key_b64)
        if len(key) != 32:
            raise RuntimeError("TW_SECRET_KEY must be base64 of exactly 32 bytes")
        return key


settings = Settings()

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

    ai_provider = os.environ.get("AI_MODEL", "anthropic").strip().lower()
    openai_api_key = os.environ.get("OPENAI_API_KEY", "")
    openai_model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
    gemini_api_key = os.environ.get("GEMINI_API_KEY", "")
    gemini_model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

    payment_mode = os.environ.get("PAYMENT_MODE", "test").strip().lower()
    _payment_live = payment_mode in ("prod", "production", "live")
    stripe_secret_key = (
        (os.environ.get("STRIPE_SECRET_KEY_LIVE") if _payment_live else os.environ.get("STRIPE_SECRET_KEY_TEST"))
        or os.environ.get("STRIPE_SECRET_KEY", ""))
    stripe_price_pro = (
        (os.environ.get("STRIPE_PRICE_PRO_LIVE") if _payment_live else os.environ.get("STRIPE_PRICE_PRO_TEST"))
        or os.environ.get("STRIPE_PRICE_PRO", ""))
    stripe_price_enterprise = (
        (os.environ.get("STRIPE_PRICE_ENTERPRISE_LIVE") if _payment_live else os.environ.get("STRIPE_PRICE_ENTERPRISE_TEST"))
        or os.environ.get("STRIPE_PRICE_ENTERPRISE", ""))
    stripe_webhook_secret = (
        (os.environ.get("STRIPE_WEBHOOK_SECRET_LIVE") if _payment_live else os.environ.get("STRIPE_WEBHOOK_SECRET_TEST"))
        or os.environ.get("STRIPE_WEBHOOK_SECRET", ""))
    free_daily_tokens = int(os.environ.get("FREE_DAILY_TOKENS", "5"))
    cookie_secure = os.environ.get("COOKIE_SECURE", "true").lower() == "true"
    session_days = int(os.environ.get("SESSION_DAYS", "14"))

    app_base_url = os.environ.get("APP_BASE_URL", "https://threadwire.ai")

    smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_user = os.environ.get("SMTP_USER", "")
    smtp_pass = os.environ.get("SMTP_PASS", "")
    smtp_from = os.environ.get("SMTP_FROM", "")

    # Document store. If an S3 bucket is configured, documents (supplier certs, SOPs,
    # inspection PDFs) live in S3; otherwise they fall back to a local directory so the
    # demo works without AWS. Keys are namespaced by org: org_{org_id}/{doc_type}/{file}.
    s3_bucket = os.environ.get("THREADWIRE_S3_BUCKET", "")
    s3_region = os.environ.get("THREADWIRE_S3_REGION", os.environ.get("AWS_REGION", "us-east-1"))
    s3_prefix = os.environ.get("THREADWIRE_S3_PREFIX", "")
    aws_access_key_id = os.environ.get("AWS_ACCESS_KEY_ID", "")
    aws_secret_access_key = os.environ.get("AWS_SECRET_ACCESS_KEY", "")
    local_upload_dir = os.environ.get("THREADWIRE_UPLOAD_DIR", "/opt/threadwire/backend/uploads")

    @property
    def s3_enabled(self) -> bool:
        return bool(self.s3_bucket)

    contact_recipients = os.environ.get("CONTACT_RECIPIENTS", "anu@threadwire.ai,maro@threadwire.ai")

    def secret_key(self) -> bytes:
        if not self.secret_key_b64:
            raise RuntimeError("TW_SECRET_KEY is not set")
        key = base64.b64decode(self.secret_key_b64)
        if len(key) != 32:
            raise RuntimeError("TW_SECRET_KEY must be base64 of exactly 32 bytes")
        return key


settings = Settings()

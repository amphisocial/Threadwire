from __future__ import annotations

import smtplib
import ssl
from email.message import EmailMessage

from .config import settings


def send_invite_email(to_email: str, org_name: str, inviter_name: str, accept_url: str) -> bool:
    """Send a branded invite email. Returns False (so the caller shares the link
    manually) if SMTP isn't configured or sending fails."""
    if not (settings.smtp_host and settings.smtp_user and settings.smtp_pass):
        return False

    msg = EmailMessage()
    msg["Subject"] = f"You're invited to {org_name} on ThreadWire"
    msg["From"] = settings.smtp_from or settings.smtp_user
    msg["To"] = to_email
    msg.set_content(
        f"{inviter_name} invited you to join {org_name} on ThreadWire.\n\n"
        f"Accept your invite: {accept_url}\n\nThis link expires in 7 days.")
    msg.add_alternative(f"""\
<div style="font-family:Arial,Helvetica,sans-serif;background:#0a0e15;padding:32px">
  <div style="max-width:520px;margin:0 auto;background:#121a26;border:1px solid #243245;border-radius:14px;overflow:hidden">
    <div style="padding:24px 28px;border-bottom:1px solid #243245">
      <span style="color:#fff;font-size:20px;font-weight:800">ThreadWire</span>
      <span style="color:#8d9fb5;font-size:13px"> · AI for Manufacturing</span>
    </div>
    <div style="padding:28px">
      <h1 style="color:#e7eef6;font-size:22px;margin:0 0 10px">You've been invited</h1>
      <p style="color:#8d9fb5;font-size:15px;line-height:1.6;margin:0 0 22px">
        <b style="color:#e7eef6">{inviter_name}</b> invited you to join
        <b style="color:#ff8a3d">{org_name}</b>'s workspace on ThreadWire — the digital thread for manufacturing.
      </p>
      <a href="{accept_url}" style="display:inline-block;background:#ff8a3d;color:#1a0f06;font-weight:700;
        text-decoration:none;padding:13px 26px;border-radius:10px;font-size:15px">Accept invitation</a>
      <p style="color:#5d6f86;font-size:12px;margin:22px 0 0">
        This link expires in 7 days. If you didn't expect this, you can ignore this email.
      </p>
    </div>
  </div>
</div>""", subtype="html")

    try:
        ctx = ssl.create_default_context()
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as s:
            s.starttls(context=ctx)
            s.login(settings.smtp_user, settings.smtp_pass)
            s.send_message(msg)
        return True
    except Exception:
        return False

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

def send_contact_email(company: str, name: str, email: str, phone: str,
                       preferred_contact: str, website: str) -> bool:
    """Send contact-form submission to the configured recipients."""
    if not (settings.smtp_host and settings.smtp_user and settings.smtp_pass):
        return False

    recipients = [r.strip() for r in settings.contact_recipients.split(",") if r.strip()]
    if not recipients:
        return False

    body_text = (
        f"New contact form submission from threadwire.ai\n\n"
        f"Company:            {company}\n"
        f"Name:               {name}\n"
        f"Email:              {email}\n"
        f"Phone:              {phone or '—'}\n"
        f"Preferred contact:  {preferred_contact}\n"
        f"Website:            {website or '—'}\n"
    )
    body_html = f"""\
<div style="font-family:Arial,Helvetica,sans-serif;background:#0a0e15;padding:32px">
  <div style="max-width:560px;margin:0 auto;background:#121a26;border:1px solid #243245;border-radius:14px;overflow:hidden">
    <div style="padding:20px 28px;border-bottom:1px solid #243245">
      <span style="color:#fff;font-size:18px;font-weight:800">Threadwire</span>
      <span style="color:#8d9fb5;font-size:13px"> · New contact request</span>
    </div>
    <div style="padding:28px">
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#8d9fb5">
        <tr><td style="padding:7px 0;color:#5d6f86;width:160px">Company</td><td style="color:#e7eef6;font-weight:600">{company}</td></tr>
        <tr><td style="padding:7px 0;color:#5d6f86">Name</td><td style="color:#e7eef6">{name}</td></tr>
        <tr><td style="padding:7px 0;color:#5d6f86">Email</td><td><a href="mailto:{email}" style="color:#ff8a3d">{email}</a></td></tr>
        <tr><td style="padding:7px 0;color:#5d6f86">Phone</td><td style="color:#e7eef6">{phone or '—'}</td></tr>
        <tr><td style="padding:7px 0;color:#5d6f86">Preferred contact</td><td style="color:#e7eef6">{preferred_contact}</td></tr>
        <tr><td style="padding:7px 0;color:#5d6f86">Website</td><td style="color:#e7eef6">{website or '—'}</td></tr>
      </table>
    </div>
  </div>
</div>"""

    msg = EmailMessage()
    msg["Subject"] = f"Contact request from {name} at {company}"
    msg["From"] = settings.smtp_from or settings.smtp_user
    msg["To"] = ", ".join(recipients)
    msg["Reply-To"] = email
    msg.set_content(body_text)
    msg.add_alternative(body_html, subtype="html")

    try:
        ctx = ssl.create_default_context()
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as s:
            s.starttls(context=ctx)
            s.login(settings.smtp_user, settings.smtp_pass)
            s.send_message(msg)
        return True
    except Exception:
        return False



from __future__ import annotations

import smtplib
import ssl
import email.policy
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from .config import settings


def _configured() -> bool:
    return bool(settings.smtp_host and settings.smtp_user and settings.smtp_pass)


def _send(subject: str, from_addr: str, to_addrs: list, reply_to: str,
          body_text: str, body_html: str) -> bool:
    """Single shared SMTP send path used by every email in the app."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = from_addr
        msg["To"] = ", ".join(to_addrs)
        if reply_to:
            msg["Reply-To"] = reply_to
        msg.attach(MIMEText(body_text, "plain", "utf-8"))
        msg.attach(MIMEText(body_html, "html", "utf-8"))

        ctx = ssl.create_default_context()
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as s:
            s.ehlo()
            s.starttls(context=ctx)
            s.ehlo()
            s.login(settings.smtp_user, settings.smtp_pass)
            s.sendmail(from_addr, to_addrs, msg.as_bytes())
        return True
    except Exception as e:
        print(f"SMTP error ({subject!r}): {e}", flush=True)
        return False


def send_invite_email(to_email: str, org_name: str, inviter_name: str, accept_url: str) -> bool:
    if not _configured():
        print("SMTP invite: not configured", flush=True)
        return False

    org = org_name or "your team"
    inviter = inviter_name or "An admin"
    from_addr = settings.smtp_from or settings.smtp_user

    body_text = (
        f"{inviter} has invited you to join {org} on Threadwire.\n\n"
        f"Accept your invite: {accept_url}\n\n"
        f"This link expires in 7 days."
    )
    body_html = (
        '<div style="font-family:Arial,sans-serif;background:#08090d;padding:32px">'
        '<div style="max-width:520px;margin:0 auto;background:#13181f;'
        'border:1px solid #252d3d;border-radius:14px;overflow:hidden">'
        '<div style="padding:22px 28px;border-bottom:1px solid #252d3d">'
        '<span style="color:#f0f4f8;font-size:19px;font-weight:800">Threadwire</span>'
        '<span style="color:#7a8fa8;font-size:13px"> - Manufacturing Delivery Control</span>'
        '</div>'
        '<div style="padding:28px">'
        '<h1 style="color:#f0f4f8;font-size:21px;margin:0 0 12px">You have been invited</h1>'
        f'<p style="color:#b8c5d6;font-size:15px;line-height:1.6;margin:0 0 24px">'
        f'<b style="color:#f0f4f8">{inviter}</b> has invited you to join '
        f'<b style="color:#ff9a4d">{org}</b> on Threadwire.</p>'
        f'<a href="{accept_url}" style="display:inline-block;background:#ff9a4d;color:#150b02;'
        f'font-weight:700;text-decoration:none;padding:13px 26px;border-radius:10px;font-size:15px">'
        f'Accept invitation</a>'
        '<p style="color:#7a8fa8;font-size:12px;margin:24px 0 0">'
        'This link expires in 7 days. If you did not expect this, you can ignore this email.</p>'
        '</div></div></div>'
    )

    return _send(
        subject=f"You are invited to join {org} on Threadwire",
        from_addr=from_addr,
        to_addrs=[to_email],
        reply_to="",
        body_text=body_text,
        body_html=body_html,
    )


def send_contact_email(company: str, name: str, email: str, phone: str,
                       preferred_contact: str, website: str) -> bool:
    if not _configured():
        print("SMTP contact: not configured", flush=True)
        return False

    recipients = [r.strip() for r in settings.contact_recipients.split(",") if r.strip()]
    if not recipients:
        print("SMTP contact: CONTACT_RECIPIENTS not set", flush=True)
        return False

    phone_display = phone if phone else "Not provided"
    website_display = website if website else "Not provided"
    from_addr = settings.smtp_from or settings.smtp_user

    body_text = (
        f"New contact form submission from threadwire.ai\n\n"
        f"Company:           {company}\n"
        f"Name:              {name}\n"
        f"Email:             {email}\n"
        f"Phone:             {phone_display}\n"
        f"Preferred contact: {preferred_contact}\n"
        f"Website:           {website_display}\n"
    )
    body_html = (
        '<div style="font-family:Arial,sans-serif;background:#08090d;padding:32px">'
        '<div style="max-width:560px;margin:0 auto;background:#13181f;'
        'border:1px solid #252d3d;border-radius:14px;overflow:hidden">'
        '<div style="padding:20px 28px;border-bottom:1px solid #252d3d">'
        '<span style="color:#f0f4f8;font-size:18px;font-weight:800">Threadwire</span>'
        '<span style="color:#7a8fa8;font-size:13px"> - New contact request</span>'
        '</div>'
        '<div style="padding:28px">'
        '<table style="width:100%;border-collapse:collapse;font-size:14px">'
        f'<tr><td style="padding:7px 0;color:#7a8fa8;width:160px">Company</td>'
        f'<td style="color:#f0f4f8;font-weight:600">{company}</td></tr>'
        f'<tr><td style="padding:7px 0;color:#7a8fa8">Name</td>'
        f'<td style="color:#f0f4f8">{name}</td></tr>'
        f'<tr><td style="padding:7px 0;color:#7a8fa8">Email</td>'
        f'<td><a href="mailto:{email}" style="color:#ff9a4d">{email}</a></td></tr>'
        f'<tr><td style="padding:7px 0;color:#7a8fa8">Phone</td>'
        f'<td style="color:#b8c5d6">{phone_display}</td></tr>'
        f'<tr><td style="padding:7px 0;color:#7a8fa8">Preferred contact</td>'
        f'<td style="color:#b8c5d6">{preferred_contact}</td></tr>'
        f'<tr><td style="padding:7px 0;color:#7a8fa8">Website</td>'
        f'<td style="color:#b8c5d6">{website_display}</td></tr>'
        '</table>'
        '</div></div></div>'
    )

    return _send(
        subject=f"Contact request from {name} at {company}",
        from_addr=from_addr,
        to_addrs=recipients,
        reply_to=email,
        body_text=body_text,
        body_html=body_html,
    )

"""TOTP multi-factor auth — authenticator apps (Google Authenticator, Authy,
1Password). No SMS/email cost. Secrets are stored encrypted via crypto.py."""
import io

import pyotp
import qrcode
import qrcode.image.svg

ISSUER = "ThreadWire"


def new_secret() -> str:
    return pyotp.random_base32()


def provisioning_uri(secret: str, email: str) -> str:
    return pyotp.TOTP(secret).provisioning_uri(name=email, issuer_name=ISSUER)


def qr_svg(uri: str) -> str:
    img = qrcode.make(uri, image_factory=qrcode.image.svg.SvgImage, box_size=9, border=2)
    buf = io.BytesIO()
    img.save(buf)
    return buf.getvalue().decode("utf-8")


def verify(secret: str, code: str) -> bool:
    try:
        clean = (code or "").strip().replace(" ", "").replace("-", "")
        return pyotp.TOTP(secret).verify(clean, valid_window=1)
    except Exception:
        return False

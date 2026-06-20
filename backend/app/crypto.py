import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from .config import settings

# Layout of stored blob:  [12-byte nonce][ciphertext+tag]
NONCE_LEN = 12


def encrypt_str(plaintext: str) -> bytes:
    key = settings.secret_key()
    nonce = os.urandom(NONCE_LEN)
    ct = AESGCM(key).encrypt(nonce, plaintext.encode("utf-8"), None)
    return nonce + ct


def decrypt_bytes(blob: bytes) -> str:
    key = settings.secret_key()
    nonce, ct = blob[:NONCE_LEN], blob[NONCE_LEN:]
    return AESGCM(key).decrypt(nonce, ct, None).decode("utf-8")

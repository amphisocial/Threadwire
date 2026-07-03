"""Document storage: S3 when a bucket is configured, else a local directory.

The rest of the app calls put_object / get_object / list_objects / delete_object
and never needs to know which backend is active. Keys are namespaced per org by
the caller (e.g. "org_<uuid>/cert/<filename>").
"""
import os
from typing import Optional

from .config import settings

_s3_client = None


def _s3():
    global _s3_client
    if _s3_client is None:
        import boto3  # imported lazily so the app runs without boto3 when S3 is off
        kwargs = {"region_name": settings.s3_region}
        if settings.aws_access_key_id and settings.aws_secret_access_key:
            kwargs["aws_access_key_id"] = settings.aws_access_key_id
            kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
        _s3_client = boto3.client("s3", **kwargs)
    return _s3_client


def _full_key(key: str) -> str:
    p = settings.s3_prefix.strip("/")
    return (p + "/" + key) if p else key


def backend_name() -> str:
    return "s3" if settings.s3_enabled else "local"


def put_object(key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
    """Store bytes under key. Returns the storage locator actually used."""
    if settings.s3_enabled:
        _s3().put_object(Bucket=settings.s3_bucket, Key=_full_key(key), Body=data, ContentType=content_type)
        return "s3://%s/%s" % (settings.s3_bucket, _full_key(key))
    path = os.path.join(settings.local_upload_dir, key)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(data)
    return "file://" + path


def get_object(key: str) -> Optional[bytes]:
    if settings.s3_enabled:
        try:
            r = _s3().get_object(Bucket=settings.s3_bucket, Key=_full_key(key))
            return r["Body"].read()
        except Exception:
            return None
    path = os.path.join(settings.local_upload_dir, key)
    if not os.path.exists(path):
        return None
    with open(path, "rb") as f:
        return f.read()


def list_objects(prefix: str) -> list:
    """List object keys under a prefix (org-relative)."""
    if settings.s3_enabled:
        out = []
        token = None
        base = _full_key(prefix)
        while True:
            kw = {"Bucket": settings.s3_bucket, "Prefix": base}
            if token:
                kw["ContinuationToken"] = token
            r = _s3().list_objects_v2(**kw)
            for o in r.get("Contents", []):
                k = o["Key"]
                if settings.s3_prefix:
                    k = k[len(settings.s3_prefix.strip("/")) + 1:]
                out.append({"key": k, "size": o.get("Size", 0)})
            if not r.get("IsTruncated"):
                break
            token = r.get("NextContinuationToken")
        return out
    root = os.path.join(settings.local_upload_dir, prefix)
    out = []
    for dirpath, _dirs, files in os.walk(root):
        for fn in files:
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, settings.local_upload_dir)
            out.append({"key": rel, "size": os.path.getsize(full)})
    return out


def delete_object(key: str) -> None:
    if settings.s3_enabled:
        try:
            _s3().delete_object(Bucket=settings.s3_bucket, Key=_full_key(key))
        except Exception:
            pass
        return
    path = os.path.join(settings.local_upload_dir, key)
    if os.path.exists(path):
        os.remove(path)

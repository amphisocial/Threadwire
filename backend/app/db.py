from __future__ import annotations

import json

import asyncpg

from .config import settings

_pool = None


async def _init_conn(con):
    # Make jsonb columns encode/decode as Python objects (dict/list).
    for t in ("jsonb", "json"):
        await con.set_type_codec(t, encoder=json.dumps, decoder=json.loads, schema="pg_catalog")


async def init_pool() -> None:
    global _pool
    _pool = await asyncpg.create_pool(dsn=settings.database_url, min_size=1, max_size=5, init=_init_conn)


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def pool():
    if _pool is None:
        raise RuntimeError("DB pool not initialized")
    return _pool

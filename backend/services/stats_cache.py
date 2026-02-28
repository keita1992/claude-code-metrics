"""stats-cache.json の読み込みとキャッシュ管理"""

import time
from pathlib import Path

import orjson

from config import CACHE_TTL_SECONDS, STATS_CACHE_PATH

_cache: dict | None = None
_cache_time: float = 0.0


def load_stats_cache(path: Path = STATS_CACHE_PATH) -> dict:
    """stats-cache.jsonを読み込み、TTLキャッシュで返す"""
    global _cache, _cache_time

    now = time.monotonic()
    if _cache is not None and (now - _cache_time) < CACHE_TTL_SECONDS:
        return _cache

    with open(path, "rb") as f:
        data = orjson.loads(f.read())

    _cache = data
    _cache_time = now
    return data


def invalidate_cache() -> None:
    """キャッシュを無効化"""
    global _cache, _cache_time
    _cache = None
    _cache_time = 0.0

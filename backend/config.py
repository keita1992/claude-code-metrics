import os
from pathlib import Path

CLAUDE_DATA_DIR = Path(os.environ.get("CLAUDE_DATA_DIR", str(Path.home() / ".claude")))

STATS_CACHE_PATH = CLAUDE_DATA_DIR / "stats-cache.json"
PROJECTS_DIR = CLAUDE_DATA_DIR / "projects"

# API価格テーブル (USD per million tokens)
# 出典: https://platform.claude.com/docs/en/about-claude/pricing
PRICE_TABLE: dict[str, dict[str, float]] = {
    "claude-opus-4-6": {
        "input": 5.0,
        "output": 25.0,
        "cache_read": 0.50,
        "cache_creation": 6.25,
    },
    "claude-opus-4-5-20251101": {
        "input": 5.0,
        "output": 25.0,
        "cache_read": 0.50,
        "cache_creation": 6.25,
    },
    "claude-sonnet-4-5-20250929": {
        "input": 3.0,
        "output": 15.0,
        "cache_read": 0.30,
        "cache_creation": 3.75,
    },
    "claude-sonnet-4-6": {
        "input": 3.0,
        "output": 15.0,
        "cache_read": 0.30,
        "cache_creation": 3.75,
    },
    "claude-haiku-4-5-20251001": {
        "input": 1.0,
        "output": 5.0,
        "cache_read": 0.10,
        "cache_creation": 1.25,
    },
}

# モデルの表示名マッピング
MODEL_DISPLAY_NAMES: dict[str, str] = {
    "claude-opus-4-6": "Opus 4.6",
    "claude-opus-4-5-20251101": "Opus 4.5",
    "claude-sonnet-4-5-20250929": "Sonnet 4.5",
    "claude-sonnet-4-6": "Sonnet 4.6",
    "claude-haiku-4-5-20251001": "Haiku 4.5",
}

# キャッシュTTL (秒)
CACHE_TTL_SECONDS = 300

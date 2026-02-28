"""stats-cacheデータとJONLライブデータのマージ集約"""

import time
from collections import defaultdict
from datetime import date, timedelta

import polars as pl

from config import CACHE_TTL_SECONDS, PRICE_TABLE
from services.cost_calculator import calculate_cost
from services.jsonl_parser import parse_jsonl_files
from services.stats_cache import load_stats_cache

_agg_cache: dict | None = None
_agg_cache_time: float = 0.0


def get_aggregated_data() -> dict:
    """stats-cacheとJONLデータをマージして返す (TTLキャッシュ付き)"""
    global _agg_cache, _agg_cache_time

    now = time.monotonic()
    if _agg_cache is not None and (now - _agg_cache_time) < CACHE_TTL_SECONDS:
        return _agg_cache

    stats = load_stats_cache()
    last_computed = stats.get("lastComputedDate", "")

    # lastComputedDate の翌日以降のJONLデータをパース（当日は stats-cache に含まれるため）
    since: date | None = None
    if last_computed:
        try:
            since = date.fromisoformat(last_computed) + timedelta(days=1)
        except ValueError:
            since = None

    live_df = parse_jsonl_files(since_date=since)

    result = _merge_data(
        stats=stats,
        live_df=live_df,
        last_computed=last_computed,
        incremental_live=since is not None,
    )
    _agg_cache = result
    _agg_cache_time = now
    return result


def _deduplicate_live_assistant_rows(live_df: pl.DataFrame) -> pl.DataFrame:
    """同一(session_id, message_id)のassistant行は1件に正規化（最終/最大usageを優先）"""
    if live_df.height == 0 or "message_id" not in live_df.columns:
        return live_df

    assistant_df = live_df.filter(pl.col("type") == "assistant")
    if assistant_df.height == 0:
        return live_df

    non_assistant_df = live_df.filter(pl.col("type") != "assistant")
    assistant_with_id = assistant_df.filter(pl.col("message_id") != "")
    assistant_without_id = assistant_df.filter(pl.col("message_id") == "")

    if assistant_with_id.height > 0:
        assistant_with_id = (
            assistant_with_id
            .with_columns(
                (pl.col("input_tokens") + pl.col("output_tokens") + pl.col("cache_read_tokens") + pl.col("cache_creation_tokens")).alias("_token_total"),
            )
            .sort(["session_id", "message_id", "_token_total", "timestamp"])
            .unique(subset=["session_id", "message_id"], keep="last")
            .drop("_token_total")
        )

    return pl.concat([non_assistant_df, assistant_without_id, assistant_with_id], how="vertical_relaxed")


def _merge_data(
    stats: dict,
    live_df: pl.DataFrame,
    last_computed: str,
    incremental_live: bool,
) -> dict:
    """statsキャッシュとlive DataFrameをマージ"""
    live_df = _deduplicate_live_assistant_rows(live_df)
    # incremental_live=False かつ live が存在する場合は full-scan とみなし、
    # stats をベースにせず live を正として集約する。
    use_stats_base = incremental_live or live_df.height == 0

    live_total_sessions = 0
    live_total_messages = 0
    live_range_start = ""
    live_range_end = ""
    if live_df.height > 0:
        live_total_sessions = (
            live_df
            .filter(pl.col("session_id") != "")
            .select(pl.col("session_id").n_unique())
            .item()
        )
        live_total_messages = live_df.filter(pl.col("type") == "human").height

        live_range = (
            live_df
            .select(
                pl.col("date").min().alias("min_date"),
                pl.col("date").max().alias("max_date"),
            )
            .to_dicts()[0]
        )
        live_range_start = live_range.get("min_date") or ""
        live_range_end = live_range.get("max_date") or ""

    # --- dailyActivity ---
    daily_activity = (
        {row["date"]: row for row in (stats.get("dailyActivity") or [])}
        if use_stats_base
        else {}
    )
    if live_df.height > 0:
        live_daily = (
            live_df.group_by("date")
            .agg(
                pl.col("session_id").n_unique().alias("sessionCount"),
                pl.len().alias("messageCount"),
                pl.col("tool_names").list.len().sum().alias("toolCallCount"),
            )
            .sort("date")
        )
        for row in live_daily.iter_rows(named=True):
            d = row["date"]
            if d in daily_activity:
                existing = daily_activity[d]
                existing["messageCount"] = max(existing.get("messageCount", 0), row["messageCount"])
                existing["sessionCount"] = max(existing.get("sessionCount", 0), row["sessionCount"])
            else:
                daily_activity[d] = {
                    "date": d,
                    "messageCount": row["messageCount"],
                    "sessionCount": row["sessionCount"],
                    "toolCallCount": row["toolCallCount"],
                }

    sorted_daily = sorted(daily_activity.values(), key=lambda x: x["date"])

    # --- dailyModelTokens ---
    daily_model_tokens = {}
    if use_stats_base:
        for row in (stats.get("dailyModelTokens") or []):
            d = row["date"]
            daily_model_tokens[d] = row.get("tokensByModel", {})

    if live_df.height > 0:
        assistant_df = live_df.filter(pl.col("type") == "assistant")
        if assistant_df.height > 0:
            live_tokens = (
                assistant_df.group_by("date", "model")
                .agg(
                    (pl.col("input_tokens") + pl.col("output_tokens")).sum().alias("total_tokens"),
                )
                .sort("date")
            )
            for row in live_tokens.iter_rows(named=True):
                d = row["date"]
                model = row["model"]
                if not model:
                    continue
                if d not in daily_model_tokens:
                    daily_model_tokens[d] = {}
                daily_model_tokens[d][model] = daily_model_tokens[d].get(model, 0) + row["total_tokens"]

    sorted_daily_tokens = [
        {"date": d, "tokensByModel": daily_model_tokens[d]}
        for d in sorted(daily_model_tokens.keys())
    ]

    # --- modelUsage ---
    model_usage: dict[str, dict] = {}
    if use_stats_base:
        for model_id, usage in (stats.get("modelUsage") or {}).items():
            model_usage[model_id] = dict(usage)

    if live_df.height > 0:
        assistant_df = live_df.filter(pl.col("type") == "assistant")
        if assistant_df.height > 0:
            live_model = (
                assistant_df.group_by("model")
                .agg(
                    pl.col("input_tokens").sum().alias("inputTokens"),
                    pl.col("output_tokens").sum().alias("outputTokens"),
                    pl.col("cache_read_tokens").sum().alias("cacheReadInputTokens"),
                    pl.col("cache_creation_tokens").sum().alias("cacheCreationInputTokens"),
                )
            )
            for row in live_model.iter_rows(named=True):
                model = row["model"]
                if not model:
                    continue
                if model not in model_usage:
                    model_usage[model] = {
                        "inputTokens": 0, "outputTokens": 0,
                        "cacheReadInputTokens": 0, "cacheCreationInputTokens": 0,
                    }
                mu = model_usage[model]
                mu["inputTokens"] = mu.get("inputTokens", 0) + row["inputTokens"]
                mu["outputTokens"] = mu.get("outputTokens", 0) + row["outputTokens"]
                mu["cacheReadInputTokens"] = mu.get("cacheReadInputTokens", 0) + row["cacheReadInputTokens"]
                mu["cacheCreationInputTokens"] = mu.get("cacheCreationInputTokens", 0) + row["cacheCreationInputTokens"]

    # --- hourCounts ---
    hour_counts: dict[str, int] = dict(stats.get("hourCounts") or {}) if use_stats_base else {}
    if live_df.height > 0:
        live_hours = (
            live_df.group_by("hour")
            .agg(pl.len().alias("count"))
        )
        for row in live_hours.iter_rows(named=True):
            h = str(row["hour"])
            hour_counts[h] = hour_counts.get(h, 0) + row["count"]

    # --- プロジェクト集約 ---
    projects: dict[str, dict] = {}
    if live_df.height > 0:
        proj_base = (
            live_df.group_by("dir_name", "project_name")
            .agg(
                pl.col("session_id").n_unique().alias("sessionCount"),
                (pl.col("input_tokens") + pl.col("output_tokens")).sum().alias("totalTokens"),
                pl.col("tool_names").explode().drop_nulls().alias("all_tools"),
            )
        )
        for row in proj_base.iter_rows(named=True):
            dir_name = row["dir_name"]
            tool_list = row["all_tools"] if row["all_tools"] else []
            tool_counts: dict[str, int] = defaultdict(int)
            for t in tool_list:
                if t:
                    tool_counts[t] += 1
            top_tools = sorted(tool_counts.items(), key=lambda x: -x[1])[:10]

            projects[dir_name] = {
                "name": row["project_name"],
                "dirName": dir_name,
                "sessionCount": row["sessionCount"],
                "totalTokens": row["totalTokens"],
                "topTools": [{"name": n, "count": c} for n, c in top_tools],
                "modelUsage": {},
            }

        assistant_df = live_df.filter((pl.col("type") == "assistant") & (pl.col("model") != ""))
        if assistant_df.height > 0:
            proj_models = (
                assistant_df.group_by("dir_name", "model")
                .agg(
                    pl.col("input_tokens").sum().alias("inputTokens"),
                    pl.col("output_tokens").sum().alias("outputTokens"),
                    pl.col("cache_read_tokens").sum().alias("cacheReadTokens"),
                    pl.col("cache_creation_tokens").sum().alias("cacheCreationTokens"),
                )
            )
            for row in proj_models.iter_rows(named=True):
                dir_name = row["dir_name"]
                if dir_name not in projects:
                    continue
                model_id = row["model"]
                projects[dir_name]["modelUsage"][model_id] = {
                    "inputTokens": row["inputTokens"],
                    "outputTokens": row["outputTokens"],
                    "cacheReadTokens": row["cacheReadTokens"],
                    "cacheCreationTokens": row["cacheCreationTokens"],
                }

        for project in projects.values():
            estimated_cost = 0.0
            unknown_tokens = 0
            for model_id, usage in project.get("modelUsage", {}).items():
                total_model_tokens = (
                    usage.get("inputTokens", 0)
                    + usage.get("outputTokens", 0)
                    + usage.get("cacheReadTokens", 0)
                    + usage.get("cacheCreationTokens", 0)
                )
                if model_id not in PRICE_TABLE:
                    unknown_tokens += total_model_tokens
                    continue
                estimated_cost += calculate_cost(
                    model=model_id,
                    input_tokens=usage.get("inputTokens", 0),
                    output_tokens=usage.get("outputTokens", 0),
                    cache_read_tokens=usage.get("cacheReadTokens", 0),
                    cache_creation_tokens=usage.get("cacheCreationTokens", 0),
                )

            project["estimatedCost"] = round(estimated_cost, 2)
            project["unknownModelTokens"] = unknown_tokens

    # --- dailyDetail (日次詳細: routerで使用) ---
    daily_detail: dict[str, dict] = {}
    if live_df.height > 0:
        assistant_df = live_df.filter((pl.col("type") == "assistant") & (pl.col("model") != ""))
        if assistant_df.height > 0:
            dd = (
                assistant_df.group_by("date")
                .agg(
                    pl.col("input_tokens").sum().alias("inputTokens"),
                    pl.col("output_tokens").sum().alias("outputTokens"),
                    pl.col("cache_read_tokens").sum().alias("cacheReadTokens"),
                    pl.col("cache_creation_tokens").sum().alias("cacheCreationTokens"),
                )
                .sort("date")
            )
            for row in dd.iter_rows(named=True):
                daily_detail[row["date"]] = {
                    "inputTokens": row["inputTokens"],
                    "outputTokens": row["outputTokens"],
                    "cacheReadTokens": row["cacheReadTokens"],
                    "cacheCreationTokens": row["cacheCreationTokens"],
                }

    # stats-cacheからの既存日次トークン詳細もマージ
    if use_stats_base:
        for dmt in (stats.get("dailyModelTokens") or []):
            d = dmt["date"]
            if d not in daily_detail:
                # stats-cacheにはトークン種別の内訳がないので概算
                total = sum(dmt.get("tokensByModel", {}).values())
                daily_detail[d] = {
                    "inputTokens": 0,
                    "outputTokens": 0,
                    "cacheReadTokens": 0,
                    "cacheCreationTokens": 0,
                    "estimatedTotalTokens": total,
                }

    # --- セッション別データ (ダウングレード分析用) ---
    session_models: list[dict] = []
    if live_df.height > 0:
        sess = (
            live_df.filter(pl.col("type") == "assistant")
            .group_by("session_id", "model")
            .agg(
                pl.len().alias("messageCount"),
                pl.col("input_tokens").sum().alias("inputTokens"),
                pl.col("output_tokens").sum().alias("outputTokens"),
                pl.col("cache_read_tokens").sum().alias("cacheReadTokens"),
                pl.col("cache_creation_tokens").sum().alias("cacheCreationTokens"),
            )
        )
        session_models = sess.to_dicts()

    stats_total_sessions = stats.get("totalSessions", 0)
    stats_total_messages = stats.get("totalMessages", 0)
    sessions_include_live = False
    if incremental_live:
        # session_idの重複(既存セッションの継続)が判定できないため、過大計上を避ける
        total_sessions = stats_total_sessions if stats_total_sessions > 0 else live_total_sessions
        total_messages = stats_total_messages + live_total_messages
        sessions_include_live = stats_total_sessions == 0
    else:
        if use_stats_base:
            total_sessions = max(stats_total_sessions, live_total_sessions)
            total_messages = max(stats_total_messages, live_total_messages)
            sessions_include_live = total_sessions == live_total_sessions and live_total_sessions > 0
        else:
            total_sessions = live_total_sessions
            total_messages = live_total_messages
            sessions_include_live = live_total_sessions > 0

    return {
        "totalSessions": total_sessions,
        "totalMessages": total_messages,
        "dailyActivity": sorted_daily,
        "dailyModelTokens": sorted_daily_tokens,
        "modelUsage": model_usage,
        "hourCounts": hour_counts,
        "projects": projects,
        "dailyDetail": daily_detail,
        "sessionModels": session_models,
        "firstSessionDate": stats.get("firstSessionDate", ""),
        "coverage": {
            "timezone": "Asia/Tokyo",
            "statsLastComputedDate": last_computed,
            "liveDataMode": "incremental" if incremental_live else "full_scan",
            "liveRangeStartDate": live_range_start,
            "liveRangeEndDate": live_range_end,
            "projectsCoverage": "live_only",
            "sessionCoverage": "live_only",
            "totalSessionsIncludesLive": sessions_include_live,
            "totalMessagesIncludesLive": incremental_live or total_messages == live_total_messages,
        },
    }

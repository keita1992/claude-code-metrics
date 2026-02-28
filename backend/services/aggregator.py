"""JSONLライブデータの集約（TTLキャッシュ付き）"""

import time
from collections import defaultdict

import polars as pl

from config import CACHE_TTL_SECONDS, PRICE_TABLE
from services.cost_calculator import calculate_cost
from services.jsonl_parser import parse_jsonl_files
from services.stats_cache import load_stats_cache

_agg_cache: dict | None = None
_agg_cache_time: float = 0.0


def get_aggregated_data() -> dict:
    """JSONLデータを集約して返す (TTLキャッシュ付き)"""
    global _agg_cache, _agg_cache_time

    now = time.monotonic()
    if _agg_cache is not None and (now - _agg_cache_time) < CACHE_TTL_SECONDS:
        return _agg_cache

    stats = _load_stats_cache_safe()
    last_computed = stats.get("lastComputedDate", "")
    first_session_date = stats.get("firstSessionDate", "")

    live_df = parse_jsonl_files(since_date=None)
    result = _aggregate_live_data(
        live_df=live_df,
        last_computed=last_computed,
        first_session_date=first_session_date,
    )

    # ライブデータが無い場合のみstats-cacheへフォールバック
    if live_df.height == 0 and stats:
        result = _fallback_from_stats(stats=stats, last_computed=last_computed)

    _agg_cache = result
    _agg_cache_time = now
    return result


def _load_stats_cache_safe() -> dict:
    try:
        return load_stats_cache()
    except FileNotFoundError:
        return {}


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
                (
                    pl.col("input_tokens")
                    + pl.col("output_tokens")
                    + pl.col("cache_read_tokens")
                    + pl.col("cache_creation_tokens")
                ).alias("_token_total"),
            )
            .sort(["session_id", "message_id", "_token_total", "timestamp"])
            .unique(subset=["session_id", "message_id"], keep="last")
            .drop("_token_total")
        )

    return pl.concat([non_assistant_df, assistant_without_id, assistant_with_id], how="vertical_relaxed")


def _aggregate_live_data(live_df: pl.DataFrame, last_computed: str, first_session_date: str) -> dict:
    live_df = _deduplicate_live_assistant_rows(live_df)

    if live_df.height == 0:
        return {
            "totalSessions": 0,
            "totalMessages": 0,
            "dailyActivity": [],
            "dailyModelTokens": [],
            "dailyModelDetail": {},
            "modelUsage": {},
            "hourCounts": {},
            "projects": {},
            "dailyDetail": {},
            "sessionModels": [],
            "sessionIdsByDate": {},
            "sessionDateBounds": {},
            "firstSessionDate": first_session_date,
            "coverage": {
                "timezone": "Asia/Tokyo",
                "statsLastComputedDate": last_computed,
                "liveDataMode": "full_scan",
                "liveRangeStartDate": "",
                "liveRangeEndDate": "",
                "projectsCoverage": "live_only",
                "sessionCoverage": "live_only",
                "totalSessionsIncludesLive": True,
                "totalMessagesIncludesLive": True,
            },
        }

    # ライブ範囲
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

    # セッション定義:
    # user と assistant の両方を持つ session_id を「有効セッション」とする
    conversation_rows = live_df.filter(
        (pl.col("session_id") != "") & pl.col("type").is_in(["user", "assistant"])
    )

    valid_session_ids: set[str] = set()
    valid_session_id_list: list[str] = []

    if conversation_rows.height > 0:
        valid_sessions_df = (
            conversation_rows
            .group_by("session_id")
            .agg(
                (pl.col("type") == "user").any().alias("has_user"),
                (pl.col("type") == "assistant").any().alias("has_assistant"),
                pl.col("date").min().alias("startDate"),
                pl.col("date").max().alias("endDate"),
            )
            .filter(pl.col("has_user") & pl.col("has_assistant"))
            .select("session_id", "startDate", "endDate")
        )
        valid_session_id_list = valid_sessions_df["session_id"].to_list()
        valid_session_ids = set(valid_session_id_list)
    else:
        valid_sessions_df = pl.DataFrame(
            schema={"session_id": pl.Utf8, "startDate": pl.Utf8, "endDate": pl.Utf8}
        )

    # セッション日次インデックス / セッション期間インデックス
    session_ids_by_date: dict[str, set[str]] = {}
    session_date_bounds: dict[str, dict[str, str]] = {}

    session_rows = conversation_rows.filter(pl.col("session_id").is_in(valid_session_id_list))
    if session_rows.height > 0:
        sessions_by_day = (
            session_rows
            .group_by("date")
            .agg(pl.col("session_id").unique().alias("session_ids"))
            .sort("date")
        )
        for row in sessions_by_day.iter_rows(named=True):
            session_ids_by_date[row["date"]] = set(row["session_ids"] or [])

        for row in valid_sessions_df.iter_rows(named=True):
            sid = row["session_id"]
            if not sid:
                continue
            session_date_bounds[sid] = {
                "startDate": row["startDate"],
                "endDate": row["endDate"],
            }

    total_sessions = len(valid_session_ids)
    total_messages = live_df.filter(pl.col("type") == "user").height

    # dailyActivity
    daily_activity_df = (
        live_df
        .group_by("date")
        .agg(
            pl.col("session_id")
            .filter(
                (pl.col("session_id") != "")
                & pl.col("type").is_in(["user", "assistant"])
                & pl.col("session_id").is_in(valid_session_id_list)
            )
            .n_unique()
            .alias("sessionCount"),
            (pl.col("type") == "user").sum().alias("messageCount"),
            pl.col("tool_names").list.len().sum().alias("toolCallCount"),
        )
        .sort("date")
    )
    daily_activity = daily_activity_df.to_dicts()

    assistant_df = live_df.filter((pl.col("type") == "assistant") & (pl.col("model") != ""))

    # modelUsage
    model_usage: dict[str, dict] = {}
    if assistant_df.height > 0:
        live_model_df = (
            assistant_df
            .group_by("model")
            .agg(
                pl.col("input_tokens").sum().alias("inputTokens"),
                pl.col("output_tokens").sum().alias("outputTokens"),
                pl.col("cache_read_tokens").sum().alias("cacheReadInputTokens"),
                pl.col("cache_creation_tokens").sum().alias("cacheCreationInputTokens"),
            )
        )
        for row in live_model_df.iter_rows(named=True):
            model_id = row["model"]
            if not model_id:
                continue
            model_usage[model_id] = {
                "inputTokens": row["inputTokens"],
                "outputTokens": row["outputTokens"],
                "cacheReadInputTokens": row["cacheReadInputTokens"],
                "cacheCreationInputTokens": row["cacheCreationInputTokens"],
            }

    # dailyDetail
    daily_detail: dict[str, dict] = {}
    if assistant_df.height > 0:
        dd_df = (
            assistant_df
            .group_by("date")
            .agg(
                pl.col("input_tokens").sum().alias("inputTokens"),
                pl.col("output_tokens").sum().alias("outputTokens"),
                pl.col("cache_read_tokens").sum().alias("cacheReadTokens"),
                pl.col("cache_creation_tokens").sum().alias("cacheCreationTokens"),
            )
            .sort("date")
        )
        for row in dd_df.iter_rows(named=True):
            daily_detail[row["date"]] = {
                "inputTokens": row["inputTokens"],
                "outputTokens": row["outputTokens"],
                "cacheReadTokens": row["cacheReadTokens"],
                "cacheCreationTokens": row["cacheCreationTokens"],
            }

    # dailyModelDetail / dailyModelTokens
    daily_model_detail: dict[str, dict[str, dict[str, int]]] = {}
    daily_model_tokens_map: dict[str, dict[str, int]] = {}
    if assistant_df.height > 0:
        dmd_df = (
            assistant_df
            .group_by("date", "model")
            .agg(
                pl.col("input_tokens").sum().alias("inputTokens"),
                pl.col("output_tokens").sum().alias("outputTokens"),
                pl.col("cache_read_tokens").sum().alias("cacheReadTokens"),
                pl.col("cache_creation_tokens").sum().alias("cacheCreationTokens"),
            )
            .sort(["date", "model"])
        )
        for row in dmd_df.iter_rows(named=True):
            d = row["date"]
            model_id = row["model"]
            if not d or not model_id:
                continue
            daily_model_detail.setdefault(d, {})[model_id] = {
                "inputTokens": row["inputTokens"],
                "outputTokens": row["outputTokens"],
                "cacheReadTokens": row["cacheReadTokens"],
                "cacheCreationTokens": row["cacheCreationTokens"],
            }

            total_tokens = (
                row["inputTokens"]
                + row["outputTokens"]
                + row["cacheReadTokens"]
                + row["cacheCreationTokens"]
            )
            daily_model_tokens_map.setdefault(d, {})[model_id] = total_tokens

    daily_model_tokens = [
        {"date": d, "tokensByModel": daily_model_tokens_map[d]}
        for d in sorted(daily_model_tokens_map.keys())
    ]

    # hourCounts: ユーザーメッセージ数ベースで一貫化
    hour_counts: dict[str, int] = {}
    user_df = live_df.filter(pl.col("type") == "user")
    if user_df.height > 0:
        hours_df = user_df.group_by("hour").agg(pl.len().alias("count"))
        for row in hours_df.iter_rows(named=True):
            hour_counts[str(row["hour"])] = row["count"]

    # projects
    projects = _build_projects(
        live_df=live_df,
        assistant_df=assistant_df,
        valid_session_ids=valid_session_ids,
    )

    # ダウングレード分析用
    session_models: list[dict] = []
    if assistant_df.height > 0:
        sess_df = (
            assistant_df
            .filter(
                (pl.col("session_id") != "")
                & pl.col("session_id").is_in(valid_session_id_list)
            )
            .group_by("session_id", "model")
            .agg(
                pl.len().alias("messageCount"),
                pl.col("input_tokens").sum().alias("inputTokens"),
                pl.col("output_tokens").sum().alias("outputTokens"),
                pl.col("cache_read_tokens").sum().alias("cacheReadTokens"),
                pl.col("cache_creation_tokens").sum().alias("cacheCreationTokens"),
            )
        )
        session_models = sess_df.to_dicts()

    return {
        "totalSessions": total_sessions,
        "totalMessages": total_messages,
        "dailyActivity": daily_activity,
        "dailyModelTokens": daily_model_tokens,
        "dailyModelDetail": daily_model_detail,
        "modelUsage": model_usage,
        "hourCounts": hour_counts,
        "projects": projects,
        "dailyDetail": daily_detail,
        "sessionModels": session_models,
        "sessionIdsByDate": session_ids_by_date,
        "sessionDateBounds": session_date_bounds,
        "firstSessionDate": first_session_date,
        "coverage": {
            "timezone": "Asia/Tokyo",
            "statsLastComputedDate": last_computed,
            "liveDataMode": "full_scan",
            "liveRangeStartDate": live_range_start,
            "liveRangeEndDate": live_range_end,
            "projectsCoverage": "live_only",
            "sessionCoverage": "live_only",
            "totalSessionsIncludesLive": True,
            "totalMessagesIncludesLive": True,
        },
    }


def _build_projects(
    live_df: pl.DataFrame,
    assistant_df: pl.DataFrame,
    valid_session_ids: set[str],
) -> dict[str, dict]:
    projects: dict[str, dict] = {}
    valid_session_id_list = list(valid_session_ids)

    project_rows = live_df.filter(pl.col("dir_name") != "")
    if project_rows.height == 0:
        return projects

    project_base_df = (
        project_rows
        .group_by("dir_name", "project_name")
        .agg(
            pl.col("session_id")
            .filter(
                (pl.col("session_id") != "")
                & pl.col("type").is_in(["user", "assistant"])
                & pl.col("session_id").is_in(valid_session_id_list)
            )
            .n_unique()
            .alias("sessionCount"),
            (
                pl.col("input_tokens")
                + pl.col("output_tokens")
                + pl.col("cache_read_tokens")
                + pl.col("cache_creation_tokens")
            ).sum().alias("totalTokens"),
            pl.col("tool_names").explode().drop_nulls().alias("all_tools"),
        )
    )

    for row in project_base_df.iter_rows(named=True):
        dir_name = row["dir_name"]
        if not dir_name:
            continue

        tool_list = row["all_tools"] if row["all_tools"] else []
        tool_counts: dict[str, int] = defaultdict(int)
        for tool_name in tool_list:
            if tool_name:
                tool_counts[tool_name] += 1

        top_tools = sorted(tool_counts.items(), key=lambda x: -x[1])[:10]

        projects[dir_name] = {
            "name": row["project_name"],
            "dirName": dir_name,
            "sessionCount": row["sessionCount"],
            "totalTokens": row["totalTokens"],
            "topTools": [{"name": n, "count": c} for n, c in top_tools],
            "modelUsage": {},
        }

    assistant_project_df = assistant_df.filter(pl.col("dir_name") != "")
    if assistant_project_df.height > 0:
        proj_models_df = (
            assistant_project_df
            .group_by("dir_name", "model")
            .agg(
                pl.col("input_tokens").sum().alias("inputTokens"),
                pl.col("output_tokens").sum().alias("outputTokens"),
                pl.col("cache_read_tokens").sum().alias("cacheReadTokens"),
                pl.col("cache_creation_tokens").sum().alias("cacheCreationTokens"),
            )
        )
        for row in proj_models_df.iter_rows(named=True):
            dir_name = row["dir_name"]
            if dir_name not in projects:
                continue
            model_id = row["model"]
            if not model_id:
                continue

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

    return projects


def _fallback_from_stats(stats: dict, last_computed: str) -> dict:
    daily_activity = list(stats.get("dailyActivity") or [])
    daily_model_tokens = list(stats.get("dailyModelTokens") or [])
    model_usage = dict(stats.get("modelUsage") or {})

    daily_detail: dict[str, dict] = {}
    for dmt in daily_model_tokens:
        d = dmt.get("date")
        if not d:
            continue
        total = sum((dmt.get("tokensByModel") or {}).values())
        daily_detail[d] = {
            "inputTokens": 0,
            "outputTokens": 0,
            "cacheReadTokens": 0,
            "cacheCreationTokens": 0,
            "estimatedTotalTokens": total,
        }

    return {
        "totalSessions": stats.get("totalSessions", 0),
        "totalMessages": stats.get("totalMessages", 0),
        "dailyActivity": daily_activity,
        "dailyModelTokens": daily_model_tokens,
        "dailyModelDetail": {},
        "modelUsage": model_usage,
        "hourCounts": dict(stats.get("hourCounts") or {}),
        "projects": {},
        "dailyDetail": daily_detail,
        "sessionModels": [],
        "sessionIdsByDate": {},
        "sessionDateBounds": {},
        "firstSessionDate": stats.get("firstSessionDate", ""),
        "coverage": {
            "timezone": "Asia/Tokyo",
            "statsLastComputedDate": last_computed,
            "liveDataMode": "full_scan",
            "liveRangeStartDate": "",
            "liveRangeEndDate": "",
            "projectsCoverage": "live_only",
            "sessionCoverage": "live_only",
            "totalSessionsIncludesLive": False,
            "totalMessagesIncludesLive": False,
        },
    }

"""GET /api/daily"""

from collections import defaultdict
from datetime import date as date_type

from fastapi import APIRouter, Query

from services.aggregator import get_aggregated_data
from services.cost_calculator import calculate_cost, calculate_model_costs

router = APIRouter()


def _estimate_io_tokens(tokens_by_model: dict[str, int], model_usage: dict) -> tuple[int, int]:
    """tokensByModelから input/output を推定する（cache種別は推定しない）。"""
    total_tokens = sum(tokens_by_model.values())
    if total_tokens <= 0:
        return 0, 0

    estimated_input = 0.0
    estimated_output = 0.0
    for model_id, model_tokens in tokens_by_model.items():
        mu = model_usage.get(model_id, {})
        mu_input = mu.get("inputTokens", 0)
        mu_output = mu.get("outputTokens", 0)
        mu_total = mu_input + mu_output
        if mu_total > 0:
            estimated_input += model_tokens * (mu_input / mu_total)
            estimated_output += model_tokens * (mu_output / mu_total)
        else:
            estimated_input += model_tokens

    input_t = int(round(estimated_input))
    output_t = int(round(estimated_output))

    # 丸め誤差を吸収し、合計が total_tokens になるよう補正
    delta = total_tokens - (input_t + output_t)
    output_t += delta
    if output_t < 0:
        input_t = max(0, input_t + output_t)
        output_t = 0

    return input_t, output_t


def _calculate_daily_model_costs_from_detail(model_detail: dict[str, dict]) -> dict[str, float]:
    """日次のモデル別コストを実データから計算する。"""
    costs_by_model: dict[str, float] = {}
    for model_id, usage in model_detail.items():
        costs_by_model[model_id] = calculate_cost(
            model=model_id,
            input_tokens=usage.get("inputTokens", 0),
            output_tokens=usage.get("outputTokens", 0),
            cache_read_tokens=usage.get("cacheReadTokens", 0),
            cache_creation_tokens=usage.get("cacheCreationTokens", 0),
        )
    return costs_by_model


def _calculate_daily_model_costs_fallback(detail: dict, tokens_by_model: dict[str, int], model_usage: dict) -> dict[str, float]:
    """statsフォールバック時の日次モデル別コスト推定。"""
    if not tokens_by_model:
        return {}

    input_t = detail.get("inputTokens", 0)
    output_t = detail.get("outputTokens", 0)
    cache_read_t = detail.get("cacheReadTokens", 0)
    cache_create_t = detail.get("cacheCreationTokens", 0)
    has_estimated_total_only = "estimatedTotalTokens" in detail

    costs_by_model: dict[str, float] = {}

    if not has_estimated_total_only and (input_t + output_t + cache_read_t + cache_create_t > 0):
        total_day_tokens = sum(tokens_by_model.values())
        if total_day_tokens <= 0:
            return {}

        for model_id, model_tokens in tokens_by_model.items():
            ratio = model_tokens / total_day_tokens
            costs_by_model[model_id] = calculate_cost(
                model_id,
                input_t * ratio,
                output_t * ratio,
                cache_read_t * ratio,
                cache_create_t * ratio,
            )
        return costs_by_model

    full_cost_cache: dict[str, float] = {}
    for model_id, model_tokens in tokens_by_model.items():
        mu = model_usage.get(model_id, {})
        mu_total = mu.get("inputTokens", 0) + mu.get("outputTokens", 0)
        if mu_total <= 0:
            continue

        if model_id not in full_cost_cache:
            full_costs = calculate_model_costs({model_id: mu})
            full_cost_cache[model_id] = full_costs.get(model_id, {}).get("cost", 0.0)

        costs_by_model[model_id] = full_cost_cache[model_id] * (model_tokens / mu_total)

    return costs_by_model


def _build_daily_rows(data: dict, start: str, end: str) -> list[dict]:
    """日次データを構築"""
    daily_detail = data.get("dailyDetail", {})
    daily_activity = {row["date"]: row for row in data.get("dailyActivity", [])}
    daily_model_tokens = {entry["date"]: entry.get("tokensByModel", {}) for entry in data.get("dailyModelTokens", [])}
    daily_model_detail = data.get("dailyModelDetail", {})
    model_usage = data.get("modelUsage", {})

    result = []
    all_dates = sorted(
        set(list(daily_detail.keys()) + list(daily_activity.keys()) + list(daily_model_tokens.keys()) + list(daily_model_detail.keys()))
    )

    for d in all_dates:
        if start and d < start:
            continue
        if end and d > end:
            continue

        detail = daily_detail.get(d, {})
        activity = daily_activity.get(d, {})
        tokens_by_model = daily_model_tokens.get(d, {})
        model_detail = daily_model_detail.get(d, {})

        if model_detail:
            input_t = sum(v.get("inputTokens", 0) for v in model_detail.values())
            output_t = sum(v.get("outputTokens", 0) for v in model_detail.values())
            cache_read_t = sum(v.get("cacheReadTokens", 0) for v in model_detail.values())
            cache_create_t = sum(v.get("cacheCreationTokens", 0) for v in model_detail.values())
            costs_by_model = _calculate_daily_model_costs_from_detail(model_detail)
        else:
            has_estimated_total_only = "estimatedTotalTokens" in detail
            if has_estimated_total_only:
                input_t, output_t = _estimate_io_tokens(tokens_by_model, model_usage)
                cache_read_t = 0
                cache_create_t = 0
            else:
                input_t = detail.get("inputTokens", 0)
                output_t = detail.get("outputTokens", 0)
                cache_read_t = detail.get("cacheReadTokens", 0)
                cache_create_t = detail.get("cacheCreationTokens", 0)

            costs_by_model = _calculate_daily_model_costs_fallback(detail, tokens_by_model, model_usage)

        estimated_cost = sum(costs_by_model.values())

        result.append({
            "date": d,
            "inputTokens": input_t,
            "outputTokens": output_t,
            "cacheReadTokens": cache_read_t,
            "cacheCreationTokens": cache_create_t,
            "estimatedCost": round(estimated_cost, 2),
            "sessionCount": activity.get("sessionCount", 0),
            "messageCount": activity.get("messageCount", 0),
        })

    return result


def _count_unique_sessions_in_range(data: dict, start: str, end: str) -> int:
    """期間内ユニークセッション数を返す。"""
    session_ids_by_date = data.get("sessionIdsByDate") or {}
    if session_ids_by_date:
        unique_session_ids: set[str] = set()
        for d, session_ids in session_ids_by_date.items():
            if start and d < start:
                continue
            if end and d > end:
                continue
            unique_session_ids.update(session_ids)
        return len(unique_session_ids)

    # フォールバック: 日次合算
    total = 0
    for row in data.get("dailyActivity", []):
        d = row.get("date", "")
        if start and d < start:
            continue
        if end and d > end:
            continue
        total += row.get("sessionCount", 0)
    return total


def _aggregate_weekly(daily_rows: list[dict], data: dict, start: str, end: str) -> list[dict]:
    """日次データを週次に集約 (ISO week)"""
    weeks: dict[str, dict] = defaultdict(lambda: {
        "inputTokens": 0,
        "outputTokens": 0,
        "cacheReadTokens": 0,
        "cacheCreationTokens": 0,
        "estimatedCost": 0.0,
        "sessionCount": 0,
        "messageCount": 0,
        "_session_ids": set(),
    })

    for row in daily_rows:
        try:
            dt = date_type.fromisoformat(row["date"])
        except ValueError:
            continue

        week_label = dt.strftime("%G-W%V")
        w = weeks[week_label]
        w["inputTokens"] += row["inputTokens"]
        w["outputTokens"] += row["outputTokens"]
        w["cacheReadTokens"] += row["cacheReadTokens"]
        w["cacheCreationTokens"] += row["cacheCreationTokens"]
        w["estimatedCost"] += row["estimatedCost"]
        w["messageCount"] += row["messageCount"]

    session_ids_by_date = data.get("sessionIdsByDate") or {}
    if session_ids_by_date:
        for d, session_ids in session_ids_by_date.items():
            if start and d < start:
                continue
            if end and d > end:
                continue
            try:
                dt = date_type.fromisoformat(d)
            except ValueError:
                continue
            week_label = dt.strftime("%G-W%V")
            weeks[week_label]["_session_ids"].update(session_ids)

    result = []
    for week_label in sorted(weeks.keys()):
        w = weeks[week_label]
        if w["_session_ids"]:
            session_count = len(w["_session_ids"])
        else:
            session_count = w["sessionCount"]

        result.append({
            "date": week_label,
            "inputTokens": w["inputTokens"],
            "outputTokens": w["outputTokens"],
            "cacheReadTokens": w["cacheReadTokens"],
            "cacheCreationTokens": w["cacheCreationTokens"],
            "estimatedCost": round(w["estimatedCost"], 2),
            "sessionCount": session_count,
            "messageCount": w["messageCount"],
        })

    return result


ALLOWED_TIMEZONES = {"Asia/Tokyo", "UTC"}


@router.get("/api/daily")
async def daily(
    start: str = Query(default="", description="開始日 (YYYY-MM-DD)"),
    end: str = Query(default="", description="終了日 (YYYY-MM-DD)"),
    mode: str = Query(default="daily", description="集計モード: daily / weekly"),
    tz: str = Query(default="Asia/Tokyo", description="集計タイムゾーン (Asia/Tokyo または UTC)"),
):
    if tz not in ALLOWED_TIMEZONES:
        tz = "Asia/Tokyo"
    data = get_aggregated_data(tz=tz)
    daily_rows = _build_daily_rows(data, start, end)
    timezone = (data.get("coverage") or {}).get("timezone", "Asia/Tokyo")

    summary = {
        "uniqueSessions": _count_unique_sessions_in_range(data, start, end),
        "totalMessages": sum(r.get("messageCount", 0) for r in daily_rows),
        "totalCost": round(sum(r.get("estimatedCost", 0.0) for r in daily_rows), 2),
    }

    if mode == "weekly":
        return {
            "daily": _aggregate_weekly(daily_rows, data, start, end),
            "timezone": timezone,
            "summary": summary,
        }

    return {
        "daily": daily_rows,
        "timezone": timezone,
        "summary": summary,
    }

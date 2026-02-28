"""GET /api/overview"""

from datetime import date

from fastapi import APIRouter, Query

from config import MODEL_DISPLAY_NAMES, PRICE_TABLE
from routers.daily import _build_daily_rows, _count_unique_sessions_in_range
from services.aggregator import get_aggregated_data
from services.cost_calculator import calculate_model_costs

router = APIRouter()


def _aggregate_model_usage_for_range(data: dict, start: str, end: str) -> dict[str, dict[str, int]]:
    """期間内のモデル使用量を日次モデル詳細から集計する。"""
    daily_model_detail = data.get("dailyModelDetail") or {}

    model_usage_in_range: dict[str, dict[str, int]] = {}
    for d, models in daily_model_detail.items():
        if start and d < start:
            continue
        if end and d > end:
            continue

        for model_id, usage in models.items():
            if model_id not in model_usage_in_range:
                model_usage_in_range[model_id] = {
                    "inputTokens": 0,
                    "outputTokens": 0,
                    "cacheReadInputTokens": 0,
                    "cacheCreationInputTokens": 0,
                }

            mu = model_usage_in_range[model_id]
            mu["inputTokens"] += usage.get("inputTokens", 0)
            mu["outputTokens"] += usage.get("outputTokens", 0)
            mu["cacheReadInputTokens"] += usage.get("cacheReadTokens", 0)
            mu["cacheCreationInputTokens"] += usage.get("cacheCreationTokens", 0)

    return model_usage_in_range


def _approximate_model_usage_for_range(data: dict, start: str, end: str) -> dict[str, dict[str, int]]:
    """dailyModelTokensと全体modelUsageから期間内モデル使用量を近似する。"""
    model_usage_all = data.get("modelUsage", {})
    daily_model_tokens = data.get("dailyModelTokens", [])

    total_tokens_by_model: dict[str, int] = {}
    range_tokens_by_model: dict[str, int] = {}

    for entry in daily_model_tokens:
        d = entry.get("date", "")
        tokens_by_model = entry.get("tokensByModel", {}) or {}
        for model_id, tokens in tokens_by_model.items():
            total_tokens_by_model[model_id] = total_tokens_by_model.get(model_id, 0) + int(tokens)
            if (not start or d >= start) and (not end or d <= end):
                range_tokens_by_model[model_id] = range_tokens_by_model.get(model_id, 0) + int(tokens)

    approx: dict[str, dict[str, int]] = {}
    for model_id, range_tokens in range_tokens_by_model.items():
        total_tokens = total_tokens_by_model.get(model_id, 0)
        if total_tokens <= 0:
            continue
        ratio = range_tokens / total_tokens
        mu = model_usage_all.get(model_id, {})
        approx[model_id] = {
            "inputTokens": int(round(mu.get("inputTokens", 0) * ratio)),
            "outputTokens": int(round(mu.get("outputTokens", 0) * ratio)),
            "cacheReadInputTokens": int(round(mu.get("cacheReadInputTokens", 0) * ratio)),
            "cacheCreationInputTokens": int(round(mu.get("cacheCreationInputTokens", 0) * ratio)),
        }

    return approx


ALLOWED_TIMEZONES = {"Asia/Tokyo", "UTC"}


@router.get("/api/overview")
async def overview(
    tz: str = Query(default="Asia/Tokyo", description="集計タイムゾーン (Asia/Tokyo または UTC)"),
):
    if tz not in ALLOWED_TIMEZONES:
        tz = "Asia/Tokyo"
    data = get_aggregated_data(tz=tz)

    # --- 今月フィルタ ---
    today = date.today()
    month_start = today.replace(day=1).isoformat()
    month_end = today.isoformat()

    daily_rows = _build_daily_rows(data, start=month_start, end=month_end)

    month_cost = sum(r["estimatedCost"] for r in daily_rows)
    month_sessions = _count_unique_sessions_in_range(data, month_start, month_end)
    month_messages = sum(r["messageCount"] for r in daily_rows)
    active_days = sum(1 for r in daily_rows if r["estimatedCost"] > 0)

    avg_cost_per_session = (month_cost / month_sessions) if month_sessions > 0 else 0.0
    daily_avg_cost = (month_cost / active_days) if active_days > 0 else 0.0

    # モデル使用量を今月分に限定して再集計
    month_model_usage = _aggregate_model_usage_for_range(data, month_start, month_end)
    if not month_model_usage:
        month_model_usage = _approximate_model_usage_for_range(data, month_start, month_end)

    month_costs = calculate_model_costs(month_model_usage)

    month_savings = 0.0
    unknown_model_count = 0
    unknown_model_tokens = 0
    month_cacheable = 0
    month_cache_read = 0

    model_cost_dist = []

    for model_id, usage in month_model_usage.items():
        inp = usage.get("inputTokens", 0)
        out = usage.get("outputTokens", 0)
        cr = usage.get("cacheReadInputTokens", 0)
        cc = usage.get("cacheCreationInputTokens", 0)

        month_cacheable += inp + cr + cc
        month_cache_read += cr

        total_tokens = inp + out + cr + cc
        if model_id not in PRICE_TABLE:
            if total_tokens > 0:
                unknown_model_count += 1
                unknown_model_tokens += total_tokens
            continue

        cost_data = month_costs.get(model_id, {})
        model_cost = round(cost_data.get("cost", 0.0), 2)
        month_savings += cost_data.get("savings", 0.0)

        display = MODEL_DISPLAY_NAMES.get(model_id, model_id)
        model_cost_dist.append({"model": display, "cost": model_cost})

    cache_hit_rate = (month_cache_read / month_cacheable * 100) if month_cacheable > 0 else 0.0

    model_cost_dist.sort(key=lambda x: -x["cost"])

    # トップモデル
    top_model = None
    if model_cost_dist and month_cost > 0:
        top = model_cost_dist[0]
        top_model = {
            "name": top["model"],
            "cost": top["cost"],
            "percentage": round(top["cost"] / month_cost * 100, 1),
        }

    kpi = {
        "totalSessions": month_sessions,
        "totalMessages": month_messages,
        "estimatedCost": round(month_cost, 2),
        "cacheSavings": round(month_savings, 2),
        "cacheHitRate": round(cache_hit_rate, 1),
        "avgCostPerSession": round(avg_cost_per_session, 2),
        "dailyAvgCost": round(daily_avg_cost, 2),
        "unknownModelCount": unknown_model_count,
        "unknownModelTokens": unknown_model_tokens,
    }

    daily_cost = [{"date": r["date"], "cost": r["estimatedCost"]} for r in daily_rows]

    return {
        "kpi": kpi,
        "dailyCost": daily_cost,
        "modelCostDistribution": model_cost_dist,
        "topModel": top_model,
        "coverage": data.get("coverage", {}),
    }

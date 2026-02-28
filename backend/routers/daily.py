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


def _calculate_daily_model_costs(detail: dict, tokens_by_model: dict[str, int], model_usage: dict) -> dict[str, float]:
    """日次のモデル別コストを推定する。"""
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
    model_usage = data.get("modelUsage", {})

    result = []
    all_dates = sorted(set(list(daily_detail.keys()) + list(daily_activity.keys()) + list(daily_model_tokens.keys())))

    for d in all_dates:
        if start and d < start:
            continue
        if end and d > end:
            continue

        detail = daily_detail.get(d, {})
        activity = daily_activity.get(d, {})
        tokens_by_model = daily_model_tokens.get(d, {})

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

        costs_by_model = _calculate_daily_model_costs(detail, tokens_by_model, model_usage)
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


def _aggregate_weekly(daily_rows: list[dict]) -> list[dict]:
    """日次データを週次に集約 (ISO week)"""
    weeks: dict[str, dict] = defaultdict(lambda: {
        "inputTokens": 0, "outputTokens": 0,
        "cacheReadTokens": 0, "cacheCreationTokens": 0,
        "estimatedCost": 0.0, "sessionCount": 0, "messageCount": 0,
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
        w["sessionCount"] += row["sessionCount"]
        w["messageCount"] += row["messageCount"]

    result = []
    for week_label in sorted(weeks.keys()):
        w = weeks[week_label]
        result.append({
            "date": week_label,
            "inputTokens": w["inputTokens"],
            "outputTokens": w["outputTokens"],
            "cacheReadTokens": w["cacheReadTokens"],
            "cacheCreationTokens": w["cacheCreationTokens"],
            "estimatedCost": round(w["estimatedCost"], 2),
            "sessionCount": w["sessionCount"],
            "messageCount": w["messageCount"],
        })
    return result


@router.get("/api/daily")
async def daily(
    start: str = Query(default="", description="開始日 (YYYY-MM-DD)"),
    end: str = Query(default="", description="終了日 (YYYY-MM-DD)"),
    mode: str = Query(default="daily", description="集計モード: daily / weekly"),
):
    data = get_aggregated_data()
    daily_rows = _build_daily_rows(data, start, end)
    timezone = (data.get("coverage") or {}).get("timezone", "Asia/Tokyo")

    if mode == "weekly":
        return {"daily": _aggregate_weekly(daily_rows), "timezone": timezone}

    return {"daily": daily_rows, "timezone": timezone}

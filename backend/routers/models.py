"""GET /api/models"""

from fastapi import APIRouter, Query

from config import MODEL_DISPLAY_NAMES, PRICE_TABLE
from services.aggregator import get_aggregated_data
from services.cost_calculator import calculate_cache_savings, calculate_cost, calculate_cost_without_cache

router = APIRouter()


ALLOWED_TIMEZONES = {"Asia/Tokyo", "UTC"}


@router.get("/api/models")
async def models(
    tz: str = Query(default="Asia/Tokyo", description="集計タイムゾーン (Asia/Tokyo または UTC)"),
):
    if tz not in ALLOWED_TIMEZONES:
        tz = "Asia/Tokyo"
    data = get_aggregated_data(tz=tz)
    model_usage = data.get("modelUsage", {})

    models_list = []
    for model_id, usage in model_usage.items():
        inp = usage.get("inputTokens", 0)
        out = usage.get("outputTokens", 0)
        cr = usage.get("cacheReadInputTokens", 0)
        cc = usage.get("cacheCreationInputTokens", 0)
        denominator = inp + cr + cc
        cache_hit_rate = cr / denominator if denominator > 0 else 0.0

        total_cost: float | None = None
        without_cache: float | None = None
        savings: float | None = None
        if model_id in PRICE_TABLE:
            total_cost = calculate_cost(model_id, inp, out, cr, cc)
            without_cache = calculate_cost_without_cache(model_id, inp, out, cr, cc)
            savings = calculate_cache_savings(model_id, inp, out, cr, cc)

        display = MODEL_DISPLAY_NAMES.get(model_id, model_id)
        models_list.append({
            "model": display,
            "modelId": model_id,
            "inputTokens": inp,
            "outputTokens": out,
            "cacheReadTokens": cr,
            "cacheCreationTokens": cc,
            "totalCost": round(total_cost, 2) if total_cost is not None else None,
            "withoutCacheCost": round(without_cache, 2) if without_cache is not None else None,
            "cacheSavings": round(savings, 2) if savings is not None else None,
            "cacheHitRate": round(cache_hit_rate, 4),
            "isPriceKnown": model_id in PRICE_TABLE,
        })

    models_list.sort(
        key=lambda x: (
            not x["isPriceKnown"],
            -(x["totalCost"] or 0.0),
            -(x["inputTokens"] + x["outputTokens"]),
        ),
    )

    daily_trend = []
    for entry in data.get("dailyModelTokens", []):
        models_map = {}
        for model_id, tokens in entry.get("tokensByModel", {}).items():
            display = MODEL_DISPLAY_NAMES.get(model_id, model_id)
            models_map[display] = models_map.get(display, 0) + tokens
        if models_map:
            daily_trend.append({"date": entry["date"], "models": models_map})

    return {
        "models": models_list,
        "dailyModelTrend": daily_trend,
        "coverage": data.get("coverage", {}),
    }

"""GET /api/heatmap — 曜日×時間帯トークン消費ヒートマップ"""

from fastapi import APIRouter, Query

from services.aggregator import get_aggregated_data, get_filtered_weekday_hour_tokens
from services.cost_calculator import calculate_cost

router = APIRouter()


@router.get("/api/heatmap")
async def heatmap(
    start: str | None = Query(None, description="開始日 (YYYY-MM-DD)"),
    end: str | None = Query(None, description="終了日 (YYYY-MM-DD)"),
):
    data = get_aggregated_data()
    coverage = data.get("coverage", {})

    if start is None and end is None:
        whm = data.get("weekdayHourModelTokens", {})
    else:
        whm = get_filtered_weekday_hour_tokens(start=start, end=end)

    cells: list[dict] = []
    for key, models in whm.items():
        weekday_str, hour_str = key.split(":")
        weekday = int(weekday_str)
        hour = int(hour_str)

        total_tokens = 0
        total_cost = 0.0
        for model_id, usage in models.items():
            inp = usage.get("inputTokens", 0)
            out = usage.get("outputTokens", 0)
            cr = usage.get("cacheReadTokens", 0)
            cc = usage.get("cacheCreationTokens", 0)
            total_tokens += inp + out + cr + cc
            total_cost += calculate_cost(
                model=model_id,
                input_tokens=inp,
                output_tokens=out,
                cache_read_tokens=cr,
                cache_creation_tokens=cc,
            )

        cells.append({
            "weekday": weekday,
            "hour": hour,
            "tokens": total_tokens,
            "cost": round(total_cost, 4),
        })

    cells.sort(key=lambda c: (c["weekday"], c["hour"]))

    return {
        "cells": cells,
        "timezone": coverage.get("timezone", "Asia/Tokyo"),
        "coverage": coverage,
    }

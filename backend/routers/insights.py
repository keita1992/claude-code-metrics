"""GET /api/insights"""

from fastapi import APIRouter, Query

from services.aggregator import get_aggregated_data
from services.insight_engine import (
    get_cache_efficiency,
    get_cache_read_bloat_suggestions,
    get_downgrade_suggestions,
    get_peak_hours,
    get_project_concentration,
    get_weekly_trend,
)

router = APIRouter()

ALLOWED_TIMEZONES = {"Asia/Tokyo", "UTC"}


@router.get("/api/insights")
async def insights(
    tz: str = Query(default="Asia/Tokyo", description="集計タイムゾーン (Asia/Tokyo または UTC)"),
):
    if tz not in ALLOWED_TIMEZONES:
        tz = "Asia/Tokyo"
    data = get_aggregated_data(tz=tz)
    coverage = data.get("coverage", {})
    suggestions = get_downgrade_suggestions(data) + get_cache_read_bloat_suggestions(data)

    return {
        "cacheEfficiency": get_cache_efficiency(data),
        "downgradeSuggestions": suggestions,
        "peakHours": get_peak_hours(data),
        "weeklyTrend": get_weekly_trend(data),
        "projectConcentration": get_project_concentration(data),
        "timezone": coverage.get("timezone", "Asia/Tokyo"),
        "coverage": coverage,
    }

"""GET /api/insights"""

from fastapi import APIRouter

from services.aggregator import get_aggregated_data
from services.insight_engine import (
    get_cache_efficiency,
    get_downgrade_suggestions,
    get_peak_hours,
    get_project_concentration,
    get_weekly_trend,
)

router = APIRouter()


@router.get("/api/insights")
async def insights():
    data = get_aggregated_data()
    coverage = data.get("coverage", {})

    return {
        "cacheEfficiency": get_cache_efficiency(data),
        "downgradeSuggestions": get_downgrade_suggestions(data),
        "peakHours": get_peak_hours(data),
        "weeklyTrend": get_weekly_trend(data),
        "projectConcentration": get_project_concentration(data),
        "timezone": coverage.get("timezone", "Asia/Tokyo"),
        "coverage": coverage,
    }

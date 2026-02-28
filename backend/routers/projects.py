"""GET /api/projects"""

from fastapi import APIRouter, Query

from services.aggregator import get_aggregated_data

router = APIRouter()

ALLOWED_TIMEZONES = {"Asia/Tokyo", "UTC"}


@router.get("/api/projects")
async def projects(
    tz: str = Query(default="Asia/Tokyo", description="集計タイムゾーン (Asia/Tokyo または UTC)"),
):
    if tz not in ALLOWED_TIMEZONES:
        tz = "Asia/Tokyo"
    data = get_aggregated_data(tz=tz)
    projects_data = data.get("projects", {})

    result = []
    for proj in projects_data.values():
        estimated_cost = proj.get("estimatedCost", 0.0)
        result.append({
            "name": proj["name"],
            "dirName": proj["dirName"],
            "sessionCount": proj.get("sessionCount", 0),
            "totalTokens": proj.get("totalTokens", 0),
            "estimatedCost": round(estimated_cost, 2),
            "unknownModelTokens": proj.get("unknownModelTokens", 0),
            "topTools": proj.get("topTools", []),
        })

    result.sort(key=lambda x: -x["estimatedCost"])
    return {
        "projects": result,
        "coverage": data.get("coverage", {}),
    }

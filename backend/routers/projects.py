"""GET /api/projects"""

from fastapi import APIRouter

from services.aggregator import get_aggregated_data

router = APIRouter()


@router.get("/api/projects")
async def projects():
    data = get_aggregated_data()
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

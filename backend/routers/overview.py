"""GET /api/overview"""

from collections import defaultdict
from datetime import date

from fastapi import APIRouter

from config import MODEL_DISPLAY_NAMES, PRICE_TABLE
from routers.daily import _build_daily_rows, _calculate_daily_model_costs
from services.aggregator import get_aggregated_data
from services.cost_calculator import calculate_model_costs

router = APIRouter()


@router.get("/api/overview")
async def overview():
    data = get_aggregated_data()
    model_usage = data.get("modelUsage", {})

    # --- 全期間ベースの計算 (キャッシュヒット率・節約額の按分用) ---
    costs = calculate_model_costs(model_usage)
    all_total_cost = 0.0
    all_total_savings = 0.0
    unknown_model_count = 0
    unknown_model_tokens = 0

    total_input = 0
    total_cache_read = 0
    total_cache_creation = 0

    for model_id, usage in model_usage.items():
        total_input += usage.get("inputTokens", 0)
        total_cache_read += usage.get("cacheReadInputTokens", 0)
        total_cache_creation += usage.get("cacheCreationInputTokens", 0)

        if model_id not in PRICE_TABLE:
            unknown_model_count += 1
            unknown_model_tokens += (
                usage.get("inputTokens", 0)
                + usage.get("outputTokens", 0)
                + usage.get("cacheReadInputTokens", 0)
                + usage.get("cacheCreationInputTokens", 0)
            )
            continue
        cost_data = costs.get(model_id, {})
        all_total_cost += cost_data.get("cost", 0.0)
        all_total_savings += cost_data.get("savings", 0.0)

    # キャッシュヒット率 (全期間ベース: 構造的指標)
    total_cacheable = total_input + total_cache_read + total_cache_creation
    cache_hit_rate = (total_cache_read / total_cacheable * 100) if total_cacheable > 0 else 0.0

    # --- 今月フィルタ ---
    today = date.today()
    month_start = today.replace(day=1).isoformat()
    month_end = today.isoformat()

    daily_rows = _build_daily_rows(data, start=month_start, end=month_end)
    daily_detail = data.get("dailyDetail", {})
    daily_model_tokens = {
        entry["date"]: entry.get("tokensByModel", {})
        for entry in data.get("dailyModelTokens", [])
    }

    month_cost = sum(r["estimatedCost"] for r in daily_rows)
    month_sessions = sum(r["sessionCount"] for r in daily_rows)
    month_messages = sum(r["messageCount"] for r in daily_rows)
    active_days = sum(1 for r in daily_rows if r["estimatedCost"] > 0)

    avg_cost_per_session = (month_cost / month_sessions) if month_sessions > 0 else 0.0
    daily_avg_cost = (month_cost / active_days) if active_days > 0 else 0.0

    # キャッシュ節約額: 今月コスト比率で按分
    month_ratio = (month_cost / all_total_cost) if all_total_cost > 0 else 0.0
    month_savings = all_total_savings * month_ratio

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

    # 日次コスト (今月分)
    daily_cost = [
        {"date": r["date"], "cost": r["estimatedCost"]}
        for r in daily_rows
    ]

    # モデル別コスト: 月内の日次推定コストを積み上げ
    month_model_costs: dict[str, float] = defaultdict(float)
    for row in daily_rows:
        d = row["date"]
        model_costs = _calculate_daily_model_costs(
            daily_detail.get(d, {}),
            daily_model_tokens.get(d, {}),
            model_usage,
        )
        for model_id, cost in model_costs.items():
            month_model_costs[model_id] += cost

    model_cost_dist = []
    for model_id, month_model_cost in month_model_costs.items():
        if model_id not in PRICE_TABLE:
            continue
        display = MODEL_DISPLAY_NAMES.get(model_id, model_id)
        model_cost_dist.append({"model": display, "cost": round(month_model_cost, 2)})
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

    return {
        "kpi": kpi,
        "dailyCost": daily_cost,
        "modelCostDistribution": model_cost_dist,
        "topModel": top_model,
        "coverage": data.get("coverage", {}),
    }

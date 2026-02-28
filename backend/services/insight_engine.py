"""インサイト生成エンジン"""

from collections import defaultdict
from datetime import date, timedelta

from config import MODEL_DISPLAY_NAMES, PRICE_TABLE
from services.aggregator import get_aggregated_data
from services.cost_calculator import calculate_cache_savings, calculate_cost, calculate_model_costs


def get_cache_efficiency(data: dict) -> dict:
    """キャッシュ効率を算出"""
    model_usage = data.get("modelUsage", {})
    total_input = 0
    total_cache_read = 0
    total_cache_creation = 0
    total_savings = 0.0

    by_model = []
    for model_id, usage in model_usage.items():
        if model_id not in PRICE_TABLE:
            continue
        inp = usage.get("inputTokens", 0)
        cr = usage.get("cacheReadInputTokens", 0)
        cc = usage.get("cacheCreationInputTokens", 0)
        total_input += inp
        total_cache_read += cr
        total_cache_creation += cc

        denominator = inp + cr + cc
        rate = cr / denominator if denominator > 0 else 0.0
        out = usage.get("outputTokens", 0)
        savings = calculate_cache_savings(model_id, inp, out, cr, cc)
        total_savings += savings

        display = MODEL_DISPLAY_NAMES.get(model_id, model_id)
        by_model.append({"model": display, "rate": round(rate, 4), "savings": round(savings, 2)})

    total_denom = total_input + total_cache_read + total_cache_creation
    overall_rate = total_cache_read / total_denom if total_denom > 0 else 0.0

    return {
        "overallRate": round(overall_rate, 4),
        "totalSavings": round(total_savings, 2),
        "byModel": sorted(by_model, key=lambda x: -x["savings"]),
    }


def get_downgrade_suggestions(data: dict) -> list[dict]:
    """短セッションでのモデルダウングレード提案"""
    session_models = data.get("sessionModels", [])
    opus_models = {m for m in PRICE_TABLE if "opus" in m}
    sonnet_target = "claude-sonnet-4-5-20250929"

    total_potential_savings = 0.0
    short_session_count = 0

    for sess in session_models:
        model = sess.get("model", "")
        if model not in opus_models:
            continue
        if sess.get("messageCount", 0) > 5:
            continue

        short_session_count += 1
        opus_cost = calculate_cost(
            model,
            sess.get("inputTokens", 0),
            sess.get("outputTokens", 0),
            sess.get("cacheReadTokens", 0),
            sess.get("cacheCreationTokens", 0),
        )
        sonnet_cost = calculate_cost(
            sonnet_target,
            sess.get("inputTokens", 0),
            sess.get("outputTokens", 0),
            sess.get("cacheReadTokens", 0),
            sess.get("cacheCreationTokens", 0),
        )
        total_potential_savings += max(0, opus_cost - sonnet_cost)

    suggestions = []
    if total_potential_savings > 0:
        suggestions.append({
            "description": f"短セッション(5メッセージ以下)でOpusの代わりにSonnetを使えば推定${total_potential_savings:.0f}節約 ({short_session_count}セッション対象)",
            "potentialSavings": round(total_potential_savings, 2),
        })

    return suggestions


def get_peak_hours(data: dict) -> list[dict]:
    """ピーク利用時間帯 (上位5時間)"""
    hour_counts = data.get("hourCounts", {})
    hours = [{"hour": int(h), "count": c} for h, c in hour_counts.items()]
    return sorted(hours, key=lambda x: -x["count"])[:5]


def get_weekly_trend(data: dict) -> list[dict]:
    """週次コストトレンド"""
    daily_detail = data.get("dailyDetail", {})
    model_usage = data.get("modelUsage", {})
    daily_tokens = data.get("dailyModelTokens", [])

    weekly: dict[str, float] = defaultdict(float)

    # dailyModelTokensからモデル別にコスト概算
    for entry in daily_tokens:
        d = entry["date"]
        try:
            dt = date.fromisoformat(d)
        except ValueError:
            continue
        week = dt.strftime("%G-W%V")
        tokens_by_model = entry.get("tokensByModel", {})
        for model_id, total_tokens in tokens_by_model.items():
            # トークン種別の内訳がないので、modelUsageの比率で概算
            mu = model_usage.get(model_id, {})
            mu_total = mu.get("inputTokens", 0) + mu.get("outputTokens", 0)
            if mu_total > 0:
                ratio = total_tokens / mu_total
                model_cost_data = calculate_model_costs({model_id: mu})
                full_cost = model_cost_data.get(model_id, {}).get("cost", 0.0)
                weekly[week] += full_cost * ratio

    result = [{"week": w, "cost": round(c, 2)} for w, c in sorted(weekly.items())]
    return result


def get_project_concentration(data: dict) -> dict:
    """プロジェクト集中度"""
    projects = data.get("projects", {})
    if not projects:
        return {"topProjects": [], "totalProjects": 0}

    total_tokens = sum(p.get("totalTokens", 0) for p in projects.values())
    if total_tokens == 0:
        return {"topProjects": [], "totalProjects": len(projects)}

    ranked = sorted(projects.values(), key=lambda p: -p.get("totalTokens", 0))
    top = [
        {
            "name": p["name"],
            "percentage": round(p.get("totalTokens", 0) / total_tokens * 100, 1),
        }
        for p in ranked[:5]
    ]

    return {"topProjects": top, "totalProjects": len(projects)}

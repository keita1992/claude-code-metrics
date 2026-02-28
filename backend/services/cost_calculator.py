"""コスト計算エンジン"""

from config import PRICE_TABLE


def calculate_cost(
    model: str,
    input_tokens: int,
    output_tokens: int,
    cache_read_tokens: int = 0,
    cache_creation_tokens: int = 0,
) -> float:
    """指定モデル・トークン数から実際のAPIコスト(USD)を計算"""
    prices = PRICE_TABLE.get(model)
    if prices is None:
        return 0.0
    return (
        input_tokens * prices["input"] / 1_000_000
        + output_tokens * prices["output"] / 1_000_000
        + cache_read_tokens * prices["cache_read"] / 1_000_000
        + cache_creation_tokens * prices["cache_creation"] / 1_000_000
    )


def calculate_cost_without_cache(
    model: str,
    input_tokens: int,
    output_tokens: int,
    cache_read_tokens: int = 0,
    cache_creation_tokens: int = 0,
) -> float:
    """キャッシュが無かった場合の仮想コスト(USD)を計算。
    cache_read + cache_creation は全て通常のinput価格で課金される想定。
    """
    prices = PRICE_TABLE.get(model)
    if prices is None:
        return 0.0
    total_input = input_tokens + cache_read_tokens + cache_creation_tokens
    return (
        total_input * prices["input"] / 1_000_000
        + output_tokens * prices["output"] / 1_000_000
    )


def calculate_cache_savings(
    model: str,
    input_tokens: int,
    output_tokens: int,
    cache_read_tokens: int = 0,
    cache_creation_tokens: int = 0,
) -> float:
    """キャッシュによる実際の節約額を計算。
    (キャッシュ無しコスト) - (実際のコスト) の差額。
    cache_creation のプレミアム分も考慮する。
    """
    actual = calculate_cost(model, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens)
    without = calculate_cost_without_cache(model, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens)
    return max(0.0, without - actual)


def calculate_model_costs(model_usage: dict) -> dict[str, dict[str, float]]:
    """modelUsage辞書全体のコスト計算。モデルごとのcost, savings, withoutCacheCostを返す。"""
    result: dict[str, dict[str, float]] = {}
    for model_id, usage in model_usage.items():
        inp = usage.get("inputTokens", 0)
        out = usage.get("outputTokens", 0)
        cr = usage.get("cacheReadInputTokens", 0)
        cc = usage.get("cacheCreationInputTokens", 0)

        cost = calculate_cost(model_id, inp, out, cr, cc)
        without_cache = calculate_cost_without_cache(model_id, inp, out, cr, cc)
        savings = max(0.0, without_cache - cost)

        result[model_id] = {
            "cost": cost,
            "savings": savings,
            "withoutCacheCost": without_cache,
        }
    return result

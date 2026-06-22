import math
from typing import Any


def clamp_score(score: float) -> int:
    return max(0, min(100, int(round(score))))


def score_to_action(score: int) -> str:
    if score >= 60:
        return "LONG"
    if score <= 40:
        return "SHORT"
    return "WAIT"


def confidence_from_score(score: int) -> int:
    return max(score, 100 - score)


def runtime_action(action: str) -> str:
    if action == "LONG":
        return "long"
    if action == "SHORT":
        return "short"
    return "hold"


def invalidation_text(action: str, ema20: float) -> str:
    if action == "LONG":
        return f"Reassess if price closes back below EMA20 near {ema20:.2f}."
    if action == "SHORT":
        return f"Reassess if price closes back above EMA20 near {ema20:.2f}."
    return "Wait for the next closed bar before reassessing."


def parse_leverage(value: Any) -> int:
    try:
        leverage = int(value)
    except (TypeError, ValueError):
        leverage = 1
    return max(1, leverage)


def parse_margin_budget(value: Any) -> float:
    try:
        budget = float(value)
    except (TypeError, ValueError):
        budget = 0.0
    return max(0.0, budget)


def contract_quantity(*, close_price: float, leverage: int, margin_budget: float) -> float:
    if close_price <= 0 or leverage <= 0 or margin_budget <= 0:
        return 0.0
    quantity = (margin_budget * float(leverage)) / close_price
    return max(0.0, quantity)


def sanitize_metric(value: Any) -> Any:
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return value if math.isfinite(value) else None
    try:
        cast = float(value)
    except (TypeError, ValueError):
        return value
    return cast if math.isfinite(cast) else None

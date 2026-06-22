from typing import Any

from getagent import runtime

from src.risk import runtime_action, sanitize_metric


def emit_decision_signal(
    *,
    symbol: str,
    action: str,
    confidence_pct: int,
    metrics: dict[str, Any],
    meta: dict[str, Any],
) -> None:
    runtime.emit_signal(
        action=runtime_action(action),
        symbol=symbol,
        confidence=float(confidence_pct) / 100.0,
        metrics={key: sanitize_metric(value) for key, value in metrics.items()},
        meta=meta,
    )

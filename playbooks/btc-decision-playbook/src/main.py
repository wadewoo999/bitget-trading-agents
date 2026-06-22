from copy import deepcopy
from typing import Any

from getagent import backtest, data, runtime

from src.execution import emit_decision_signal
from src.indicators import StrategyInputs, build_replay_frame, latest_ready_row, parse_execution_bounds
from src.strategy import evaluate_feature_row


HISTORICAL_BAR_LIMIT = 1000
LIVE_BAR_LIMIT = 320


def run() -> None:
    if runtime.is_historical():
        _run_historical()
        return
    if runtime.is_live():
        _run_live()
        return
    raise ValueError(f"unsupported evaluation_mode={runtime.evaluation_mode!r}")


def _run_historical() -> None:
    inputs = _strategy_inputs()
    start_time, end_time = parse_execution_bounds(runtime.backtest_spec)
    raw_bars = data.crypto.futures.kline(
        symbol=inputs.symbol,
        interval=inputs.timeframe,
        exchange=inputs.exchange,
        limit=HISTORICAL_BAR_LIMIT,
        start_time=start_time,
        end_time=end_time,
    )
    replay_frame = build_replay_frame(raw_bars)
    if replay_frame.empty:
        emit_decision_signal(
            symbol=inputs.symbol,
            action="WAIT",
            confidence_pct=0,
            metrics={"rows": 0},
            meta={"mode": "historical", "reason": "no historical bars returned"},
        )
        return

    latest = latest_ready_row(replay_frame)
    decision = evaluate_feature_row(latest)
    result = backtest.run(
        ohlcv_data={f"{inputs.symbol}.BINANCE": replay_frame},
        spec=_historical_spec(),
    )
    chart_path = backtest.generate_chart(result)
    summary = result.summary or {}
    emit_decision_signal(
        symbol=inputs.symbol,
        action=decision.action,
        confidence_pct=decision.confidence_pct,
        metrics={
            "market_bias_score": decision.market_bias_score,
            "signal_confidence_pct": decision.confidence_pct,
            "trend_signal": decision.trend_signal,
            "momentum_signal": decision.momentum_signal,
            "participation_signal": decision.participation_signal,
            "crowding_signal": decision.crowding_signal,
            "total_return_pct": result.total_return_pct,
            "max_drawdown_pct": result.max_drawdown_pct,
            "sharpe_ratio": result.sharpe_ratio,
            "win_rate": result.win_rate,
            "profit_factor": result.profit_factor,
            "total_trades": result.total_trades,
            "fill_count": result.fill_count,
            "position_count": result.position_count,
            "net_pnl": summary.get("net_pnl", 0),
            "starting_balance": summary.get("starting_balance"),
            "rows": len(replay_frame),
        },
        meta={
            "mode": "historical",
            "timeframe": inputs.timeframe,
            "summary": decision.summary,
            "reasons": decision.reasons,
            "warnings": decision.warnings,
            "invalidation_condition": decision.invalidation_condition,
            "chart_path": chart_path,
            "replay_window_start": str(replay_frame.index.min()),
            "replay_window_end": str(replay_frame.index.max()),
            "crowding_scope": "omitted for first replayable package version",
        },
    )


def _run_live() -> None:
    inputs = _strategy_inputs()
    raw_bars = data.crypto.futures.kline(
        symbol=inputs.symbol,
        interval=inputs.timeframe,
        exchange=inputs.exchange,
        limit=LIVE_BAR_LIMIT,
    )
    replay_frame = build_replay_frame(raw_bars)
    if replay_frame.empty:
        emit_decision_signal(
            symbol=inputs.symbol,
            action="WAIT",
            confidence_pct=0,
            metrics={"rows": 0},
            meta={"mode": "live", "reason": "no bars returned"},
        )
        return

    latest = latest_ready_row(replay_frame)
    decision = evaluate_feature_row(latest)
    emit_decision_signal(
        symbol=inputs.symbol,
        action=decision.action,
        confidence_pct=decision.confidence_pct,
        metrics={
            "market_bias_score": decision.market_bias_score,
            "signal_confidence_pct": decision.confidence_pct,
            "trend_signal": decision.trend_signal,
            "momentum_signal": decision.momentum_signal,
            "participation_signal": decision.participation_signal,
            "crowding_signal": decision.crowding_signal,
            "latest_close": float(latest["close"]),
            "ema20": float(latest["ema20"]),
            "rsi14": float(latest["rsi14"]),
            "macd_histogram": float(latest["macd_histogram"]),
            "volume_change_pct": float(latest["volume_change_pct"]),
            "price_return_20_pct": float(latest["price_return_20_pct"]),
            "rows": len(replay_frame),
        },
        meta={
            "mode": "live",
            "timeframe": inputs.timeframe,
            "summary": decision.summary,
            "reasons": decision.reasons,
            "warnings": decision.warnings,
            "invalidation_condition": decision.invalidation_condition,
            "crowding_scope": "omitted for first replayable package version",
        },
    )


def _strategy_inputs() -> StrategyInputs:
    config = runtime.manifest.get("strategy_config", {}) or {}
    symbols = config.get("trading_symbols") or runtime.manifest.get("trading_symbols") or ["BTCUSDT"]
    return StrategyInputs(
        symbol=str(symbols[0]),
        timeframe=str(config.get("timeframe", "4h")),
        exchange="binance",
    )


def _historical_spec() -> dict[str, Any]:
    spec = deepcopy(runtime.backtest_spec or {})
    strategy = spec.setdefault("strategy", {})
    config = strategy.setdefault("config", {})
    manifest_config = runtime.manifest.get("strategy_config", {}) or {}
    config["leverage"] = manifest_config.get("leverage", 3)
    config["margin_budget"] = manifest_config.get("margin_budget", "50")
    return spec


if __name__ == "__main__":
    run()

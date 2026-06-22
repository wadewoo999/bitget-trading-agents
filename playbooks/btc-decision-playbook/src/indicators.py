from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd
from getagent import backtest


BAR_COLUMNS = ("open", "high", "low", "close", "volume")


@dataclass(frozen=True)
class StrategyInputs:
    symbol: str
    timeframe: str
    exchange: str = "binance"


def build_replay_frame(raw_bars: Any) -> pd.DataFrame:
    frame = backtest.prepare_frame(raw_bars, datetime_index="date")
    if frame.empty:
        return frame

    prepared = frame.copy()
    prepared = prepared.sort_index()
    prepared = prepared[~prepared.index.duplicated(keep="last")]

    for column in BAR_COLUMNS:
        prepared[column] = pd.to_numeric(prepared[column], errors="coerce")

    prepared = prepared.dropna(subset=list(BAR_COLUMNS))
    prepared["ema20"] = prepared["close"].ewm(span=20, adjust=False).mean()
    prepared["ema50"] = prepared["close"].ewm(span=50, adjust=False).mean()
    prepared["ema100"] = prepared["close"].ewm(span=100, adjust=False).mean()
    prepared["ema200"] = prepared["close"].ewm(span=200, adjust=False).mean()

    macd_line, macd_signal, macd_histogram = _macd(prepared["close"])
    prepared["rsi14"] = _rsi(prepared["close"], period=14)
    prepared["macd"] = macd_line
    prepared["macd_signal"] = macd_signal
    prepared["macd_histogram"] = macd_histogram
    prepared["atr14"] = _atr(prepared, period=14)

    previous_volume_mean = prepared["volume"].shift(1).rolling(window=20, min_periods=20).mean()
    prepared["volume_change_pct"] = np.where(
        previous_volume_mean > 0,
        (prepared["volume"] / previous_volume_mean - 1.0) * 100.0,
        np.nan,
    )
    prepared["price_return_20_pct"] = (prepared["close"] / prepared["close"].shift(20) - 1.0) * 100.0

    prepared["atr_close_ratio"] = prepared["atr14"] / prepared["close"]
    prepared["volatility_threshold"] = (
        prepared["atr_close_ratio"].rolling(window=100, min_periods=100).quantile(0.8)
    )
    prepared["volatility_high"] = (
        prepared["atr_close_ratio"] > prepared["volatility_threshold"]
    ).astype(int)

    prepared["warmup_ready"] = (
        prepared[
            [
                "ema20",
                "ema50",
                "ema100",
                "ema200",
                "rsi14",
                "macd_histogram",
                "atr14",
                "volume_change_pct",
                "price_return_20_pct",
                "volatility_threshold",
            ]
        ]
        .notna()
        .all(axis=1)
        .astype(int)
    )
    return prepared


def latest_ready_row(frame: pd.DataFrame) -> pd.Series:
    ready = frame.loc[frame["warmup_ready"] == 1]
    if ready.empty:
        raise ValueError("no warmup-ready rows available")
    return ready.iloc[-1]


def parse_execution_bounds(spec: dict[str, Any] | None) -> tuple[int | None, int | None]:
    execution = (spec or {}).get("execution", {}) or {}
    return _iso_to_millis(execution.get("start")), _iso_to_millis(execution.get("end"))


def _iso_to_millis(value: Any) -> int | None:
    text = str(value or "").strip()
    if not text:
        return None
    timestamp = pd.Timestamp(text)
    if timestamp.tzinfo is None:
        timestamp = timestamp.tz_localize("UTC")
    else:
        timestamp = timestamp.tz_convert("UTC")
    return int(timestamp.timestamp() * 1000)


def _rsi(series: pd.Series, *, period: int) -> pd.Series:
    delta = series.diff()
    gains = delta.clip(lower=0.0)
    losses = -delta.clip(upper=0.0)
    average_gain = gains.ewm(alpha=1.0 / period, adjust=False, min_periods=period).mean()
    average_loss = losses.ewm(alpha=1.0 / period, adjust=False, min_periods=period).mean()
    relative_strength = average_gain / average_loss.replace(0.0, np.nan)
    rsi = 100.0 - (100.0 / (1.0 + relative_strength))
    return rsi.fillna(50.0)


def _macd(series: pd.Series) -> tuple[pd.Series, pd.Series, pd.Series]:
    fast = series.ewm(span=12, adjust=False).mean()
    slow = series.ewm(span=26, adjust=False).mean()
    macd_line = fast - slow
    signal = macd_line.ewm(span=9, adjust=False).mean()
    histogram = macd_line - signal
    return macd_line, signal, histogram


def _atr(frame: pd.DataFrame, *, period: int) -> pd.Series:
    high_low = frame["high"] - frame["low"]
    high_close = (frame["high"] - frame["close"].shift(1)).abs()
    low_close = (frame["low"] - frame["close"].shift(1)).abs()
    true_range = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
    return true_range.ewm(alpha=1.0 / period, adjust=False, min_periods=period).mean()

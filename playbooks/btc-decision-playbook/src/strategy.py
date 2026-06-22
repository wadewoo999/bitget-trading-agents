from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Optional

import pandas as pd
from nautilus_trader.config import StrategyConfig
from nautilus_trader.model.data import Bar, BarType
from nautilus_trader.model.enums import OrderSide, TimeInForce
from nautilus_trader.model.identifiers import InstrumentId
from nautilus_trader.model.instruments import Instrument
from nautilus_trader.model.objects import Quantity
from nautilus_trader.trading.strategy import Strategy

from src.risk import (
    clamp_score,
    confidence_from_score,
    contract_quantity,
    invalidation_text,
    parse_leverage,
    parse_margin_budget,
    score_to_action,
)


@dataclass(frozen=True)
class DecisionSnapshot:
    action: str
    confidence_pct: int
    market_bias_score: int
    trend_signal: int
    momentum_signal: int
    participation_signal: int
    crowding_signal: int
    volatility_risk: str
    summary: str
    invalidation_condition: str
    reasons: list[str]
    warnings: list[str]


class BtcDecisionStrategyConfig(StrategyConfig):
    instrument_id: Optional[InstrumentId] = None
    bar_type: Optional[BarType] = None
    instrument_ids: tuple[InstrumentId, ...] = ()
    bar_types: tuple[BarType, ...] = ()
    leverage: int = 3
    margin_budget: str = "50"


def evaluate_feature_row(row: pd.Series) -> DecisionSnapshot:
    trend = (
        1
        if (
            row["close"] > row["ema20"]
            and row["ema20"] > row["ema50"]
            and row["ema50"] > row["ema100"]
            and row["ema100"] > row["ema200"]
        )
        else -1
        if (
            row["close"] < row["ema20"]
            and row["ema20"] < row["ema50"]
            and row["ema50"] < row["ema100"]
            and row["ema100"] < row["ema200"]
        )
        else 0
    )
    momentum = (
        1
        if row["macd_histogram"] > 0 and 50 <= row["rsi14"] <= 70
        else -1
        if row["macd_histogram"] < 0 and 30 <= row["rsi14"] < 50
        else 0
    )
    participation = (
        1
        if row["volume_change_pct"] > 0 and row["price_return_20_pct"] > 0
        else -1
        if row["volume_change_pct"] > 0 and row["price_return_20_pct"] < 0
        else 0
    )
    crowding = 0

    raw_score = 50.0 + 0.5 * (40 * trend + 25 * momentum + 20 * participation + 10 * crowding)
    adjusted_score = 50.0 + (raw_score - 50.0) * 0.9 if int(row["volatility_high"]) == 1 else raw_score
    market_bias_score = clamp_score(adjusted_score)
    confidence_pct = confidence_from_score(market_bias_score)
    action = score_to_action(market_bias_score)

    label = lambda value: "bullish" if value > 0 else "bearish" if value < 0 else "neutral"
    warnings: list[str] = []
    if row["rsi14"] < 30 or row["rsi14"] > 70:
        warnings.append("RSI is extended and reversal risk is higher.")
    if int(row["volatility_high"]) == 1:
        warnings.append("ATR/close volatility is elevated versus its recent distribution.")
    warnings.append("Crowding from funding and OI is intentionally omitted in this replayable first version.")

    summary = (
        "Trend, momentum, and participation align to the upside."
        if action == "LONG"
        else "Trend, momentum, and participation align to the downside."
        if action == "SHORT"
        else "Signals are mixed or low-conviction, so the strategy waits."
    )
    reasons = [
        f"trend={label(trend)}",
        f"momentum={label(momentum)}",
        f"participation={label(participation)}",
        "crowding omitted for replayable deterministic scope",
    ]

    return DecisionSnapshot(
        action=action,
        confidence_pct=confidence_pct,
        market_bias_score=market_bias_score,
        trend_signal=trend,
        momentum_signal=momentum,
        participation_signal=participation,
        crowding_signal=crowding,
        volatility_risk="high" if int(row["volatility_high"]) == 1 else "normal",
        summary=summary,
        invalidation_condition=invalidation_text(action, float(row["ema20"])),
        reasons=reasons,
        warnings=warnings,
    )


class BtcDecisionStrategy(Strategy):
    def __init__(self, config: BtcDecisionStrategyConfig) -> None:
        super().__init__(config)
        self.cfg = config
        self.feature_frames: dict[str, pd.DataFrame] = {}
        self._frame: Optional[pd.DataFrame] = None
        self._row_index = 0
        self._instrument: Optional[Instrument] = None
        self._position_state = "NONE"

    def set_feature_frames(self, feature_frames: dict[str, pd.DataFrame]) -> None:
        self.feature_frames = feature_frames

    def on_start(self) -> None:
        bar_type = self.cfg.bar_type or (self.cfg.bar_types[0] if self.cfg.bar_types else None)
        instrument_id = self.cfg.instrument_id or (
            self.cfg.instrument_ids[0] if self.cfg.instrument_ids else None
        )
        if bar_type is None or instrument_id is None:
            raise RuntimeError("bar_type and instrument_id must be set")

        self._instrument = self.cache.instrument(instrument_id)
        self._frame = self.feature_frames.get(str(instrument_id))
        if self._frame is None:
            raise RuntimeError(f"missing feature frame for {instrument_id}")

        self.subscribe_bars(bar_type)

    def on_bar(self, bar: Bar) -> None:
        if self._instrument is None or self._frame is None:
            return
        if self._row_index >= len(self._frame):
            return

        row = self._frame.iloc[self._row_index]
        self._row_index += 1
        if int(row.get("warmup_ready", 0)) != 1:
            return

        decision = evaluate_feature_row(row)
        quantity = contract_quantity(
            close_price=float(row["close"]),
            leverage=parse_leverage(self.cfg.leverage),
            margin_budget=parse_margin_budget(self.cfg.margin_budget),
        )
        if quantity <= 0:
            return

        instrument_id = self._instrument.id
        order_quantity = Quantity(Decimal(str(quantity)), self._instrument.size_precision)

        if self._position_state == "LONG" and decision.action != "LONG":
            self._close_open(instrument_id, OrderSide.SELL)
            self._position_state = "NONE"
        elif self._position_state == "SHORT" and decision.action != "SHORT":
            self._close_open(instrument_id, OrderSide.BUY)
            self._position_state = "NONE"

        if self._position_state == "NONE":
            if decision.action == "LONG":
                self._submit(instrument_id, OrderSide.BUY, order_quantity)
                self._position_state = "LONG"
            elif decision.action == "SHORT":
                self._submit(instrument_id, OrderSide.SELL, order_quantity)
                self._position_state = "SHORT"

    def _submit(self, instrument_id: InstrumentId, side: OrderSide, quantity: Quantity) -> None:
        order = self.order_factory.market(
            instrument_id=instrument_id,
            order_side=side,
            quantity=quantity,
            time_in_force=TimeInForce.GTC,
        )
        self.submit_order(order)

    def _close_open(self, instrument_id: InstrumentId, side: OrderSide) -> None:
        for position in self.cache.positions_open(instrument_id=instrument_id):
            self._submit(instrument_id, side, position.quantity)

    def on_stop(self) -> None:
        if self._instrument is not None:
            self.cancel_all_orders(self._instrument.id)
            self.close_all_positions(self._instrument.id)

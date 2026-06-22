import type { BacktestResult, StrategyConfig } from "@/features/strategy-lab/model";
import { backtestResultSchema, strategyConfigSchema } from "@/features/strategy-lab/model";
import { calculateEma } from "@/server/indicators/ema";
import { calculateMacd } from "@/server/indicators/macd";
import { calculateRsi } from "@/server/indicators/rsi";
import { loadBacktestMarket } from "@/server/strategy-lab/load-backtest-market";

const WARMUP_BARS = 200;
const STARTING_EQUITY = 10_000;
const FEE_RATE = 0.0006;
const SLIPPAGE_RATE = 0.0002;
const VOLUME_LOOKBACK = 20;
const RSI_PERIOD = 14;

type Position = {
  side: "LONG" | "SHORT";
  entryAt: string;
  entryPrice: number;
  quantity: number;
  entryFee: number;
};

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function calculateTradePnl(side: "LONG" | "SHORT", entryPrice: number, exitPrice: number, quantity: number) {
  return side === "LONG" ? (exitPrice - entryPrice) * quantity : (entryPrice - exitPrice) * quantity;
}

function calculateMaxDrawdown(equityCurve: BacktestResult["equityCurve"]) {
  let peak = equityCurve[0]!.equity;
  let maxDrawdown = 0;
  for (const point of equityCurve) {
    peak = Math.max(peak, point.equity);
    if (peak === 0) continue;
    maxDrawdown = Math.max(maxDrawdown, (peak - point.equity) / peak);
  }
  return maxDrawdown * 100;
}

function calculateSharpeRatio(equityCurve: BacktestResult["equityCurve"]) {
  if (equityCurve.length < 2) return 0;
  const returns = equityCurve.slice(1).map((point, index) => point.equity / equityCurve[index]!.equity - 1);
  const averageReturn = mean(returns);
  const variance = mean(returns.map((value) => (value - averageReturn) ** 2));
  const standardDeviation = Math.sqrt(variance);
  if (standardDeviation === 0) return 0;
  return Number((Math.sqrt(returns.length) * averageReturn / standardDeviation).toFixed(4));
}

export async function runBacktest(input: StrategyConfig): Promise<BacktestResult> {
  const strategy = strategyConfigSchema.parse(input);
  const market = await loadBacktestMarket(strategy.timeframe);
  const closes = market.candles.map((candle) => candle.close);
  const ema20 = calculateEma(closes, 20);
  const ema50 = calculateEma(closes, 50);
  const rsi14 = calculateRsi(closes, RSI_PERIOD);
  const macd = calculateMacd(closes);
  const equityCurve: BacktestResult["equityCurve"] = [];
  const trades: BacktestResult["trades"] = [];
  let realizedEquity = STARTING_EQUITY;
  let position: Position | null = null;

  const closePosition = (timestamp: string, marketPrice: number) => {
    if (!position) return;
    const exitPrice = position.side === "LONG" ? marketPrice * (1 - SLIPPAGE_RATE) : marketPrice * (1 + SLIPPAGE_RATE);
    const exitFee = exitPrice * position.quantity * FEE_RATE;
    const pnl = calculateTradePnl(position.side, position.entryPrice, exitPrice, position.quantity) - position.entryFee - exitFee;
    realizedEquity += pnl;
    trades.push({
      id: `trade-${trades.length + 1}`,
      side: position.side,
      entryAt: position.entryAt,
      exitAt: timestamp,
      entryPrice: position.entryPrice,
      exitPrice,
      quantity: position.quantity,
      pnl,
      fee: position.entryFee + exitFee,
    });
    position = null;
  };

  for (let index = WARMUP_BARS; index < market.candles.length; index++) {
    const candle = market.candles[index]!;
    const previousVolumes = market.candles.slice(index - VOLUME_LOOKBACK, index).map((item) => item.volume);
    const volumeChange = candle.volume - mean(previousVolumes);
    const longCondition = candle.close > ema20[index]! && candle.close > ema50[index]! && rsi14[index]! >= 55 && macd.histogram[index]! > 0 && volumeChange > 0;
    const shortCondition = candle.close < ema20[index]! && candle.close < ema50[index]! && rsi14[index]! <= 45 && macd.histogram[index]! < 0 && volumeChange > 0;

    if (position?.side === "LONG" && !longCondition) closePosition(candle.closeTime, candle.close);
    if (position?.side === "SHORT" && !shortCondition) closePosition(candle.closeTime, candle.close);

    if (!position) {
      if (longCondition) {
        const entryPrice = candle.close * (1 + SLIPPAGE_RATE);
        const quantity = realizedEquity * (strategy.riskPerTradePct / 100) / entryPrice;
        const entryFee = entryPrice * quantity * FEE_RATE;
        position = { side: "LONG", entryAt: candle.closeTime, entryPrice, quantity, entryFee };
      } else if (shortCondition) {
        const entryPrice = candle.close * (1 - SLIPPAGE_RATE);
        const quantity = realizedEquity * (strategy.riskPerTradePct / 100) / entryPrice;
        const entryFee = entryPrice * quantity * FEE_RATE;
        position = { side: "SHORT", entryAt: candle.closeTime, entryPrice, quantity, entryFee };
      }
    }

    if (index === market.candles.length - 1 && position) closePosition(candle.closeTime, candle.close);

    const shouldRecordEquity = equityCurve.length > 0 || position !== null || trades.length > 0;
    if (shouldRecordEquity) {
      const equity = position
        ? realizedEquity - position.entryFee + calculateTradePnl(position.side, position.entryPrice, candle.close, position.quantity)
        : realizedEquity;

      equityCurve.push({ timestamp: candle.closeTime, equity: Number(equity.toFixed(4)) });
    }
  }

  if (equityCurve.length === 0) {
    const lastCandle = market.candles.at(-1)!;
    equityCurve.push({ timestamp: lastCandle.closeTime, equity: STARTING_EQUITY });
  }

  const periodStart = equityCurve[0]!.timestamp;
  const periodEnd = market.candles.at(-1)!.closeTime;
  const winningTrades = trades.filter((trade) => trade.pnl > 0).length;
  return backtestResultSchema.parse({
    strategy,
    periodStart,
    periodEnd,
    totalReturnPct: Number((((equityCurve.at(-1)?.equity ?? STARTING_EQUITY) / STARTING_EQUITY - 1) * 100).toFixed(4)),
    maxDrawdownPct: Number(calculateMaxDrawdown(equityCurve).toFixed(4)),
    sharpeRatio: calculateSharpeRatio(equityCurve),
    winRate: trades.length === 0 ? 0 : winningTrades / trades.length,
    tradeCount: trades.length,
    feeRate: FEE_RATE,
    slippageRate: SLIPPAGE_RATE,
    equityCurve,
    trades: trades.map((trade) => ({
      ...trade,
      entryPrice: Number(trade.entryPrice.toFixed(4)),
      exitPrice: Number(trade.exitPrice.toFixed(4)),
      quantity: Number(trade.quantity.toFixed(8)),
      pnl: Number(trade.pnl.toFixed(4)),
      fee: Number(trade.fee.toFixed(4)),
    })),
  });
}

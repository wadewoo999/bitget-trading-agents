import type { MarketCandle } from "@/server/market-data/fixture-schema";

export function calculateAtr(candles: MarketCandle[], period = 14): number[] {
  if (!candles.length || period < 1 || candles.length < period) throw new Error("Invalid ATR input");
  const ranges = candles.map((candle, index) => index === 0 ? candle.high - candle.low : Math.max(candle.high - candle.low, Math.abs(candle.high - candles[index - 1]!.close), Math.abs(candle.low - candles[index - 1]!.close)));
  const result = [...ranges];
  let atr = ranges.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  result[period - 1] = atr;
  for (let index = period; index < ranges.length; index++) { atr = (atr * (period - 1) + ranges[index]!) / period; result[index] = atr; }
  return result;
}

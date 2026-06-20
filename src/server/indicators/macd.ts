import { calculateEma } from "@/server/indicators/ema";

export function calculateMacd(closes: number[]) {
  const fast = calculateEma(closes, 12); const slow = calculateEma(closes, 26);
  const macd = closes.map((_, index) => fast[index]! - slow[index]!);
  const signal = calculateEma(macd, 9);
  return { macd, signal, histogram: macd.map((value, index) => value - signal[index]!) };
}

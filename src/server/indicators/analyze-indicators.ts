import type { ChartPoint, MarketIndicators } from "@/features/market-analysis/model";
import type { MarketFixture } from "@/server/market-data/fixture-schema";
import { calculateAtr } from "@/server/indicators/atr";
import { calculateEma } from "@/server/indicators/ema";
import { calculateMacd } from "@/server/indicators/macd";
import { calculateRsi } from "@/server/indicators/rsi";

export function analyzeIndicators(fixture: MarketFixture): { indicators: MarketIndicators; volatilityRisk: "normal" | "high"; latestClose: number; chart: ChartPoint[] } {
  const closes = fixture.candles.map((candle) => candle.close);
  const ema20 = calculateEma(closes, 20); const ema50 = calculateEma(closes, 50);
  const ema100 = calculateEma(closes, 100); const ema200 = calculateEma(closes, 200);
  const rsi = calculateRsi(closes); const macd = calculateMacd(closes); const atr = calculateAtr(fixture.candles);
  const last = closes.length - 1; const latest = fixture.candles[last]!;
  const previousVolumes = fixture.candles.slice(last - 20, last).map((candle) => candle.volume);
  const meanVolume = previousVolumes.reduce((sum, value) => sum + value, 0) / previousVolumes.length;
  const volumeChangePct = meanVolume === 0 ? 0 : (latest.volume / meanVolume - 1) * 100;
  const priceReturn20Pct = (latest.close / fixture.candles[last - 20]!.close - 1) * 100;
  const ratios = atr.slice(-100).map((value, index) => value / fixture.candles[fixture.candles.length - 100 + index]!.close);
  const sorted = [...ratios].sort((a, b) => a - b); const threshold = sorted[Math.ceil(sorted.length * 0.8) - 1]!;
  const volatilityRisk = ratios.at(-1)! > threshold ? "high" : "normal";
  const indicators: MarketIndicators = {
    ema20: ema20[last]!, ema50: ema50[last]!, ema100: ema100[last]!, ema200: ema200[last]!, rsi14: rsi[last]!,
    macd: macd.macd[last]!, macdSignal: macd.signal[last]!, macdHistogram: macd.histogram[last]!, atr14: atr[last]!,
    volumeChangePct, priceReturn20Pct, fundingRate: fixture.fundingRate, openInterest: fixture.openInterest,
  };
  const chart = fixture.candles.slice(-80).map((candle, offset) => {
    const index = fixture.candles.length - 80 + offset;
    return { timestamp: candle.closeTime, close: candle.close, ema20: ema20[index]!, ema50: ema50[index]!, ema100: ema100[index]!, ema200: ema200[index]! };
  });
  return { indicators, volatilityRisk, latestClose: latest.close, chart };
}

import type { ChartPoint, MarketIndicators } from "@/features/market-analysis/model";
import type { NormalizedMarketData } from "@/server/market-data/normalized-market-data";
import { calculateAtr } from "@/server/indicators/atr";
import { calculateEma } from "@/server/indicators/ema";
import { calculateMacd } from "@/server/indicators/macd";
import { calculateRsi } from "@/server/indicators/rsi";

export function analyzeIndicators(marketData: Pick<NormalizedMarketData, "candles" | "fundingRate" | "openInterest">): { indicators: MarketIndicators; volatilityRisk: "normal" | "high"; latestClose: number; chart: ChartPoint[] } {
  const closes = marketData.candles.map((candle) => candle.close);
  const ema20 = calculateEma(closes, 20); const ema50 = calculateEma(closes, 50);
  const ema80 = calculateEma(closes, 80);
  const rsi = calculateRsi(closes); const macd = calculateMacd(closes); const atr = calculateAtr(marketData.candles);
  const last = closes.length - 1; const latest = marketData.candles[last]!;
  const previousVolumes = marketData.candles.slice(last - 20, last).map((candle) => candle.volume);
  const meanVolume = previousVolumes.reduce((sum, value) => sum + value, 0) / previousVolumes.length;
  const volumeChangePct = meanVolume === 0 ? 0 : (latest.volume / meanVolume - 1) * 100;
  const priceReturn20Pct = (latest.close / marketData.candles[last - 20]!.close - 1) * 100;
  const atrSlice = Math.min(80, atr.length);
  const ratios = atr.slice(-atrSlice).map((value, index) => value / marketData.candles[marketData.candles.length - atrSlice + index]!.close);
  const sorted = [...ratios].sort((a, b) => a - b); const threshold = sorted[Math.ceil(sorted.length * 0.8) - 1]!;
  const volatilityRisk = ratios.at(-1)! > threshold ? "high" : "normal";
  const indicators: MarketIndicators = {
    ema20: ema20[last]!, ema50: ema50[last]!, ema80: ema80[last]!, rsi14: rsi[last]!,
    macd: macd.macd[last]!, macdSignal: macd.signal[last]!, macdHistogram: macd.histogram[last]!, atr14: atr[last]!,
    volumeChangePct, priceReturn20Pct, fundingRate: marketData.fundingRate, openInterest: marketData.openInterest,
  };
  const chartSlice = Math.min(80, marketData.candles.length);
  const chart = marketData.candles.slice(-chartSlice).map((candle, offset) => {
    const index = marketData.candles.length - chartSlice + offset;
    return { timestamp: candle.closeTime, close: candle.close, ema20: ema20[index]!, ema50: ema50[index]!, ema80: ema80[index]! };
  });
  return { indicators, volatilityRisk, latestClose: latest.close, chart };
}

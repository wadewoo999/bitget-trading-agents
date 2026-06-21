import type {
  MarketDataMode,
  MarketSource,
  Timeframe,
} from "@/features/market-analysis/model";
import type { MarketCandle, MarketFixture } from "@/server/market-data/fixture-schema";

export interface NormalizedMarketData {
  symbol: "BTCUSDT";
  timeframe: Timeframe;
  mode: MarketDataMode;
  fetchedAt: string;
  sourceRequestTime: string;
  lastClosedCandleAt: string;
  latestPrice: number;
  fixtureVersion: string | null;
  fundingRate: number | null;
  openInterest: number | null;
  sources: MarketSource[];
  candles: MarketCandle[];
}

export function fixtureToNormalizedMarketData(fixture: MarketFixture): NormalizedMarketData {
  return {
    symbol: fixture.symbol,
    timeframe: fixture.timeframe,
    mode: "sample",
    fetchedAt: new Date().toISOString(),
    sourceRequestTime: fixture.sources[0]!.requestedAt,
    lastClosedCandleAt: fixture.candles.at(-1)!.closeTime,
    latestPrice: fixture.tickerPrice,
    fixtureVersion: fixture.version,
    fundingRate: fixture.fundingRate,
    openInterest: fixture.openInterest,
    sources: fixture.sources,
    candles: fixture.candles,
  };
}

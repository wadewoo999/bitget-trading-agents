import {
  marketFeedResponseSchema,
  type MarketFeedResponse,
  type Symbol,
  type Timeframe,
} from "@/features/market-analysis/model";
import { buildMarketCompletenessWarnings } from "@/server/market-data/completeness-warnings";
import {
  InsufficientCandlesError,
  loadLiveMarketData,
} from "@/server/market-data/live-market-data";

const marketFeedCandleCountByTimeframe: Record<Timeframe, number> = {
  "15m": 80,
  "1h": 80,
  "4h": 80,
  "1d": 80,
};

export async function loadMarketFeed({
  symbol,
  timeframe,
}: {
  symbol: Symbol;
  timeframe: Timeframe;
}): Promise<MarketFeedResponse> {
  const marketData = await loadLiveMarketData(symbol, timeframe);

  const candleCount = marketFeedCandleCountByTimeframe[timeframe];
  const candles = marketData.candles.slice(-candleCount);
  if (candles.length !== candleCount) {
    throw new InsufficientCandlesError(
      `Market feed requires ${candleCount} candles.`,
    );
  }

  return marketFeedResponseSchema.parse({
    symbol: marketData.symbol,
    mode: "live" as const,
    timeframe: marketData.timeframe,
    price: marketData.latestPrice,
    fetchedAt: marketData.fetchedAt,
    fixtureVersion: marketData.fixtureVersion,
    fundingRate: marketData.fundingRate,
    openInterest: marketData.openInterest,
    completenessWarnings: buildMarketCompletenessWarnings({
      fundingRate: marketData.fundingRate,
      openInterest: marketData.openInterest,
    }),
    candles,
  });
}

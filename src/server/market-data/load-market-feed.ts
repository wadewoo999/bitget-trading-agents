import {
  MARKET_FEED_CANDLE_COUNT,
  marketFeedResponseSchema,
  type MarketDataMode,
  type MarketFeedResponse,
  type Timeframe,
} from "@/features/market-analysis/model";
import { buildMarketCompletenessWarnings } from "@/server/market-data/completeness-warnings";
import { loadMarketFixture } from "@/server/market-data/load-market-fixture";
import {
  InsufficientCandlesError,
  loadLiveMarketData,
} from "@/server/market-data/live-market-data";
import { fixtureToNormalizedMarketData } from "@/server/market-data/normalized-market-data";

export async function loadMarketFeed({
  mode,
  timeframe,
}: {
  mode: MarketDataMode;
  timeframe: Timeframe;
}): Promise<MarketFeedResponse> {
  const marketData =
    mode === "sample"
      ? fixtureToNormalizedMarketData(await loadMarketFixture(timeframe))
      : await loadLiveMarketData(timeframe);

  const candles = marketData.candles.slice(-MARKET_FEED_CANDLE_COUNT);
  if (candles.length !== MARKET_FEED_CANDLE_COUNT) {
    throw new InsufficientCandlesError(
      `Market feed requires ${MARKET_FEED_CANDLE_COUNT} candles.`,
    );
  }

  return marketFeedResponseSchema.parse({
    symbol: marketData.symbol,
    mode,
    timeframe: marketData.timeframe,
    price: marketData.latestPrice,
    fetchedAt: marketData.fetchedAt,
    fixtureVersion: marketData.fixtureVersion,
    completenessWarnings: buildMarketCompletenessWarnings({
      mode,
      fundingRate: marketData.fundingRate,
      openInterest: marketData.openInterest,
    }),
    candles,
  });
}

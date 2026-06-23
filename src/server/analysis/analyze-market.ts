import { analyzeResponseSchema, type AnalyzeResponse, type MarketDataMode, type Symbol, type Timeframe, type UserStance } from "@/features/market-analysis/model";
import { createDecision } from "@/server/decision/create-decision";
import { analyzeIndicators } from "@/server/indicators/analyze-indicators";
import { buildMarketCompletenessWarnings } from "@/server/market-data/completeness-warnings";
import { loadMarketFixture } from "@/server/market-data/load-market-fixture";
import { loadLiveMarketData } from "@/server/market-data/live-market-data";
import { fixtureToNormalizedMarketData } from "@/server/market-data/normalized-market-data";

export async function analyzeMarket({ symbol, timeframe, stance, mode }: { symbol: Symbol; timeframe: Timeframe; stance: UserStance; mode: MarketDataMode }): Promise<AnalyzeResponse> {
  const marketData = mode === "sample"
    ? fixtureToNormalizedMarketData(await loadMarketFixture(symbol, timeframe))
    : await loadLiveMarketData(symbol, timeframe);
  const analysis = analyzeIndicators(marketData);
  const decision = createDecision({
    stance,
    latestClose: analysis.latestClose,
    indicators: analysis.indicators,
    volatilityRisk: analysis.volatilityRisk,
  });
  const completenessWarnings = buildMarketCompletenessWarnings({
    mode,
    fundingRate: marketData.fundingRate,
    openInterest: marketData.openInterest,
  });
  return analyzeResponseSchema.parse({
    snapshot: {
      symbol,
      timeframe,
      mode,
      fetchedAt: marketData.fetchedAt,
      sourceRequestTime: marketData.sourceRequestTime,
      lastClosedCandleAt: marketData.lastClosedCandleAt,
      latestPrice: marketData.latestPrice,
      fixtureVersion: marketData.fixtureVersion,
      indicators: analysis.indicators,
    },
    decision,
    dataComplete: completenessWarnings.length === 0,
    completenessWarnings,
    sources: marketData.sources,
    chart: analysis.chart,
  });
}

import { analyzeResponseSchema, type AnalyzeResponse, type Symbol, type Timeframe, type UserStance } from "@/features/market-analysis/model";
import { createDecision } from "@/server/decision/create-decision";
import { analyzeIndicators } from "@/server/indicators/analyze-indicators";
import { buildMarketCompletenessWarnings } from "@/server/market-data/completeness-warnings";
import { loadLiveMarketData } from "@/server/market-data/live-market-data";

export async function analyzeMarket({ symbol, timeframe, stance }: { symbol: Symbol; timeframe: Timeframe; stance: UserStance }): Promise<AnalyzeResponse> {
  const marketData = await loadLiveMarketData(symbol, timeframe);
  const analysis = analyzeIndicators(marketData);
  const decision = createDecision({
    stance,
    latestClose: analysis.latestClose,
    indicators: analysis.indicators,
    volatilityRisk: analysis.volatilityRisk,
  });
  const completenessWarnings = buildMarketCompletenessWarnings({
    fundingRate: marketData.fundingRate,
    openInterest: marketData.openInterest,
  });
  return analyzeResponseSchema.parse({
    snapshot: {
      symbol,
      timeframe,
      mode: marketData.mode,
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

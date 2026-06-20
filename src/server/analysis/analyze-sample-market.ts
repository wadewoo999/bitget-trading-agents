import { analyzeResponseSchema, type AnalyzeResponse, type Timeframe, type UserStance } from "@/features/market-analysis/model";
import { createDecision } from "@/server/decision/create-decision";
import { analyzeIndicators } from "@/server/indicators/analyze-indicators";
import { loadMarketFixture } from "@/server/market-data/load-market-fixture";

export async function analyzeSampleMarket({ timeframe, stance }: { timeframe: Timeframe; stance: UserStance }): Promise<AnalyzeResponse> {
  const fixture = await loadMarketFixture(timeframe);
  const analysis = analyzeIndicators(fixture);
  const decision = createDecision({ stance, latestClose: analysis.latestClose, indicators: analysis.indicators, volatilityRisk: analysis.volatilityRisk });
  return analyzeResponseSchema.parse({
    snapshot: { symbol: "BTCUSDT", timeframe, mode: "sample", fetchedAt: new Date().toISOString(), sourceRequestTime: fixture.sources[0]!.requestedAt, lastClosedCandleAt: fixture.candles.at(-1)!.closeTime, latestPrice: fixture.tickerPrice, fixtureVersion: fixture.version, indicators: analysis.indicators },
    decision,
    dataComplete: true,
    completenessWarnings: ["Sample Data 為凍結快照，不代表即時市場。"],
    sources: fixture.sources,
    chart: analysis.chart,
  });
}

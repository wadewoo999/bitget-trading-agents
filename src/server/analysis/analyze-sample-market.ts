import type { AnalyzeResponse, Symbol, Timeframe, UserStance } from "@/features/market-analysis/model";
import { analyzeMarket } from "@/server/analysis/analyze-market";

export async function analyzeSampleMarket({ symbol, timeframe, stance }: { symbol: Symbol; timeframe: Timeframe; stance: UserStance }): Promise<AnalyzeResponse> {
  return analyzeMarket({ symbol, timeframe, stance, mode: "sample" });
}

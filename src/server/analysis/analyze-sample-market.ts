import type { AnalyzeResponse, Timeframe, UserStance } from "@/features/market-analysis/model";
import { analyzeMarket } from "@/server/analysis/analyze-market";

export async function analyzeSampleMarket({ timeframe, stance }: { timeframe: Timeframe; stance: UserStance }): Promise<AnalyzeResponse> {
  return analyzeMarket({ timeframe, stance, mode: "sample" });
}

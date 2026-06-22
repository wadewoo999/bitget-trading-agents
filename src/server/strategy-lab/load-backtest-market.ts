import type { Timeframe } from "@/features/market-analysis/model";
import type { StrategyTimeframe } from "@/features/strategy-lab/model";
import { loadMarketFixture } from "@/server/market-data/load-market-fixture";

export async function loadBacktestMarket(timeframe: StrategyTimeframe) {
  if (timeframe === "1week") throw new Error("1week backtest data is not available yet.");
  return loadMarketFixture(timeframe as Timeframe);
}

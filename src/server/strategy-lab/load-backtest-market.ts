import type { Symbol, Timeframe } from "@/features/market-analysis/model";
import type { StrategyTimeframe } from "@/features/strategy-lab/model";
import { loadMarketFixture } from "@/server/market-data/load-market-fixture";
import { loadLiveMarketData } from "@/server/market-data/live-market-data";

export async function loadBacktestMarket(symbol: Symbol, timeframe: StrategyTimeframe) {
  if (timeframe === "1week") throw new Error("1week backtest data is not available yet.");
  if (symbol === "BTCUSDT") return loadMarketFixture(symbol, timeframe as Timeframe);
  return loadLiveMarketData(symbol, timeframe as Timeframe);
}

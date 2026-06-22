import { describe, expect, it } from "vitest";

import { backtestResultSchema } from "@/features/strategy-lab/model";
import { buildStrategyConfig } from "@/server/strategy-lab/build-strategy-config";
import { loadBacktestMarket } from "@/server/strategy-lab/load-backtest-market";
import { runBacktest } from "@/server/strategy-lab/run-backtest";

describe("runBacktest", () => {
  it("returns a schema-valid deterministic result with fixed fees and slippage", async () => {
    const result = await runBacktest(buildStrategyConfig({ profile: "aggressive", timeframe: "15m" }));

    expect(backtestResultSchema.parse(result)).toBeTruthy();
    expect(result.feeRate).toBe(0.0006);
    expect(result.slippageRate).toBe(0.0002);
    expect(result.equityCurve.length).toBeGreaterThan(0);
    expect(result.tradeCount).toBe(result.trades.length);
    expect(Date.parse(result.periodStart)).toBeLessThan(Date.parse(result.periodEnd));
    if (result.trades.length > 0) expect(result.trades[0]!.entryAt).toBe(result.equityCurve[0]!.timestamp);
  });

  it("cleanly rejects 1week because no committed backtest fixture exists yet", async () => {
    await expect(loadBacktestMarket("1week")).rejects.toThrow("1week backtest data is not available yet.");
  });
});

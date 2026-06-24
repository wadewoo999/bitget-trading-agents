import { describe, expect, it } from "vitest";

import { analyzeIndicators } from "@/server/indicators/analyze-indicators";
import { loadMarketFixture } from "@/server/market-data/load-market-fixture";

describe("indicator aggregation", () => {
  it("returns complete indicators and 80 chart points", async () => {
    const fixture = await loadMarketFixture("BTCUSDT", "1h");
    const result = analyzeIndicators(fixture);
    expect(result.chart).toHaveLength(80);
    expect(result.latestClose).toBe(fixture.candles.at(-1)!.close);
    expect(result.indicators.ema80).toBeGreaterThan(0);
    expect(result.indicators.rsi14).toBeGreaterThanOrEqual(0);
    expect(result.indicators.rsi14).toBeLessThanOrEqual(100);
    expect(["normal", "high"]).toContain(result.volatilityRisk);
  });
});

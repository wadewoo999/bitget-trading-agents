import { describe, expect, it } from "vitest";

import { analyzeResponseSchema } from "@/features/market-analysis/model";
import { analyzeSampleMarket } from "@/server/analysis/analyze-sample-market";

describe("Sample market analysis", () => {
  it.each(["15m", "1h", "4h", "1d"] as const)("analyzes %s fixture", async (timeframe) => {
    const result = await analyzeSampleMarket({ symbol: "BTCUSDT", timeframe, stance: "unsure" });
    expect(analyzeResponseSchema.safeParse(result).success).toBe(true);
    expect(result.chart).toHaveLength(80);
    expect(result.snapshot.fixtureVersion).toContain(timeframe);
  });

  it("changes stance assessment without changing score", async () => {
    const unsure = await analyzeSampleMarket({ symbol: "BTCUSDT", timeframe: "1h", stance: "unsure" });
    const long = await analyzeSampleMarket({ symbol: "BTCUSDT", timeframe: "1h", stance: "long" });
    expect(long.decision.marketBiasScore).toBe(unsure.decision.marketBiasScore);
    expect(long.decision.stanceAssessment).not.toBe("neutral");
  });
});

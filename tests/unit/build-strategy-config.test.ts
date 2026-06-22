import { describe, expect, it } from "vitest";

import { buildStrategyConfig } from "@/server/strategy-lab/build-strategy-config";

describe("buildStrategyConfig", () => {
  it("returns 1 percent risk for aggressive 15m requests", () => {
    expect(buildStrategyConfig({ profile: "aggressive", timeframe: "15m" })).toMatchObject({
      profile: "aggressive",
      timeframe: "15m",
      riskPerTradePct: 1,
    });
  });

  it("returns the balanced 4h entry rules from the stage 2 plan", () => {
    expect(buildStrategyConfig({ profile: "balanced", timeframe: "4h" }).entryRules).toEqual([
      "Trend confirmation with EMA20/EMA50 alignment",
      "Momentum support from RSI14 and MACD histogram",
      "Participation confirmation from volume expansion",
    ]);
  });

  it("returns the conservative 1week exit rules", () => {
    expect(buildStrategyConfig({ profile: "conservative", timeframe: "1week" }).exitRules).toEqual([
      "Close the trade when higher-timeframe trend support breaks",
      "Close the trade when the setup loses directional confirmation",
    ]);
  });

  it("rejects invalid profile and timeframe pairs through request validation", () => {
    expect(() => buildStrategyConfig({ profile: "aggressive", timeframe: "4h" })).toThrow();
  });
});

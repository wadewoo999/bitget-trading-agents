import { describe, expect, it } from "vitest";

import { createDecision } from "@/server/decision/create-decision";

const bullish = { ema20: 105, ema50: 104, ema100: 103, ema200: 102, rsi14: 60, macd: 2, macdSignal: 1, macdHistogram: 1, atr14: 2, volumeChangePct: 10, priceReturn20Pct: 5, fundingRate: 0, openInterest: 1000 };

describe("deterministic decision", () => {
  it("creates LONG and supported stance", () => {
    const result = createDecision({ stance: "long", latestClose: 106, indicators: bullish, volatilityRisk: "normal" });
    expect(result.action).toBe("LONG");
    expect(result.marketBiasScore).toBe(93);
    expect(result.stanceAssessment).toBe("supported");
  });

  it("creates SHORT and opposed stance", () => {
    const indicators = { ...bullish, ema20: 101, ema50: 102, ema100: 103, ema200: 104, rsi14: 40, macdHistogram: -1, priceReturn20Pct: -5 };
    const result = createDecision({ stance: "long", latestClose: 100, indicators, volatilityRisk: "normal" });
    expect(result.action).toBe("SHORT");
    expect(result.stanceAssessment).toBe("opposed");
  });

  it("creates WAIT for conflicting signals and neutral for unsure", () => {
    const result = createDecision({ stance: "unsure", latestClose: 104, indicators: { ...bullish, macdHistogram: -1, rsi14: 40 }, volatilityRisk: "high" });
    expect(result.action).toBe("WAIT");
    expect(result.stanceAssessment).toBe("neutral");
    expect(result.riskWarnings.length).toBeGreaterThan(0);
  });
});

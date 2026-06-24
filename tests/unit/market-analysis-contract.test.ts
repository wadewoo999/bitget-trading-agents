import { describe, expect, it } from "vitest";

import {
  analyzeRequestSchema,
  analyzeResponseSchema,
  apiErrorSchema,
  priceResponseSchema,
  timeframeSchema,
} from "@/features/market-analysis/model";

const decision = {
  action: "LONG",
  confidence: 75,
  marketBiasScore: 75,
  stanceAssessment: "supported",
  categorySignals: { trend: 1, momentum: 1, participation: 1, crowding: 0 },
  volatilityRisk: "normal",
  summary: "Trend, momentum, and participation align.",
  reasons: ["EMA structure is bullish."],
  riskWarnings: [],
  invalidationCondition: "Close below EMA20.",
  mode: "deterministic",
} as const;

const snapshot = {
  symbol: "BTCUSDT",
  timeframe: "1h",
  mode: "live",
  fetchedAt: "2026-06-20T00:00:00.000Z",
  sourceRequestTime: "2026-06-20T00:00:00.000Z",
  lastClosedCandleAt: "2026-06-19T23:00:00.000Z",
  latestPrice: 100000,
  fixtureVersion: null,
  indicators: {
    ema20: 101000,
    ema50: 100000,
    ema80: 99000,
    rsi14: 58,
    macd: 400,
    macdSignal: 300,
    macdHistogram: 100,
    atr14: 1200,
    volumeChangePct: 15,
    priceReturn20Pct: 4,
    fundingRate: 0.00005,
    openInterest: 1200000000,
  },
} as const;

const sources = [
  {
    name: "repository fixture",
    requestedAt: "2026-06-20T00:00:00.000Z",
    url: "https://github.com/wadewoo999/bitget-trading-agents",
  },
];

const chart = Array.from({ length: 80 }, (_, index) => ({
  timestamp: new Date(Date.UTC(2026, 5, 16, index)).toISOString(),
  close: 100000 + index,
  ema20: 99900 + index,
  ema50: 99800 + index,
  ema80: 99700 + index,
}));

describe("market analysis contracts", () => {
  it.each(["15m", "1h", "4h", "1d"])("accepts timeframe %s", (timeframe) => {
    expect(timeframeSchema.safeParse(timeframe).success).toBe(true);
  });

  it("requires stance and data mode in analysis requests", () => {
    expect(
      analyzeRequestSchema.safeParse({
        symbol: "BTCUSDT",
        timeframe: "1h",
        stance: "long",
        mode: "live",
      }).success,
    ).toBe(true);
    expect(analyzeRequestSchema.safeParse({ symbol: "BTCUSDT", timeframe: "1h" }).success).toBe(
      false,
    );
  });

  it("accepts a complete analysis response", () => {
    expect(
      analyzeResponseSchema.safeParse({
        snapshot,
        decision,
        dataComplete: true,
        completenessWarnings: [],
        sources,
        chart,
      }).success,
    ).toBe(true);
  });

  it("rejects the retired historical OI change field", () => {
    expect(
      analyzeResponseSchema.safeParse({
        snapshot: {
          ...snapshot,
          indicators: { ...snapshot.indicators, openInterestChangePct: 3 },
        },
        decision,
        dataComplete: true,
        completenessWarnings: [],
        sources,
        chart,
      }).success,
    ).toBe(false);
  });

  it("requires exactly 80 chart points", () => {
    const response = {
      snapshot,
      decision,
      dataComplete: true,
      completenessWarnings: [],
      sources,
    };
    expect(analyzeResponseSchema.safeParse(response).success).toBe(false);
    expect(analyzeResponseSchema.safeParse({ ...response, chart: chart.slice(1) }).success).toBe(
      false,
    );
    expect(analyzeResponseSchema.safeParse({ ...response, chart }).success).toBe(true);
  });

  it("defines price and stable API error envelopes", () => {
    expect(
      priceResponseSchema.safeParse({
        symbol: "BTCUSDT",
        mode: "live",
        price: 100000,
        fetchedAt: "2026-06-20T00:00:00.000Z",
        fixtureVersion: null,
      }).success,
    ).toBe(true);
    expect(
      apiErrorSchema.safeParse({
        error: {
          code: "INSUFFICIENT_CANDLES",
          message: "At least 250 candles are required.",
        },
      }).success,
    ).toBe(true);
  });
});

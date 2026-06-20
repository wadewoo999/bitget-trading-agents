import { z } from "zod";

import { decisionSchema } from "@/features/decision/model";

export const timeframeSchema = z.enum(["15m", "1h", "4h", "1d"]);
export const userStanceSchema = z.enum(["unsure", "long", "short"]);
export const marketDataModeSchema = z.enum(["live", "sample"]);

export const marketIndicatorsSchema = z
  .object({
    ema20: z.number(),
    ema50: z.number(),
    ema100: z.number(),
    ema200: z.number(),
    rsi14: z.number().min(0).max(100),
    macd: z.number(),
    macdSignal: z.number(),
    macdHistogram: z.number(),
    atr14: z.number().nonnegative(),
    volumeChangePct: z.number(),
    priceReturn20Pct: z.number(),
    fundingRate: z.number().nullable(),
    openInterest: z.number().nonnegative().nullable(),
  })
  .strict();

export const marketSnapshotSchema = z
  .object({
    symbol: z.literal("BTCUSDT"),
    timeframe: timeframeSchema,
    mode: marketDataModeSchema,
    fetchedAt: z.string().datetime(),
    sourceRequestTime: z.string().datetime(),
    lastClosedCandleAt: z.string().datetime(),
    latestPrice: z.number().positive(),
    fixtureVersion: z.string().min(1).nullable(),
    indicators: marketIndicatorsSchema,
  })
  .superRefine(({ fixtureVersion, mode }, context) => {
    if (mode === "sample" && fixtureVersion === null) {
      context.addIssue({
        code: "custom",
        path: ["fixtureVersion"],
        message: "Sample data requires a fixture version",
      });
    }
    if (mode === "live" && fixtureVersion !== null) {
      context.addIssue({
        code: "custom",
        path: ["fixtureVersion"],
        message: "Live data cannot declare a fixture version",
      });
    }
  });

export const marketSourceSchema = z.object({
  name: z.string().min(1),
  requestedAt: z.string().datetime(),
  url: z.string().url(),
});

export const chartPointSchema = z.object({
  timestamp: z.string().datetime(),
  close: z.number().positive(),
  ema20: z.number().positive(),
  ema50: z.number().positive(),
  ema100: z.number().positive(),
  ema200: z.number().positive(),
});

export const analyzeRequestSchema = z.object({
  symbol: z.literal("BTCUSDT"),
  timeframe: timeframeSchema,
  stance: userStanceSchema,
  mode: marketDataModeSchema,
});

export const analyzeResponseSchema = z.object({
  snapshot: marketSnapshotSchema,
  decision: decisionSchema,
  dataComplete: z.boolean(),
  completenessWarnings: z.array(z.string().min(1)),
  sources: z.array(marketSourceSchema).min(1),
  chart: z.array(chartPointSchema).length(80),
});

export const priceQuerySchema = z.object({ mode: marketDataModeSchema });

export const priceResponseSchema = z
  .object({
    symbol: z.literal("BTCUSDT"),
    mode: marketDataModeSchema,
    price: z.number().positive(),
    fetchedAt: z.string().datetime(),
    fixtureVersion: z.string().min(1).nullable(),
  })
  .superRefine(({ fixtureVersion, mode }, context) => {
    if (mode === "sample" && fixtureVersion === null) {
      context.addIssue({
        code: "custom",
        path: ["fixtureVersion"],
        message: "Sample prices require a fixture version",
      });
    }
    if (mode === "live" && fixtureVersion !== null) {
      context.addIssue({
        code: "custom",
        path: ["fixtureVersion"],
        message: "Live prices cannot declare a fixture version",
      });
    }
  });

export const apiErrorCodeSchema = z.enum([
  "INVALID_INPUT",
  "MARKET_DATA_UNAVAILABLE",
  "INSUFFICIENT_CANDLES",
  "UPSTREAM_TIMEOUT",
  "INTERNAL_ERROR",
]);

export const apiErrorSchema = z.object({
  error: z.object({ code: apiErrorCodeSchema, message: z.string().min(1) }),
});

export type Timeframe = z.infer<typeof timeframeSchema>;
export type UserStance = z.infer<typeof userStanceSchema>;
export type MarketDataMode = z.infer<typeof marketDataModeSchema>;
export type MarketIndicators = z.infer<typeof marketIndicatorsSchema>;
export type MarketSnapshot = z.infer<typeof marketSnapshotSchema>;
export type MarketSource = z.infer<typeof marketSourceSchema>;
export type ChartPoint = z.infer<typeof chartPointSchema>;
export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;
export type AnalyzeResponse = z.infer<typeof analyzeResponseSchema>;
export type PriceQuery = z.infer<typeof priceQuerySchema>;
export type PriceResponse = z.infer<typeof priceResponseSchema>;
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;

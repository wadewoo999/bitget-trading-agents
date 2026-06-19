import { z } from "zod";

import { decisionSchema } from "@/features/decision/model";

export const timeframeSchema = z.enum(["15m", "1h", "4h", "1d"]);

export const marketIndicatorsSchema = z.object({
  ema20: z.number(),
  ema50: z.number(),
  ema100: z.number(),
  ema200: z.number(),
  rsi14: z.number().min(0).max(100),
  macd: z.number(),
  atr14: z.number().nonnegative(),
  volumeChangePct: z.number(),
  fundingRate: z.number().nullable(),
  openInterest: z.number().nonnegative().nullable(),
  openInterestChangePct: z.number().nullable(),
});

export const marketSnapshotSchema = z.object({
  symbol: z.literal("BTCUSDT"),
  timeframe: timeframeSchema,
  fetchedAt: z.string().datetime(),
  sourceRequestTime: z.string().datetime(),
  lastClosedCandleAt: z.string().datetime(),
  indicators: marketIndicatorsSchema,
});

export const analyzeRequestSchema = z.object({
  symbol: z.literal("BTCUSDT"),
  timeframe: timeframeSchema,
});

export const analyzeResponseSchema = z.object({
  snapshot: marketSnapshotSchema,
  decision: decisionSchema,
  dataComplete: z.boolean(),
  sources: z.array(
    z.object({
      name: z.string().min(1),
      requestedAt: z.string().datetime(),
    }),
  ),
  model: z.string().min(1),
});

export type Timeframe = z.infer<typeof timeframeSchema>;
export type MarketIndicators = z.infer<typeof marketIndicatorsSchema>;
export type MarketSnapshot = z.infer<typeof marketSnapshotSchema>;
export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;
export type AnalyzeResponse = z.infer<typeof analyzeResponseSchema>;

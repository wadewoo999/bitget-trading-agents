import { z } from "zod";

import { symbolSchema, timeframeSchema } from "@/features/market-analysis/model";

export const marketCandleSchema = z.object({
  openTime: z.string().datetime(),
  closeTime: z.string().datetime(),
  open: z.number().positive(),
  high: z.number().positive(),
  low: z.number().positive(),
  close: z.number().positive(),
  volume: z.number().nonnegative(),
});

export const marketFixtureSchema = z
  .object({
    version: z.string().min(1),
    symbol: symbolSchema,
    timeframe: timeframeSchema,
    capturedAt: z.string().datetime(),
    tickerPrice: z.number().positive(),
    fundingRate: z.number().finite(),
    openInterest: z.number().finite().nonnegative(),
    sources: z.array(z.object({ name: z.string().min(1), url: z.string().url(), requestedAt: z.string().datetime() })).min(1),
    candles: z.array(marketCandleSchema).min(250),
  })
  .superRefine(({ candles, capturedAt }, context) => {
    const captured = Date.parse(capturedAt);
    const seen = new Set<string>();
    candles.forEach((candle, index) => {
      const invalidOhlc = candle.high < Math.max(candle.open, candle.close, candle.low) || candle.low > Math.min(candle.open, candle.close, candle.high);
      if (invalidOhlc) context.addIssue({ code: "custom", path: ["candles", index], message: "Invalid OHLC range" });
      if (seen.has(candle.openTime)) context.addIssue({ code: "custom", path: ["candles", index, "openTime"], message: "Duplicate candle" });
      seen.add(candle.openTime);
      if (index > 0 && Date.parse(candle.openTime) <= Date.parse(candles[index - 1]!.openTime)) context.addIssue({ code: "custom", path: ["candles", index, "openTime"], message: "Candles must be chronological" });
      if (Date.parse(candle.closeTime) > captured) context.addIssue({ code: "custom", path: ["candles", index, "closeTime"], message: "Candle is not closed" });
    });
  });

export type MarketCandle = z.infer<typeof marketCandleSchema>;
export type MarketFixture = z.infer<typeof marketFixtureSchema>;

export function validateMarketFixture(value: unknown): MarketFixture {
  return marketFixtureSchema.parse(value);
}

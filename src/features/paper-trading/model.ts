import { z } from "zod";

import { timeframeSchema } from "@/features/market-analysis/model";

export const paperPositionSchema = z.object({
  id: z.string().min(1),
  symbol: z.literal("BTCUSDT"),
  timeframe: timeframeSchema,
  side: z.enum(["LONG", "SHORT"]),
  entryPrice: z.number().positive(),
  quantity: z.number().positive(),
  stopLoss: z.number().positive(),
  takeProfit: z.number().positive(),
  openedAt: z.string().datetime(),
});

export const paperTradeRecordSchema = z.object({
  timestamp: z.string().datetime(),
  symbol: z.literal("BTCUSDT"),
  timeframe: timeframeSchema,
  event: z.enum(["OPEN", "CLOSE"]),
  side: z.enum(["LONG", "SHORT"]),
  price: z.number().positive(),
  quantity: z.number().positive(),
  stopLoss: z.number().positive(),
  takeProfit: z.number().positive(),
  fee: z.number().nonnegative(),
  pnl: z.number(),
  balanceBefore: z.number().nonnegative(),
  balanceAfter: z.number().nonnegative(),
  decisionSummary: z.string().min(1),
});

export type PaperPosition = z.infer<typeof paperPositionSchema>;
export type PaperTradeRecord = z.infer<typeof paperTradeRecordSchema>;

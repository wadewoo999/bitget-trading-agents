import { z } from "zod";

import {
  marketDataModeSchema,
  symbolSchema,
  timeframeSchema,
} from "@/features/market-analysis/model";

export const INITIAL_PAPER_BALANCE = 10_000;
export const PAPER_STORAGE_KEY = "bitget-trading-agents:paper-account:v1";

export const paperPositionSchema = z.object({
  id: z.string().min(1),
  symbol: symbolSchema,
  timeframe: timeframeSchema,
  mode: marketDataModeSchema,
  side: z.enum(["LONG", "SHORT"]),
  entryPrice: z.number().positive(),
  quantity: z.number().positive(),
  stopLoss: z.number().positive(),
  takeProfit: z.number().positive(),
  openedAt: z.string().datetime(),
  decisionSummary: z.string().min(1),
});

export const paperTradeRecordSchema = z.object({
  id: z.string().min(1),
  positionId: z.string().min(1),
  timestamp: z.string().datetime(),
  symbol: symbolSchema,
  timeframe: timeframeSchema,
  mode: marketDataModeSchema,
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

export const paperAccountSchema = z.object({
  version: z.literal(1),
  balance: z.number().nonnegative(),
  openPosition: paperPositionSchema.nullable(),
  ledger: z.array(paperTradeRecordSchema),
});

export type PaperPosition = z.infer<typeof paperPositionSchema>;
export type PaperTradeRecord = z.infer<typeof paperTradeRecordSchema>;
export type PaperAccount = z.infer<typeof paperAccountSchema>;

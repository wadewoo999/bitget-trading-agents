import { z } from "zod";

import { symbolSchema } from "@/features/market-analysis/model";

export const strategyProfileSchema = z.enum(["aggressive", "balanced", "conservative"]);
export const strategyTimeframeSchema = z.enum(["15m", "1h", "4h", "1d", "1week"]);

const allowedTimeframes = {
  aggressive: ["15m", "1h"],
  balanced: ["4h", "1d"],
  conservative: ["1d", "1week"],
} as const;

export const strategyRequestSchema = z
  .object({
    profile: strategyProfileSchema,
    timeframe: strategyTimeframeSchema,
    symbol: symbolSchema,
    idea: z.string().trim().max(500).optional(),
  })
  .superRefine(({ profile, timeframe }, context) => {
    const profileTimeframes: readonly string[] = allowedTimeframes[profile];
    if (!profileTimeframes.includes(timeframe)) {
      context.addIssue({
        code: "custom",
        path: ["timeframe"],
        message: `${timeframe} is not available for the ${profile} profile`,
      });
    }
  });

export const strategyConfigSchema = z
  .object({
    profile: strategyProfileSchema,
    timeframe: strategyTimeframeSchema,
    entryRules: z.array(z.string().min(1)).min(1),
    exitRules: z.array(z.string().min(1)).min(1),
    riskPerTradePct: z.number().positive().max(1),
  })
  .superRefine(({ profile, timeframe }, context) => {
    const profileTimeframes: readonly string[] = allowedTimeframes[profile];
    if (!profileTimeframes.includes(timeframe)) {
      context.addIssue({
        code: "custom",
        path: ["timeframe"],
        message: `${timeframe} is not available for the ${profile} profile`,
      });
    }
  });

export const backtestResultSchema = z.object({
  strategy: strategyConfigSchema,
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  totalReturnPct: z.number(),
  maxDrawdownPct: z.number().nonnegative(),
  sharpeRatio: z.number(),
  winRate: z.number().min(0).max(1),
  tradeCount: z.number().int().nonnegative(),
  feeRate: z.number().nonnegative(),
  slippageRate: z.number().nonnegative(),
  equityCurve: z.array(z.object({ timestamp: z.string().datetime(), equity: z.number() })),
  trades: z.array(
    z.object({
      id: z.string().min(1),
      side: z.enum(["LONG", "SHORT"]),
      entryAt: z.string().datetime(),
      exitAt: z.string().datetime(),
      entryPrice: z.number().positive(),
      exitPrice: z.number().positive(),
      quantity: z.number().positive(),
      pnl: z.number(),
      fee: z.number().nonnegative(),
    }),
  ),
});

export type StrategyProfile = z.infer<typeof strategyProfileSchema>;
export type StrategyTimeframe = z.infer<typeof strategyTimeframeSchema>;
export type StrategyRequest = z.infer<typeof strategyRequestSchema>;
export type StrategyConfig = z.infer<typeof strategyConfigSchema>;
export type BacktestResult = z.infer<typeof backtestResultSchema>;

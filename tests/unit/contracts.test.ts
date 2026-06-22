import { describe, expect, it } from "vitest";

import { playbookEvidenceSchema } from "@/features/playbook-evidence/model";
import { backtestResultSchema, strategyRequestSchema } from "@/features/strategy-lab/model";

describe("Strategy Lab contract", () => {
  it.each([
    ["aggressive", "15m"],
    ["aggressive", "1h"],
    ["balanced", "4h"],
    ["balanced", "1d"],
    ["conservative", "1d"],
    ["conservative", "1week"],
  ])("accepts %s profile with %s", (profile, timeframe) => {
    expect(strategyRequestSchema.safeParse({ profile, timeframe }).success).toBe(true);
  });

  it("rejects aggressive profile with 4h timeframe", () => {
    const result = strategyRequestSchema.safeParse({ profile: "aggressive", timeframe: "4h" });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["timeframe"]);
  });

  it("accepts balanced profile with 4h timeframe and idea", () => {
    expect(
      strategyRequestSchema.parse({
        profile: "balanced",
        timeframe: "4h",
        idea: "只在 EMA 結構與 RSI 支持時進場",
      }),
    ).toMatchObject({ profile: "balanced", timeframe: "4h" });
  });

  it("accepts backtest result trades", () => {
    expect(
      backtestResultSchema.parse({
        strategy: {
          profile: "balanced",
          timeframe: "4h",
          entryRules: ["close > ema20"],
          exitRules: ["close < ema20"],
          riskPerTradePct: 1,
        },
        periodStart: "2026-01-01T00:00:00.000Z",
        periodEnd: "2026-02-01T00:00:00.000Z",
        totalReturnPct: 12.5,
        maxDrawdownPct: 4.2,
        sharpeRatio: 1.1,
        winRate: 0.54,
        tradeCount: 18,
        feeRate: 0.0006,
        slippageRate: 0.0002,
        equityCurve: [{ timestamp: "2026-01-02T00:00:00.000Z", equity: 10020 }],
        trades: [
          {
            id: "trade-1",
            side: "LONG",
            entryAt: "2026-01-02T00:00:00.000Z",
            exitAt: "2026-01-03T00:00:00.000Z",
            entryPrice: 100,
            exitPrice: 105,
            quantity: 1,
            pnl: 4.69,
            fee: 0.11,
          },
        ],
      }),
    ).toMatchObject({
      trades: [
        {
          id: "trade-1",
          side: "LONG",
          entryAt: "2026-01-02T00:00:00.000Z",
          exitAt: "2026-01-03T00:00:00.000Z",
          entryPrice: 100,
          exitPrice: 105,
          quantity: 1,
          pnl: 4.69,
          fee: 0.11,
        },
      ],
    });
  });

  it("rejects backtest results with invalid strategy profile and timeframe pairs", () => {
    const result = backtestResultSchema.safeParse({
      strategy: {
        profile: "aggressive",
        timeframe: "4h",
        entryRules: ["close > ema20"],
        exitRules: ["close < ema20"],
        riskPerTradePct: 1,
      },
      periodStart: "2026-01-01T00:00:00.000Z",
      periodEnd: "2026-02-01T00:00:00.000Z",
      totalReturnPct: 12.5,
      maxDrawdownPct: 4.2,
      sharpeRatio: 1.1,
      winRate: 0.54,
      tradeCount: 18,
      feeRate: 0.0006,
      slippageRate: 0.0002,
      equityCurve: [{ timestamp: "2026-01-02T00:00:00.000Z", equity: 10020 }],
      trades: [
        {
          id: "trade-1",
          side: "LONG",
          entryAt: "2026-01-02T00:00:00.000Z",
          exitAt: "2026-01-03T00:00:00.000Z",
          entryPrice: 100,
          exitPrice: 105,
          quantity: 1,
          pnl: 4.69,
          fee: 0.11,
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["strategy", "timeframe"]);
  });
});

describe("Playbook evidence contract", () => {
  it("requires a public URL and completed sandbox status", () => {
    expect(
      playbookEvidenceSchema.safeParse({
        playbookUrl: "https://example.com/playbook/btc-adaptive",
        status: "completed",
        verifiedAt: "2026-06-20T00:00:00.000Z",
        metrics: {
          totalReturnPct: 12.5,
          maxDrawdownPct: 6.2,
          sharpeRatio: 1.4,
          winRate: 0.55,
          tradeCount: 24,
        },
      }).success,
    ).toBe(true);
  });
});

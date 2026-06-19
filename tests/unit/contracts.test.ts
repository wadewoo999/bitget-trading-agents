import { describe, expect, it } from "vitest";

import { decisionSchema } from "@/features/decision/model";
import {
  analyzeRequestSchema,
  marketSnapshotSchema,
  timeframeSchema,
} from "@/features/market-analysis/model";
import { paperTradeRecordSchema } from "@/features/paper-trading/model";
import { playbookEvidenceSchema } from "@/features/playbook-evidence/model";
import { strategyRequestSchema } from "@/features/strategy-lab/model";

describe("market-analysis contracts", () => {
  it.each(["15m", "1h", "4h", "1d"])("accepts analysis timeframe %s", (timeframe) => {
    expect(timeframeSchema.parse(timeframe)).toBe(timeframe);
  });

  it("rejects Strategy Lab-only timeframes for live analysis", () => {
    expect(timeframeSchema.safeParse("1week").success).toBe(false);
    expect(analyzeRequestSchema.safeParse({ symbol: "ETHUSDT", timeframe: "1h" }).success).toBe(
      false,
    );
  });

  it("accepts a complete BTC market snapshot", () => {
    const result = marketSnapshotSchema.safeParse({
      symbol: "BTCUSDT",
      timeframe: "4h",
      fetchedAt: "2026-06-20T00:00:00.000Z",
      sourceRequestTime: "2026-06-20T00:00:00.000Z",
      lastClosedCandleAt: "2026-06-19T20:00:00.000Z",
      indicators: {
        ema20: 102,
        ema50: 101,
        ema100: 100,
        ema200: 99,
        rsi14: 55,
        macd: 1.5,
        atr14: 2.1,
        volumeChangePct: 8,
        fundingRate: 0.0001,
        openInterest: 120000,
        openInterestChangePct: 3.2,
      },
    });

    expect(result.success).toBe(true);
  });
});

describe("decision contract", () => {
  it("accepts the approved AI decision shape and rejects unknown actions", () => {
    const validDecision = {
      action: "WAIT",
      confidence: 59,
      summary: "Signals conflict.",
      reasons: ["Momentum weakened."],
      riskWarnings: ["Funding is elevated."],
      invalidationCondition: "Reassess after the next 4h close.",
      mode: "ai",
    };

    expect(decisionSchema.safeParse(validDecision).success).toBe(true);
    expect(decisionSchema.safeParse({ ...validDecision, action: "BUY" }).success).toBe(false);
  });
});

describe("paper-trading contract", () => {
  it("accepts auditable OPEN and CLOSE ledger records", () => {
    const record = {
      timestamp: "2026-06-20T00:00:00.000Z",
      symbol: "BTCUSDT",
      timeframe: "1h",
      event: "OPEN",
      side: "LONG",
      price: 100000,
      quantity: 0.001,
      stopLoss: 99000,
      takeProfit: 102000,
      fee: 0.06,
      pnl: 0,
      balanceBefore: 10000,
      balanceAfter: 9999.94,
      decisionSummary: "Trend and momentum align.",
    };

    expect(paperTradeRecordSchema.safeParse(record).success).toBe(true);
    expect(paperTradeRecordSchema.safeParse({ ...record, event: "UPDATE" }).success).toBe(false);
  });
});

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

  it("rejects a timeframe outside the selected profile", () => {
    expect(
      strategyRequestSchema.safeParse({ profile: "aggressive", timeframe: "4h" }).success,
    ).toBe(false);
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

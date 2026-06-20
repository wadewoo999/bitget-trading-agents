import { describe, expect, it } from "vitest";

import { paperTradeRecordSchema } from "@/features/paper-trading/model";
import { playbookEvidenceSchema } from "@/features/playbook-evidence/model";
import { strategyRequestSchema } from "@/features/strategy-lab/model";

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

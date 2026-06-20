import { describe, expect, it } from "vitest";

import {
  INITIAL_PAPER_BALANCE,
  PAPER_STORAGE_KEY,
  paperAccountSchema,
  paperPositionSchema,
  paperTradeRecordSchema,
} from "@/features/paper-trading/model";

const position = {
  id: "position-1",
  symbol: "BTCUSDT",
  timeframe: "1h",
  mode: "sample",
  side: "LONG",
  entryPrice: 100000,
  quantity: 0.001,
  stopLoss: 98200,
  takeProfit: 103600,
  openedAt: "2026-06-20T00:00:00.000Z",
  decisionSummary: "Trend, momentum, and participation align.",
} as const;

const record = {
  id: "record-1",
  positionId: "position-1",
  timestamp: "2026-06-20T00:00:00.000Z",
  symbol: "BTCUSDT",
  timeframe: "1h",
  mode: "sample",
  event: "OPEN",
  side: "LONG",
  price: 100000,
  quantity: 0.001,
  stopLoss: 98200,
  takeProfit: 103600,
  fee: 0.06,
  pnl: 0,
  balanceBefore: 10000,
  balanceAfter: 9999.94,
  decisionSummary: "Trend, momentum, and participation align.",
} as const;

describe("paper trading contracts", () => {
  it("requires data mode on positions and ledger records", () => {
    expect(paperPositionSchema.safeParse(position).success).toBe(true);
    expect(paperTradeRecordSchema.safeParse(record).success).toBe(true);
    const { mode: _mode, ...recordWithoutMode } = record;
    void _mode;
    expect(paperTradeRecordSchema.safeParse(recordWithoutMode).success).toBe(false);
  });

  it("exports stable initial account constants", () => {
    expect(INITIAL_PAPER_BALANCE).toBe(10000);
    expect(PAPER_STORAGE_KEY).toBe("bitget-trading-agents:paper-account:v1");
  });

  it("accepts one versioned account with at most one open position", () => {
    expect(
      paperAccountSchema.safeParse({
        version: 1,
        balance: 9999.94,
        openPosition: position,
        ledger: [record],
      }).success,
    ).toBe(true);
    expect(
      paperAccountSchema.safeParse({
        version: 2,
        balance: INITIAL_PAPER_BALANCE,
        openPosition: null,
        ledger: [],
      }).success,
    ).toBe(false);
  });
});

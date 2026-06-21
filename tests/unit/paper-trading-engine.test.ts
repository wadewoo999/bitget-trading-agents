import { describe, expect, it } from "vitest";

import { createInitialPaperAccount } from "@/features/paper-trading/engine";
import {
  closeOpenPosition,
  confirmTradePreview,
  createTradePreview,
  exportLedgerCsv,
  exportLedgerJson,
  loadPaperAccount,
} from "@/features/paper-trading/engine";
import type { AnalyzeResponse } from "@/features/market-analysis/model";

const analysis: AnalyzeResponse = {
  snapshot: {
    symbol: "BTCUSDT",
    timeframe: "1h",
    mode: "live",
    fetchedAt: "2026-06-21T00:00:00.000Z",
    sourceRequestTime: "2026-06-21T00:00:00.000Z",
    lastClosedCandleAt: "2026-06-20T23:59:59.999Z",
    latestPrice: 100000,
    fixtureVersion: null,
    indicators: {
      ema20: 101000,
      ema50: 100500,
      ema100: 99900,
      ema200: 99000,
      rsi14: 58,
      macd: 40,
      macdSignal: 20,
      macdHistogram: 20,
      atr14: 1200,
      volumeChangePct: 15,
      priceReturn20Pct: 4,
      fundingRate: 0.00005,
      openInterest: 123456,
    },
  },
  decision: {
    action: "LONG",
    confidence: 75,
    marketBiasScore: 75,
    stanceAssessment: "supported",
    categorySignals: { trend: 1, momentum: 1, participation: 1, crowding: 0 },
    volatilityRisk: "normal",
    summary: "市場結構綜合偏多。",
    reasons: ["趨勢偏多。"],
    riskWarnings: [],
    invalidationCondition: "跌破 EMA20",
    mode: "deterministic",
  },
  dataComplete: true,
  completenessWarnings: [],
  sources: [{ name: "Bitget", url: "https://api.bitget.com", requestedAt: "2026-06-21T00:00:00.000Z" }],
  chart: Array.from({ length: 80 }, (_, index) => ({
    timestamp: new Date(Date.UTC(2026, 0, 1, index)).toISOString(),
    close: 100000 + index,
    ema20: 99900 + index,
    ema50: 99800 + index,
    ema100: 99700 + index,
    ema200: 99600 + index,
  })),
};

describe("paper trading engine", () => {
  it("builds a LONG preview using 1 percent risk and fee-aware sizing", () => {
    const preview = createTradePreview({
      account: createInitialPaperAccount(),
      analysis,
      entryPrice: 100000,
      fetchedAt: "2026-06-21T01:00:00.000Z",
    });

    expect(preview.side).toBe("LONG");
    expect(preview.stopLoss).toBe(98200);
    expect(preview.takeProfit).toBe(103600);
    expect(preview.quantity).toBeGreaterThan(0);
    expect(preview.quantity * preview.entryPrice).toBeLessThanOrEqual(10000);
  });

  it("confirms and closes a position while updating balance and ledger", () => {
    const preview = createTradePreview({
      account: createInitialPaperAccount(),
      analysis,
      entryPrice: 100000,
      fetchedAt: "2026-06-21T01:00:00.000Z",
    });
    const opened = confirmTradePreview({
      account: createInitialPaperAccount(),
      preview,
      openedAt: "2026-06-21T01:00:00.000Z",
    });

    expect(opened.openPosition?.side).toBe("LONG");
    expect(opened.ledger).toHaveLength(1);
    expect(opened.balance).toBeLessThan(10000);

    const closed = closeOpenPosition({
      account: opened,
      exitPrice: 101500,
      closedAt: "2026-06-21T02:00:00.000Z",
    });

    expect(closed.openPosition).toBeNull();
    expect(closed.ledger).toHaveLength(2);
    expect(closed.ledger[1]?.event).toBe("CLOSE");
    expect(closed.balance).toBeGreaterThan(opened.balance);
  });

  it("resets corrupt stored state and reports it", () => {
    const storage = {
      getItem: () => "{bad json",
      setItem: () => undefined,
      removeItem: () => undefined,
    } as Pick<Storage, "getItem" | "setItem" | "removeItem">;

    const result = loadPaperAccount(storage);
    expect(result.didReset).toBe(true);
    expect(result.account.openPosition).toBeNull();
    expect(result.account.balance).toBe(10000);
  });

  it("exports stable JSON and CSV ledger content", () => {
    const preview = createTradePreview({
      account: createInitialPaperAccount(),
      analysis,
      entryPrice: 100000,
      fetchedAt: "2026-06-21T01:00:00.000Z",
    });
    const opened = confirmTradePreview({
      account: createInitialPaperAccount(),
      preview,
      openedAt: "2026-06-21T01:00:00.000Z",
    });
    const json = exportLedgerJson(opened);
    const csv = exportLedgerCsv(opened);

    expect(json).toContain("\"event\": \"OPEN\"");
    expect(csv).toContain("timestamp,symbol,timeframe,mode,event,side,price,quantity,stopLoss,takeProfit,fee,pnl,balanceBefore,balanceAfter,decisionSummary");
    expect(csv).toContain("OPEN");
  });
});

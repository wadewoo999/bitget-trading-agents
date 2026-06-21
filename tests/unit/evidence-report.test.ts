import { describe, expect, it } from "vitest";

import type { AnalyzeResponse } from "@/features/market-analysis/model";
import { buildEvidenceReportSnapshot } from "@/features/evidence-report/model";
import type { PaperAccount } from "@/features/paper-trading/model";

const liveAnalysis: AnalyzeResponse = {
  snapshot: {
    symbol: "BTCUSDT",
    timeframe: "1h",
    mode: "live",
    fetchedAt: "2026-06-21T00:00:00.000Z",
    sourceRequestTime: "2026-06-21T00:00:00.000Z",
    lastClosedCandleAt: "2026-06-20T23:00:00.000Z",
    latestPrice: 100000,
    fixtureVersion: null,
    indicators: {
      ema20: 101000,
      ema50: 100500,
      ema100: 100000,
      ema200: 99000,
      rsi14: 58,
      macd: 25,
      macdSignal: 15,
      macdHistogram: 10,
      atr14: 1200,
      volumeChangePct: 12,
      priceReturn20Pct: 4,
      fundingRate: 0.0001,
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
    riskWarnings: ["波動偏高。"],
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

function createAccount(): PaperAccount {
  return {
    version: 1,
    balance: 10042,
    openPosition: null,
    ledger: [
      {
        id: "live-open",
        positionId: "position-live",
        timestamp: "2026-06-21T01:00:00.000Z",
        symbol: "BTCUSDT",
        timeframe: "1h",
        mode: "live",
        event: "OPEN",
        side: "LONG",
        price: 100,
        quantity: 1,
        stopLoss: 98,
        takeProfit: 104,
        fee: 0.06,
        pnl: 0,
        balanceBefore: 10000,
        balanceAfter: 9999.94,
        decisionSummary: "市場結構綜合偏多。",
      },
      {
        id: "sample-open",
        positionId: "position-sample",
        timestamp: "2026-06-21T01:30:00.000Z",
        symbol: "BTCUSDT",
        timeframe: "4h",
        mode: "sample",
        event: "OPEN",
        side: "LONG",
        price: 200,
        quantity: 1,
        stopLoss: 190,
        takeProfit: 220,
        fee: 0.12,
        pnl: 0,
        balanceBefore: 9999.94,
        balanceAfter: 9999.82,
        decisionSummary: "樣本資料交易。",
      },
      {
        id: "live-close",
        positionId: "position-live",
        timestamp: "2026-06-21T02:00:00.000Z",
        symbol: "BTCUSDT",
        timeframe: "1h",
        mode: "live",
        event: "CLOSE",
        side: "LONG",
        price: 103,
        quantity: 1,
        stopLoss: 98,
        takeProfit: 104,
        fee: 0.0618,
        pnl: 3,
        balanceBefore: 9999.94,
        balanceAfter: 10002.8782,
        decisionSummary: "市場結構綜合偏多。",
      },
    ],
  };
}

describe("evidence report snapshot", () => {
  it("marks live matching records as submission ready", () => {
    const snapshot = buildEvidenceReportSnapshot({
      analysis: liveAnalysis,
      account: createAccount(),
      stance: "long",
      generatedAt: "2026-06-21T03:00:00.000Z",
    });

    expect(snapshot.summary.verificationStatus).toBe("live-paper-evidence");
    expect(snapshot.submissionNotes.isSubmissionReady).toBe(true);
    expect(snapshot.ledger).toHaveLength(2);
    expect(snapshot.summary.openCount).toBe(1);
    expect(snapshot.summary.closeCount).toBe(1);
    expect(snapshot.summary.totalFees).toBeCloseTo(0.1218);
    expect(snapshot.summary.realizedPnl).toBe(3);
    expect(snapshot.summary.latestEventAt).toBe("2026-06-21T02:00:00.000Z");
  });

  it("marks sample analysis as demo only even with matching records", () => {
    const sampleAnalysis: AnalyzeResponse = {
      ...liveAnalysis,
      snapshot: {
        ...liveAnalysis.snapshot,
        timeframe: "4h",
        mode: "sample",
        fixtureVersion: "btc-4h-v1",
      },
    };

    const snapshot = buildEvidenceReportSnapshot({
      analysis: sampleAnalysis,
      account: createAccount(),
      stance: "unsure",
      generatedAt: "2026-06-21T03:00:00.000Z",
    });

    expect(snapshot.summary.verificationStatus).toBe("sample-demo-only");
    expect(snapshot.submissionNotes.isLiveMode).toBe(false);
    expect(snapshot.submissionNotes.isSubmissionReady).toBe(false);
    expect(snapshot.submissionNotes.warningText).toMatch(/not valid as live submission evidence/i);
    expect(snapshot.ledger).toHaveLength(1);
  });

  it("filters out ledger records with different mode timeframe or symbol", () => {
    const snapshot = buildEvidenceReportSnapshot({
      analysis: liveAnalysis,
      account: createAccount(),
      stance: "long",
      generatedAt: "2026-06-21T03:00:00.000Z",
    });

    expect(snapshot.ledger.every((record) => record.mode === "live" && record.timeframe === "1h" && record.symbol === "BTCUSDT")).toBe(true);
  });

  it("throws when there are no matching ledger records", () => {
    expect(() =>
      buildEvidenceReportSnapshot({
        analysis: {
          ...liveAnalysis,
          snapshot: { ...liveAnalysis.snapshot, timeframe: "15m" },
        },
        account: createAccount(),
        stance: "long",
        generatedAt: "2026-06-21T03:00:00.000Z",
      }),
    ).toThrow(/matching ledger records/i);
  });
});

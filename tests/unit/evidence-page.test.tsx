import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import EvidencePage from "@/app/evidence/page";
import { EVIDENCE_REPORT_STORAGE_KEY } from "@/features/evidence-report/model";

const snapshot = {
  generatedAt: "2026-06-21T03:00:00.000Z",
  request: {
    stance: "unsure",
  },
  analysis: {
    snapshot: {
      symbol: "BTCUSDT",
      timeframe: "1h",
      mode: "sample",
      fetchedAt: "2026-06-21T00:00:00.000Z",
      sourceRequestTime: "2026-06-21T00:00:00.000Z",
      lastClosedCandleAt: "2026-06-20T23:00:00.000Z",
      latestPrice: 100000,
      fixtureVersion: "btc-1h-v1",
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
    completenessWarnings: ["Sample Data"],
    sources: [{ name: "Bitget", url: "https://api.bitget.com", requestedAt: "2026-06-21T00:00:00.000Z" }],
    chart: Array.from({ length: 80 }, (_, index) => ({
      timestamp: new Date(Date.UTC(2026, 0, 1, index)).toISOString(),
      close: 100000 + index,
      ema20: 99900 + index,
      ema50: 99800 + index,
      ema100: 99700 + index,
      ema200: 99600 + index,
    })),
  },
  ledger: [
    {
      id: "open",
      positionId: "position-1",
      timestamp: "2026-06-21T01:00:00.000Z",
      symbol: "BTCUSDT",
      timeframe: "1h",
      mode: "sample",
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
  ],
  accountBalance: 9999.94,
  summary: {
    recordCount: 1,
    openCount: 1,
    closeCount: 0,
    totalFees: 0.06,
    realizedPnl: 0,
    latestEventAt: "2026-06-21T01:00:00.000Z",
    verificationStatus: "sample-demo-only",
  },
  submissionNotes: {
    isLiveMode: false,
    isSubmissionReady: false,
    warningText: "Sample mode is not valid as live submission evidence.",
  },
};

describe("EvidencePage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    window.sessionStorage.clear();
  });

  it("renders the saved snapshot and sample warning banner", () => {
    window.sessionStorage.setItem(EVIDENCE_REPORT_STORAGE_KEY, JSON.stringify(snapshot));

    render(<EvidencePage />);

    expect(screen.getByRole("heading", { name: /evidence report/i })).toBeInTheDocument();
    expect(screen.getByText("MODE")).toBeInTheDocument();
    expect(screen.getByText("ACTION")).toBeInTheDocument();
    expect(screen.getAllByText("REALIZED PNL").length).toBeGreaterThan(0);
    expect(screen.getByText(/sample demo only/i)).toBeInTheDocument();
    expect(screen.getByText(/sample mode is not valid as live submission evidence/i)).toBeInTheDocument();
    expect(screen.getByText("市場結構綜合偏多。")).toBeInTheDocument();
    expect(screen.getByText("OPEN")).toBeInTheDocument();
  });

  it("shows a graceful empty state when there is no saved snapshot", () => {
    window.sessionStorage.clear();
    render(<EvidencePage />);

    expect(screen.getByText(/no evidence snapshot found/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to dashboard/i })).toHaveAttribute("href", "/");
  });

  it("downloads the full evidence snapshot as JSON", () => {
    const createObjectURL = vi.fn(() => "blob:evidence");
    const revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    window.sessionStorage.setItem(EVIDENCE_REPORT_STORAGE_KEY, JSON.stringify(snapshot));

    render(<EvidencePage />);
    vi.stubGlobal("URL", { ...window.URL, createObjectURL, revokeObjectURL });
    fireEvent.click(screen.getByRole("button", { name: /download evidence json/i }));

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:evidence");
  });
});

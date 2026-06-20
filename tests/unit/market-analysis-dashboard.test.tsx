import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MarketAnalysisDashboard } from "@/features/market-analysis/market-analysis-dashboard";

afterEach(() => vi.unstubAllGlobals());

describe("MarketAnalysisDashboard", () => {
  it("submits selected inputs and renders a decision", async () => {
    const response = {
      snapshot: { symbol: "BTCUSDT", timeframe: "1h", mode: "sample", fetchedAt: "2026-06-20T00:00:00.000Z", sourceRequestTime: "2026-06-20T00:00:00.000Z", lastClosedCandleAt: "2026-06-19T23:00:00.000Z", latestPrice: 100000, fixtureVersion: "btc-1h-v1", indicators: { ema20: 101, ema50: 100, ema100: 99, ema200: 98, rsi14: 58, macd: 2, macdSignal: 1, macdHistogram: 1, atr14: 2, volumeChangePct: 10, priceReturn20Pct: 3, fundingRate: 0, openInterest: 1000 } },
      decision: { action: "LONG", confidence: 75, marketBiasScore: 75, stanceAssessment: "supported", categorySignals: { trend: 1, momentum: 1, participation: 1, crowding: 0 }, volatilityRisk: "normal", summary: "市場結構綜合偏多。", reasons: ["趨勢偏多。"], riskWarnings: ["Sample Data"], invalidationCondition: "跌破 EMA20", mode: "deterministic" },
      dataComplete: true, completenessWarnings: [], sources: [{ name: "Bitget", url: "https://api.bitget.com", requestedAt: "2026-06-20T00:00:00.000Z" }],
      chart: Array.from({ length: 80 }, (_, index) => ({ timestamp: new Date(Date.UTC(2026, 0, 1, index)).toISOString(), close: 100 + index, ema20: 99 + index, ema50: 98 + index, ema100: 97 + index, ema200: 96 + index })),
    };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => response });
    vi.stubGlobal("fetch", fetchMock);
    render(<MarketAnalysisDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "1h" }));
    fireEvent.click(screen.getByRole("button", { name: "偏多" }));
    fireEvent.click(screen.getByRole("button", { name: "分析市場" }));
    await waitFor(() => expect(screen.getByText("LONG")).toBeInTheDocument());
    expect(screen.getByText("75 / 100")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});

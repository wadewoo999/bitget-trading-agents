import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  analyzeResponseSchema,
  type AnalyzeResponse,
} from "@/features/market-analysis/model";
import { IndicatorGrid } from "@/components/dashboard/indicator-grid";

function createData(
  indicators: Partial<AnalyzeResponse["snapshot"]["indicators"]> = {},
): AnalyzeResponse {
  return analyzeResponseSchema.parse({
    snapshot: {
      symbol: "BTCUSDT",
      timeframe: "1h",
      mode: "live",
      fetchedAt: "2026-06-20T00:00:00.000Z",
      sourceRequestTime: "2026-06-20T00:00:00.000Z",
      lastClosedCandleAt: "2026-06-19T23:00:00.000Z",
      latestPrice: 100000,
      fixtureVersion: null,
      indicators: {
        ema20: 100,
        ema50: 99,
        ema80: 98,
        rsi14: 50,
        macd: 1,
        macdSignal: 1,
        macdHistogram: 0,
        atr14: 2,
        volumeChangePct: 0,
        priceReturn20Pct: 0,
        fundingRate: 0.0001,
        openInterest: 12345,
        ...indicators,
      },
    },
    decision: {
      action: "WAIT",
      confidence: 50,
      marketBiasScore: 50,
      stanceAssessment: "neutral",
      categorySignals: {
        trend: 0,
        momentum: 0,
        participation: 0,
        crowding: 0,
      },
      volatilityRisk: "normal",
      summary: "neutral",
      reasons: ["neutral"],
      riskWarnings: [],
      invalidationCondition: "neutral",
      mode: "deterministic",
    },
    dataComplete: true,
    completenessWarnings: [],
    sources: [
      {
        name: "Bitget",
        url: "https://api.bitget.com",
        requestedAt: "2026-06-20T00:00:00.000Z",
      },
    ],
    chart: Array.from({ length: 80 }, (_, index) => ({
      timestamp: new Date(Date.UTC(2026, 0, 1, index)).toISOString(),
      close: 100 + index,
      ema20: 99 + index,
      ema50: 98 + index,
      ema80: 97 + index,
    })),
  });
}

describe("IndicatorGrid", () => {
  it("shows that crowding is neutral because funding data is missing", () => {
    render(<IndicatorGrid data={createData({ fundingRate: null })} />);

    expect(screen.getByText("Funding 不可用（缺失資料，Crowding 顯示 neutral）")).toBeInTheDocument();
    expect(screen.getByText("OI 12345")).toBeInTheDocument();
    expect(screen.queryByText("Funding 0.0000%")).not.toBeInTheDocument();
    expect(screen.getByText(/缺少 funding rate/)).toBeInTheDocument();
    expect(screen.getAllByText("中性").length).toBeGreaterThan(0);
  });

  it("shows open interest unavailable when only open interest is missing", () => {
    render(<IndicatorGrid data={createData({ openInterest: null })} />);

    expect(screen.getByText("Funding 0.0100%")).toBeInTheDocument();
    expect(screen.getByText("OI 不可用")).toBeInTheDocument();
    expect(screen.queryByText("OI 0")).not.toBeInTheDocument();
  });

  it("shows both unavailable states when funding rate and open interest are missing", () => {
    render(<IndicatorGrid data={createData({ fundingRate: null, openInterest: null })} />);

    expect(screen.getByText("Funding 不可用（缺失資料，Crowding 顯示 neutral）")).toBeInTheDocument();
    expect(screen.getByText("OI 不可用")).toBeInTheDocument();
  });

  it("shows funding rate and open interest values when available", () => {
    render(<IndicatorGrid data={createData()} />);

    expect(screen.getByText("Funding 0.0100%")).toBeInTheDocument();
    expect(screen.getByText("OI 12345")).toBeInTheDocument();
    expect(screen.getByText(/均線排序還沒有拉開/)).toBeInTheDocument();
    expect(screen.getAllByText(/RSI 50.0/).length).toBeGreaterThan(0);
    expect(screen.getByText(/量能沒有明顯放大/)).toBeInTheDocument();
    expect(screen.getAllByText("中性").length).toBeGreaterThan(0);
  });

  it("renders readable signal states instead of raw numeric scores", () => {
    render(
      <IndicatorGrid
        data={createData({
          ema20: 110,
          ema50: 100,
          rsi14: 60,
          volumeChangePct: 12,
        })}
      />,
    );

    expect(screen.queryByText("+1")).not.toBeInTheDocument();
    expect(screen.queryByText("-1")).not.toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(screen.getAllByText(/偏多|中性|偏空/).length).toBeGreaterThan(0);
  });
});

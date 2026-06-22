import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { MarketAnalysisDashboard } from "@/features/market-analysis/market-analysis-dashboard";
import { EVIDENCE_REPORT_STORAGE_KEY } from "@/features/evidence-report/model";

function jsonResponse(payload: unknown) {
  return { ok: true, json: async () => payload };
}

function deferredResponse() {
  let resolve!: (value: { ok: boolean; json: () => Promise<unknown> }) => void;
  const promise = new Promise<{ ok: boolean; json: () => Promise<unknown> }>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

function buildChart() {
  return Array.from({ length: 80 }, (_, index) => ({
    timestamp: new Date(Date.UTC(2026, 0, 1, index)).toISOString(),
    close: 100 + index,
    ema20: 99 + index,
    ema50: 98 + index,
    ema100: 97 + index,
    ema200: 96 + index,
  }));
}

function buildCandles(base = 100000) {
  return Array.from({ length: 80 }, (_, index) => ({
    openTime: new Date(Date.UTC(2026, 0, 1, index)).toISOString(),
    closeTime: new Date(Date.UTC(2026, 0, 1, index, 59)).toISOString(),
    open: base + index,
    high: base + index + 10,
    low: base + index - 10,
    close: base + index + 2,
    volume: 1000 + index,
  }));
}

function buildAnalysisResponse(mode: "sample" | "live" = "sample") {
  return {
    snapshot: {
      symbol: "BTCUSDT",
      timeframe: "1h",
      mode,
      fetchedAt: "2026-06-20T00:00:00.000Z",
      sourceRequestTime: "2026-06-20T00:00:00.000Z",
      lastClosedCandleAt: "2026-06-19T23:00:00.000Z",
      latestPrice: 100000,
      fixtureVersion: mode === "sample" ? "btc-1h-v1" : null,
      indicators: {
        ema20: 101,
        ema50: 100,
        ema100: 99,
        ema200: 98,
        rsi14: 58,
        macd: 2,
        macdSignal: 1,
        macdHistogram: 1,
        atr14: 2,
        volumeChangePct: 10,
        priceReturn20Pct: 3,
        fundingRate: 0,
        openInterest: 1000,
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
      riskWarnings: mode === "sample" ? ["Sample Data"] : [],
      invalidationCondition: "跌破 EMA20",
      mode: "deterministic",
    },
    dataComplete: true,
    completenessWarnings: [],
    sources: [{ name: "Bitget", url: "https://api.bitget.com", requestedAt: "2026-06-20T00:00:00.000Z" }],
    chart: buildChart(),
  };
}

function buildMarketFeedResponse({
  mode = "sample",
  timeframe = "1h",
  price = 100000,
  fetchedAt = "2026-06-20T00:00:00.000Z",
  fundingRate = 0,
  openInterest = 1000,
  completenessWarnings = [],
}: {
  mode?: "sample" | "live";
  timeframe?: "15m" | "1h" | "4h" | "1d";
  price?: number;
  fetchedAt?: string;
  fundingRate?: number | null;
  openInterest?: number | null;
  completenessWarnings?: string[];
}) {
  return {
    symbol: "BTCUSDT",
    mode,
    timeframe,
    price,
    fetchedAt,
    fixtureVersion: mode === "sample" ? "btc-1h-v1" : null,
    fundingRate,
    openInterest,
    completenessWarnings,
    candles: buildCandles(price),
  };
}

function buildPriceResponse({
  mode = "sample",
  price = 100000,
  fetchedAt = "2026-06-20T00:00:00.000Z",
}: {
  mode?: "sample" | "live";
  price?: number;
  fetchedAt?: string;
}) {
  return {
    symbol: "BTCUSDT",
    mode,
    price,
    fetchedAt,
    fixtureVersion: mode === "sample" ? "btc-1h-v1" : null,
  };
}

function getRequestUrl(input: unknown) {
  return typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  push.mockReset();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe("MarketAnalysisDashboard", () => {
  it("submits selected inputs and renders a decision", async () => {
    const response = buildAnalysisResponse("live");
    const fetchMock = vi.fn(async (input: unknown, init?: RequestInit) => {
      const url = getRequestUrl(input);
      if (url.includes("/api/market-feed?mode=sample&timeframe=1h")) return jsonResponse(buildMarketFeedResponse({ mode: "sample" }));
      if (url.includes("/api/market-feed?mode=live&timeframe=1h")) return jsonResponse(buildMarketFeedResponse({ mode: "live" }));
      if (url === "/api/price?mode=sample") return jsonResponse(buildPriceResponse({ mode: "sample" }));
      if (url === "/api/price?mode=live") return jsonResponse(buildPriceResponse({ mode: "live" }));
      if (url === "/api/analyze" && init?.method === "POST") return jsonResponse(response);
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<MarketAnalysisDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "1h" }));
    fireEvent.click(screen.getByRole("button", { name: "偏多" }));
    fireEvent.click(screen.getByRole("button", { name: "LIVE" }));
    fireEvent.click(screen.getByRole("button", { name: "分析市場" }));
    await waitFor(() => expect(screen.getByText("LONG")).toBeInTheDocument());
    expect(screen.getByText("75 / 100")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(6);
    const analyzeCall = fetchMock.mock.calls.find(([input, init]) => getRequestUrl(input) === "/api/analyze" && init?.method === "POST");
    expect(analyzeCall?.[1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ symbol: "BTCUSDT", timeframe: "1h", stance: "long", mode: "live" }),
    });
  });

  it("renders separate snapshot and market-feed sections with clear status labels", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown, init?: RequestInit) => {
        const url = getRequestUrl(input);
        if (url.includes("/api/market-feed?mode=sample&timeframe=1h")) {
          return jsonResponse(buildMarketFeedResponse({ mode: "sample" }));
        }
        if (url === "/api/price?mode=sample") {
          return jsonResponse(buildPriceResponse({ mode: "sample" }));
        }
        if (url === "/api/analyze" && init?.method === "POST") {
          return jsonResponse(buildAnalysisResponse("sample"));
        }
        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );

    render(<MarketAnalysisDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "分析市場" }));

    await waitFor(() => expect(screen.getByText("LONG")).toBeInTheDocument());
    expect(screen.getByText("分析快照")).toBeInTheDocument();
    expect(screen.getByText("市場即時觀測")).toBeInTheDocument();
  });

  it("renders the signal-desk style layout rails in the correct order", async () => {
    render(<MarketAnalysisDashboard />);

    const controlRail = screen.getByText("Control Rail");
    const centralCommand = screen.getByText("Central Command");
    const riskRail = screen.getByText("Risk Rail");
    const tradeRail = screen.getByText("Trade Rail");

    expect(controlRail.compareDocumentPosition(centralCommand) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(centralCommand.compareDocumentPosition(riskRail) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(riskRail.compareDocumentPosition(tradeRail) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps the central command grouped after analysis", async () => {
    const fetchMock = vi.fn(async (input: unknown, init?: RequestInit) => {
      const url = getRequestUrl(input);
      if (url.includes("/api/market-feed?mode=sample&timeframe=1h")) return jsonResponse(buildMarketFeedResponse({ mode: "sample" }));
      if (url === "/api/price?mode=sample") return jsonResponse(buildPriceResponse({ mode: "sample" }));
      if (url === "/api/analyze" && init?.method === "POST") return jsonResponse(buildAnalysisResponse("sample"));
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<MarketAnalysisDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "分析市場" }));

    await waitFor(() => expect(screen.getByText("Decision Snapshot")).toBeInTheDocument());
    const stage = screen.getByLabelText("central-command");
    expect(within(stage).getByText("Live Market Feed")).toBeInTheDocument();
    expect(within(stage).getByText("Strategy Support")).toBeInTheDocument();
    expect(within(stage).getByText("Strategy Lab")).toBeInTheDocument();
  });

  it("refreshes only latest price without reloading market-feed candles or replacing analysis snapshot", async () => {
    vi.useFakeTimers();
    const analysis = buildAnalysisResponse("sample");
    let marketFeedCalls = 0;
    let priceCalls = 0;
    const fetchMock = vi.fn(async (input: unknown, init?: RequestInit) => {
      const url = getRequestUrl(input);
      if (url.includes("/api/market-feed?mode=sample&timeframe=1h")) {
        marketFeedCalls += 1;
        return jsonResponse(
          buildMarketFeedResponse({
            mode: "sample",
            price: marketFeedCalls === 1 ? 100000 : 100123,
            fetchedAt: marketFeedCalls === 1 ? "2026-06-20T00:00:00.000Z" : "2026-06-20T00:30:00.000Z",
          }),
        );
      }
      if (url === "/api/price?mode=sample") {
        priceCalls += 1;
        return jsonResponse(
          buildPriceResponse({
            mode: "sample",
            price: priceCalls === 1 ? 100000 : 100123,
            fetchedAt: priceCalls === 1 ? "2026-06-20T00:00:00.000Z" : "2026-06-20T00:30:00.000Z",
          }),
        );
      }
      if (url === "/api/analyze" && init?.method === "POST") return jsonResponse(analysis);
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<MarketAnalysisDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "分析市場" }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText("市場結構綜合偏多。")).toBeInTheDocument();
    expect(screen.getByText("最新價格")).toBeInTheDocument();
    expect(screen.getByText("100000.00")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });

    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(marketFeedCalls).toBe(1);
    expect(priceCalls).toBe(2);
    expect(screen.getByText("100123.00")).toBeInTheDocument();
    expect(screen.getByText("市場結構綜合偏多。")).toBeInTheDocument();
    expect(screen.getByText("剛剛更新")).toBeInTheDocument();
    expect(screen.getByText((text) => text.startsWith("上次更新："))).toBeInTheDocument();
  });

  it("shows refresh status and sample snapshot note in sample mode", async () => {
    vi.useFakeTimers();
    const firstFeed = deferredResponse();
    vi.stubGlobal(
      "fetch",
      vi.fn((input: unknown) => {
        const url = getRequestUrl(input);
        if (url.includes("/api/market-feed?mode=sample&timeframe=1h")) return firstFeed.promise;
        if (url === "/api/price?mode=sample")
          return Promise.resolve(jsonResponse(buildPriceResponse({ mode: "sample", fetchedAt: "2026-06-20T08:00:00.000Z" })));
        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );

    render(<MarketAnalysisDashboard />);

    expect(screen.getByText("更新中…")).toBeInTheDocument();

    await act(async () => {
      firstFeed.resolve(
        jsonResponse(
          buildMarketFeedResponse({
            mode: "sample",
            price: 100000,
            fetchedAt: "2026-06-20T08:00:00.000Z",
          }),
        ),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText("剛剛更新")).toBeInTheDocument();
    expect(screen.getByText((text) => text.startsWith("上次更新："))).toBeInTheDocument();
    expect(screen.getByText("此模式每 30 秒只刷新價格；K 線與上下文仍來自固定快照。")).toBeInTheDocument();
  });

  it("shows price direction feedback when the polled latest price changes", async () => {
    vi.useFakeTimers();
    let priceCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown) => {
        const url = getRequestUrl(input);
        if (url.includes("/api/market-feed?mode=sample&timeframe=1h"))
          return jsonResponse(
            buildMarketFeedResponse({
              mode: "sample",
              price: 100000,
              fetchedAt: "2026-06-20T00:00:00.000Z",
            }),
          );
        if (url === "/api/price?mode=sample") {
          priceCalls += 1;
          return jsonResponse(
            buildPriceResponse({
              mode: "sample",
              price: priceCalls === 1 ? 100000 : 100123,
              fetchedAt: priceCalls === 1 ? "2026-06-20T00:00:00.000Z" : "2026-06-20T00:30:00.000Z",
            }),
          );
        }
        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );

    render(<MarketAnalysisDashboard />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });

    expect(screen.getByText("較前次上升")).toBeInTheDocument();
  });

  it("shows latest-price refresh error while keeping chart and analysis snapshot intact", async () => {
    vi.useFakeTimers();
    const analysis = buildAnalysisResponse("sample");
    let priceCalls = 0;
    const fetchMock = vi.fn(async (input: unknown, init?: RequestInit) => {
      const url = getRequestUrl(input);
      if (url.includes("/api/market-feed?mode=sample&timeframe=1h"))
        return jsonResponse(buildMarketFeedResponse({ mode: "sample", price: 100000 }));
      if (url === "/api/price?mode=sample") {
        priceCalls += 1;
        return { ok: false, json: async () => ({ error: { code: "UPSTREAM_TIMEOUT", message: "timeout" } }) };
      }
      if (url === "/api/analyze" && init?.method === "POST") return jsonResponse(analysis);
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<MarketAnalysisDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "分析市場" }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText("100000.00")).toBeInTheDocument();
    expect(screen.getByText("市場結構綜合偏多。")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });

    expect(priceCalls).toBe(2);
    expect(screen.getByText("100000.00")).toBeInTheDocument();
    expect(screen.getByText("市場結構綜合偏多。")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("最新市場資料暫時無法更新。");
  });

  it("renders completeness warnings separately from decision risk warnings", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown, init?: RequestInit) => {
        const url = getRequestUrl(input);
        if (url.includes("/api/market-feed?mode=live&timeframe=1h")) {
          return jsonResponse(
            buildMarketFeedResponse({
              mode: "live",
              completenessWarnings: ["Funding rate unavailable.", "Open interest unavailable."],
            }),
          );
        }
        if (url === "/api/price?mode=live") {
          return jsonResponse(buildPriceResponse({ mode: "live" }));
        }
        if (url === "/api/analyze" && init?.method === "POST") {
          const liveResponse = buildAnalysisResponse("live");
          return jsonResponse({
            ...liveResponse,
            completenessWarnings: ["Funding rate unavailable.", "Open interest unavailable."],
            decision: {
              ...liveResponse.decision,
              riskWarnings: ["波動偏高。"],
            },
            snapshot: {
              ...liveResponse.snapshot,
              indicators: {
                ...liveResponse.snapshot.indicators,
                fundingRate: null,
                openInterest: null,
              },
            },
          });
        }
        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );

    render(<MarketAnalysisDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "LIVE" }));
    fireEvent.click(screen.getByRole("button", { name: "分析市場" }));

    await waitFor(() => expect(screen.getByText("資料完整性")).toBeInTheDocument());
    expect(screen.getAllByText("Funding rate unavailable.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Open interest unavailable.").length).toBeGreaterThan(0);
    expect(screen.getByText("風險提醒")).toBeInTheDocument();
    expect(screen.getByText("波動偏高。")).toBeInTheDocument();
  });

  it("renders completeness warnings in the market-feed panel", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown) => {
        const url = getRequestUrl(input);
        if (url.includes("/api/market-feed?mode=sample&timeframe=1h")) {
          return jsonResponse(
            buildMarketFeedResponse({
              mode: "sample",
              completenessWarnings: [
                "Sample Data 為凍結快照，不代表即時市場。",
                "Funding rate unavailable; market context is partial.",
              ],
            }),
          );
        }
        if (url === "/api/price?mode=sample") {
          return jsonResponse(buildPriceResponse({ mode: "sample" }));
        }
        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );

    render(<MarketAnalysisDashboard />);

    expect(await screen.findByText("Sample Data 為凍結快照，不代表即時市場。")).toBeInTheDocument();
    expect(screen.getByText("Funding rate unavailable; market context is partial.")).toBeInTheDocument();
  });

  it("renders market-feed funding and open interest for the selected timeframe", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown) => {
        const url = getRequestUrl(input);
        if (url.includes("/api/market-feed?mode=live&timeframe=1h")) {
          return jsonResponse(
            buildMarketFeedResponse({
              mode: "live",
              fundingRate: 0.00025,
              openInterest: 54321,
            }),
          );
        }
        if (url === "/api/price?mode=live") {
          return jsonResponse(buildPriceResponse({ mode: "live" }));
        }
        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );

    render(<MarketAnalysisDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "LIVE" }));

    expect(await screen.findByText("Funding 0.0250%")).toBeInTheDocument();
    expect(screen.getByText("OI 54321")).toBeInTheDocument();
  });

  it("does not keep stale feed visible after mode changes", async () => {
    const sampleFeed = deferredResponse();
    const liveFeed = deferredResponse();
    const fetchMock = vi.fn((input: unknown) => {
      const url = getRequestUrl(input);
      if (url.includes("/api/market-feed?mode=sample&timeframe=1h")) return sampleFeed.promise;
      if (url.includes("/api/market-feed?mode=live&timeframe=1h")) return liveFeed.promise;
      if (url === "/api/price?mode=sample") return Promise.resolve(jsonResponse(buildPriceResponse({ mode: "sample" })));
      if (url === "/api/price?mode=live") return Promise.resolve(jsonResponse(buildPriceResponse({ mode: "live", price: 200000 })));
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<MarketAnalysisDashboard />);

    await act(async () => {
      sampleFeed.resolve(jsonResponse(buildMarketFeedResponse({ mode: "sample", price: 100000 })));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText("100000.00")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "LIVE" }));

    expect(screen.queryByText("100000.00")).not.toBeInTheDocument();

    await act(async () => {
      liveFeed.resolve(jsonResponse(buildMarketFeedResponse({ mode: "live", price: 200000 })));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText("200000.00")).toBeInTheDocument();

    await act(async () => {
      sampleFeed.resolve(jsonResponse(buildMarketFeedResponse({ mode: "sample", price: 99999 })));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText("200000.00")).toBeInTheDocument();
    expect(screen.queryByText("99999.00")).not.toBeInTheDocument();
    expect(screen.getByText("LIVE DATA")).toBeInTheDocument();
  });

  it("ignores late responses after dependency change and does not update after unmount", async () => {
    const sampleFeed = deferredResponse();
    const liveFeed = deferredResponse();
    const pendingUnmountPoll = deferredResponse();
    let renderCount = 0;

    const fetchMock = vi.fn((input: unknown) => {
      const url = getRequestUrl(input);
      if (url.includes("/api/market-feed?mode=sample&timeframe=1h")) {
        renderCount += 1;
        return renderCount === 1 ? sampleFeed.promise : pendingUnmountPoll.promise;
      }
      if (url.includes("/api/market-feed?mode=live&timeframe=1h")) return liveFeed.promise;
      if (url === "/api/price?mode=sample") return Promise.resolve(jsonResponse(buildPriceResponse({ mode: "sample" })));
      if (url === "/api/price?mode=live") return Promise.resolve(jsonResponse(buildPriceResponse({ mode: "live", price: 200000, fetchedAt: "2026-06-20T00:30:00.000Z" })));
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { unmount } = render(<MarketAnalysisDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "LIVE" }));

    await act(async () => {
      liveFeed.resolve(jsonResponse(buildMarketFeedResponse({ mode: "live", price: 200000, fetchedAt: "2026-06-20T00:30:00.000Z" })));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText("200000.00")).toBeInTheDocument();

    await act(async () => {
      sampleFeed.resolve(jsonResponse(buildMarketFeedResponse({ mode: "sample", price: 100000, fetchedAt: "2026-06-20T00:00:00.000Z" })));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText("200000.00")).toBeInTheDocument();
    expect(screen.queryByText("100000.00")).not.toBeInTheDocument();

    unmount();

    const pendingRender = render(<MarketAnalysisDashboard />);
    pendingRender.unmount();

    await act(async () => {
      pendingUnmountPoll.resolve(jsonResponse(buildMarketFeedResponse({ mode: "sample", price: 300000, fetchedAt: "2026-06-20T01:00:00.000Z" })));
      await Promise.resolve();
      await Promise.resolve();
    });
  });

  it("can preview, confirm, and close one paper trade", async () => {
    const response = buildAnalysisResponse("live");
    let priceCalls = 0;
    const fetchMock = vi.fn(async (input: unknown, init?: RequestInit) => {
      const url = getRequestUrl(input);
      if (url.includes("/api/market-feed?mode=sample&timeframe=1h")) return jsonResponse(buildMarketFeedResponse({ mode: "sample" }));
      if (url.includes("/api/market-feed?mode=live&timeframe=1h")) return jsonResponse(buildMarketFeedResponse({ mode: "live" }));
      if (url === "/api/analyze" && init?.method === "POST") return jsonResponse(response);
      if (url === "/api/price?mode=live") {
        priceCalls += 1;
        return jsonResponse(buildPriceResponse({
          mode: "live",
          price: priceCalls === 1 ? 100 : 101,
          fetchedAt: priceCalls === 1 ? "2026-06-20T01:00:00.000Z" : "2026-06-20T02:00:00.000Z",
        }));
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<MarketAnalysisDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "LIVE" }));
    fireEvent.click(screen.getByRole("button", { name: "分析市場" }));
    await waitFor(() => expect(screen.getByText("LONG")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "預覽模擬交易" }));
    await waitFor(() => expect(screen.getByText("確認模擬開倉")).toBeInTheDocument());
    expect(screen.getByText(/Risk Budget/i)).toBeInTheDocument();
    expect(screen.getByText(/Open Fee/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "確認模擬開倉" }));
    await waitFor(() => expect(screen.getByText("目前持倉")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "手動平倉" }));
    await waitFor(() => expect(screen.getByText("Ledger")).toBeInTheDocument());
  });

  it("blocks preview safely when /api/price returns a malformed payload", async () => {
    const response = buildAnalysisResponse("live");
    const fetchMock = vi.fn(async (input: unknown, init?: RequestInit) => {
      const url = getRequestUrl(input);
      if (url.includes("/api/market-feed?mode=sample&timeframe=1h")) return jsonResponse(buildMarketFeedResponse({ mode: "sample" }));
      if (url.includes("/api/market-feed?mode=live&timeframe=1h")) return jsonResponse(buildMarketFeedResponse({ mode: "live" }));
      if (url === "/api/analyze" && init?.method === "POST") return jsonResponse(response);
      if (url === "/api/price?mode=live") {
        return jsonResponse({
          symbol: "BTCUSDT",
          mode: "live",
          fetchedAt: "2026-06-20T01:00:00.000Z",
          fixtureVersion: null,
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<MarketAnalysisDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "LIVE" }));
    fireEvent.click(screen.getByRole("button", { name: "分析市場" }));
    await waitFor(() => expect(screen.getByText("LONG")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "預覽模擬交易" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("價格資料格式無效。"));
    expect(screen.queryByText("確認模擬開倉")).not.toBeInTheDocument();
  });

  it("blocks close safely when /api/price returns a malformed payload", async () => {
    const response = buildAnalysisResponse("live");
    let priceCalls = 0;
    const fetchMock = vi.fn(async (input: unknown, init?: RequestInit) => {
      const url = getRequestUrl(input);
      if (url.includes("/api/market-feed?mode=sample&timeframe=1h")) return jsonResponse(buildMarketFeedResponse({ mode: "sample" }));
      if (url.includes("/api/market-feed?mode=live&timeframe=1h")) return jsonResponse(buildMarketFeedResponse({ mode: "live" }));
      if (url === "/api/analyze" && init?.method === "POST") return jsonResponse(response);
      if (url === "/api/price?mode=live") {
        priceCalls += 1;
        if (priceCalls <= 2) {
          return jsonResponse(buildPriceResponse({ mode: "live", price: 100, fetchedAt: "2026-06-20T01:00:00.000Z" }));
        }
        return jsonResponse({
          symbol: "BTCUSDT",
          mode: "live",
          price: "bad",
          fetchedAt: "2026-06-20T02:00:00.000Z",
          fixtureVersion: null,
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<MarketAnalysisDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "LIVE" }));
    fireEvent.click(screen.getByRole("button", { name: "分析市場" }));
    await waitFor(() => expect(screen.getByText("LONG")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "預覽模擬交易" }));
    await waitFor(() => expect(screen.getByText("確認模擬開倉")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "確認模擬開倉" }));
    await waitFor(() => expect(screen.getByText("目前持倉")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "手動平倉" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("價格資料格式無效。"));
    expect(screen.getByText("目前持倉")).toBeInTheDocument();
  });

  it("disables evidence report generation when there is no matching ledger for the current analysis", async () => {
    window.localStorage.clear();
    const response = buildAnalysisResponse("live");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown, init?: RequestInit) => {
        const url = getRequestUrl(input);
        if (url.includes("/api/market-feed?mode=sample&timeframe=1h")) return jsonResponse(buildMarketFeedResponse({ mode: "sample" }));
        if (url.includes("/api/market-feed?mode=live&timeframe=1h")) return jsonResponse(buildMarketFeedResponse({ mode: "live" }));
        if (url === "/api/price?mode=sample") return jsonResponse(buildPriceResponse({ mode: "sample" }));
        if (url === "/api/price?mode=live") return jsonResponse(buildPriceResponse({ mode: "live" }));
        if (url === "/api/analyze" && init?.method === "POST") return jsonResponse(response);
        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );

    render(<MarketAnalysisDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "LIVE" }));
    fireEvent.click(screen.getByRole("button", { name: "分析市場" }));
    await waitFor(() => expect(screen.getByText("LONG")).toBeInTheDocument());

    expect(screen.getByRole("button", { name: /generate evidence report/i })).toBeDisabled();
  });

  it("stores the evidence snapshot and routes to the report page", async () => {
    const response = buildAnalysisResponse("live");
    const fetchMock = vi.fn(async (input: unknown, init?: RequestInit) => {
      const url = getRequestUrl(input);
      if (url.includes("/api/market-feed?mode=sample&timeframe=1h")) return jsonResponse(buildMarketFeedResponse({ mode: "sample" }));
      if (url.includes("/api/market-feed?mode=live&timeframe=1h")) return jsonResponse(buildMarketFeedResponse({ mode: "live" }));
      if (url === "/api/analyze" && init?.method === "POST") return jsonResponse(response);
      if (url === "/api/price?mode=live") {
        return jsonResponse(buildPriceResponse({ mode: "live", price: 100, fetchedAt: "2026-06-20T01:00:00.000Z" }));
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<MarketAnalysisDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "LIVE" }));
    fireEvent.click(screen.getByRole("button", { name: "分析市場" }));
    await waitFor(() => expect(screen.getByText("LONG")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "預覽模擬交易" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "確認模擬開倉" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "確認模擬開倉" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /generate evidence report/i })).toBeEnabled());

    fireEvent.click(screen.getByRole("button", { name: /generate evidence report/i }));

    const stored = window.sessionStorage.getItem(EVIDENCE_REPORT_STORAGE_KEY);
    expect(stored).not.toBeNull();
    expect(push).toHaveBeenCalledWith("/evidence");
  });
});

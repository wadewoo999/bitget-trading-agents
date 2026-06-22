import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/market-data/load-market-feed", () => ({
  loadMarketFeed: vi.fn(),
}));

import { GET } from "@/app/api/market-feed/route";
import { apiErrorSchema, marketFeedResponseSchema } from "@/features/market-analysis/model";
import { loadMarketFeed } from "@/server/market-data/load-market-feed";
import {
  InsufficientCandlesError,
  MarketDataUnavailableError,
  UpstreamTimeoutError,
} from "@/server/market-data/live-market-data";

function createCandles(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const openTime = Date.UTC(2026, 5, 20, index, 0, 0);
    return {
      openTime: new Date(openTime).toISOString(),
      closeTime: new Date(openTime + (60 * 60 * 1000) - 1).toISOString(),
      open: 100000 + index,
      high: 100100 + index,
      low: 99900 + index,
      close: 100050 + index,
      volume: 1000 + index,
    };
  });
}

describe("GET /api/market-feed", () => {
  it("returns validated sample market-feed data", async () => {
    vi.mocked(loadMarketFeed).mockResolvedValue({
      symbol: "BTCUSDT",
      mode: "sample",
      timeframe: "1h",
      price: 100000,
      fetchedAt: "2026-06-21T00:00:00.000Z",
      fixtureVersion: "fixture-2026-06-20",
      fundingRate: 0.0001,
      openInterest: 12345,
      completenessWarnings: ["Sample data is a frozen snapshot and not live market data."],
      candles: createCandles(80),
    });

    const response = await GET(
      new Request("http://localhost/api/market-feed?mode=sample&timeframe=1h"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(marketFeedResponseSchema.parse(json).candles).toHaveLength(80);
  });

  it("rejects invalid query params", async () => {
    const response = await GET(new Request("http://localhost/api/market-feed?mode=sample"));
    expect(response.status).toBe(400);
    expect(apiErrorSchema.parse(await response.json()).error.code).toBe("INVALID_INPUT");
  });

  it("returns live warnings without failing when market context is partial", async () => {
    vi.mocked(loadMarketFeed).mockResolvedValue({
      symbol: "BTCUSDT",
      mode: "live",
      timeframe: "15m",
      price: 101234,
      fetchedAt: "2026-06-21T01:00:00.000Z",
      fixtureVersion: null,
      fundingRate: null,
      openInterest: null,
      completenessWarnings: [
        "Funding rate unavailable; crowding signal is neutral.",
        "Open interest unavailable; market context is partial.",
      ],
      candles: createCandles(80),
    });

    const response = await GET(
      new Request("http://localhost/api/market-feed?mode=live&timeframe=15m"),
    );
    const json = marketFeedResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(json.completenessWarnings).toEqual([
      "Funding rate unavailable; crowding signal is neutral.",
      "Open interest unavailable; market context is partial.",
    ]);
  });

  it("rejects market-feed payloads with too few candles", async () => {
    expect(() =>
      marketFeedResponseSchema.parse({
        symbol: "BTCUSDT",
        mode: "sample",
        timeframe: "1h",
        price: 100000,
        fetchedAt: "2026-06-21T00:00:00.000Z",
        fixtureVersion: "fixture-2026-06-20",
        fundingRate: 0.0001,
        openInterest: 12345,
        completenessWarnings: ["Sample data is a frozen snapshot and not live market data."],
        candles: createCandles(1),
      }),
    ).toThrow();
  });

  it("maps insufficient candle errors", async () => {
    vi.mocked(loadMarketFeed).mockRejectedValue(
      new InsufficientCandlesError("Insufficient closed candles."),
    );

    const response = await GET(
      new Request("http://localhost/api/market-feed?mode=live&timeframe=1h"),
    );

    expect(response.status).toBe(422);
    expect(apiErrorSchema.parse(await response.json()).error.code).toBe("INSUFFICIENT_CANDLES");
  });

  it("maps upstream timeout errors", async () => {
    vi.mocked(loadMarketFeed).mockRejectedValue(
      new UpstreamTimeoutError("Bitget market-feed request timed out."),
    );

    const response = await GET(
      new Request("http://localhost/api/market-feed?mode=live&timeframe=1h"),
    );

    expect(response.status).toBe(504);
    expect(apiErrorSchema.parse(await response.json()).error.code).toBe("UPSTREAM_TIMEOUT");
  });

  it("maps market data unavailable errors", async () => {
    vi.mocked(loadMarketFeed).mockRejectedValue(
      new MarketDataUnavailableError("Market data unavailable."),
    );

    const response = await GET(
      new Request("http://localhost/api/market-feed?mode=live&timeframe=1h"),
    );

    expect(response.status).toBe(503);
    expect(apiErrorSchema.parse(await response.json()).error.code).toBe("MARKET_DATA_UNAVAILABLE");
  });
});

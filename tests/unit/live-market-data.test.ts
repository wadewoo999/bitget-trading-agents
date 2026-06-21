import { afterEach, describe, expect, it, vi } from "vitest";

import {
  loadLiveMarketData,
  normalizeLiveMarketData,
  type BitgetFundingRatePayload,
  type BitgetOpenInterestPayload,
  type BitgetTickerPayload,
} from "@/server/market-data/live-market-data";

afterEach(() => vi.unstubAllGlobals());

function iso(time: number) {
  return new Date(time).toISOString();
}

function buildCandle(openTime: number, closeTime: number) {
  return [String(openTime), "100", "110", "90", "105", "25", "0", "0", String(closeTime)];
}

describe("normalizeLiveMarketData", () => {
  it("keeps only closed candles and sorts them chronologically without duplicates", () => {
    const start = Date.UTC(2024, 0, 1, 0, 0, 0);
    const step = 60 * 60 * 1000;
    const fetchedAt = iso(start + 260 * step);
    const candles = Array.from({ length: 252 }, (_, index) => {
      const openTime = start + index * step;
      return buildCandle(openTime, openTime + step - 1);
    });
    const duplicate = candles[20]!;
    const incomplete = buildCandle(start + 260 * step, start + 261 * step);
    const unordered = [candles[3]!, candles[1]!, duplicate, incomplete, ...candles];

    const result = normalizeLiveMarketData({
      timeframe: "1h",
      fetchedAt,
      ticker: [{ lastPr: "64000" }] as BitgetTickerPayload,
      funding: [{ fundingRate: "0.0001" }] as BitgetFundingRatePayload,
      openInterest: { openInterestList: [{ size: "12345" }] } as BitgetOpenInterestPayload,
      candles: unordered,
      sourceRequestTime: fetchedAt,
    });

    expect(result.candles).toHaveLength(252);
    expect(result.candles[0]?.openTime).toBe(iso(start));
    expect(result.candles.at(-1)?.closeTime).toBe(iso(start + 252 * step - 1));
  });

  it("returns null optional derivatives fields when missing", () => {
    const start = Date.UTC(2026, 5, 21, 0, 0, 0);
    const step = 15 * 60 * 1000;
    const candles = Array.from({ length: 300 }, (_, index) => {
      const openTime = start + index * step;
      return buildCandle(openTime, openTime + step - 1);
    });

    const result = normalizeLiveMarketData({
      timeframe: "15m",
      fetchedAt: iso(start + 301 * step),
      ticker: [{ lastPr: "64000" }] as BitgetTickerPayload,
      funding: [] as BitgetFundingRatePayload,
      openInterest: { openInterestList: [] } as BitgetOpenInterestPayload,
      candles,
      sourceRequestTime: iso(start + 301 * step),
    });

    expect(result.fundingRate).toBeNull();
    expect(result.openInterest).toBeNull();
  });

  it("requests candle history in 200-row pages", async () => {
    const start = Date.UTC(2026, 5, 21, 0, 0, 0);
    const step = 60 * 60 * 1000;
    const pageA = Array.from({ length: 200 }, (_, index) => {
      const openTime = start + index * step;
      return [String(openTime), "100", "110", "90", "105", "25", "0"];
    });
    const pageB = Array.from({ length: 200 }, (_, index) => {
      const openTime = start - (200 - index) * step;
      return [String(openTime), "99", "109", "89", "104", "20", "0"];
    });

    const firstBoundary = start + 300 * step;
    const fetchMock = vi.fn((input: URL | RequestInfo) => {
      const url = String(input);
      if (url.includes("/ticker")) {
        return Promise.resolve({ ok: true, json: async () => ({ code: "00000", requestTime: start, data: [{ lastPr: "64000" }] }) });
      }
      if (url.includes("/current-fund-rate")) {
        return Promise.resolve({ ok: true, json: async () => ({ code: "00000", requestTime: start, data: [{ fundingRate: "0.0001" }] }) });
      }
      if (url.includes("/open-interest")) {
        return Promise.resolve({ ok: true, json: async () => ({ code: "00000", requestTime: start, data: { openInterestList: [{ size: "12345" }] } }) });
      }
      const endTime = Number(new URL(url).searchParams.get("endTime"));
      const page = endTime > firstBoundary ? pageA : pageB;
      return Promise.resolve({ ok: true, json: async () => ({ code: "00000", requestTime: start, data: page }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    await loadLiveMarketData("1h").catch(() => undefined);

    const candleCalls = fetchMock.mock.calls.filter(([call]) => String(call).includes("/history-candles"));
    expect(candleCalls).toHaveLength(2);
    expect(candleCalls.every(([call]) => String(call).includes("limit=200"))).toBe(true);
    const firstCall = new URL(String(candleCalls[0]?.[0]));
    const secondCall = new URL(String(candleCalls[1]?.[0]));
    expect(Number(secondCall.searchParams.get("endTime"))).toBeLessThan(
      Number(firstCall.searchParams.get("endTime")),
    );
  });
});

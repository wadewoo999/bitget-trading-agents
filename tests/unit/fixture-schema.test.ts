import { describe, expect, it } from "vitest";

import { validateMarketFixture } from "@/server/market-data/fixture-schema";

function makeFixture(count = 300) {
  const start = Date.UTC(2026, 0, 1);
  return {
    version: "test-v1",
    symbol: "BTCUSDT",
    timeframe: "1h",
    capturedAt: new Date(start + count * 3_600_000).toISOString(),
    tickerPrice: 100000,
    fundingRate: 0.00001,
    openInterest: 1000,
    sources: [{ name: "Bitget", url: "https://api.bitget.com", requestedAt: new Date(start).toISOString() }],
    candles: Array.from({ length: count }, (_, index) => ({
      openTime: new Date(start + index * 3_600_000).toISOString(),
      closeTime: new Date(start + (index + 1) * 3_600_000 - 1).toISOString(),
      open: 100 + index,
      high: 102 + index,
      low: 99 + index,
      close: 101 + index,
      volume: 10 + index,
    })),
  };
}

describe("market fixture validation", () => {
  it("accepts 300 chronological closed candles", () => {
    expect(validateMarketFixture(makeFixture()).candles).toHaveLength(300);
  });

  it("rejects insufficient, duplicate, unordered, open, and invalid OHLC candles", () => {
    expect(() => validateMarketFixture(makeFixture(249))).toThrow();
    const duplicate = makeFixture(); duplicate.candles[1]!.openTime = duplicate.candles[0]!.openTime;
    expect(() => validateMarketFixture(duplicate)).toThrow();
    const unordered = makeFixture(); [unordered.candles[1], unordered.candles[2]] = [unordered.candles[2]!, unordered.candles[1]!];
    expect(() => validateMarketFixture(unordered)).toThrow();
    const open = makeFixture(); open.candles[299]!.closeTime = new Date(Date.parse(open.capturedAt) + 1).toISOString();
    expect(() => validateMarketFixture(open)).toThrow();
    const invalid = makeFixture(); invalid.candles[0]!.high = 1;
    expect(() => validateMarketFixture(invalid)).toThrow();
  });
});

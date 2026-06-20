import { describe, expect, it } from "vitest";

import { loadMarketFixture } from "@/server/market-data/load-market-fixture";

describe("committed market fixtures", () => {
  it.each(["15m", "1h", "4h", "1d"] as const)("loads %s real snapshot", async (timeframe) => {
    const fixture = await loadMarketFixture(timeframe);
    expect(fixture.candles).toHaveLength(300);
    expect(fixture.sources.every((source) => source.url.startsWith("https://api.bitget.com/"))).toBe(true);
    expect(Number.isFinite(fixture.tickerPrice)).toBe(true);
    expect(Number.isFinite(fixture.fundingRate)).toBe(true);
    expect(Number.isFinite(fixture.openInterest)).toBe(true);
  });
});

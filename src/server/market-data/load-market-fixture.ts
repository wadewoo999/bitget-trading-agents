import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Symbol, Timeframe } from "@/features/market-analysis/model";
import { validateMarketFixture, type MarketFixture } from "@/server/market-data/fixture-schema";
import { MarketDataUnavailableError } from "@/server/market-data/live-market-data";

const fixtureFiles: Record<Timeframe, string> = {
  "15m": "btcusdt-15m.json",
  "1h": "btcusdt-1h.json",
  "4h": "btcusdt-4h.json",
  "1d": "btcusdt-1d.json",
};

export async function loadMarketFixture(symbol: Symbol, timeframe: Timeframe): Promise<MarketFixture> {
  if (symbol !== "BTCUSDT") throw new MarketDataUnavailableError(`Fixtures for ${symbol} are not available. Use live mode.`);
  const file = path.join(process.cwd(), "fixtures", "market", fixtureFiles[timeframe]);
  const fixture = validateMarketFixture(JSON.parse(await readFile(file, "utf8")));
  if (fixture.timeframe !== timeframe) throw new Error("Fixture timeframe mismatch");
  return fixture;
}

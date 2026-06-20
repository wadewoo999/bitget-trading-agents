import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Timeframe } from "@/features/market-analysis/model";
import { validateMarketFixture, type MarketFixture } from "@/server/market-data/fixture-schema";

const fixtureFiles: Record<Timeframe, string> = {
  "15m": "btcusdt-15m.json",
  "1h": "btcusdt-1h.json",
  "4h": "btcusdt-4h.json",
  "1d": "btcusdt-1d.json",
};

export async function loadMarketFixture(timeframe: Timeframe): Promise<MarketFixture> {
  const file = path.join(process.cwd(), "fixtures", "market", fixtureFiles[timeframe]);
  const fixture = validateMarketFixture(JSON.parse(await readFile(file, "utf8")));
  if (fixture.timeframe !== timeframe) throw new Error("Fixture timeframe mismatch");
  return fixture;
}

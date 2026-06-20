import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const base = "https://api.bitget.com";
const productType = "USDT-FUTURES";
const intervals = { "15m": ["15m", 900000], "1h": ["1H", 3600000], "4h": ["4H", 14400000], "1d": ["1D", 86400000] };

async function request(endpoint, params) {
  const url = new URL(endpoint, base);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${endpoint} returned ${response.status}`);
  const payload = await response.json();
  if (payload.code !== "00000") throw new Error(`${endpoint}: ${payload.msg}`);
  return { data: payload.data, requestedAt: new Date(payload.requestTime ?? Date.now()).toISOString(), url: url.toString() };
}

const common = { symbol: "BTCUSDT", productType };
const [ticker, funding, oi] = await Promise.all([
  request("/api/v2/mix/market/ticker", common),
  request("/api/v2/mix/market/current-fund-rate", common),
  request("/api/v2/mix/market/open-interest", common),
]);
const capturedAt = new Date().toISOString();
const output = path.join(process.cwd(), "fixtures", "market");
await mkdir(output, { recursive: true });

for (const [timeframe, [granularity, duration]] of Object.entries(intervals)) {
  const candlePages = [];
  let endTime = Date.parse(capturedAt);
  while (candlePages.length < 301) {
    const page = await request("/api/v2/mix/market/history-candles", { ...common, granularity, limit: 200, endTime });
    if (!page.data.length) break;
    candlePages.push(...page.data);
    endTime = Math.min(...page.data.map((row) => Number(row[0]))) - 1;
  }
  const candleResult = { url: `${base}/api/v2/mix/market/history-candles`, requestedAt: capturedAt };
  const candles = candlePages
    .map((row) => ({
      openTime: new Date(Number(row[0])).toISOString(),
      closeTime: new Date(Number(row[0]) + duration - 1).toISOString(),
      open: Number(row[1]), high: Number(row[2]), low: Number(row[3]), close: Number(row[4]), volume: Number(row[5]),
    }))
    .filter((candle) => Date.parse(candle.closeTime) <= Date.parse(capturedAt))
    .filter((candle, index, values) => values.findIndex((value) => value.openTime === candle.openTime) === index)
    .sort((a, b) => Date.parse(a.openTime) - Date.parse(b.openTime))
    .slice(-300);
  if (candles.length !== 300) throw new Error(`${timeframe}: expected 300 closed candles, got ${candles.length}`);
  const safeTimestamp = capturedAt.replace(/[:.]/g, "-");
  const fixture = {
    version: `btcusdt-${timeframe}-${safeTimestamp}`,
    symbol: "BTCUSDT", timeframe, capturedAt,
    tickerPrice: Number(ticker.data[0].lastPr),
    fundingRate: Number(funding.data[0].fundingRate),
    openInterest: Number(oi.data.openInterestList[0].size),
    sources: [
      { name: "Bitget futures candles", url: candleResult.url, requestedAt: candleResult.requestedAt },
      { name: "Bitget futures ticker", url: ticker.url, requestedAt: ticker.requestedAt },
      { name: "Bitget current funding rate", url: funding.url, requestedAt: funding.requestedAt },
      { name: "Bitget current open interest", url: oi.url, requestedAt: oi.requestedAt },
    ], candles,
  };
  await writeFile(path.join(output, `btcusdt-${timeframe}.json`), `${JSON.stringify(fixture, null, 2)}\n`);
}

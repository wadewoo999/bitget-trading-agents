import type { Symbol, Timeframe } from "@/features/market-analysis/model";
import { marketCandleSchema } from "@/server/market-data/fixture-schema";
import type { NormalizedMarketData } from "@/server/market-data/normalized-market-data";

const BITGET_BASE_URL = "https://api.bitget.com";
const PRODUCT_TYPE = "USDT-FUTURES";
const REQUEST_TIMEOUT_MS = 8000;

const timeframeConfig: Record<Timeframe, { granularity: string; intervalMs: number }> = {
  "15m": { granularity: "15m", intervalMs: 15 * 60 * 1000 },
  "1h": { granularity: "1H", intervalMs: 60 * 60 * 1000 },
  "4h": { granularity: "4H", intervalMs: 4 * 60 * 60 * 1000 },
  "1d": { granularity: "1D", intervalMs: 24 * 60 * 60 * 1000 },
};

type BitgetSuccessEnvelope<T> = { code: string; msg?: string; requestTime?: number; data: T };
export type BitgetTickerPayload = Array<{ lastPr?: string }>;
export type BitgetFundingRatePayload = Array<{ fundingRate?: string }>;
export type BitgetOpenInterestPayload = { openInterestList?: Array<{ size?: string }> };
type BitgetCandlePayload = string[][];

export class MarketDataUnavailableError extends Error {}
export class InsufficientCandlesError extends Error {}
export class UpstreamTimeoutError extends Error {}

interface NormalizeLiveMarketDataInput {
  symbol: Symbol;
  timeframe: Timeframe;
  fetchedAt: string;
  ticker: BitgetTickerPayload;
  funding: BitgetFundingRatePayload;
  openInterest: BitgetOpenInterestPayload;
  candles: BitgetCandlePayload;
  sourceRequestTime: string;
}

function toNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildUrl(pathname: string, params: Record<string, string | number>) {
  const url = new URL(pathname, BITGET_BASE_URL);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  return url;
}

async function requestBitget<T>(pathname: string, params: Record<string, string | number>) {
  const url = buildUrl(pathname, params);
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), cache: "no-store" });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") throw new UpstreamTimeoutError("Bitget request timed out.");
    throw new MarketDataUnavailableError("Bitget request failed.");
  }
  if (!response.ok) throw new MarketDataUnavailableError(`Bitget request failed with ${response.status}.`);
  const payload = (await response.json()) as BitgetSuccessEnvelope<T>;
  if (payload.code !== "00000") throw new MarketDataUnavailableError(payload.msg ?? "Bitget request failed.");
  return {
    data: payload.data,
    requestedAt: new Date(payload.requestTime ?? Date.now()).toISOString(),
    url: url.toString(),
  };
}

async function requestBitgetCandles(symbol: Symbol, timeframe: Timeframe) {
  const { granularity } = timeframeConfig[timeframe];
  const candles: BitgetCandlePayload = [];
  let endTime = Date.now();
  let requestedAt = new Date().toISOString();
  let url = "";

  while (candles.length < 300) {
    const response = await requestBitget<BitgetCandlePayload>("/api/v2/mix/market/history-candles", {
      symbol,
      productType: PRODUCT_TYPE,
      granularity,
      limit: 200,
      endTime,
    });
    requestedAt = response.requestedAt;
    url = response.url;
    if (!response.data.length) break;
    candles.push(...response.data);
    const oldestOpenTime = Math.min(...response.data.map((row) => Number(row[0])));
    if (!Number.isFinite(oldestOpenTime) || response.data.length < 200) break;
    endTime = oldestOpenTime - 1;
  }

  return { data: candles, requestedAt, url };
}

export function normalizeLiveMarketData({
  symbol,
  timeframe,
  fetchedAt,
  ticker,
  funding,
  openInterest,
  candles,
  sourceRequestTime,
}: NormalizeLiveMarketDataInput): Omit<NormalizedMarketData, "mode" | "sources"> {
  const fetchedAtMs = Date.parse(fetchedAt);
  const intervalMs = timeframeConfig[timeframe].intervalMs;
  const normalizedCandles = candles
    .map((row) => {
      const openTimeMs = Number(row[0]);
      const closeTimeMs = openTimeMs + intervalMs - 1;
      return marketCandleSchema.parse({
        openTime: new Date(openTimeMs).toISOString(),
        closeTime: new Date(closeTimeMs).toISOString(),
        open: Number(row[1]),
        high: Number(row[2]),
        low: Number(row[3]),
        close: Number(row[4]),
        volume: Number(row[5]),
      });
    })
    .filter((candle) => Date.parse(candle.closeTime) <= fetchedAtMs)
    .sort((left, right) => Date.parse(left.openTime) - Date.parse(right.openTime))
    .filter((candle, index, values) => index === values.findIndex((value) => value.openTime === candle.openTime));

  if (normalizedCandles.length < 250) {
    throw new InsufficientCandlesError("At least 250 closed candles are required.");
  }

  const latestTickerPrice = toNumber(ticker[0]?.lastPr);
  if (latestTickerPrice === null) throw new MarketDataUnavailableError("Ticker price is unavailable.");

  return {
    symbol,
    timeframe,
    fetchedAt,
    sourceRequestTime,
    lastClosedCandleAt: normalizedCandles.at(-1)!.closeTime,
    latestPrice: latestTickerPrice,
    fixtureVersion: null,
    fundingRate: toNumber(funding[0]?.fundingRate),
    openInterest: toNumber(openInterest.openInterestList?.[0]?.size),
    candles: normalizedCandles.slice(-300),
  };
}

export async function loadLiveMarketData(symbol: Symbol, timeframe: Timeframe): Promise<NormalizedMarketData> {
  const fetchedAt = new Date().toISOString();
  const common = { symbol, productType: PRODUCT_TYPE };
  const [ticker, funding, openInterest, candles] = await Promise.all([
    requestBitget<BitgetTickerPayload>("/api/v2/mix/market/ticker", common),
    requestBitget<BitgetFundingRatePayload>("/api/v2/mix/market/current-fund-rate", common),
    requestBitget<BitgetOpenInterestPayload>("/api/v2/mix/market/open-interest", common),
    requestBitgetCandles(symbol, timeframe),
  ]);

  return {
    ...normalizeLiveMarketData({
      symbol,
      timeframe,
      fetchedAt,
      ticker: ticker.data,
      funding: funding.data,
      openInterest: openInterest.data,
      candles: candles.data,
      sourceRequestTime: ticker.requestedAt,
    }),
    mode: "live",
    sources: [
      { name: "Bitget futures candles", url: candles.url, requestedAt: candles.requestedAt },
      { name: "Bitget futures ticker", url: ticker.url, requestedAt: ticker.requestedAt },
      { name: "Bitget current funding rate", url: funding.url, requestedAt: funding.requestedAt },
      { name: "Bitget current open interest", url: openInterest.url, requestedAt: openInterest.requestedAt },
    ],
  };
}

export async function loadLivePrice(symbol: Symbol) {
  const ticker = await requestBitget<BitgetTickerPayload>("/api/v2/mix/market/ticker", {
    symbol,
    productType: PRODUCT_TYPE,
  });
  const price = toNumber(ticker.data[0]?.lastPr);
  if (price === null) throw new MarketDataUnavailableError("Ticker price is unavailable.");
  return { symbol, mode: "live" as const, price, fetchedAt: ticker.requestedAt, fixtureVersion: null };
}

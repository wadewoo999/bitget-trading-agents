import type { MarketDataMode } from "@/features/market-analysis/model";

const SAMPLE_DATA_WARNING = "Sample data is a frozen snapshot and not live market data.";
const OPEN_INTEREST_UNAVAILABLE_WARNING = "Open interest unavailable; market context is partial.";
const FUNDING_RATE_UNAVAILABLE_WARNING = "Funding rate unavailable; crowding signal is neutral.";

export function buildMarketCompletenessWarnings({
  mode,
  fundingRate,
  openInterest,
}: {
  mode: MarketDataMode;
  fundingRate: number | null;
  openInterest: number | null;
}) {
  if (mode === "sample") return [SAMPLE_DATA_WARNING];

  return Array.from(new Set([
    ...(fundingRate === null ? [FUNDING_RATE_UNAVAILABLE_WARNING] : []),
    ...(openInterest === null ? [OPEN_INTEREST_UNAVAILABLE_WARNING] : []),
  ]));
}

export {
  FUNDING_RATE_UNAVAILABLE_WARNING,
  OPEN_INTEREST_UNAVAILABLE_WARNING,
  SAMPLE_DATA_WARNING,
};

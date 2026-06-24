const OPEN_INTEREST_UNAVAILABLE_WARNING = "Open interest unavailable; market context is partial.";
const FUNDING_RATE_UNAVAILABLE_WARNING = "Funding rate unavailable; crowding signal is neutral.";

export function buildMarketCompletenessWarnings({
  fundingRate,
  openInterest,
}: {
  fundingRate: number | null;
  openInterest: number | null;
}) {
  return Array.from(new Set([
    ...(fundingRate === null ? [FUNDING_RATE_UNAVAILABLE_WARNING] : []),
    ...(openInterest === null ? [OPEN_INTEREST_UNAVAILABLE_WARNING] : []),
  ]));
}

export {
  FUNDING_RATE_UNAVAILABLE_WARNING,
  OPEN_INTEREST_UNAVAILABLE_WARNING,
};

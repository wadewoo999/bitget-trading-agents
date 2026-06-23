import {
  apiErrorSchema,
  marketFeedQuerySchema,
} from "@/features/market-analysis/model";
import {
  InsufficientCandlesError,
  MarketDataUnavailableError,
  UpstreamTimeoutError,
} from "@/server/market-data/live-market-data";
import { loadMarketFeed } from "@/server/market-data/load-market-feed";

function error(status: number, code: string, message: string) {
  return Response.json(apiErrorSchema.parse({ error: { code, message } }), { status });
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const parsed = marketFeedQuerySchema.safeParse({
    mode: url.searchParams.get("mode"),
    timeframe: url.searchParams.get("timeframe"),
    symbol: url.searchParams.get("symbol"),
  });

  if (!parsed.success) return error(400, "INVALID_INPUT", "請確認 mode、timeframe 與 symbol。");

  try {
    return Response.json(await loadMarketFeed(parsed.data));
  } catch (cause) {
    if (cause instanceof InsufficientCandlesError) {
      return error(422, "INSUFFICIENT_CANDLES", "Insufficient closed candles.");
    }
    if (cause instanceof UpstreamTimeoutError) {
      return error(504, "UPSTREAM_TIMEOUT", "Bitget market-feed request timed out.");
    }
    if (cause instanceof MarketDataUnavailableError) {
      return error(503, "MARKET_DATA_UNAVAILABLE", "即時市場資料暫時無法取得。");
    }
    return error(500, "INTERNAL_ERROR", "Market feed 暫時無法取得，請稍後再試。");
  }
}

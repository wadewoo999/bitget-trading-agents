import { analyzeRequestSchema } from "@/features/market-analysis/model";
import { analyzeMarket } from "@/server/analysis/analyze-market";
import { InsufficientCandlesError, MarketDataUnavailableError, UpstreamTimeoutError } from "@/server/market-data/live-market-data";

function error(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try { body = await request.json(); } catch { return error(400, "INVALID_INPUT", "Request body must be valid JSON."); }
  const parsed = analyzeRequestSchema.safeParse(body);
  if (!parsed.success) return error(400, "INVALID_INPUT", "請確認 symbol、timeframe、stance 與 mode。");
  try {
    return Response.json(await analyzeMarket({ timeframe: parsed.data.timeframe, stance: parsed.data.stance, mode: parsed.data.mode }));
  } catch (cause) {
    if (cause instanceof InsufficientCandlesError) return error(422, "INSUFFICIENT_CANDLES", "At least 250 closed candles are required.");
    if (cause instanceof UpstreamTimeoutError) return error(504, "UPSTREAM_TIMEOUT", "Bitget request timed out.");
    if (cause instanceof MarketDataUnavailableError) return error(503, "MARKET_DATA_UNAVAILABLE", "即時市場資料暫時無法取得。");
    return error(500, "INTERNAL_ERROR", "分析暫時無法完成，請稍後再試。");
  }
}

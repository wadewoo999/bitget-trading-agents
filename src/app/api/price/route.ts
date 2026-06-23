import { priceQuerySchema, priceResponseSchema } from "@/features/market-analysis/model";
import { loadMarketFixture } from "@/server/market-data/load-market-fixture";
import { loadLivePrice, MarketDataUnavailableError, UpstreamTimeoutError } from "@/server/market-data/live-market-data";

function error(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const parsed = priceQuerySchema.safeParse({ mode: url.searchParams.get("mode"), symbol: url.searchParams.get("symbol") });
  if (!parsed.success) return error(400, "INVALID_INPUT", "請確認 mode 與 symbol。");
  try {
    if (parsed.data.mode === "sample") {
      const fixture = await loadMarketFixture(parsed.data.symbol, "1h");
      return Response.json(
        priceResponseSchema.parse({
          symbol: parsed.data.symbol,
          mode: "sample",
          price: fixture.tickerPrice,
          fetchedAt: new Date().toISOString(),
          fixtureVersion: fixture.version,
        }),
      );
    }
    return Response.json(priceResponseSchema.parse(await loadLivePrice(parsed.data.symbol)));
  } catch (cause) {
    if (cause instanceof UpstreamTimeoutError) return error(504, "UPSTREAM_TIMEOUT", "Bitget price request timed out.");
    if (cause instanceof MarketDataUnavailableError) return error(503, "MARKET_DATA_UNAVAILABLE", "即時價格暫時無法取得。");
    return error(500, "INTERNAL_ERROR", "價格暫時無法取得，請稍後再試。");
  }
}

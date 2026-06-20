import { analyzeRequestSchema } from "@/features/market-analysis/model";
import { analyzeSampleMarket } from "@/server/analysis/analyze-sample-market";

function error(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try { body = await request.json(); } catch { return error(400, "INVALID_INPUT", "Request body must be valid JSON."); }
  const parsed = analyzeRequestSchema.safeParse(body);
  if (!parsed.success) return error(400, "INVALID_INPUT", "請確認 symbol、timeframe、stance 與 mode。");
  if (parsed.data.mode === "live") return error(503, "MARKET_DATA_UNAVAILABLE", "第二階段僅提供 Sample Data 分析。");
  try {
    return Response.json(await analyzeSampleMarket({ timeframe: parsed.data.timeframe, stance: parsed.data.stance }));
  } catch {
    return error(500, "INTERNAL_ERROR", "分析暫時無法完成，請稍後再試。");
  }
}

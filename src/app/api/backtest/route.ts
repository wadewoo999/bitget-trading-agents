function error(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error(400, "INVALID_INPUT", "Request body must be valid JSON.");
  }

  const [{ strategyRequestSchema }, { buildStrategyConfig }, { runBacktest }] = await Promise.all([
    import("@/features/strategy-lab/model"),
    import("@/server/strategy-lab/build-strategy-config"),
    import("@/server/strategy-lab/run-backtest"),
  ]);

  const parsed = strategyRequestSchema.safeParse(body);
  if (!parsed.success) return error(400, "INVALID_INPUT", "請確認 symbol、profile、timeframe 與 idea。");

  try {
    return Response.json(await runBacktest(buildStrategyConfig(parsed.data)));
  } catch (cause) {
    return error(500, "INTERNAL_ERROR", "Strategy Lab 暫時無法完成。");
  }
}

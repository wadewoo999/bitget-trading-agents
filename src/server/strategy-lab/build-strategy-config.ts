import { strategyConfigSchema, strategyRequestSchema, type StrategyRequest } from "@/features/strategy-lab/model";

const profileRules = {
  aggressive: {
    riskPerTradePct: 1,
    entryRules: [
      "Trend confirmation with EMA20/EMA50 alignment",
      "Momentum support from RSI14 and MACD histogram",
      "Participation confirmation from volume expansion",
    ],
    exitRules: [
      "Close the trade when EMA20 trend support breaks",
      "Close the trade when momentum confirmation fades",
    ],
  },
  balanced: {
    riskPerTradePct: 0.75,
    entryRules: [
      "Trend confirmation with EMA20/EMA50 alignment",
      "Momentum support from RSI14 and MACD histogram",
      "Participation confirmation from volume expansion",
    ],
    exitRules: [
      "Close the trade when EMA20 trend support breaks",
      "Close the trade when MACD momentum turns against the position",
    ],
  },
  conservative: {
    riskPerTradePct: 0.5,
    entryRules: [
      "Trend confirmation with EMA50/EMA200 alignment",
      "Require stronger RSI confirmation before entry",
      "Avoid low-participation conditions",
    ],
    exitRules: [
      "Close the trade when higher-timeframe trend support breaks",
      "Close the trade when the setup loses directional confirmation",
    ],
  },
} as const;

export function buildStrategyConfig(input: StrategyRequest) {
  const request = strategyRequestSchema.parse(input);
  const rules = profileRules[request.profile];

  return strategyConfigSchema.parse({
    profile: request.profile,
    timeframe: request.timeframe,
    entryRules: rules.entryRules,
    exitRules: rules.exitRules,
    riskPerTradePct: rules.riskPerTradePct,
  });
}

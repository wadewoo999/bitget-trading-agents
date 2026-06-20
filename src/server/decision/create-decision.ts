import { decisionSchema, type Decision, type DecisionAction, type VolatilityRisk } from "@/features/decision/model";
import type { MarketIndicators, UserStance } from "@/features/market-analysis/model";

export function createDecision({ stance, latestClose, indicators, volatilityRisk }: { stance: UserStance; latestClose: number; indicators: MarketIndicators; volatilityRisk: VolatilityRisk }): Decision {
  const trend = latestClose > indicators.ema20 && indicators.ema20 > indicators.ema50 && indicators.ema50 > indicators.ema100 && indicators.ema100 > indicators.ema200 ? 1 : latestClose < indicators.ema20 && indicators.ema20 < indicators.ema50 && indicators.ema50 < indicators.ema100 && indicators.ema100 < indicators.ema200 ? -1 : 0;
  const momentum = indicators.macdHistogram > 0 && indicators.rsi14 >= 50 && indicators.rsi14 <= 70 ? 1 : indicators.macdHistogram < 0 && indicators.rsi14 >= 30 && indicators.rsi14 < 50 ? -1 : 0;
  const participation = indicators.volumeChangePct > 0 && indicators.priceReturn20Pct > 0 ? 1 : indicators.volumeChangePct > 0 && indicators.priceReturn20Pct < 0 ? -1 : 0;
  const crowding = indicators.fundingRate === null ? 0 : indicators.fundingRate < -0.0001 ? 1 : indicators.fundingRate > 0.0001 ? -1 : 0;
  const raw = 50 + 0.5 * (40 * trend + 25 * momentum + 20 * participation + 10 * crowding);
  const adjusted = volatilityRisk === "high" ? 50 + (raw - 50) * 0.9 : raw;
  const marketBiasScore = Math.max(0, Math.min(100, Math.round(adjusted)));
  const action: DecisionAction = marketBiasScore <= 40 ? "SHORT" : marketBiasScore >= 60 ? "LONG" : "WAIT";
  const stanceAssessment = stance === "unsure" ? "neutral" : action === "WAIT" ? "insufficient" : stance.toUpperCase() === action ? "supported" : "opposed";
  const label = (value: number) => value > 0 ? "偏多" : value < 0 ? "偏空" : "中性";
  const reasons = [`趨勢訊號${label(trend)}。`, `動能訊號${label(momentum)}。`, `成交參與度${label(participation)}。`, `資金費率擁擠訊號${label(crowding)}。`];
  const riskWarnings = ["目前使用凍結的 Sample Data，不代表即時市場。"];
  if (indicators.rsi14 < 30 || indicators.rsi14 > 70) riskWarnings.push("RSI 位於延伸區間，價格反轉風險提高。");
  if (volatilityRisk === "high") riskWarnings.push("ATR 波動率高於近期第 80 百分位。 ");
  const summary = action === "LONG" ? "市場結構綜合偏多。" : action === "SHORT" ? "市場結構綜合偏空。" : "目前訊號互相衝突，建議等待。";
  const invalidationCondition = action === "LONG" ? `若收盤跌破 EMA20（${indicators.ema20.toFixed(2)}）則重新評估。` : action === "SHORT" ? `若收盤升破 EMA20（${indicators.ema20.toFixed(2)}）則重新評估。` : "等待下一根已收盤 candle 後重新評估。";
  return decisionSchema.parse({ action, confidence: Math.max(marketBiasScore, 100 - marketBiasScore), marketBiasScore, stanceAssessment, categorySignals: { trend, momentum, participation, crowding }, volatilityRisk, summary, reasons, riskWarnings, invalidationCondition, mode: "deterministic" });
}

import { decisionSchema, type Decision, type DecisionAction, type VolatilityRisk } from "@/features/decision/model";
import type { MarketIndicators, UserStance } from "@/features/market-analysis/model";

function label(value: number) {
  return value > 0 ? "偏多" : value < 0 ? "偏空" : "中性";
}

function buildTrendSentence(latestClose: number, indicators: MarketIndicators, trend: number) {
  if (trend > 0) {
    return `價格 ${latestClose.toFixed(2)} 站在 EMA20 ${indicators.ema20.toFixed(2)} 與 EMA50 ${indicators.ema50.toFixed(2)} 之上，EMA20、EMA50、EMA80 也維持多頭排列，趨勢結構仍偏多。`;
  }
  if (trend < 0) {
    return `價格 ${latestClose.toFixed(2)} 落在 EMA20 ${indicators.ema20.toFixed(2)} 與 EMA50 ${indicators.ema50.toFixed(2)} 之下，EMA20、EMA50、EMA80 呈現空頭排列，趨勢結構仍偏空。`;
  }
  return `價格雖然靠近 EMA20 ${indicators.ema20.toFixed(2)}，但 EMA20、EMA50、EMA80 沒有形成乾淨排列，趨勢結構暫時不夠明確。`;
}

function buildMomentumSentence(indicators: MarketIndicators, momentum: number) {
  if (momentum > 0) {
    return `RSI ${indicators.rsi14.toFixed(1)} 站上 50，MACD Histogram ${indicators.macdHistogram.toFixed(2)} 維持正值，代表動能仍在支持向上延續。`;
  }
  if (momentum < 0) {
    return `RSI ${indicators.rsi14.toFixed(1)} 落在 50 下方，MACD Histogram ${indicators.macdHistogram.toFixed(2)} 維持負值，代表反彈力道不足，空方動能仍在。`;
  }
  return `RSI ${indicators.rsi14.toFixed(1)} 與 MACD Histogram ${indicators.macdHistogram.toFixed(2)} 沒有形成同向共識，動能訊號目前偏中性。`;
}

function buildParticipationSentence(indicators: MarketIndicators, participation: number) {
  if (participation > 0) {
    return `成交量變化 ${indicators.volumeChangePct.toFixed(1)}% 與 20 根報酬 ${indicators.priceReturn20Pct.toFixed(1)}% 同步轉正，表示這段上行有量能參與。`;
  }
  if (participation < 0) {
    return `成交量變化 ${indicators.volumeChangePct.toFixed(1)}% 仍有放量，但 20 根報酬 ${indicators.priceReturn20Pct.toFixed(1)}% 轉負，表示賣壓參與度偏高。`;
  }
  return `成交量變化 ${indicators.volumeChangePct.toFixed(1)}% 沒有明顯放大，20 根報酬 ${indicators.priceReturn20Pct.toFixed(1)}% 也未形成延續，成交參與度不足以單獨支持方向。`;
}

function buildCrowdingSentence(indicators: MarketIndicators, crowding: number) {
  const fundingText =
    indicators.fundingRate === null
      ? "Funding rate 缺失，擁擠度暫時只能視為中性。"
      : `Funding rate ${(indicators.fundingRate * 100).toFixed(4)}%`;
  const openInterestText =
    indicators.openInterest === null
      ? "Open interest 缺失，暫時無法確認是否有新倉追價。"
      : `Open interest ${indicators.openInterest.toFixed(0)}。`;

  if (indicators.fundingRate === null) {
    return `${fundingText}${openInterestText}`;
  }
  if (crowding > 0) {
    return `${fundingText} 偏負，代表市場空方擁擠，較容易出現反向擠壓。${openInterestText}`;
  }
  if (crowding < 0) {
    return `${fundingText} 偏正，代表多方追價略擁擠，若價格無法續強，長倉可能先被擠出。${openInterestText}`;
  }
  return `${fundingText} 接近中性，暫時沒有過度擁擠的一側。${openInterestText}`;
}

function buildActionLead(action: DecisionAction, confidence: number) {
  if (action === "LONG") {
    return `目前系統給出 LONG，confidence ${confidence}，因為趨勢、動能與參與度大致站在同一側。`;
  }
  if (action === "SHORT") {
    return `目前系統給出 SHORT，confidence ${confidence}，因為趨勢、動能與參與度大致站在空方這一側。`;
  }
  return `目前系統給出 WAIT，confidence ${confidence}，代表訊號雖然有方向傾向，但還沒有形成足夠乾淨的共識。`;
}

function buildVolatilitySentence(volatilityRisk: VolatilityRisk) {
  return volatilityRisk === "high"
    ? "目前波動偏高，代表即使方向判斷正確，進場節奏也更容易被來回掃掉。"
    : "目前波動仍在可控區間，重點回到趨勢與動能是否持續同向。";
}

function buildInvalidationCondition(action: DecisionAction, indicators: MarketIndicators, volatilityRisk: VolatilityRisk) {
  if (action === "LONG") {
    return `第一個失效點是收盤重新跌回 EMA20 ${indicators.ema20.toFixed(2)} 之下，代表短線支撐被破壞。第二個失效點是 EMA20 無法繼續站在 EMA50 ${indicators.ema50.toFixed(2)} 之上，表示趨勢排序開始鬆動。第三個失效點是 RSI 回落到 50 下方且 MACD Histogram 重新轉負，代表動能確認消失。第四個失效點是放量但價格續漲失敗，表示追價資金無法推動延續，應重新評估是否降級成 WAIT。`;
  }
  if (action === "SHORT") {
    return `第一個失效點是收盤重新站回 EMA20 ${indicators.ema20.toFixed(2)} 之上，代表短線壓力被收復。第二個失效點是 EMA20 重新翻回 EMA50 ${indicators.ema50.toFixed(2)} 之上，表示空方趨勢排序被破壞。第三個失效點是 RSI 重新站回 50 上方且 MACD Histogram 轉正，代表下跌動能開始失效。第四個失效點是價格止跌後伴隨量能回升，表示賣壓不再擴大，應先把判斷降回 WAIT 再重新觀察。`;
  }
  return `第一個重新評估點是下一根已收盤 candle 是否重新站穩 EMA20 ${indicators.ema20.toFixed(2)} 或明確跌破它，讓方向先被市場選出來。第二個重新評估點是 RSI 是否重新站回 50 上方或跌破 45 下方，確認動能是否離開中性區。第三個重新評估點是 MACD Histogram 是否回到同一側並持續擴大，避免只看單根雜訊。第四個重新評估點是量能是否同步放大，尤其在波動 ${volatilityRisk === "high" ? "偏高" : "正常"} 的情況下，沒有量能確認就不應急著進場。`;
}

export function createDecision({ stance, latestClose, indicators, volatilityRisk }: { stance: UserStance; latestClose: number; indicators: MarketIndicators; volatilityRisk: VolatilityRisk }): Decision {
  const trend = latestClose > indicators.ema20 && indicators.ema20 > indicators.ema50 && indicators.ema50 > indicators.ema80 ? 1 : latestClose < indicators.ema20 && indicators.ema20 < indicators.ema50 && indicators.ema50 < indicators.ema80 ? -1 : 0;
  const momentum = indicators.macdHistogram > 0 && indicators.rsi14 >= 50 && indicators.rsi14 <= 70 ? 1 : indicators.macdHistogram < 0 && indicators.rsi14 >= 30 && indicators.rsi14 < 50 ? -1 : 0;
  const participation = indicators.volumeChangePct > 0 && indicators.priceReturn20Pct > 0 ? 1 : indicators.volumeChangePct > 0 && indicators.priceReturn20Pct < 0 ? -1 : 0;
  const crowding = indicators.fundingRate === null ? 0 : indicators.fundingRate < -0.0001 ? 1 : indicators.fundingRate > 0.0001 ? -1 : 0;
  const raw = 50 + 0.5 * (40 * trend + 25 * momentum + 20 * participation + 10 * crowding);
  const adjusted = volatilityRisk === "high" ? 50 + (raw - 50) * 0.9 : raw;
  const marketBiasScore = Math.max(0, Math.min(100, Math.round(adjusted)));
  const action: DecisionAction = marketBiasScore <= 40 ? "SHORT" : marketBiasScore >= 60 ? "LONG" : "WAIT";
  const confidence = Math.max(marketBiasScore, 100 - marketBiasScore);
  const stanceAssessment = stance === "unsure" ? "neutral" : action === "WAIT" ? "insufficient" : stance.toUpperCase() === action ? "supported" : "opposed";
  const reasons = [`趨勢訊號${label(trend)}。`, `動能訊號${label(momentum)}。`, `成交參與度${label(participation)}。`, `資金費率擁擠訊號${label(crowding)}。`];
  const riskWarnings: string[] = [];
  if (indicators.rsi14 < 30 || indicators.rsi14 > 70) riskWarnings.push("RSI 位於延伸區間，價格反轉風險提高。");
  if (volatilityRisk === "high") riskWarnings.push("ATR 波動率高於近期第 80 百分位。 ");
  const summary = [
    buildActionLead(action, confidence),
    buildTrendSentence(latestClose, indicators, trend),
    buildMomentumSentence(indicators, momentum),
    buildParticipationSentence(indicators, participation),
    buildCrowdingSentence(indicators, crowding),
    buildVolatilitySentence(volatilityRisk),
  ].join("");
  const invalidationCondition = buildInvalidationCondition(action, indicators, volatilityRisk);

  return decisionSchema.parse({ action, confidence, marketBiasScore, stanceAssessment, categorySignals: { trend, momentum, participation, crowding }, volatilityRisk, summary, reasons, riskWarnings, invalidationCondition, mode: "deterministic" });
}

import type { DecisionAction, DecisionCategorySignals } from "@/features/decision/model";
import type { Timeframe } from "@/features/market-analysis/model";
import type { StrategyProfile, StrategyTimeframe } from "@/features/strategy-lab/model";

export type StrategySupportAttitude = "support_long" | "support_short" | "wait" | "hold";

export type StrategySupportItem = {
  profile: StrategyProfile;
  label: string;
  compatible: boolean;
  labTimeframe: StrategyTimeframe;
  attitude: StrategySupportAttitude;
  reason: string;
};

export type StrategySupportState = {
  recommended: StrategySupportItem;
  alternatives: StrategySupportItem[];
};

export const strategyProfileOrder: StrategyProfile[] = ["aggressive", "balanced", "conservative"];

export const strategyProfileLabels: Record<StrategyProfile, string> = {
  aggressive: "激進",
  balanced: "平衡",
  conservative: "穩健",
};

export const strategyAllowedTimeframes: Record<StrategyProfile, StrategyTimeframe[]> = {
  aggressive: ["15m", "1h"],
  balanced: ["4h", "1d"],
  conservative: ["1d", "1week"],
};

const baselineProfileByTimeframe: Record<Timeframe, StrategyProfile> = {
  "15m": "aggressive",
  "1h": "aggressive",
  "4h": "balanced",
  "1d": "conservative",
};

function isDirectionalConsensus(action: Exclude<DecisionAction, "WAIT">, signals: DecisionCategorySignals) {
  const expectedSignal = action === "LONG" ? 1 : -1;
  return [signals.trend, signals.momentum, signals.participation].every((value) => value === expectedSignal);
}

function shiftProfile(profile: StrategyProfile, direction: -1 | 1) {
  const currentIndex = strategyProfileOrder.indexOf(profile);
  const targetIndex = Math.min(strategyProfileOrder.length - 1, Math.max(0, currentIndex + direction));
  return strategyProfileOrder[targetIndex]!;
}

function isCompatible(profile: StrategyProfile, timeframe: Timeframe) {
  return strategyAllowedTimeframes[profile].includes(timeframe as StrategyTimeframe);
}

function getLabTimeframe(profile: StrategyProfile, timeframe: Timeframe): StrategyTimeframe {
  return isCompatible(profile, timeframe) ? (timeframe as StrategyTimeframe) : strategyAllowedTimeframes[profile][0]!;
}

function getAttitude(
  profile: StrategyProfile,
  recommendedProfile: StrategyProfile,
  timeframe: Timeframe,
  action: DecisionAction,
  confidence: number,
  signals: DecisionCategorySignals,
): StrategySupportAttitude {
  if (action === "WAIT") return profile === recommendedProfile ? "wait" : "hold";
  if (!isCompatible(profile, timeframe)) return "hold";

  const thresholds: Record<StrategyProfile, number> = {
    aggressive: 60,
    balanced: 70,
    conservative: 80,
  };

  const directionalAction = action as Exclude<DecisionAction, "WAIT">;
  const thresholdPassed = confidence >= thresholds[profile];
  const consensusPassed =
    profile === "conservative" ? isDirectionalConsensus(directionalAction, signals) : true;

  if (thresholdPassed && consensusPassed) {
    return directionalAction === "LONG" ? "support_long" : "support_short";
  }

  return profile === recommendedProfile ? (directionalAction === "LONG" ? "support_long" : "support_short") : "hold";
}

function getReason(
  item: { profile: StrategyProfile; label: string; compatible: boolean; attitude: StrategySupportAttitude },
  timeframe: Timeframe,
  action: DecisionAction,
  confidence: number,
  signals: DecisionCategorySignals,
) {
  const trendText = signals.trend > 0 ? "趨勢偏多" : signals.trend < 0 ? "趨勢偏空" : "趨勢還沒站穩";
  const momentumText = signals.momentum > 0 ? "動能配合" : signals.momentum < 0 ? "動能偏弱" : "動能中性";
  const participationText =
    signals.participation > 0 ? "參與度有跟上" : signals.participation < 0 ? "參與度偏向賣壓" : "參與度尚未確認";

  if (item.attitude === "wait") {
    if (!item.compatible) {
      return `目前 ${timeframe} 盤面還沒有形成足夠乾淨的方向共識，所以先等待。${item.label}策略本身偏保守，但它真正適用的是更高週期，而不是目前 ${timeframe}。建議動作是先等更高週期收盤確認，再切到對應 timeframe 驗證是否還值得出手。這代表現在不是直接執行${item.label}策略，而是先把它當成下一層確認。`;
    }
    return `目前 ${timeframe} 盤面還沒有形成足夠乾淨的方向共識。${trendText}、${momentumText}，但整體確認度只有 ${confidence}，因此這個策略更適合先等待。建議動作是等下一次收盤後再看趨勢與動能是否重新站到同一側。若要先做準備，可以帶入 Strategy Lab 驗證更保守的出手條件。`;
  }
  if (!item.compatible) {
    return `目前 ${timeframe} 結構不直接適用${item.label}策略。${item.label}策略主要看更高或不同節奏的週期，所以現在帶入只適合拿來做比較，不適合直接執行。若你想採用這種風格，建議先切到它對應的 timeframe 再驗證 entry。這代表現在的建議動作不是立刻進場，而是先確認週期是否匹配。`;
  }
  if (item.attitude === "support_long") {
    return item.profile === "aggressive"
      ? `目前 ${timeframe} 結構先由${item.label}策略承接。${trendText}、${momentumText}，而且 ${participationText}，代表短線可以先順著 LONG 方向觀察。這個策略容忍雜訊較高，所以適合先處理第一段延續，而不是等所有訊號都變慢。建議動作是縮小風險、優先等 pullback 或下一次確認後再跟進。`
      : `目前 ${timeframe} 的結構與確認門檻足以支持偏多參與。${trendText}、${momentumText}，同時 ${participationText}，所以這個策略不是在賭反彈，而是在等較穩定的延續。建議動作是保留 LONG 偏向，但只在確認條件沒有被破壞時執行。若接下來量能跟不上，就應回到 WAIT。`;
  }
  if (item.attitude === "support_short") {
    return item.profile === "aggressive"
      ? `目前 ${timeframe} 結構先由${item.label}策略承接。${trendText}、${momentumText}，而且 ${participationText}，代表短線仍可順著 SHORT 方向觀察。這個策略容忍雜訊較高，所以適合先吃第一段下行，而不是等到所有均線都走完。建議動作是優先等反彈不過關再跟進，不要在延伸段追空。`
      : `目前 ${timeframe} 的結構與確認門檻足以支持偏空參與。${trendText}、${momentumText}，同時 ${participationText}，所以這個策略是在等結構性走弱的延續，而不是追逐單根急跌。建議動作是保留 SHORT 偏向，但只在失效條件尚未出現時執行。若價格重新站回關鍵均線，就應先退回 WAIT。`;
  }
  return action === "WAIT"
    ? `這個策略目前沒有額外優勢。${trendText}、${momentumText}，但 ${participationText}，所以現在還不值得主動出手。建議動作是先保留，等更完整的確認。`
    : `目前對這個方向仍保留。雖然 ${trendText}，但 ${momentumText} 或 ${participationText} 還不夠完整，所以不建議把它當成主要執行策略。建議動作是先以推薦策略為主，這一張只作比較。`;
}

export function buildStrategySupportState({
  timeframe,
  action,
  confidence,
  categorySignals,
}: {
  timeframe: Timeframe;
  action: DecisionAction;
  confidence: number;
  categorySignals: DecisionCategorySignals;
}): StrategySupportState {
  const baseline = baselineProfileByTimeframe[timeframe];
  const canShiftAggressive = confidence >= 80 && action !== "WAIT" && isDirectionalConsensus(action, categorySignals);
  const recommendedProfile =
    action === "WAIT"
      ? shiftProfile(baseline, 1)
      : canShiftAggressive && isCompatible(shiftProfile(baseline, -1), timeframe)
        ? shiftProfile(baseline, -1)
        : baseline;

  const items = strategyProfileOrder.map((profile) => {
    const compatible = isCompatible(profile, timeframe);
    const attitude = getAttitude(profile, recommendedProfile, timeframe, action, confidence, categorySignals);
    return {
      profile,
      label: strategyProfileLabels[profile],
      compatible,
      labTimeframe: getLabTimeframe(profile, timeframe),
      attitude,
      reason: getReason({ profile, label: strategyProfileLabels[profile], compatible, attitude }, timeframe, action, confidence, categorySignals),
    } satisfies StrategySupportItem;
  });

  const recommended = items.find((item) => item.profile === recommendedProfile)!;
  return {
    recommended,
    alternatives: items.filter((item) => item.profile !== recommendedProfile),
  };
}

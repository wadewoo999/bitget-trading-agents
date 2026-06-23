"use client";

import { useEffect, useState } from "react";

import type { AnalyzeResponse } from "@/features/market-analysis/model";
import { buildStrategySupportState, type StrategySupportItem } from "@/features/strategy-lab/strategy-support";
import type { BacktestResult, StrategyProfile, StrategyTimeframe } from "@/features/strategy-lab/model";

type StrategyBacktestSummary = Pick<BacktestResult, "totalReturnPct" | "winRate" | "maxDrawdownPct" | "tradeCount">;

type StrategySupportPanelProps = {
  analysis: AnalyzeResponse;
  onApplyStrategyLab: (profile: StrategyProfile, timeframe: StrategyTimeframe) => void;
};

function isBacktestSummary(value: unknown): value is StrategyBacktestSummary {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StrategyBacktestSummary>;
  return (
    typeof candidate.totalReturnPct === "number" &&
    typeof candidate.winRate === "number" &&
    typeof candidate.maxDrawdownPct === "number" &&
    typeof candidate.tradeCount === "number"
  );
}

function formatSummary(summary: StrategyBacktestSummary | null, compatible: boolean) {
  if (!compatible) return "目前 timeframe 不適用";
  if (!summary) return "回測摘要載入中";
  return `Win Rate ${(summary.winRate * 100).toFixed(2)}% · Max DD ${summary.maxDrawdownPct.toFixed(2)}% · ${summary.tradeCount} trades`;
}

function attitudeText(item: StrategySupportItem) {
  switch (item.attitude) {
    case "support_long":
      return "支持 LONG";
    case "support_short":
      return "支持 SHORT";
    case "wait":
      return "建議 WAIT";
    default:
      return "保留";
  }
}

export function StrategySupportPanel({ analysis, onApplyStrategyLab }: StrategySupportPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [summaryState, setSummaryState] = useState<{
    key: string;
    values: Record<string, StrategyBacktestSummary | null>;
  }>({ key: "", values: {} });

  const supportState = buildStrategySupportState({
    timeframe: analysis.snapshot.timeframe,
    action: analysis.decision.action,
    confidence: analysis.decision.confidence,
    categorySignals: analysis.decision.categorySignals,
  });
  const analysisKey = [
    analysis.snapshot.timeframe,
    analysis.decision.action,
    analysis.decision.confidence,
    analysis.decision.categorySignals.trend,
    analysis.decision.categorySignals.momentum,
    analysis.decision.categorySignals.participation,
    analysis.decision.categorySignals.crowding,
  ].join(":");
  const summaries = summaryState.key === analysisKey ? summaryState.values : {};

  useEffect(() => {
    let cancelled = false;
    const nextSupportState = buildStrategySupportState({
      timeframe: analysis.snapshot.timeframe,
      action: analysis.decision.action,
      confidence: analysis.decision.confidence,
      categorySignals: analysis.decision.categorySignals,
    });
    const compatibleItems = [nextSupportState.recommended, ...nextSupportState.alternatives].filter((item) => item.compatible);

    void Promise.all(
      compatibleItems.map(async (item) => {
        try {
          const response = await fetch("/api/backtest", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ profile: item.profile, timeframe: item.labTimeframe, idea: "", symbol: analysis.snapshot.symbol }),
          });
          const json: unknown = await response.json();
          if (!response.ok || !isBacktestSummary(json)) return [item.profile, null] as const;
          return [item.profile, json] as const;
        } catch {
          return [item.profile, null] as const;
        }
      }),
    ).then((entries) => {
      if (cancelled) return;
      setSummaryState({ key: analysisKey, values: Object.fromEntries(entries) });
    });

    return () => {
      cancelled = true;
    };
  }, [
    analysisKey,
    analysis.snapshot.timeframe,
    analysis.decision.action,
    analysis.decision.confidence,
    analysis.decision.categorySignals,
  ]);

  return (
    <section className="panel strategy-support-panel">
      <div className="panel-header">
        <div>
          <p className="panel-label">策略支援</p>
          <h2>Strategy Support</h2>
        </div>
        <span className="panel-meta">Decision Support Layer</span>
      </div>

      <p className="panel-summary">主頁先給你即時結論，再補上哪一種交易風格最適合參與現在這個盤面。</p>

      <div className="strategy-support-card strategy-support-card-main">
        <p className="panel-label">推薦策略</p>
        <h3>{supportState.recommended.label}</h3>
        <p className="strategy-support-attitude">{attitudeText(supportState.recommended)}</p>
        <p className="summary">{supportState.recommended.reason}</p>
        <div className="analysis-meta">
          <span>適用 timeframe：{supportState.recommended.labTimeframe}</span>
          <span>{formatSummary(summaries[supportState.recommended.profile] ?? null, supportState.recommended.compatible)}</span>
        </div>
        <div className="paper-actions">
          <button
            className="analyze-button"
            onClick={() => onApplyStrategyLab(supportState.recommended.profile, supportState.recommended.labTimeframe)}
          >
            帶入 Strategy Lab 驗證
          </button>
          <button className="secondary-button" onClick={() => setExpanded((value) => !value)}>
            {expanded ? "收起另外兩個策略" : "查看另外兩個策略"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="strategy-support-grid">
          {supportState.alternatives.map((item) => (
            <section className="strategy-support-card" key={item.profile}>
              <p className="panel-label">{item.label}</p>
              <p className="strategy-support-attitude">{attitudeText(item)}</p>
              <p className="summary">{item.reason}</p>
              <div className="analysis-meta">
                <span>{item.compatible ? "適合目前 timeframe" : "目前 timeframe 不適用"}</span>
                <span>{formatSummary(summaries[item.profile] ?? null, item.compatible)}</span>
              </div>
              <div className="paper-actions">
                <button
                  className="secondary-button"
                  disabled={!item.compatible}
                  onClick={() => onApplyStrategyLab(item.profile, item.labTimeframe)}
                >
                  {item.compatible ? "帶入 Strategy Lab" : "目前 timeframe 不適用"}
                </button>
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

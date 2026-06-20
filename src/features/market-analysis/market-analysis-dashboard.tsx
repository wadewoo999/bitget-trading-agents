"use client";

import { useState } from "react";
import { AnalysisControls } from "@/components/dashboard/analysis-controls";
import { AnalysisDetails } from "@/components/dashboard/analysis-details";
import { DecisionCard } from "@/components/dashboard/decision-card";
import { IndicatorGrid } from "@/components/dashboard/indicator-grid";
import { MarketChart } from "@/components/dashboard/market-chart";
import { analyzeResponseSchema, type AnalyzeResponse, type Timeframe, type UserStance } from "@/features/market-analysis/model";

export function MarketAnalysisDashboard() {
  const [timeframe,setTimeframe] = useState<Timeframe>("1h"); const [stance,setStance] = useState<UserStance>("unsure"); const [loading,setLoading] = useState(false); const [data,setData] = useState<AnalyzeResponse | null>(null); const [error,setError] = useState<string | null>(null);
  async function analyze() { setLoading(true); setError(null); try { const response = await fetch("/api/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ symbol: "BTCUSDT", timeframe, stance, mode: "sample" }) }); const json: unknown = await response.json(); if (!response.ok) throw new Error("分析暫時無法完成。"); const parsed = analyzeResponseSchema.safeParse(json); if (!parsed.success) throw new Error("分析資料格式無效。"); setData(parsed.data); } catch (reason) { setData(null); setError(reason instanceof Error ? reason.message : "分析暫時無法完成。"); } finally { setLoading(false); } }
  return <main className="workspace"><header className="topbar"><a className="brand" href="https://github.com/wadewoo999/bitget-trading-agents">BITGET / BTC DECISION WORKSPACE</a><span className="sample-badge">SAMPLE DATA</span></header><section className="intro"><p>BITGET AI BASE CAMP HACKATHON S1</p><h1>釐清當前 BTC 交易方向</h1><span>選擇時間級別與你的初始觀點，系統會用可追溯指標整理下一步。</span></section><div className="workspace-grid"><AnalysisControls timeframe={timeframe} stance={stance} loading={loading} onTimeframe={setTimeframe} onStance={setStance} onAnalyze={analyze}/><div className="results">{error && <div className="error-panel" role="alert">{error}</div>}{data ? <><DecisionCard data={data}/><MarketChart points={data.chart}/><IndicatorGrid data={data}/><AnalysisDetails data={data}/></> : !error && <section className="panel empty-state"><p className="panel-label">READY</p><h2>選擇條件後開始分析</h2><p>結果將顯示 0–100 score、方向、EMA 圖表、理由與風險。</p></section>}</div></div><footer className="workspace-footer"><span>READ-ONLY MARKET ANALYSIS · PHASE 2</span><span>NO REAL TRADING</span></footer></main>;
}

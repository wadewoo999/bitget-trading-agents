"use client";

import { useState } from "react";

import { strategyAllowedTimeframes, strategyProfileLabels } from "@/features/strategy-lab/strategy-support";
import type { BacktestResult, StrategyProfile, StrategyTimeframe } from "@/features/strategy-lab/model";
import type { Symbol } from "@/features/market-analysis/model";

type StrategyLabPanelProps = {
  symbol: Symbol;
  selectedProfile: StrategyProfile;
  selectedTimeframe: StrategyTimeframe;
  selectedNotice: string | null;
  onSelectionChange: (profile: StrategyProfile, timeframe: StrategyTimeframe) => void;
};

function formatPercent(value: number, digits = 2) {
  return `${value.toFixed(digits)}%`;
}

function buildEquityCurvePolyline(result: BacktestResult) {
  if (result.equityCurve.length === 0) return "";
  const equities = result.equityCurve.map((point) => point.equity);
  const minEquity = Math.min(...equities);
  const maxEquity = Math.max(...equities);
  const spread = maxEquity - minEquity || 1;

  return result.equityCurve
    .map((point, index) => {
      const x = (index / Math.max(result.equityCurve.length - 1, 1)) * 100;
      const y = 100 - ((point.equity - minEquity) / spread) * 100;
      return `${x},${y}`;
    })
    .join(" ");
}

function isBacktestResult(value: unknown): value is BacktestResult {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<BacktestResult>;
  return (
    !!candidate.strategy &&
    typeof candidate.strategy.profile === "string" &&
    typeof candidate.strategy.timeframe === "string" &&
    Array.isArray(candidate.strategy.entryRules) &&
    Array.isArray(candidate.strategy.exitRules) &&
    typeof candidate.totalReturnPct === "number" &&
    typeof candidate.maxDrawdownPct === "number" &&
    typeof candidate.winRate === "number" &&
    typeof candidate.tradeCount === "number"
  );
}

export function StrategyLabPanel({
  symbol,
  selectedProfile,
  selectedTimeframe,
  selectedNotice,
  onSelectionChange,
}: StrategyLabPanelProps) {
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);

  async function runStrategyLab() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/backtest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ symbol, profile: selectedProfile, timeframe: selectedTimeframe, idea }),
      });
      const json: unknown = await response.json();
      if (!response.ok) throw new Error("Strategy Lab 暫時無法完成。");
      if (!isBacktestResult(json)) throw new Error("Strategy Lab 回傳格式無效。");
      setResult(json);
    } catch (reason) {
      setResult(null);
      setError(reason instanceof Error ? reason.message : "Strategy Lab 暫時無法完成。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel strategy-lab-panel">
      <div className="panel-header">
        <div>
          <p className="panel-label">STRATEGY LAB</p>
          <h2>Strategy Lab</h2>
        </div>
        <span className="panel-meta">Deterministic Backtest</span>
      </div>
      <p className="panel-summary">先驗證固定 profile 的歷史表現；它不改寫當前 decision，也不會自動建立 paper trade。</p>
      {selectedNotice && <p className="strategy-lab-prefill">{selectedNotice}</p>}

      <div className="strategy-lab-controls">
        <div>
          <p className="panel-label">Profile</p>
          <div className="choice-grid stance">
            {(["aggressive", "balanced", "conservative"] as const).map((value) => (
              <button
                className={selectedProfile === value ? "choice active" : "choice"}
                disabled={loading}
                key={value}
                onClick={() => {
                  onSelectionChange(value, strategyAllowedTimeframes[value][0]!);
                }}
              >
                {strategyProfileLabels[value]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="panel-label spaced">Timeframe</p>
          <div className="choice-grid stance">
            {strategyAllowedTimeframes[selectedProfile].map((value) => (
              <button
                className={selectedTimeframe === value ? "choice active" : "choice"}
                disabled={loading}
                key={value}
                onClick={() => onSelectionChange(selectedProfile, value)}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <label className="strategy-lab-idea">
          <span className="panel-label spaced">Optional Idea</span>
          <textarea
            className="strategy-lab-textarea"
            disabled={loading}
            maxLength={500}
            onChange={(event) => setIdea(event.target.value)}
            placeholder="V1 只保存這段補充，不改動 deterministic 規則。"
            value={idea}
          />
        </label>

        <button className="analyze-button" disabled={loading} onClick={runStrategyLab}>
          {loading ? "Strategy Lab 執行中…" : "Run Strategy Lab"}
        </button>
      </div>

      {error && (
        <div className="error-panel" role="alert">
          {error}
        </div>
      )}

      {result && (
        <div className="strategy-lab-result">
          <div className="strategy-lab-metrics">
            <div className="metric">
              <p className="panel-label">Total Return</p>
              <strong className={result.totalReturnPct >= 0 ? "positive" : "negative"}>{formatPercent(result.totalReturnPct)}</strong>
            </div>
            <div className="metric">
              <p className="panel-label">Win Rate</p>
              <strong>{formatPercent(result.winRate * 100)}</strong>
            </div>
            <div className="metric">
              <p className="panel-label">Max Drawdown</p>
              <strong>{formatPercent(result.maxDrawdownPct)}</strong>
            </div>
            <div className="metric">
              <p className="panel-label">Trade Count</p>
              <strong>{result.tradeCount}</strong>
            </div>
            <div className="metric">
              <p className="panel-label">Sharpe Ratio</p>
              <strong>{result.sharpeRatio.toFixed(2)}</strong>
            </div>
          </div>

          <div className="detail-grid">
            <section className="paper-card">
              <p className="panel-label">Entry Rules</p>
              <ul>
                {result.strategy.entryRules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </section>
            <section className="paper-card">
              <p className="panel-label">Exit Rules</p>
              <ul>
                {result.strategy.exitRules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </section>
          </div>

          <section className="paper-card strategy-lab-curve-card">
            <div className="paper-summary">
              <p className="panel-label">Equity Curve</p>
              <span>
                {result.periodStart.slice(0, 10)} → {result.periodEnd.slice(0, 10)}
              </span>
            </div>
            <svg aria-label="Strategy Lab equity curve" className="strategy-lab-curve" preserveAspectRatio="none" viewBox="0 0 100 100">
              <polyline fill="none" points={buildEquityCurvePolyline(result)} stroke="#7cf0b7" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </svg>
          </section>

          <section className="paper-card">
            <div className="paper-summary">
              <p className="panel-label">Recent Trades</p>
              <span>{result.trades.length} trades</span>
            </div>
            <div className="ledger-table-wrap">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Side</th>
                    <th>Entry</th>
                    <th>Exit</th>
                    <th>PnL</th>
                    <th>Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {result.trades.slice(-5).reverse().map((trade) => (
                    <tr key={trade.id}>
                      <td>{trade.id}</td>
                      <td>{trade.side}</td>
                      <td>{trade.entryPrice.toFixed(2)}</td>
                      <td>{trade.exitPrice.toFixed(2)}</td>
                      <td className={trade.pnl >= 0 ? "positive" : "negative"}>{trade.pnl.toFixed(2)}</td>
                      <td>{trade.fee.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

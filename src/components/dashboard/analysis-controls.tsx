import { SYMBOLS, type Symbol, type Timeframe, type UserStance } from "@/features/market-analysis/model";

export function AnalysisControls({
  symbol,
  timeframe,
  stance,
  loading,
  onSymbol,
  onTimeframe,
  onStance,
  onAnalyze,
}: {
  symbol: Symbol;
  timeframe: Timeframe;
  stance: UserStance;
  loading: boolean;
  onSymbol: (value: Symbol) => void;
  onTimeframe: (value: Timeframe) => void;
  onStance: (value: UserStance) => void;
  onAnalyze: () => void;
}) {
  return (
    <section className="panel controls">
      <p className="panel-label spaced">SYMBOL</p>
      <select
        className="symbol-select"
        disabled={loading}
        value={symbol}
        onChange={(e) => onSymbol(e.target.value as Symbol)}
      >
        {SYMBOLS.map((sym) => (
          <option key={sym} value={sym}>{sym}</option>
        ))}
      </select>

      <p className="panel-label spaced">TIMEFRAME</p>
      <div className="choice-grid">
        {(["15m", "1h", "4h", "1d"] as const).map((value) => (
          <button
            className={timeframe === value ? "choice active" : "choice"}
            disabled={loading}
            key={value}
            onClick={() => onTimeframe(value)}
          >
            {value}
          </button>
        ))}
      </div>

      <p className="panel-label spaced">你的初始觀點</p>
      <div className="choice-grid stance">
        {([
          ["unsure", "不確定"],
          ["long", "偏多"],
          ["short", "偏空"],
        ] as const).map(([value, label]) => (
          <button
            className={stance === value ? "choice active" : "choice"}
            disabled={loading}
            key={value}
            onClick={() => onStance(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <button className="analyze-button" disabled={loading} onClick={onAnalyze}>
        {loading ? "分析中…" : "分析市場"}
      </button>
    </section>
  );
}

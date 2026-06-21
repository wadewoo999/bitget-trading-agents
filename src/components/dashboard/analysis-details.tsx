import type { AnalyzeResponse } from "@/features/market-analysis/model";

export function AnalysisDetails({ data }: { data: AnalyzeResponse }) {
  return (
    <>
      <section className="detail-grid">
        <article className="panel">
          <p className="panel-label">支持理由</p>
          <ul>
            {data.decision.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </article>

        {data.completenessWarnings.length > 0 && (
          <article className="panel">
            <p className="panel-label">資料完整性</p>
            <ul>
              {data.completenessWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </article>
        )}

        {data.decision.riskWarnings.length > 0 && (
          <article className="panel warning">
            <p className="panel-label">風險提醒</p>
            <ul>
              {data.decision.riskWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </article>
        )}
      </section>

      <footer className="analysis-meta">
        <span>{data.snapshot.mode === "sample" ? `Fixture：${data.snapshot.fixtureVersion}` : "Source：Bitget live market data"}</span>
        <span>分析擷取：{new Date(data.snapshot.sourceRequestTime).toLocaleString("zh-TW")}</span>
        <span>最後收盤：{new Date(data.snapshot.lastClosedCandleAt).toLocaleString("zh-TW")}</span>
        <span>此分析結果不會自動更新，若要刷新判斷請重新分析。</span>
      </footer>
    </>
  );
}

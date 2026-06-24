import type { AnalyzeResponse } from "@/features/market-analysis/model";

const stanceText = { neutral: "未指定方向", supported: "你的觀點獲得支持", opposed: "市場資料反對你的觀點", insufficient: "目前證據不足" };

function splitNarrative(text: string) {
  return text
    .split(/(?<=[。！？])/u)
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitInvalidation(text: string) {
  return text
    .split(/(?=第[一二三四五六七八九十]+個失效點)/u)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function DecisionCard({ data }: { data: AnalyzeResponse }) {
  const { decision } = data;
  const summaryParts = splitNarrative(decision.summary);
  const invalidationParts = splitInvalidation(decision.invalidationCondition);

  return (
    <section className="panel decision-card">
      <div className="decision-primary">
        <p className="panel-label">SYSTEM DECISION</p>
        <div className={`decision-action ${decision.action.toLowerCase()}`}>
          {decision.action}
          <span>{decision.marketBiasScore} / 100</span>
        </div>
        <div className="score-bar">
          <i style={{ left: `${decision.marketBiasScore}%` }} />
        </div>
        <p className="stance-assessment">{stanceText[decision.stanceAssessment]}</p>
      </div>

      <div className="decision-copy">
        <section className="decision-copy-block">
          <p className="panel-label">判斷摘要</p>
          <div className="decision-paragraphs">
            {summaryParts.map((part) => (
              <p className="summary" key={part}>
                {part}
              </p>
            ))}
          </div>
        </section>

        <section className="decision-copy-block">
          <p className="panel-label spaced">失效條件</p>
          <div className="decision-paragraphs">
            {invalidationParts.map((part) => (
              <p className="invalidation" key={part}>
                {part}
              </p>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

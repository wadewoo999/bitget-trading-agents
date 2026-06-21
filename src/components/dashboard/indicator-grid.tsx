import type { AnalyzeResponse } from "@/features/market-analysis/model";

function renderAvailability(
  label: string,
  value: number | null,
  formatter: (input: number) => string,
  unavailableText = `${label} 不可用`,
) {
  return value === null ? unavailableText : `${label} ${formatter(value)}`;
}

export function IndicatorGrid({ data }: { data: AnalyzeResponse }) {
  const s = data.decision.categorySignals;
  const i = data.snapshot.indicators;

  const cards = [
    ["TREND", s.trend, `EMA20 ${i.ema20.toFixed(0)}`],
    ["MOMENTUM", s.momentum, `RSI ${i.rsi14.toFixed(1)}`],
    ["PARTICIPATION", s.participation, `Volume ${i.volumeChangePct.toFixed(1)}%`],
    [
      "CROWDING",
      s.crowding,
      renderAvailability(
        "Funding",
        i.fundingRate,
        (value) => `${(value * 100).toFixed(4)}%`,
        "Funding 不可用（缺失資料，Crowding 顯示 neutral）",
      ),
    ],
    [
      "OPEN INTEREST",
      0,
      renderAvailability("OI", i.openInterest, (value) => value.toFixed(0)),
    ],
  ] as const;

  return (
    <section className="indicator-grid">
      {cards.map(([label, value, detail]) => (
        <article className="metric" key={label}>
          <p className="panel-label">{label}</p>
          <strong className={value > 0 ? "positive" : value < 0 ? "negative" : "neutral"}>
            {value > 0 ? "+1" : value}
          </strong>
          <small>{detail}</small>
        </article>
      ))}
    </section>
  );
}

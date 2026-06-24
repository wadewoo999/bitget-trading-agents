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
  const latestPrice = data.snapshot.latestPrice;

  function signalText(value: number) {
    if (value > 0) return "偏多";
    if (value < 0) return "偏空";
    return "中性";
  }

  const cards = [
    {
      label: "TREND",
      value: s.trend,
      detail: `EMA20 ${i.ema20.toFixed(0)}`,
      explanation:
        s.trend > 0
          ? "價格目前站在 EMA20 與 EMA50 之上，EMA 結構偏多。"
          : s.trend < 0
            ? "價格目前落在 EMA20 與 EMA50 之下，EMA 結構偏空。"
            : `價格 ${latestPrice.toFixed(0)} 靠近 EMA20，但均線排序還沒有拉開。`,
    },
    {
      label: "MOMENTUM",
      value: s.momentum,
      detail: `RSI ${i.rsi14.toFixed(1)}`,
      explanation:
        s.momentum > 0
          ? "RSI 與 MACD 同步站在多方，推動力仍在。"
          : s.momentum < 0
            ? "RSI 仍在 50 下方，MACD 也偏弱，反彈動能不足。"
            : `RSI ${i.rsi14.toFixed(1)} 靠近中線，MACD 沒有明顯擴張，動能偏中性。`,
    },
    {
      label: "PARTICIPATION",
      value: s.participation,
      detail: `Volume ${i.volumeChangePct.toFixed(1)}%`,
      explanation:
        s.participation > 0
          ? "量能與漲幅同步擴張，這段 move 有資金參與。"
          : s.participation < 0
            ? "量能放大但報酬轉負，代表賣壓參與更強。"
            : "量能沒有明顯放大，這波方向還缺少成交確認。",
    },
    {
      label: "CROWDING",
      value: s.crowding,
      detail: renderAvailability(
        "Funding",
        i.fundingRate,
        (value) => `${(value * 100).toFixed(4)}%`,
        "Funding 不可用（缺失資料，Crowding 顯示 neutral）",
      ),
      explanation:
        i.fundingRate === null
          ? "缺少 funding rate，所以目前無法判定是否有一側過度擁擠。"
          : s.crowding > 0
            ? "Funding 偏負，代表空方倉位較擁擠，需提防反向擠壓。"
            : s.crowding < 0
              ? "Funding 偏正，代表多方追價較擁擠，續漲失敗時容易回吐。"
              : "Funding 接近中性，沒有看到明顯擁擠的一側。",
    },
    {
      label: "OPEN INTEREST",
      value: 0,
      detail: renderAvailability("OI", i.openInterest, (value) => value.toFixed(0)),
      explanation:
        i.openInterest === null
          ? "Open interest 缺失，暫時看不出是否有新資金在堆倉。"
          : `OI ${i.openInterest.toFixed(0)} 代表目前未平倉合約規模，需搭配價格與 funding 一起看，不能單獨判多空。`,
    },
  ] as const;

  return (
    <section className="indicator-grid">
      {cards.map(({ label, value, detail, explanation }) => (
        <article className="metric" key={label}>
          <div className="metric-head">
            <p className="panel-label">{label}</p>
            <span className={value > 0 ? "metric-signal positive" : value < 0 ? "metric-signal negative" : "metric-signal neutral"}>
              {signalText(value)}
            </span>
          </div>
          <div className="metric-body">
            <small>{detail}</small>
            <p className="metric-explanation">{explanation}</p>
          </div>
        </article>
      ))}
    </section>
  );
}

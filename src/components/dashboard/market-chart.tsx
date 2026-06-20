import type { ChartPoint } from "@/features/market-analysis/model";

export function MarketChart({ points }: { points: ChartPoint[] }) {
  const keys = ["close", "ema20", "ema50", "ema100", "ema200"] as const; const colors = ["#79a7ff", "#49d49d", "#e7bd55", "#e88663", "#9a83ff"];
  const values = points.flatMap((point) => keys.map((key) => point[key])); const min = Math.min(...values); const max = Math.max(...values); const range = max - min || 1;
  const path = (key: typeof keys[number]) => points.map((point,index) => `${index ? "L" : "M"}${(index/(points.length-1))*700},${170-((point[key]-min)/range)*150}`).join(" ");
  return <section className="market-chart" aria-label="Close 與 EMA 趨勢圖"><div className="chart-legend">{keys.map((key,index) => <span key={key} style={{ color: colors[index] }}>{key.toUpperCase()}</span>)}</div><svg role="img" aria-label="最近 80 根 candle 的 Close 與 EMA 線圖" viewBox="0 0 700 180" preserveAspectRatio="none">{keys.map((key,index) => <path d={path(key)} fill="none" key={key} stroke={colors[index]} strokeWidth={key === "close" ? 2.5 : 1.5}/>)}</svg></section>;
}

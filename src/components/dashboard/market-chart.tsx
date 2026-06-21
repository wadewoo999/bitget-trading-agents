import type { MarketFeedCandle, Timeframe } from "@/features/market-analysis/model";
import { calculateEma } from "@/server/indicators/ema";

const CHART_WIDTH = 700;
const CHART_HEIGHT = 220;
const PLOT_TOP = 12;
const PLOT_HEIGHT = 168;
const MIN_BODY_HEIGHT = 2;

function formatFetchedAt(fetchedAt: string) {
  return new Date(fetchedAt).toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function MarketChart({
  timeframe,
  price,
  fetchedAt,
  candles,
}: {
  timeframe: Timeframe;
  price: number;
  fetchedAt: string;
  candles: MarketFeedCandle[];
}) {
  const ema20 = calculateEma(
    candles.map((candle) => candle.close),
    20,
  );
  const prices = candles.flatMap((candle, index) => [candle.high, candle.low, ema20[index]!]);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;
  const candleGap = candles.length > 1 ? CHART_WIDTH / (candles.length - 1) : CHART_WIDTH;
  const candleBodyWidth = Math.min(Math.max(candleGap * 0.55, 4), 10);
  const toY = (value: number) => PLOT_TOP + ((maxPrice - value) / priceRange) * PLOT_HEIGHT;
  const toX = (index: number) =>
    candles.length === 1 ? CHART_WIDTH / 2 : (index / (candles.length - 1)) * CHART_WIDTH;
  const emaPath = ema20
    .map((value, index) => `${index === 0 ? "M" : "L"}${toX(index)},${toY(value)}`)
    .join(" ");

  return (
    <section className="market-chart" aria-label="BTCUSDT 市場 K 線圖">
      <div className="market-feed-header">
        <div>
          <p className="panel-label">MARKET FEED</p>
          <h2>最新價格</h2>
        </div>
        <div>
          <div className="market-feed-price">{price.toFixed(2)}</div>
          <div className="analysis-meta">
            <span>{timeframe}</span>
            <span>{formatFetchedAt(fetchedAt)}</span>
          </div>
        </div>
      </div>

      <div className="chart-legend">
        <span>BTCUSDT · {timeframe}</span>
        <span style={{ color: "#79a7ff" }}>EMA20</span>
      </div>

      <svg
        role="img"
        aria-label={`BTCUSDT ${timeframe} candlestick chart`}
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
      >
        {candles.map((candle, index) => {
          const x = toX(index);
          const openY = toY(candle.open);
          const closeY = toY(candle.close);
          const highY = toY(candle.high);
          const lowY = toY(candle.low);
          const bullish = candle.close >= candle.open;
          const bodyY = Math.min(openY, closeY);
          const bodyHeight = Math.max(Math.abs(closeY - openY), MIN_BODY_HEIGHT);

          return (
            <g key={candle.openTime}>
              <line
                x1={x}
                x2={x}
                y1={highY}
                y2={lowY}
                stroke={bullish ? "#49d49d" : "#e88663"}
                strokeWidth={1.5}
              />
              <rect
                data-candle-body="true"
                x={x - candleBodyWidth / 2}
                y={bodyY}
                width={candleBodyWidth}
                height={bodyHeight}
                fill={bullish ? "#49d49d" : "#e88663"}
                rx={1}
              />
            </g>
          );
        })}

        <path
          data-ema-line="ema20"
          d={emaPath}
          fill="none"
          stroke="#79a7ff"
          strokeWidth={2}
        />
      </svg>
    </section>
  );
}

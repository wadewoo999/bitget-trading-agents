# Live Market Feed and Chart Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 補齊市場分析頁的市場觀測層，修復 `funding / OI` 缺失顯示，新增獨立 market-feed API，並讓 `sample` / `live` 都能每 30 秒更新最新價格與 K 線圖而不重跑分析。

**Architecture:** 保留既有 `/api/analyze` 作為手動分析快照來源，新增獨立 `/api/market-feed` 作為市場觀測資料流。Server 端用共用 market-feed 組裝流程統一 `sample` / `live` 輸出；前端將 `analysisData` 與 `marketFeed` state 分離，讓輪詢只更新價格與圖表。圖表改為 K 線圖為主，第一版疊加單條 EMA20。

**Tech Stack:** Next.js App Router、React client components、TypeScript、Zod、Vitest、既有 Bitget public futures live provider

---

## File Structure

- Create: `src/server/market-data/load-market-feed.ts`
  - 組裝 `sample` / `live` market-feed response，共用 route 使用
- Create: `src/app/api/market-feed/route.ts`
  - 提供 `GET /api/market-feed`
- Modify: `src/features/market-analysis/model.ts`
  - 新增 market-feed request / response schema 與型別
- Modify: `src/features/market-analysis/market-analysis-dashboard.tsx`
  - 分離 `analysisData` / `marketFeed` state，新增 30 秒輪詢
- Modify: `src/components/dashboard/market-chart.tsx`
  - 改成 K 線圖，支援 EMA20 疊加
- Modify: `src/components/dashboard/indicator-grid.tsx`
  - 修復 `funding / OI` 缺失顯示
- Modify: `src/components/dashboard/analysis-details.tsx`
  - 補分析快照不自動更新提示，並保留分析時間 / 收盤時間
- Modify: `src/app/globals.css`
  - 補市場觀測區塊與 K 線圖樣式
- Modify: `README.md`
  - 補 market-feed 與 30 秒價格刷新說明
- Test: `tests/integration/market-feed-route.test.ts`
  - 新 API integration tests
- Test: `tests/unit/market-analysis-dashboard.test.tsx`
  - 輪詢只更新 market feed、不覆蓋 analysis data
- Test: `tests/unit/indicator-grid.test.tsx`
  - `funding / OI` 缺失顯示為不可用
- Test: `tests/unit/market-chart.test.tsx`
  - K 線圖基本渲染與 timeframe 標示

### Task 1: 建立 market-feed contract 與 route

**Files:**
- Create: `src/server/market-data/load-market-feed.ts`
- Modify: `src/features/market-analysis/model.ts`
- Create: `src/app/api/market-feed/route.ts`
- Test: `tests/integration/market-feed-route.test.ts`

- [ ] **Step 1: 寫 market-feed schema 的 failing test**

在 `tests/integration/market-feed-route.test.ts` 建立：

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/market-data/load-market-feed", () => ({
  loadMarketFeed: vi.fn(),
}));

import { GET } from "@/app/api/market-feed/route";
import { marketFeedResponseSchema } from "@/features/market-analysis/model";
import { loadMarketFeed } from "@/server/market-data/load-market-feed";

describe("GET /api/market-feed", () => {
  it("returns validated sample market-feed data", async () => {
    vi.mocked(loadMarketFeed).mockResolvedValue({
      symbol: "BTCUSDT",
      mode: "sample",
      timeframe: "1h",
      price: 100000,
      fetchedAt: "2026-06-21T00:00:00.000Z",
      fixtureVersion: "fixture-2026-06-20",
      completenessWarnings: [],
      candles: [
        {
          openTime: "2026-06-20T00:00:00.000Z",
          closeTime: "2026-06-20T00:59:59.999Z",
          open: 100,
          high: 110,
          low: 90,
          close: 105,
          volume: 123,
        },
      ],
    });

    const response = await GET(
      new Request("http://localhost/api/market-feed?mode=sample&timeframe=1h"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(marketFeedResponseSchema.parse(json).mode).toBe("sample");
  });
});
```

- [ ] **Step 2: 執行測試確認目前失敗**

Run: `npm test -- tests/integration/market-feed-route.test.ts`  
Expected: FAIL，因為 `marketFeedResponseSchema`、`loadMarketFeed`、`/api/market-feed` 尚不存在

- [ ] **Step 3: 在 model 新增 market-feed schema**

在 `src/features/market-analysis/model.ts` 新增：

```ts
export const marketFeedQuerySchema = z.object({
  mode: marketDataModeSchema,
  timeframe: timeframeSchema,
});

export const marketFeedCandleSchema = z.object({
  openTime: z.string().datetime(),
  closeTime: z.string().datetime(),
  open: z.number().positive(),
  high: z.number().positive(),
  low: z.number().positive(),
  close: z.number().positive(),
  volume: z.number().nonnegative(),
});

export const marketFeedResponseSchema = z
  .object({
    symbol: z.literal("BTCUSDT"),
    mode: marketDataModeSchema,
    timeframe: timeframeSchema,
    price: z.number().positive(),
    fetchedAt: z.string().datetime(),
    fixtureVersion: z.string().min(1).nullable(),
    completenessWarnings: z.array(z.string().min(1)),
    candles: z.array(marketFeedCandleSchema).min(1),
  })
  .superRefine(({ fixtureVersion, mode }, context) => {
    if (mode === "sample" && fixtureVersion === null) {
      context.addIssue({ code: "custom", path: ["fixtureVersion"], message: "Sample market-feed requires a fixture version" });
    }
    if (mode === "live" && fixtureVersion !== null) {
      context.addIssue({ code: "custom", path: ["fixtureVersion"], message: "Live market-feed cannot declare a fixture version" });
    }
  });

export type MarketFeedQuery = z.infer<typeof marketFeedQuerySchema>;
export type MarketFeedCandle = z.infer<typeof marketFeedCandleSchema>;
export type MarketFeedResponse = z.infer<typeof marketFeedResponseSchema>;
```

- [ ] **Step 4: 寫 minimal server loader**

建立 `src/server/market-data/load-market-feed.ts`：

```ts
import {
  marketFeedResponseSchema,
  type MarketDataMode,
  type MarketFeedResponse,
  type Timeframe,
} from "@/features/market-analysis/model";
import { loadMarketFixture } from "@/server/market-data/load-market-fixture";
import { loadLiveMarketData } from "@/server/market-data/live-market-data";
import { fixtureToNormalizedMarketData } from "@/server/market-data/normalized-market-data";

const CHART_CANDLE_COUNT = 80;

export async function loadMarketFeed({
  mode,
  timeframe,
}: {
  mode: MarketDataMode;
  timeframe: Timeframe;
}): Promise<MarketFeedResponse> {
  const marketData =
    mode === "sample"
      ? fixtureToNormalizedMarketData(await loadMarketFixture(timeframe))
      : await loadLiveMarketData(timeframe);

  const completenessWarnings =
    mode === "sample"
      ? ["Sample Data 為凍結快照，不代表即時市場。"]
      : [
          ...(marketData.fundingRate === null
            ? ["Funding rate unavailable; market context is partial."]
            : []),
          ...(marketData.openInterest === null
            ? ["Open interest unavailable; market context is partial."]
            : []),
        ];

  return marketFeedResponseSchema.parse({
    symbol: "BTCUSDT",
    mode,
    timeframe,
    price: marketData.latestPrice,
    fetchedAt: marketData.fetchedAt,
    fixtureVersion: marketData.fixtureVersion,
    completenessWarnings,
    candles: marketData.candles.slice(-CHART_CANDLE_COUNT),
  });
}
```

- [ ] **Step 5: 建立 route**

建立 `src/app/api/market-feed/route.ts`：

```ts
import { NextResponse } from "next/server";
import {
  apiErrorSchema,
  marketFeedQuerySchema,
} from "@/features/market-analysis/model";
import {
  InsufficientCandlesError,
  MarketDataUnavailableError,
  UpstreamTimeoutError,
} from "@/server/market-data/live-market-data";
import { loadMarketFeed } from "@/server/market-data/load-market-feed";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = marketFeedQuerySchema.safeParse({
    mode: searchParams.get("mode"),
    timeframe: searchParams.get("timeframe"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      apiErrorSchema.parse({
        error: { code: "INVALID_INPUT", message: "Invalid market-feed query." },
      }),
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await loadMarketFeed(parsed.data));
  } catch (error) {
    if (error instanceof InsufficientCandlesError) {
      return NextResponse.json({ error: { code: "INSUFFICIENT_CANDLES", message: "Insufficient closed candles." } }, { status: 422 });
    }
    if (error instanceof UpstreamTimeoutError) {
      return NextResponse.json({ error: { code: "UPSTREAM_TIMEOUT", message: "Market-feed request timed out." } }, { status: 504 });
    }
    if (error instanceof MarketDataUnavailableError) {
      return NextResponse.json({ error: { code: "MARKET_DATA_UNAVAILABLE", message: "Market-feed data is unavailable." } }, { status: 503 });
    }
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Market-feed failed." } }, { status: 500 });
  }
}
```

- [ ] **Step 6: 跑 route 測試確認通過**

Run: `npm test -- tests/integration/market-feed-route.test.ts`  
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/features/market-analysis/model.ts src/server/market-data/load-market-feed.ts src/app/api/market-feed/route.ts tests/integration/market-feed-route.test.ts
git commit -m "feat: add market feed api"
```

### Task 2: 修復 `funding / OI` 缺失顯示

**Files:**
- Modify: `src/components/dashboard/indicator-grid.tsx`
- Test: `tests/unit/indicator-grid.test.tsx`

- [ ] **Step 1: 寫 UI failing test**

建立 `tests/unit/indicator-grid.test.tsx`：

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IndicatorGrid } from "@/components/dashboard/indicator-grid";

const data = {
  decision: { categorySignals: { trend: 0, momentum: 0, participation: 0, crowding: 0 } },
  snapshot: {
    indicators: {
      ema20: 1,
      rsi14: 50,
      volumeChangePct: 0,
      fundingRate: null,
      openInterest: null,
    },
  },
} as any;

describe("IndicatorGrid", () => {
  it("shows unavailable when funding or open interest is missing", () => {
    render(<IndicatorGrid data={data} />);
    expect(screen.getByText("不可用")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 執行測試確認目前失敗**

Run: `npm test -- tests/unit/indicator-grid.test.tsx`  
Expected: FAIL，因為目前組件沒有顯示「不可用」

- [ ] **Step 3: 最小修改 indicator grid**

把 `src/components/dashboard/indicator-grid.tsx` 調整成：

```tsx
import type { AnalyzeResponse } from "@/features/market-analysis/model";

function renderAvailability(label: string, value: number | null, formatter: (input: number) => string) {
  return value === null ? `${label} 不可用` : `${label} ${formatter(value)}`;
}

export function IndicatorGrid({ data }: { data: AnalyzeResponse }) {
  const s = data.decision.categorySignals;
  const i = data.snapshot.indicators;
  const cards = [
    ["TREND", s.trend, `EMA20 ${i.ema20.toFixed(0)}`],
    ["MOMENTUM", s.momentum, `RSI ${i.rsi14.toFixed(1)}`],
    ["PARTICIPATION", s.participation, `Volume ${i.volumeChangePct.toFixed(1)}%`],
    ["CROWDING", s.crowding, renderAvailability("Funding", i.fundingRate, (value) => `${(value * 100).toFixed(4)}%`)],
    ["OPEN INTEREST", 0, renderAvailability("OI", i.openInterest, (value) => value.toFixed(0))],
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
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npm test -- tests/unit/indicator-grid.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/indicator-grid.tsx tests/unit/indicator-grid.test.tsx
git commit -m "fix: show unavailable live context metrics"
```

### Task 3: 前端加入 market-feed state 與 30 秒輪詢

**Files:**
- Modify: `src/features/market-analysis/market-analysis-dashboard.tsx`
- Modify: `src/components/dashboard/analysis-details.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/unit/market-analysis-dashboard.test.tsx`

- [ ] **Step 1: 寫輪詢不覆蓋 analysis 的 failing test**

在 `tests/unit/market-analysis-dashboard.test.tsx` 新增：

```tsx
it("refreshes market feed without replacing analysis snapshot", async () => {
  vi.useFakeTimers();
  global.fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify(sampleAnalysis), { status: 200 }))
    .mockResolvedValueOnce(new Response(JSON.stringify(sampleFeedA), { status: 200 }))
    .mockResolvedValueOnce(new Response(JSON.stringify(sampleFeedB), { status: 200 })) as any;

  render(<MarketAnalysisDashboard />);
  await user.click(screen.getByText("分析市場"));
  expect(await screen.findByText(/市場結構/)).toBeInTheDocument();

  await act(async () => {
    vi.advanceTimersByTime(30000);
  });

  expect(screen.getByText(sampleAnalysis.decision.summary)).toBeInTheDocument();
  expect(screen.getByText(/最新價格/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: 執行測試確認目前失敗**

Run: `npm test -- tests/unit/market-analysis-dashboard.test.tsx`  
Expected: FAIL，因為目前沒有 market-feed state 與輪詢

- [ ] **Step 3: 在 dashboard 新增 market-feed state 與 fetcher**

在 `src/features/market-analysis/market-analysis-dashboard.tsx` 做最小調整：

```tsx
const [analysisData, setAnalysisData] = useState<AnalyzeResponse | null>(null);
const [marketFeed, setMarketFeed] = useState<MarketFeedResponse | null>(null);
const [marketFeedError, setMarketFeedError] = useState<string | null>(null);

async function fetchMarketFeed(nextMode: MarketDataMode, nextTimeframe: Timeframe) {
  const response = await fetch(`/api/market-feed?mode=${nextMode}&timeframe=${nextTimeframe}`);
  const json: unknown = await response.json();
  if (!response.ok) throw new Error("最新價格暫時無法更新。");
  const parsed = marketFeedResponseSchema.safeParse(json);
  if (!parsed.success) throw new Error("市場資料格式無效。");
  setMarketFeed(parsed.data);
  setMarketFeedError(null);
}

useEffect(() => {
  let cancelled = false;

  async function refresh() {
    try {
      const response = await fetch(`/api/market-feed?mode=${mode}&timeframe=${timeframe}`);
      const json: unknown = await response.json();
      if (!response.ok) throw new Error("最新價格暫時無法更新。");
      const parsed = marketFeedResponseSchema.safeParse(json);
      if (!parsed.success) throw new Error("市場資料格式無效。");
      if (!cancelled) {
        setMarketFeed(parsed.data);
        setMarketFeedError(null);
      }
    } catch (reason) {
      if (!cancelled) {
        setMarketFeedError(reason instanceof Error ? reason.message : "最新價格暫時無法更新。");
      }
    }
  }

  void refresh();
  const timer = window.setInterval(refresh, 30000);
  return () => {
    cancelled = true;
    window.clearInterval(timer);
  };
}, [mode, timeframe]);
```

並把既有 `data` state 改名成 `analysisData`，所有分析相關 UI 仍只讀 `analysisData`。

- [ ] **Step 4: 在 details 區補上快照提示**

把 `src/components/dashboard/analysis-details.tsx` footer 補成：

```tsx
<footer className="analysis-meta">
  <span>{data.snapshot.mode === "sample" ? `Fixture：${data.snapshot.fixtureVersion}` : "Source：Bitget live market data"}</span>
  <span>分析擷取：{new Date(data.snapshot.sourceRequestTime).toLocaleString("zh-TW")}</span>
  <span>最後收盤：{new Date(data.snapshot.lastClosedCandleAt).toLocaleString("zh-TW")}</span>
  <span>此分析結果不會自動更新，若要刷新判斷請重新分析。</span>
</footer>
```

- [ ] **Step 5: 加上 market-feed error 樣式**

在 `src/app/globals.css` 新增：

```css
.market-feed-panel {
  display: grid;
  gap: 12px;
}

.market-feed-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
}

.market-feed-price {
  font: 800 2rem ui-monospace;
  color: #dce8f9;
}

.market-feed-error {
  border: 1px solid #684f28;
  background: #211b11;
  color: #f4d58d;
  padding: 12px;
}
```

- [ ] **Step 6: 跑 dashboard 測試**

Run: `npm test -- tests/unit/market-analysis-dashboard.test.tsx`  
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/features/market-analysis/market-analysis-dashboard.tsx src/components/dashboard/analysis-details.tsx src/app/globals.css tests/unit/market-analysis-dashboard.test.tsx
git commit -m "feat: poll market feed separately from analysis"
```

### Task 4: 把圖表改成 K 線圖並接上 market-feed

**Files:**
- Modify: `src/components/dashboard/market-chart.tsx`
- Modify: `src/features/market-analysis/market-analysis-dashboard.tsx`
- Test: `tests/unit/market-chart.test.tsx`

- [ ] **Step 1: 寫 K 線圖 failing test**

建立 `tests/unit/market-chart.test.tsx`：

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarketChart } from "@/components/dashboard/market-chart";

describe("MarketChart", () => {
  it("renders timeframe-aware candlestick chart", () => {
    render(
      <MarketChart
        timeframe="1h"
        price={100000}
        fetchedAt="2026-06-21T00:00:00.000Z"
        points={[
          {
            openTime: "2026-06-20T00:00:00.000Z",
            closeTime: "2026-06-20T00:59:59.999Z",
            open: 100,
            high: 110,
            low: 90,
            close: 105,
            volume: 10,
          },
        ]}
      />,
    );

    expect(screen.getByText("1h K 線")).toBeInTheDocument();
    expect(screen.getByText(/100000/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 執行測試確認目前失敗**

Run: `npm test -- tests/unit/market-chart.test.tsx`  
Expected: FAIL，因為當前 chart props 與實作不符合

- [ ] **Step 3: 最小實作 K 線圖**

把 `src/components/dashboard/market-chart.tsx` 改成接受 market-feed candles：

```tsx
import type { MarketFeedCandle, Timeframe } from "@/features/market-analysis/model";

function calculateEma20(values: number[]) {
  const multiplier = 2 / (20 + 1);
  return values.reduce<number[]>((result, value, index) => {
    if (index === 0) return [value];
    return [...result, value * multiplier + result[index - 1]! * (1 - multiplier)];
  }, []);
}

export function MarketChart({
  timeframe,
  price,
  fetchedAt,
  points,
}: {
  timeframe: Timeframe;
  price: number;
  fetchedAt: string;
  points: MarketFeedCandle[];
}) {
  const highs = points.map((point) => point.high);
  const lows = points.map((point) => point.low);
  const max = Math.max(...highs);
  const min = Math.min(...lows);
  const range = max - min || 1;
  const width = 700;
  const height = 220;
  const candleWidth = Math.max(4, width / points.length - 2);
  const ema20 = calculateEma20(points.map((point) => point.close));

  const y = (value: number) => height - ((value - min) / range) * (height - 20) - 10;

  return (
    <section className="market-chart" aria-label={`${timeframe} K 線圖`}>
      <div className="market-feed-header">
        <div>
          <p className="panel-label">MARKET FEED</p>
          <h2>{timeframe} K 線</h2>
        </div>
        <div>
          <div className="market-feed-price">{price.toFixed(2)}</div>
          <small>更新：{new Date(fetchedAt).toLocaleString("zh-TW")}</small>
        </div>
      </div>
      <svg role="img" aria-label={`${timeframe} candlestick chart`} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {points.map((point, index) => {
          const x = index * (width / points.length) + 2;
          const rising = point.close >= point.open;
          const color = rising ? "#49d49d" : "#ef6a77";
          const bodyTop = y(Math.max(point.open, point.close));
          const bodyBottom = y(Math.min(point.open, point.close));
          return (
            <g key={point.closeTime}>
              <line x1={x + candleWidth / 2} x2={x + candleWidth / 2} y1={y(point.high)} y2={y(point.low)} stroke={color} strokeWidth="1.5" />
              <rect x={x} y={bodyTop} width={candleWidth} height={Math.max(2, bodyBottom - bodyTop)} fill={color} />
            </g>
          );
        })}
        <path
          d={ema20.map((value, index) => `${index ? "L" : "M"}${index * (width / points.length) + candleWidth / 2},${y(value)}`).join(" ")}
          fill="none"
          stroke="#79a7ff"
          strokeWidth="1.5"
        />
      </svg>
    </section>
  );
}
```

- [ ] **Step 4: 在 dashboard 改接 marketFeed**

把 `src/features/market-analysis/market-analysis-dashboard.tsx` 中：

```tsx
{marketFeed ? (
  <MarketChart
    timeframe={marketFeed.timeframe}
    price={marketFeed.price}
    fetchedAt={marketFeed.fetchedAt}
    points={marketFeed.candles}
  />
) : null}
```

並保留分析結果區塊，不再把 `data.chart` 傳進圖表。

- [ ] **Step 5: 跑圖表測試**

Run: `npm test -- tests/unit/market-chart.test.tsx`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/market-chart.tsx src/features/market-analysis/market-analysis-dashboard.tsx tests/unit/market-chart.test.tsx
git commit -m "feat: render market feed candlestick chart"
```

### Task 5: 文件與全量驗證

**Files:**
- Modify: `README.md`
- Modify: `docs/development/PROJECT_STATUS_AND_NEXT_STEPS.md`
- Test: `tests/integration/market-feed-route.test.ts`
- Test: `tests/unit/indicator-grid.test.tsx`
- Test: `tests/unit/market-chart.test.tsx`
- Test: `tests/unit/market-analysis-dashboard.test.tsx`

- [ ] **Step 1: 更新 README**

在 `README.md` 的 current status 與 local testing 段落補上：

```md
The dashboard now keeps analysis snapshots separate from the 30-second market feed refresh. Latest price and candlestick chart update automatically in both `LIVE DATA` and `SAMPLE DATA` modes, while decision results remain fixed until the user reruns analysis.
```

- [ ] **Step 2: 更新 status doc**

在 `docs/development/PROJECT_STATUS_AND_NEXT_STEPS.md` 補上：

```md
- 市場頁已分離 analysis snapshot 與 market feed。
- 最新價格與 K 線圖可每 30 秒刷新。
- 刷新市場觀測資料時，不會自動改寫既有 decision。
```

- [ ] **Step 3: 跑新增測試**

Run: `npm test -- tests/integration/market-feed-route.test.ts tests/unit/indicator-grid.test.tsx tests/unit/market-chart.test.tsx tests/unit/market-analysis-dashboard.test.tsx`  
Expected: PASS

- [ ] **Step 4: 跑全量驗證**

Run: `npm test`  
Expected: PASS

Run: `npm run build`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add README.md docs/development/PROJECT_STATUS_AND_NEXT_STEPS.md tests/integration/market-feed-route.test.ts tests/unit/indicator-grid.test.tsx tests/unit/market-chart.test.tsx tests/unit/market-analysis-dashboard.test.tsx
git commit -m "docs: document separated market feed refresh"
```

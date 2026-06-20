# Phase 2 Sample Market Analysis Design

## 1. Goal

Build the first visible and interactive product slice of the BTC Trading Decision Agent. A user selects a timeframe and initial stance, submits an analysis, and receives an explainable deterministic decision calculated from frozen real Bitget market snapshots.

This phase proves the complete read-only path:

```text
Real Bitget snapshot → validated fixture → indicators → deterministic decision → API → Dashboard
```

## 2. Scope

### Included

- `BTCUSDT` only.
- Timeframes: `15m`, `1h`, `4h`, `1d`.
- User stance: `unsure`, `long`, `short`.
- Sample mode using immutable real Bitget historical snapshots.
- EMA 20/50/100/200, RSI 14, MACD 12/26/9, ATR 14, 20-bar volume change, 20-bar price return, funding rate, and current OI context.
- Deterministic `LONG`, `SHORT`, or `WAIT` decision.
- Decision-first single-page Dashboard in Traditional Chinese with English trading terms.
- Simplified close-price chart with EMA 20/50/100/200.
- `POST /api/analyze` for Sample mode.

### Excluded

- Live Agent Hub requests at runtime.
- `/api/price` behavior.
- Paper trading, localStorage, ledger, and exports.
- Strategy Lab, backtesting, Playbook evidence, multi-asset support, news, on-chain data, macro data, authentication, database, background jobs, and runtime LLM.

## 3. User Experience

Use the approved Decision-first layout.

### Inputs

- Timeframe selector: `15m`, `1h`, `4h`, `1d`.
- Initial stance selector:
  - `unsure` → 不確定
  - `long` → 偏多
  - `short` → 偏空
- Analyze button.

Sample mode is fixed in this phase. The UI does not show a mode selector and persistently displays `SAMPLE DATA` plus fixture version, capture time, and last closed candle time.

### Result

- `marketBiasScore` from 0 to 100.
- `LONG`, `SHORT`, or `WAIT`.
- Confidence.
- Stance assessment in Traditional Chinese.
- Decision summary, reasons, risk warnings, and invalidation condition.
- Close-price line with EMA 20/50/100/200 for the latest 80 candles.
- Trend, momentum, participation, and crowding category signals.
- RSI, MACD histogram, ATR, volume change, price return, funding rate, and current OI.

### Page states

```text
Initial → Loading → Decision
             ↘ Error
```

- `Initial`: selectors and Sample provenance are visible; no invented result is shown.
- `Loading`: selectors and Analyze button are disabled to prevent duplicate submission.
- `Decision`: previous result is replaced atomically with the validated response.
- `Error`: the previous result is cleared and a stable user-facing error is displayed.

## 4. Fixture Data

Store four runtime-readable fixtures:

```text
fixtures/market/
├── btcusdt-15m.json
├── btcusdt-1h.json
├── btcusdt-4h.json
└── btcusdt-1d.json
```

Each fixture contains:

```ts
interface MarketFixture {
  version: string;
  symbol: "BTCUSDT";
  timeframe: "15m" | "1h" | "4h" | "1d";
  capturedAt: string;
  tickerPrice: number;
  fundingRate: number;
  openInterest: number;
  sources: Array<{
    name: string;
    url: string;
    requestedAt: string;
  }>;
  candles: Array<{
    openTime: string;
    closeTime: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}
```

Fixture requirements:

- Exactly 300 real Bitget futures candles.
- Candles are chronological and have unique `openTime` values.
- Every `closeTime` is at or before `capturedAt`.
- OHLC values are positive, `high` is not below open/close/low, and `low` is not above open/close/high.
- Volume, funding rate, and OI are finite; volume and OI are non-negative.
- The filename timeframe matches the internal timeframe.
- Source URLs and request timestamps are preserved.
- Fixture files are committed and never rewritten during application runtime.

Malformed fixtures stop analysis with `MARKET_DATA_UNAVAILABLE`; they are never partially accepted.

## 5. Indicator Engine

Calculate from fixture candles only. The ticker price is context; the latest closed candle close drives directional calculations.

### EMA

- Periods: 12, 20, 26, 50, 100, 200.
- Multiplier: `2 / (period + 1)`.
- Initialize each EMA with the first close, then apply the recursive EMA formula.

### RSI 14

- Use Wilder smoothing.
- Initialize average gain and average loss with the first 14 close changes.
- When average loss is zero, RSI is 100; when both average gain and loss are zero, RSI is 50.

### MACD 12/26/9

- `macd = EMA12 - EMA26`.
- Signal is EMA9 of the MACD sequence, initialized with the first MACD value.
- Histogram is `macd - signal`.

### ATR 14

- True range is the maximum of `high-low`, `abs(high-previousClose)`, and `abs(low-previousClose)`.
- Initialize ATR with the arithmetic mean of the first 14 true ranges.
- Apply Wilder smoothing to subsequent values.

### Participation

```text
volumeChangePct = (latestVolume / mean(previous 20 volumes) - 1) × 100
priceReturn20Pct = (latestClose / close20BarsAgo - 1) × 100
```

If the previous 20-bar mean volume is zero, `volumeChangePct` is `0`.

### Volatility

- Calculate `ATR14 / close` for the latest 100 valid ATR values.
- Sort the 100 ratios and use nearest-rank percentile index `ceil(0.8 × count) - 1`.
- Current ratio strictly above the 80th percentile is `high`; otherwise it is `normal`.

## 6. Deterministic Decision

Category signals emit `-1`, `0`, or `1`.

- Trend, weight 40:
  - `1`: `close > EMA20 > EMA50 > EMA100 > EMA200`.
  - `-1`: exact reverse ordering.
  - `0`: otherwise.
- Momentum, weight 25:
  - `1`: MACD histogram positive and RSI from 50 through 70 inclusive.
  - `-1`: MACD histogram negative and RSI from 30 inclusive to below 50.
  - `0`: otherwise.
- Participation, weight 20:
  - `1`: positive 20-bar return and positive volume change.
  - `-1`: negative 20-bar return and positive volume change.
  - `0`: otherwise.
- Crowding, weight 10:
  - `1`: funding below `-0.0001`.
  - `-1`: funding above `0.0001`.
  - `0`: otherwise.

```text
rawScore = 50 + 0.5 × (40T + 25M + 20P + 10C)
```

When volatility is high:

```text
adjustedScore = 50 + (rawScore - 50) × 0.9
```

Otherwise `adjustedScore = rawScore`. Round to the nearest integer and clamp to `0–100`.

```text
0–40   → SHORT
41–59  → WAIT
60–100 → LONG
confidence = max(score, 100-score)
```

Stance assessment follows the approved Phase 1 contract:

- `unsure` → `neutral`.
- Matching actionable stance and decision → `supported`.
- Opposite actionable stance and decision → `opposed`.
- Any explicit stance with `WAIT` → `insufficient`.

Warnings:

- RSI outside `30–70` adds an overextended warning.
- High volatility adds a volatility warning.
- Sample mode always adds a warning that the data is frozen and not current.
- Current OI is non-directional context and never affects the score.

Invalidation condition:

- `LONG`: reassess if a selected-timeframe candle closes below EMA20.
- `SHORT`: reassess if a selected-timeframe candle closes above EMA20.
- `WAIT`: reassess after the next selected-timeframe candle closes.

All summaries, reasons, warnings, and invalidation text returned by this phase are deterministic Traditional Chinese templates.

## 7. Server and API

Use server-only modules for fixture loading and analysis:

```text
src/server/market-data/
├── fixture-schema.ts
└── load-market-fixture.ts
src/server/indicators/
├── ema.ts
├── rsi.ts
├── macd.ts
├── atr.ts
└── analyze-indicators.ts
src/server/decision/
└── create-decision.ts
src/server/analysis/
└── analyze-sample-market.ts
src/app/api/analyze/route.ts
```

`POST /api/analyze`:

- Validates request using `analyzeRequestSchema`.
- Accepts only `symbol: "BTCUSDT"` and `mode: "sample"` in this phase.
- Loads the fixture matching the requested timeframe.
- Validates and analyzes it.
- Validates the final response using `analyzeResponseSchema` before returning JSON.
- A `live` request returns HTTP 503 with `MARKET_DATA_UNAVAILABLE`; it never substitutes Sample data.

Extend `AnalyzeResponse` with chart data:

```ts
chart: Array<{
  timestamp: string;
  close: number;
  ema20: number;
  ema50: number;
  ema100: number;
  ema200: number;
}>;
```

Return only the latest 80 chart points.

Error mapping:

- Invalid JSON or input → HTTP 400, `INVALID_INPUT`.
- Missing or malformed fixture → HTTP 503, `MARKET_DATA_UNAVAILABLE`.
- Fewer than 250 valid closed candles → HTTP 422, `INSUFFICIENT_CANDLES`.
- Unexpected internal failure → HTTP 500, `INTERNAL_ERROR`.

Responses do not include stack traces, filesystem paths, or raw upstream payloads.

## 8. Dashboard Components

Keep the page small and responsibility-based:

```text
src/components/dashboard/
├── analysis-controls.tsx
├── decision-card.tsx
├── market-chart.tsx
├── indicator-grid.tsx
└── analysis-details.tsx
src/features/market-analysis/
└── market-analysis-dashboard.tsx
```

- `MarketAnalysisDashboard`: owns form and request state.
- `AnalysisControls`: timeframe, stance, Analyze button, and disabled state.
- `DecisionCard`: action, score, confidence, stance assessment, summary, and invalidation.
- `MarketChart`: accessible SVG close and EMA line chart with legend; no chart dependency.
- `IndicatorGrid`: category signals and key indicator values.
- `AnalysisDetails`: reasons, warnings, source, capture time, and last candle time.

The existing homepage becomes the Dashboard. Styling remains dependency-free CSS and responsive at the existing mobile breakpoint.

## 9. Verification

### Unit

- Fixture schema rejects duplicate, unordered, open, and insufficient candle data.
- EMA, RSI, MACD, and ATR match independently calculated expected values.
- Volume change and price return formulas cover zero-volume handling.
- Volatility percentile covers equal-to-threshold and above-threshold cases.
- Bullish inputs produce LONG, bearish inputs produce SHORT, and conflict produces WAIT.
- Score stays in `0–100`; confidence matches the Phase 1 contract.
- Every stance/action assessment combination is covered.

### Integration

- Each of the four committed fixtures produces a valid `AnalyzeResponse`.
- `/api/analyze` rejects missing fields and `mode: "live"`.
- Successful response contains 80 chart points and Sample provenance.
- Server output passes `analyzeResponseSchema`.

### Browser and UI

- User can select every timeframe and stance.
- Loading disables duplicate submission.
- Result displays Sample badge, score, direction, chart, indicators, reasons, warnings, and timestamps.
- A new analysis replaces the prior result.
- Error clears stale result and exposes no internal details.
- Desktop and mobile layouts remain readable.

### Repository gates

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## 10. Acceptance Criteria

1. The real Next.js homepage, not a static mockup, can analyze all four Sample fixtures.
2. Changing timeframe or stance changes the request and validated result.
3. All displayed numbers originate from committed fixtures and deterministic calculations.
4. The persistent Sample label makes it impossible to mistake results for current market data.
5. No live API call, paper trade, LLM, database, authentication, or real order capability exists in this phase.
6. The repository quality gates pass and the feature is browser-verified on localhost.

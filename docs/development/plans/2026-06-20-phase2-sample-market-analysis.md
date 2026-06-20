# Phase 2 Sample Market Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real interactive Sample Data Dashboard that calculates deterministic BTCUSDT analysis from four frozen Bitget market snapshots.

**Architecture:** Server-only modules validate fixtures, calculate indicators, and create decisions. `POST /api/analyze` exposes one validated response; a client Dashboard owns input and request state while focused presentational components render the response.

**Tech Stack:** Next.js 16, React 19, TypeScript 6, Zod 4, Vitest 4, native SVG and CSS

---

## File Map

**Create:**

- `fixtures/market/btcusdt-{15m,1h,4h,1d}.json`: immutable real Bitget snapshots.
- `scripts/capture-market-fixtures.mjs`: one-time public Bitget snapshot capture tool.
- `src/server/market-data/fixture-schema.ts`: raw fixture and candle validation.
- `src/server/market-data/load-market-fixture.ts`: server-only timeframe loader.
- `src/server/indicators/{ema,rsi,macd,atr,analyze-indicators}.ts`: deterministic calculations.
- `src/server/decision/create-decision.ts`: category signals, score, stance, and Chinese explanations.
- `src/server/analysis/analyze-sample-market.ts`: fixture-to-response orchestration.
- `src/app/api/analyze/route.ts`: HTTP validation and error mapping.
- `src/features/market-analysis/market-analysis-dashboard.tsx`: client state owner.
- `src/components/dashboard/{analysis-controls,decision-card,market-chart,indicator-grid,analysis-details}.tsx`: focused UI.
- Unit and integration tests matching each server/UI unit.

**Modify:**

- `src/features/market-analysis/model.ts`: add chart-point contract.
- `src/app/page.tsx`: render the real Dashboard.
- `src/app/globals.css`: approved responsive Decision-first design.
- `README.md`: describe Sample mode and verification.
- `.gitignore`: ignore `.superpowers/` visual-companion artifacts.

### Task 1: Extend the Analysis Response Contract

**Files:**

- Modify: `src/features/market-analysis/model.ts`
- Modify: `tests/unit/market-analysis-contract.test.ts`

- [ ] Add a failing test that a valid response requires exactly 80 chart points with `timestamp`, `close`, `ema20`, `ema50`, `ema100`, and `ema200`; verify missing chart and a 79-point chart fail.
- [ ] Run `npm test -- tests/unit/market-analysis-contract.test.ts`; expect the new assertions to fail because `chart` is not required.
- [ ] Add:

```ts
export const chartPointSchema = z.object({
  timestamp: z.string().datetime(),
  close: z.number().positive(),
  ema20: z.number().positive(),
  ema50: z.number().positive(),
  ema100: z.number().positive(),
  ema200: z.number().positive(),
});
```

and `chart: z.array(chartPointSchema).length(80)` to `analyzeResponseSchema`; export `ChartPoint`.
- [ ] Run the focused test; expect PASS.
- [ ] Commit: `git commit -m "Extend analysis chart contract"`.

### Task 2: Validate and Load Market Fixtures

**Files:**

- Create: `src/server/market-data/fixture-schema.ts`
- Create: `src/server/market-data/load-market-fixture.ts`
- Create: `tests/unit/fixture-schema.test.ts`

- [ ] Write failing tests for a valid 300-candle fixture and rejection of duplicate timestamps, unordered timestamps, invalid OHLC, close time after capture, wrong symbol, and fewer than 250 candles.
- [ ] Run `npm test -- tests/unit/fixture-schema.test.ts`; expect module-not-found failure.
- [ ] Implement `marketCandleSchema`, `marketFixtureSchema`, and `validateMarketFixture(value)` using Zod plus `superRefine`. `validateMarketFixture` returns the parsed fixture and throws a Zod error for every listed invalid case.
- [ ] Implement a fixed map:

```ts
const fixtureFiles: Record<Timeframe, string> = {
  "15m": "btcusdt-15m.json",
  "1h": "btcusdt-1h.json",
  "4h": "btcusdt-4h.json",
  "1d": "btcusdt-1d.json",
};
```

`loadMarketFixture(timeframe)` reads only the mapped file beneath `fixtures/market`, parses JSON, validates it, and verifies its internal timeframe matches the request.
- [ ] Run the focused tests; expect PASS.
- [ ] Commit: `git commit -m "Add validated market fixture loader"`.

### Task 3: Capture Four Real Bitget Snapshots

**Files:**

- Create: `scripts/capture-market-fixtures.mjs`
- Create: four `fixtures/market/*.json` files
- Create: `tests/integration/market-fixtures.test.ts`

- [ ] Create a failing integration test that loads all four timeframes, asserts exactly 300 candles, and checks source URLs, finite ticker/funding/OI, chronological closed candles, and unique fixture versions.
- [ ] Implement the capture script using public Bitget V2 USDT futures endpoints:

```text
/api/v2/mix/market/candles
/api/v2/mix/market/ticker
/api/v2/mix/market/current-fund-rate
/api/v2/mix/market/open-interest
```

Use `symbol=BTCUSDT`, `productType=USDT-FUTURES`, `limit=301`, and granularity mapping `15m`, `1H`, `4H`, `1D`. Remove any candle whose close time is after capture time, retain the newest 300 closed candles, normalize strings to finite numbers and ISO timestamps, and refuse to write unless 300 closed candles remain.
- [ ] Run `node scripts/capture-market-fixtures.mjs`; expect four formatted JSON files with version `btcusdt-<timeframe>-<captured timestamp>` and preserved endpoint URLs.
- [ ] Run `npm test -- tests/integration/market-fixtures.test.ts`; expect PASS.
- [ ] Commit the script, fixtures, and test: `git commit -m "Capture real Bitget market fixtures"`.

### Task 4: Implement Indicator Primitives

**Files:**

- Create: `src/server/indicators/ema.ts`, `rsi.ts`, `macd.ts`, `atr.ts`
- Create: `tests/unit/indicators.test.ts`

- [ ] Write failing tests using small explicit series. Assert EMA `[10, 11, 12]` with period 2 equals `[10, 10.6666667, 11.5555556]`; flat RSI is 50; rising RSI is 100; MACD exposes equal-length macd/signal/histogram arrays; ATR uses Wilder smoothing and expected true ranges.
- [ ] Run `npm test -- tests/unit/indicators.test.ts`; expect module-not-found failure.
- [ ] Implement exact exports:

```ts
calculateEma(values: number[], period: number): number[]
calculateRsi(closes: number[], period?: number): number[]
calculateMacd(closes: number[]): { macd: number[]; signal: number[]; histogram: number[] }
calculateAtr(candles: MarketCandle[], period?: number): number[]
```

Follow the initialization and Wilder rules in the approved spec; reject empty arrays and invalid periods.
- [ ] Run focused tests; expect PASS.
- [ ] Commit: `git commit -m "Implement technical indicator primitives"`.

### Task 5: Aggregate Indicators and Chart Data

**Files:**

- Create: `src/server/indicators/analyze-indicators.ts`
- Create: `tests/unit/analyze-indicators.test.ts`

- [ ] Write failing tests asserting EMA20/50/100/200, RSI14, MACD fields, ATR14, price return, volume change, funding, OI, volatility state, and exactly 80 chart points. Include zero prior volume and equal/above percentile cases.
- [ ] Implement:

```ts
analyzeIndicators(fixture: MarketFixture): {
  indicators: MarketIndicators;
  volatilityRisk: "normal" | "high";
  latestClose: number;
  chart: ChartPoint[];
}
```

Use the latest closed candle for calculations, prior 20 candles for volume mean, and nearest-rank 80th percentile over the latest 100 valid ATR/close ratios.
- [ ] Run focused tests; expect PASS.
- [ ] Commit: `git commit -m "Aggregate market indicators"`.

### Task 6: Implement the Deterministic Decision Engine

**Files:**

- Create: `src/server/decision/create-decision.ts`
- Create: `tests/unit/create-decision.test.ts`

- [ ] Write failing table tests for bullish LONG, bearish SHORT, conflicting WAIT, high-volatility score adjustment, clamp boundaries, all stance assessments, funding thresholds, RSI warnings, and deterministic Chinese text.
- [ ] Implement:

```ts
createDecision(input: {
  stance: UserStance;
  latestClose: number;
  indicators: MarketIndicators;
  volatilityRisk: VolatilityRisk;
}): Decision
```

Use weights `40/25/20/10`, round after volatility adjustment, derive confidence from score, and validate the result with `decisionSchema.parse` before returning it.
- [ ] Run focused tests; expect PASS.
- [ ] Commit: `git commit -m "Implement deterministic market decision"`.

### Task 7: Orchestrate Sample Analysis

**Files:**

- Create: `src/server/analysis/analyze-sample-market.ts`
- Create: `tests/integration/analyze-sample-market.test.ts`

- [ ] Write failing tests for every timeframe and stance. Assert response schema validity, 80 chart points, fixture provenance, current OI not affecting score, and changed stance assessment without changed market score.
- [ ] Implement `analyzeSampleMarket({ timeframe, stance }): AnalyzeResponse` by loading the fixture, aggregating indicators, creating the decision, and returning a response validated by `analyzeResponseSchema.parse`.
- [ ] Run focused tests; expect PASS.
- [ ] Commit: `git commit -m "Build Sample market analysis service"`.

### Task 8: Expose POST /api/analyze

**Files:**

- Create: `src/app/api/analyze/route.ts`
- Create: `tests/integration/analyze-route.test.ts`

- [ ] Write failing route tests for valid Sample requests, invalid JSON, missing stance, unsupported symbol, `mode: live`, and sanitized internal errors.
- [ ] Implement `POST(request: Request)` with `analyzeRequestSchema.safeParse`; return 400 `INVALID_INPUT`, 503 `MARKET_DATA_UNAVAILABLE` for live, 422 `INSUFFICIENT_CANDLES`, and 500 `INTERNAL_ERROR`. Never return stack traces or fixture paths.
- [ ] Run focused tests; expect PASS.
- [ ] Commit: `git commit -m "Expose Sample analysis API"`.

### Task 9: Build the Decision-first Dashboard

**Files:**

- Create the six Dashboard/component files in the File Map
- Modify: `src/app/page.tsx`, `src/app/globals.css`
- Replace: `tests/unit/app-shell.test.tsx`
- Create: `tests/unit/market-analysis-dashboard.test.tsx`

- [ ] Write failing UI tests for Traditional Chinese heading, persistent Sample badge, four timeframe buttons, three stance buttons, disabled loading controls, successful result rendering, new-result replacement, and stale-result clearing on error.
- [ ] Implement `MarketAnalysisDashboard` as a `"use client"` component using `fetch("/api/analyze")`; validate successful JSON with `analyzeResponseSchema.safeParse` before setting state.
- [ ] Implement semantic buttons and accessible labels in `AnalysisControls`; render no invented initial metrics.
- [ ] Implement the five presentational components. `MarketChart` renders native SVG paths for close and four EMA lines and includes a text legend/table fallback for screen readers.
- [ ] Replace the homepage with the Dashboard and implement the approved dark Decision-first responsive CSS without adding dependencies.
- [ ] Run `npm test -- tests/unit/app-shell.test.tsx tests/unit/market-analysis-dashboard.test.tsx`; expect PASS.
- [ ] Commit: `git commit -m "Build Sample analysis Dashboard"`.

### Task 10: Documentation, Browser Acceptance, and Final Gates

**Files:**

- Modify: `README.md`, `.gitignore`

- [ ] Add `.superpowers/` to `.gitignore`. Update README with Sample limitations, fixture provenance, `POST /api/analyze`, verification commands, and explicit exclusions.
- [ ] Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`; every command must exit 0.
- [ ] Start `npm run dev` and verify in the in-app browser: every timeframe and stance is selectable, analysis returns, Sample provenance remains visible, loading blocks duplicates, a second result replaces the first, mobile layout is readable, and browser console has no errors.
- [ ] Confirm no client bundle imports from `src/server`, no live network request occurs at runtime, and `rg -n "apiKey|secret|privateKey" src fixtures` reveals no credential values.
- [ ] Commit: `git commit -m "Document and verify Phase 2 Demo"`.

## Completion Boundary

Completion means the real Next.js homepage performs Sample market analysis end to end and passes automated and browser acceptance checks. It does not include Live Agent Hub, `/api/price`, paper trading, localStorage, Strategy Lab, backtesting, Playbook evidence, or deployment.

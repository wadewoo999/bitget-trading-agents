# Stage 2 Product Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the product body after Stage 1 by adding Strategy Lab, deterministic backtesting, and the minimum UI polish needed to make the product feel coherent before delivery work.

**Architecture:** Keep the current BTC-only deterministic analysis flow unchanged. Add a separate Strategy Lab vertical slice that validates a `StrategyRequest`, produces a constrained `StrategyConfig`, runs a deterministic historical backtest on closed candles only, and returns a schema-validated result for a small dedicated UI section. Do not mix this stage with GetAgent runtime integration, public deployment, or submission packaging.

**Tech Stack:** Next.js 16, TypeScript, React, Zod, Vitest, existing fixture / market-data utilities

---

## File Structure

- Modify: `src/features/strategy-lab/model.ts`
  - Finalize the request / config / result schemas used by UI and API
- New: `src/server/strategy-lab/build-strategy-config.ts`
  - Convert profile + timeframe + optional user idea into a deterministic allowed config
- New: `src/server/strategy-lab/load-backtest-market.ts`
  - Load the historical candle set used by Strategy Lab backtests
- New: `src/server/strategy-lab/run-backtest.ts`
  - Deterministic backtest engine with warm-up, fee, slippage, no look-ahead
- New: `src/app/api/backtest/route.ts`
  - Public server route for Strategy Lab backtests
- New: `src/features/strategy-lab/strategy-lab-panel.tsx`
  - Minimal UI for profile, timeframe, optional idea, run action, and result rendering
- Modify: `src/features/market-analysis/market-analysis-dashboard.tsx`
  - Mount Strategy Lab without disturbing the existing analysis flow
- New: `tests/unit/build-strategy-config.test.ts`
  - Allowed profiles, timeframes, and generated rule coverage
- New: `tests/unit/run-backtest.test.ts`
  - Warm-up, fee/slippage, no look-ahead, and metrics coverage
- New: `tests/integration/backtest-route.test.ts`
  - Route success and failure envelopes
- Modify: `tests/unit/contracts.test.ts`
  - Keep schema contracts aligned
- Modify: `README.md`
  - Reflect the new active phase once implementation lands
- Modify: `docs/development/PROJECT_STATUS_AND_NEXT_STEPS.md`
  - Mark Stage 2 progress once Strategy Lab lands

Assumptions for Stage 2:

- Backtest remains BTC-only.
- First UI supports the three existing profiles only.
- Strategy Lab uses committed historical fixtures first, not live historical API pulls.
- `1week` is allowed only in Strategy Lab, not the main analysis dashboard.
- Strategy Lab never auto-creates a paper trade.

---

### Task 1: Lock the Strategy Lab contract

**Files:**
- Modify: `src/features/strategy-lab/model.ts`
- Modify: `tests/unit/contracts.test.ts`
- Test: `tests/unit/contracts.test.ts`

- [ ] **Step 1: Write the failing contract assertions**

Add assertions covering:

```ts
expect(() =>
  strategyRequestSchema.parse({ profile: "aggressive", timeframe: "4h" }),
).toThrow(/not available/i);

expect(
  strategyRequestSchema.parse({ profile: "balanced", timeframe: "4h", idea: "只在 EMA 結構與 RSI 支持時進場" }),
).toMatchObject({ profile: "balanced", timeframe: "4h" });

expect(
  backtestResultSchema.parse({
    strategy: {
      profile: "balanced",
      timeframe: "4h",
      entryRules: ["close > ema20"],
      exitRules: ["close < ema20"],
      riskPerTradePct: 1,
    },
    periodStart: "2026-01-01T00:00:00.000Z",
    periodEnd: "2026-02-01T00:00:00.000Z",
    totalReturnPct: 12.5,
    maxDrawdownPct: 4.2,
    sharpeRatio: 1.1,
    winRate: 0.54,
    tradeCount: 18,
    feeRate: 0.0006,
    slippageRate: 0.0002,
    equityCurve: [{ timestamp: "2026-01-02T00:00:00.000Z", equity: 10020 }],
    trades: [{
      id: "trade-1",
      side: "LONG",
      entryAt: "2026-01-02T00:00:00.000Z",
      exitAt: "2026-01-03T00:00:00.000Z",
      entryPrice: 100,
      exitPrice: 105,
      quantity: 1,
      pnl: 4.69,
      fee: 0.11,
    }],
  }),
).toBeTruthy();
```

- [ ] **Step 2: Extend the schema minimally**

Update `backtestResultSchema` to include:

```ts
trades: z.array(z.object({
  id: z.string().min(1),
  side: z.enum(["LONG", "SHORT"]),
  entryAt: z.string().datetime(),
  exitAt: z.string().datetime(),
  entryPrice: z.number().positive(),
  exitPrice: z.number().positive(),
  quantity: z.number().positive(),
  pnl: z.number(),
  fee: z.number().nonnegative(),
})),
```

Keep `riskPerTradePct` capped at `1` and do not add unused optional fields.

- [ ] **Step 3: Run the focused contract test**

Run:

```bash
npm test -- tests/unit/contracts.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/strategy-lab/model.ts tests/unit/contracts.test.ts
git commit -m "feat: finalize strategy lab contracts"
```

---

### Task 2: Add deterministic StrategyConfig generation

**Files:**
- Create: `src/server/strategy-lab/build-strategy-config.ts`
- New: `tests/unit/build-strategy-config.test.ts`
- Test: `tests/unit/build-strategy-config.test.ts`

- [ ] **Step 1: Write the failing config builder tests**

Create tests for the three profiles:

```ts
expect(buildStrategyConfig({ profile: "aggressive", timeframe: "15m" })).toMatchObject({
  profile: "aggressive",
  timeframe: "15m",
  riskPerTradePct: 1,
});

expect(buildStrategyConfig({ profile: "balanced", timeframe: "4h" }).entryRules).toEqual([
  "Trend confirmation with EMA20/EMA50 alignment",
  "Momentum support from RSI14 and MACD histogram",
  "Participation confirmation from volume expansion",
]);

expect(buildStrategyConfig({ profile: "conservative", timeframe: "1week" }).exitRules.length).toBeGreaterThan(0);
```

- [ ] **Step 2: Implement the smallest deterministic builder**

Create:

```ts
import { strategyRequestSchema, strategyConfigSchema, type StrategyRequest } from "@/features/strategy-lab/model";

export function buildStrategyConfig(input: StrategyRequest) {
  const request = strategyRequestSchema.parse(input);

  const profileRules = {
    aggressive: {
      riskPerTradePct: 1,
      entryRules: [
        "Trend confirmation with EMA20/EMA50 alignment",
        "Momentum support from RSI14 and MACD histogram",
        "Participation confirmation from volume expansion",
      ],
      exitRules: [
        "Close the trade when EMA20 trend support breaks",
        "Close the trade when momentum confirmation fades",
      ],
    },
    balanced: {
      riskPerTradePct: 0.75,
      entryRules: [
        "Trend confirmation with EMA20/EMA50 alignment",
        "Momentum support from RSI14 and MACD histogram",
        "Participation confirmation from volume expansion",
      ],
      exitRules: [
        "Close the trade when EMA20 trend support breaks",
        "Close the trade when MACD momentum turns against the position",
      ],
    },
    conservative: {
      riskPerTradePct: 0.5,
      entryRules: [
        "Trend confirmation with EMA50/EMA200 alignment",
        "Require stronger RSI confirmation before entry",
        "Avoid low-participation conditions",
      ],
      exitRules: [
        "Close the trade when higher-timeframe trend support breaks",
        "Close the trade when the setup loses directional confirmation",
      ],
    },
  } as const;

  return strategyConfigSchema.parse({
    profile: request.profile,
    timeframe: request.timeframe,
    entryRules: profileRules[request.profile].entryRules,
    exitRules: profileRules[request.profile].exitRules,
    riskPerTradePct: profileRules[request.profile].riskPerTradePct,
  });
}
```

Ignore free-form `idea` in V1 unless it can be represented without changing the contract.

- [ ] **Step 3: Run the focused builder test**

Run:

```bash
npm test -- tests/unit/build-strategy-config.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/server/strategy-lab/build-strategy-config.ts tests/unit/build-strategy-config.test.ts
git commit -m "feat: add deterministic strategy config builder"
```

---

### Task 3: Build the deterministic backtest engine

**Files:**
- Create: `src/server/strategy-lab/load-backtest-market.ts`
- Create: `src/server/strategy-lab/run-backtest.ts`
- New: `tests/unit/run-backtest.test.ts`
- Test: `tests/unit/run-backtest.test.ts`

- [ ] **Step 1: Write the failing backtest tests**

Cover the non-negotiable rules:

```ts
expect(result.feeRate).toBe(0.0006);
expect(result.slippageRate).toBe(0.0002);
expect(result.equityCurve.length).toBeGreaterThan(0);
expect(result.tradeCount).toBe(result.trades.length);
expect(result.periodStart < result.periodEnd).toBe(true);
```

And a no-look-ahead expectation:

```ts
expect(result.trades[0]?.entryAt).toBe(result.equityCurve[0]?.timestamp);
```

- [ ] **Step 2: Implement a fixture-backed market loader**

Load the historical fixtures already committed for the requested timeframe and return closed candles only. Keep it simple:

```ts
export function loadBacktestMarket(timeframe: StrategyTimeframe) {
  if (timeframe === "1week") {
    throw new Error("1week backtest data is not available yet.");
  }

  return loadSampleMarketSnapshot({
    symbol: "BTCUSDT",
    timeframe: timeframe as "15m" | "1h" | "4h" | "1d",
  });
}
```

If `1week` data is not yet present, reject it cleanly instead of faking aggregation.

- [ ] **Step 3: Implement the minimal deterministic engine**

Use existing indicator outputs and a small replay loop:

```ts
const feeRate = 0.0006;
const slippageRate = 0.0002;
const startingEquity = 10000;
const warmupBars = 200;
```

Rules:

- Start after warm-up.
- Read only the current and past bar.
- Open LONG when price is above EMA20 and EMA50, RSI14 >= 55, MACD histogram > 0, and volume change > 0.
- Open SHORT when price is below EMA20 and EMA50, RSI14 <= 45, MACD histogram < 0, and volume change > 0.
- Close when the directional condition breaks.
- Record each trade with fee and realized PnL.
- Append equity after each processed bar.

- [ ] **Step 4: Run the focused backtest test**

Run:

```bash
npm test -- tests/unit/run-backtest.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/strategy-lab/load-backtest-market.ts src/server/strategy-lab/run-backtest.ts tests/unit/run-backtest.test.ts
git commit -m "feat: add deterministic backtest engine"
```

---

### Task 4: Expose `/api/backtest`

**Files:**
- Create: `src/app/api/backtest/route.ts`
- Create: `tests/integration/backtest-route.test.ts`
- Test: `tests/integration/backtest-route.test.ts`

- [ ] **Step 1: Write the failing route tests**

Cover success plus invalid input:

```ts
const response = await POST(new Request("http://localhost/api/backtest", {
  method: "POST",
  body: JSON.stringify({ profile: "balanced", timeframe: "4h" }),
  headers: { "content-type": "application/json" },
}));

expect(response.status).toBe(200);
expect(backtestResultSchema.parse(await response.json())).toBeTruthy();
```

```ts
expect(badResponse.status).toBe(400);
expect(await badResponse.json()).toMatchObject({
  error: { code: "INVALID_INPUT" },
});
```

- [ ] **Step 2: Implement the route with stable envelopes**

Implementation shape:

```ts
export async function POST(request: Request) {
  try {
    const input = strategyRequestSchema.parse(await request.json());
    const strategy = buildStrategyConfig(input);
    const result = runBacktest(strategy);
    return Response.json(backtestResultSchema.parse(result));
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ error: { code: "INVALID_INPUT", message: "Invalid backtest request." } }, { status: 400 });
    }
    return Response.json({ error: { code: "INTERNAL_ERROR", message: "Unable to complete backtest." } }, { status: 500 });
  }
}
```

- [ ] **Step 3: Run the focused route test**

Run:

```bash
npm test -- tests/integration/backtest-route.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/api/backtest/route.ts tests/integration/backtest-route.test.ts
git commit -m "feat: add strategy lab backtest route"
```

---

### Task 5: Mount the Strategy Lab UI

**Files:**
- Create: `src/features/strategy-lab/strategy-lab-panel.tsx`
- Modify: `src/features/market-analysis/market-analysis-dashboard.tsx`
- Test: `tests/unit/market-analysis-dashboard.test.tsx`

- [ ] **Step 1: Write the failing UI test**

Add coverage that the dashboard now shows:

```ts
expect(screen.getByText(/strategy lab/i)).toBeInTheDocument();
expect(screen.getByRole("button", { name: /run backtest/i })).toBeInTheDocument();
```

And after mocking a successful response:

```ts
expect(await screen.findByText(/total return/i)).toBeInTheDocument();
expect(screen.getByText(/max drawdown/i)).toBeInTheDocument();
```

- [ ] **Step 2: Implement the minimum panel**

Panel contents only:

- profile selector
- timeframe selector limited by profile
- optional idea textarea
- run backtest button
- result cards for return, drawdown, sharpe, win rate, trade count
- simple equity curve list or compact table
- recent trades table

Do not redesign the full dashboard. Add the panel below the existing paper trading / evidence area.

- [ ] **Step 3: Re-run the dashboard unit test**

Run:

```bash
npm test -- tests/unit/market-analysis-dashboard.test.tsx
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/strategy-lab/strategy-lab-panel.tsx src/features/market-analysis/market-analysis-dashboard.tsx tests/unit/market-analysis-dashboard.test.tsx
git commit -m "feat: add strategy lab panel"
```

---

### Task 6: Full verification and status sync

**Files:**
- Modify: `README.md`
- Modify: `docs/development/PROJECT_STATUS_AND_NEXT_STEPS.md`

- [ ] **Step 1: Run the full repo verification**

Run:

```bash
npm test
npm run build
npm run demo-check
```

Expected:

- all tests pass
- production build passes
- one-click verification remains usable after Strategy Lab lands

- [ ] **Step 2: Update the docs to reflect Stage 2 progress**

Add the exact completed items that landed:

```md
- Strategy Lab 已可送出 profile / timeframe / idea
- `/api/backtest` 已上線
- deterministic backtest 已回傳 metrics、equity curve 與 trades
- Strategy Lab 不會自動建立 paper trade
```

- [ ] **Step 3: Commit**

```bash
git add README.md docs/development/PROJECT_STATUS_AND_NEXT_STEPS.md
git commit -m "docs: update stage two progress"
```

---

## Self-Review

- Spec coverage: covers Strategy Lab contract, config generation, deterministic backtest, API route, UI mount, and final verification.
- Placeholder scan: no TBD / TODO placeholders remain.
- Type consistency: `StrategyRequest`, `StrategyConfig`, `BacktestResult`, `/api/backtest`, and UI all use the same field names.

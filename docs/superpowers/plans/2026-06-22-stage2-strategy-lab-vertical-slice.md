# Stage 2 Strategy Lab Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first user-visible Stage 2 slice by exposing `/api/backtest` and rendering a minimal Strategy Lab panel inside the main dashboard.

**Architecture:** Reuse the existing deterministic `StrategyConfig` builder and backtest engine. Add a schema-validated route that returns stable JSON errors, then add a small client-side panel that posts a constrained request, renders summary metrics, and does not interfere with the existing market-analysis and paper-trading flow.

**Tech Stack:** Next.js 16 App Router, React 19 client components, TypeScript, Zod, Vitest

---

## File Structure

- Create: `src/app/api/backtest/route.ts`
  - Public route for deterministic Strategy Lab backtests
- Create: `src/components/dashboard/strategy-lab-panel.tsx`
  - Minimal Stage 2 UI for profile, timeframe, run action, and result summary
- Modify: `src/features/strategy-lab/model.ts`
  - Add client-safe response / error typing reuse for route and UI
- Modify: `src/features/market-analysis/market-analysis-dashboard.tsx`
  - Mount Strategy Lab between decision flow and lower-detail panels
- Modify: `src/app/globals.css`
  - Add Strategy Lab card layout styles
- Modify: `tests/unit/market-analysis-dashboard.test.tsx`
  - Assert the new panel renders and fetches backtest results
- Create: `tests/unit/backtest-route.test.ts`
  - Route success and invalid-input coverage

### Task 1: Expose the deterministic backtest route

**Files:**
- Create: `src/app/api/backtest/route.ts`
- Create: `tests/unit/backtest-route.test.ts`
- Test: `tests/unit/backtest-route.test.ts`

- [ ] **Step 1: Write the failing route tests**

Add a success case and an invalid input case:

```ts
const response = await POST(
  new Request("http://localhost/api/backtest", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ profile: "balanced", timeframe: "4h" }),
  }),
);

expect(response.status).toBe(200);
expect((await response.json()).strategy).toMatchObject({
  profile: "balanced",
  timeframe: "4h",
});
```

```ts
const response = await POST(
  new Request("http://localhost/api/backtest", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ profile: "aggressive", timeframe: "4h" }),
  }),
);

expect(response.status).toBe(400);
expect((await response.json()).error.code).toBe("INVALID_INPUT");
```

- [ ] **Step 2: Run the focused route test**

Run:

```bash
npm test -- tests/unit/backtest-route.test.ts
```

Expected: FAIL because `src/app/api/backtest/route.ts` does not exist yet.

- [ ] **Step 3: Add the minimal route**

Create a route that:

- parses request JSON
- validates with `strategyRequestSchema`
- builds config with `buildStrategyConfig`
- runs `runBacktest`
- returns `400 INVALID_INPUT` for invalid profile/timeframe pairs
- returns `500 INTERNAL_ERROR` for unexpected failures

- [ ] **Step 4: Re-run the focused route test**

Run:

```bash
npm test -- tests/unit/backtest-route.test.ts
```

Expected: PASS

### Task 2: Mount a minimal Strategy Lab panel in the dashboard

**Files:**
- Create: `src/components/dashboard/strategy-lab-panel.tsx`
- Modify: `src/features/market-analysis/market-analysis-dashboard.tsx`
- Modify: `src/features/strategy-lab/model.ts`
- Modify: `src/app/globals.css`
- Modify: `tests/unit/market-analysis-dashboard.test.tsx`
- Test: `tests/unit/market-analysis-dashboard.test.tsx`

- [ ] **Step 1: Write the failing dashboard test**

Add a test that:

- renders the dashboard
- verifies a `Strategy Lab` section is present before analysis
- clicks its run button
- asserts `/api/backtest` is called with a valid request
- waits for summary metrics such as `Total Return`, `Win Rate`, and `Trade Count`

- [ ] **Step 2: Run the focused dashboard test**

Run:

```bash
npm test -- tests/unit/market-analysis-dashboard.test.tsx
```

Expected: FAIL because the Strategy Lab panel is not mounted yet.

- [ ] **Step 3: Add the minimal panel**

Implement a client-side panel with:

- profile buttons: `aggressive`, `balanced`, `conservative`
- timeframe buttons constrained by profile
- optional `idea` input, stored locally but not used by the engine yet
- `Run Strategy Lab` button posting to `/api/backtest`
- loading / error states
- result summary cards for `totalReturnPct`, `winRate`, `maxDrawdownPct`, `tradeCount`
- short rules list from `result.strategy.entryRules` and `exitRules`

- [ ] **Step 4: Mount the panel in the main dashboard**

Place it after `PaperTradingPanel` and before `IndicatorGrid` so Stage 2 support sits between execution and lower-level detail.

- [ ] **Step 5: Re-run the focused dashboard test**

Run:

```bash
npm test -- tests/unit/market-analysis-dashboard.test.tsx
```

Expected: PASS

### Task 3: Full verification for this slice

**Files:**
- Modify: any files touched above
- Test: `tests/unit/backtest-route.test.ts`
- Test: `tests/unit/market-analysis-dashboard.test.tsx`

- [ ] **Step 1: Run the directly related tests**

Run:

```bash
npm test -- tests/unit/backtest-route.test.ts tests/unit/market-analysis-dashboard.test.tsx tests/unit/run-backtest.test.ts tests/unit/build-strategy-config.test.ts
```

Expected: PASS

- [ ] **Step 2: Run repo verification gates**

Run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Expected: PASS

# Stage 1 Demo Completion and Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Stage 1 tail work for the current Minimum Demo so the product feels coherent, stable, and repeatedly testable before any Playbook, Strategy Lab, or public-release work starts.

**Architecture:** Keep the existing single-page Dashboard and server contracts intact. Focus this slice on presentation clarity, live-market refresh feedback, optional-data warning consistency, paper-trading readability, evidence-page readability, and test/documentation truthfulness without expanding the product scope.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Zod, Vitest, Testing Library

---

## File Structure

### Primary UI files

- `src/features/market-analysis/market-analysis-dashboard.tsx`
  - Top-level page state, polling, analysis snapshot state, market-feed state, paper-trading actions, and evidence navigation.
- `src/components/dashboard/analysis-controls.tsx`
  - Input selectors, action button, and top-of-flow input affordances.
- `src/components/dashboard/analysis-details.tsx`
  - Reasons, invalidation, warnings, provenance, and analysis snapshot detail rendering.
- `src/components/dashboard/indicator-grid.tsx`
  - Indicator cards, funding/OI unavailable rendering, and metric labeling.
- `src/components/dashboard/market-chart.tsx`
  - K-line panel and refresh-adjacent chart presentation.
- `src/components/dashboard/paper-trading-panel.tsx`
  - Preview, open-position, ledger, export, and evidence-entry UI.
- `src/features/evidence-report/evidence-report-page.tsx`
  - Evidence summary, ledger table, export, and report framing.
- `src/app/globals.css`
  - Shared layout, hierarchy, status, and evidence-page styling.

### Supporting logic files

- `src/server/market-data/completeness-warnings.ts`
  - Shared completeness-warning wording and deduping rules.
- `src/server/analysis/analyze-market.ts`
  - Warning assembly boundary between server output and browser rendering.
- `src/features/evidence-report/model.ts`
  - Evidence snapshot structure and summary helpers when report grouping needs clearer labels.

### Tests and docs

- `tests/unit/market-analysis-dashboard.test.tsx`
  - Dashboard rendering, refresh state, warning state, market-feed fallback, and paper-trading CTA expectations.
- `tests/unit/indicator-grid.test.tsx`
  - Funding/OI unavailable rendering consistency.
- `tests/unit/market-chart.test.tsx`
  - Chart metadata and refresh-related labels where needed.
- `tests/unit/evidence-page.test.tsx`
  - Evidence-page summary, mode labeling, and ledger readability.
- `README.md`
  - User-facing feature and test-entry documentation.
- `docs/development/PROJECT_STATUS_AND_NEXT_STEPS.md`
  - Current completion truth, test counts, and Stage 1 scope description.

---

### Task 1: Reorder the Dashboard information hierarchy

**Files:**
- Modify: `src/features/market-analysis/market-analysis-dashboard.tsx`
- Modify: `src/components/dashboard/analysis-controls.tsx`
- Modify: `src/components/dashboard/analysis-details.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/unit/market-analysis-dashboard.test.tsx`

- [ ] **Step 1: Write the failing Dashboard hierarchy test**

Add a test that asserts the top area exposes separate labels for analysis snapshot vs market feed:

```tsx
it("renders separate snapshot and market-feed sections with clear status labels", async () => {
  vi.stubGlobal("fetch", vi.fn(async (input: unknown, init?: RequestInit) => {
    const url = getRequestUrl(input);
    if (url.includes("/api/market-feed?mode=sample&timeframe=1h")) {
      return jsonResponse(buildMarketFeedResponse({ mode: "sample" }));
    }
    if (url === "/api/analyze" && init?.method === "POST") {
      return jsonResponse(buildAnalysisResponse("sample"));
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }));

  render(<MarketAnalysisDashboard />);
  fireEvent.click(screen.getByRole("button", { name: "分析市場" }));

  await waitFor(() => expect(screen.getByText("分析快照")).toBeInTheDocument());
  expect(screen.getByText("市場即時觀測")).toBeInTheDocument();
  expect(screen.getByText("LONG")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- tests/unit/market-analysis-dashboard.test.tsx`

Expected: FAIL because the current Dashboard does not render the new `分析快照` / `市場即時觀測` labels.

- [ ] **Step 3: Implement the hierarchy and labels**

Update the Dashboard render order so the result card is clearly marked as a snapshot and the market-feed panel is clearly marked as a live observation block:

```tsx
<section className="panel snapshot-panel">
  <div className="panel-header">
    <div>
      <p className="panel-label">分析快照</p>
      <h2>Decision Snapshot</h2>
    </div>
    <span className="panel-meta">
      產生時間：{new Date(analysisData.snapshot.fetchedAt).toLocaleTimeString("zh-TW")}
    </span>
  </div>
  <DecisionCard analysis={analysisData} />
  <AnalysisDetails analysis={analysisData} />
</section>

<section className="panel market-feed-panel">
  <div className="panel-header">
    <div>
      <p className="panel-label">市場即時觀測</p>
      <h2>Live Market Feed</h2>
    </div>
    <span className={`market-feed-status ${marketFeedStatus}`}>
      {marketFeedStatus === "refreshing" ? "更新中…" : marketFeedStatus === "updated" ? "剛剛更新" : "等待首次更新"}
    </span>
  </div>
  <p className="panel-summary">此區塊每 30 秒刷新，但不會改寫分析快照。</p>
  <MarketChart ... />
</section>
```

- [ ] **Step 4: Add minimal supporting styles**

Append styles that create visual separation without redesigning the whole app:

```css
.panel-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.panel-summary,
.panel-meta {
  color: #8fa2bd;
  font-size: 0.82rem;
}

.snapshot-panel,
.market-feed-panel {
  gap: 16px;
}
```

- [ ] **Step 5: Re-run the focused Dashboard test**

Run: `npm test -- tests/unit/market-analysis-dashboard.test.tsx`

Expected: PASS with the new labels rendered.

- [ ] **Step 6: Commit**

```bash
git add src/features/market-analysis/market-analysis-dashboard.tsx src/components/dashboard/analysis-controls.tsx src/components/dashboard/analysis-details.tsx src/app/globals.css tests/unit/market-analysis-dashboard.test.tsx
git commit -m "feat: clarify dashboard snapshot and market feed hierarchy"
```

---

### Task 2: Strengthen live price and market-feed refresh feedback

**Files:**
- Modify: `src/features/market-analysis/market-analysis-dashboard.tsx`
- Modify: `src/components/dashboard/market-chart.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/unit/market-analysis-dashboard.test.tsx`
- Test: `tests/unit/market-chart.test.tsx`

- [ ] **Step 1: Write the failing refresh-delta test**

Add a test that expects a visible direction label when the market-feed price changes:

```tsx
it("shows price direction feedback when the market feed price changes", async () => {
  vi.useFakeTimers();
  let marketFeedCalls = 0;
  vi.stubGlobal("fetch", vi.fn(async (input: unknown) => {
    const url = getRequestUrl(input);
    if (url.includes("/api/market-feed?mode=sample&timeframe=1h")) {
      marketFeedCalls += 1;
      return jsonResponse(buildMarketFeedResponse({
        mode: "sample",
        price: marketFeedCalls === 1 ? 100000 : 100123,
        fetchedAt: marketFeedCalls === 1 ? "2026-06-20T00:00:00.000Z" : "2026-06-20T00:30:00.000Z",
      }));
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }));

  render(<MarketAnalysisDashboard />);
  await act(async () => {
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(30000);
  });

  expect(screen.getByText("較前次上升")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- tests/unit/market-analysis-dashboard.test.tsx`

Expected: FAIL because no change-direction label is rendered today.

- [ ] **Step 3: Implement previous-price comparison**

Track the previous successful price inside the Dashboard and derive a display label:

```tsx
const [previousMarketFeedPrice, setPreviousMarketFeedPrice] = useState<number | null>(null);

// inside successful refresh
setPreviousMarketFeedPrice((current) => currentMarketFeed?.price ?? current);
setMarketFeed(parsed.data);

const priceDeltaLabel =
  !currentMarketFeed || previousMarketFeedPrice === null
    ? "首次載入"
    : currentMarketFeed.price > previousMarketFeedPrice
      ? "較前次上升"
      : currentMarketFeed.price < previousMarketFeedPrice
        ? "較前次下降"
        : "與前次持平";
```

- [ ] **Step 4: Render the price-delta summary next to the chart price**

```tsx
<div className="market-feed-meta">
  <span>上次更新：{new Date(currentMarketFeed.fetchedAt).toLocaleTimeString("zh-TW")}</span>
  <span className={`price-delta ${priceDeltaClassName}`}>{priceDeltaLabel}</span>
</div>
```

- [ ] **Step 5: Add CSS that makes refresh feedback noticeable but restrained**

```css
.price-delta {
  font-size: 0.8rem;
  font-weight: 700;
}

.price-delta.up { color: #8fd8a8; }
.price-delta.down { color: #f2a3a3; }
.price-delta.flat { color: #9ec0ef; }
```

- [ ] **Step 6: Add a chart-level test for feed metadata**

Add a unit test in `tests/unit/market-chart.test.tsx` that verifies the chart still renders when auxiliary metadata is shown above or below it. Keep this test shallow: it should assert the chart title and latest price remain visible.

```tsx
it("renders the latest price alongside the chart", () => {
  render(
    <MarketChart
      timeframe="1h"
      price={100123}
      fetchedAt="2026-06-20T00:30:00.000Z"
      candles={buildCandles()}
    />,
  );

  expect(screen.getByText("最新價格")).toBeInTheDocument();
  expect(screen.getByText("100123.00")).toBeInTheDocument();
});
```

- [ ] **Step 7: Re-run focused tests**

Run: `npm test -- tests/unit/market-analysis-dashboard.test.tsx tests/unit/market-chart.test.tsx`

Expected: PASS with visible refresh-direction feedback and intact chart rendering.

- [ ] **Step 8: Commit**

```bash
git add src/features/market-analysis/market-analysis-dashboard.tsx src/components/dashboard/market-chart.tsx src/app/globals.css tests/unit/market-analysis-dashboard.test.tsx tests/unit/market-chart.test.tsx
git commit -m "feat: improve market feed refresh feedback"
```

---

### Task 3: Unify funding and OI missing-data rendering

**Files:**
- Modify: `src/components/dashboard/indicator-grid.tsx`
- Modify: `src/components/dashboard/analysis-details.tsx`
- Modify: `src/server/market-data/completeness-warnings.ts`
- Modify: `src/server/analysis/analyze-market.ts`
- Test: `tests/unit/indicator-grid.test.tsx`
- Test: `tests/unit/market-analysis-dashboard.test.tsx`

- [ ] **Step 1: Write the failing missing-data test**

Add a test that checks funding/OI missing data is grouped under data completeness rather than mixed into decision warnings:

```tsx
it("renders completeness warnings separately from decision risk warnings", async () => {
  vi.stubGlobal("fetch", vi.fn(async (input: unknown, init?: RequestInit) => {
    const url = getRequestUrl(input);
    if (url.includes("/api/market-feed?mode=live&timeframe=1h")) {
      return jsonResponse(buildMarketFeedResponse({
        mode: "live",
        completenessWarnings: ["Funding rate unavailable.", "Open interest unavailable."],
      }));
    }
    if (url === "/api/analyze" && init?.method === "POST") {
      return jsonResponse({
        ...buildAnalysisResponse("live"),
        completenessWarnings: ["Funding rate unavailable.", "Open interest unavailable."],
      });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }));

  render(<MarketAnalysisDashboard />);
  fireEvent.click(screen.getByRole("button", { name: "LIVE" }));
  fireEvent.click(screen.getByRole("button", { name: "分析市場" }));

  await waitFor(() => expect(screen.getByText("資料完整性")).toBeInTheDocument());
  expect(screen.getByText("Funding rate unavailable.")).toBeInTheDocument();
  expect(screen.getByText("Open interest unavailable.")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused tests to verify failure**

Run: `npm test -- tests/unit/indicator-grid.test.tsx tests/unit/market-analysis-dashboard.test.tsx`

Expected: FAIL because the current UI does not separate completeness warnings under a dedicated section label.

- [ ] **Step 3: Deduplicate and normalize completeness warning text on the server**

In `src/server/market-data/completeness-warnings.ts`, make the helper return stable wording and dedupe repeated entries:

```ts
export function buildMarketCompletenessWarnings({
  fundingRateAvailable,
  openInterestAvailable,
}: {
  fundingRateAvailable: boolean;
  openInterestAvailable: boolean;
}) {
  const warnings: string[] = [];

  if (!fundingRateAvailable) warnings.push("Funding rate unavailable.");
  if (!openInterestAvailable) warnings.push("Open interest unavailable.");

  return Array.from(new Set(warnings));
}
```

- [ ] **Step 4: Render a dedicated completeness block in analysis details**

```tsx
{analysis.completenessWarnings.length ? (
  <section className="details-block">
    <p className="panel-label">資料完整性</p>
    <ul>{analysis.completenessWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
  </section>
) : null}

{analysis.decision.riskWarnings.length ? (
  <section className="details-block warning">
    <p className="panel-label">風險提醒</p>
    <ul>{analysis.decision.riskWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
  </section>
) : null}
```

- [ ] **Step 5: Keep indicator cards aligned with the same wording**

Ensure `indicator-grid.tsx` uses `Funding 不可用` / `OI 不可用` for cards but does not invent new sentence variants beyond the shared server warnings:

```tsx
<small>{fundingRate == null ? "Funding 不可用" : `${(fundingRate * 100).toFixed(4)}%`}</small>
<small>{openInterest == null ? "OI 不可用" : formatLargeNumber(openInterest)}</small>
```

- [ ] **Step 6: Re-run focused tests**

Run: `npm test -- tests/unit/indicator-grid.test.tsx tests/unit/market-analysis-dashboard.test.tsx`

Expected: PASS with separate completeness/risk sections and consistent unavailable wording.

- [ ] **Step 7: Commit**

```bash
git add src/components/dashboard/indicator-grid.tsx src/components/dashboard/analysis-details.tsx src/server/market-data/completeness-warnings.ts src/server/analysis/analyze-market.ts tests/unit/indicator-grid.test.tsx tests/unit/market-analysis-dashboard.test.tsx
git commit -m "feat: separate completeness warnings from risk warnings"
```

---

### Task 4: Make paper trading and evidence pages read like product surfaces

**Files:**
- Modify: `src/components/dashboard/paper-trading-panel.tsx`
- Modify: `src/features/market-analysis/market-analysis-dashboard.tsx`
- Modify: `src/features/evidence-report/evidence-report-page.tsx`
- Modify: `src/features/evidence-report/model.ts`
- Modify: `src/app/globals.css`
- Test: `tests/unit/market-analysis-dashboard.test.tsx`
- Test: `tests/unit/evidence-page.test.tsx`

- [ ] **Step 1: Write the failing paper-trading readability test**

Add a test that expects a preview card to show fee, stop, take profit, and explicit WAIT messaging:

```tsx
it("shows structured preview details and explicit WAIT messaging", async () => {
  vi.stubGlobal("fetch", vi.fn(async (input: unknown, init?: RequestInit) => {
    const url = getRequestUrl(input);
    if (url.includes("/api/market-feed?mode=sample&timeframe=1h")) return jsonResponse(buildMarketFeedResponse({ mode: "sample" }));
    if (url === "/api/analyze" && init?.method === "POST") {
      return jsonResponse({
        ...buildAnalysisResponse("sample"),
        decision: { ...buildAnalysisResponse("sample").decision, action: "WAIT", confidence: 55, marketBiasScore: 55 },
      });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }));

  render(<MarketAnalysisDashboard />);
  fireEvent.click(screen.getByRole("button", { name: "分析市場" }));

  await waitFor(() => expect(screen.getByText("WAIT 結果不可建立模擬交易。")).toBeInTheDocument());
});
```

- [ ] **Step 2: Run the focused tests to verify failure**

Run: `npm test -- tests/unit/market-analysis-dashboard.test.tsx tests/unit/evidence-page.test.tsx`

Expected: FAIL because the current panel does not expose the richer preview/readability structure yet.

- [ ] **Step 3: Restructure the paper-trading panel**

Split summary, preview, open position, and ledger blocks into readable sub-sections:

```tsx
<div className="paper-card">
  <p className="panel-label">TRADE PREVIEW</p>
  <div className="paper-detail-grid">
    <span>Entry {fmt(preview.entryPrice)}</span>
    <span>Stop {fmt(preview.stopLoss)}</span>
    <span>Take Profit {fmt(preview.takeProfit)}</span>
    <span>Quantity {preview.quantity.toFixed(6)}</span>
    <span>Open Fee {fmt(preview.estimatedOpenFee)}</span>
    <span>Risk Budget {fmt(preview.riskBudget)}</span>
  </div>
</div>
```

Also add a passive restore note when local state is recovered:

```tsx
{account.openPosition ? <p className="paper-notice">已恢復本地模擬帳戶狀態。</p> : null}
```

- [ ] **Step 4: Restructure the evidence report summary**

At the top of `EvidenceReportPage`, add a compact summary row that surfaces mode, action, confidence, record count, realized PnL, and generated time before the ledger table:

```tsx
<section className="panel report-overview">
  <div className="indicator-grid">
    <article className="metric"><p className="panel-label">MODE</p><strong>{snapshot.analysis.snapshot.mode.toUpperCase()}</strong></article>
    <article className="metric"><p className="panel-label">ACTION</p><strong>{snapshot.analysis.decision.action}</strong></article>
    <article className="metric"><p className="panel-label">CONFIDENCE</p><strong>{snapshot.analysis.decision.confidence}</strong></article>
    <article className="metric"><p className="panel-label">REALIZED PNL</p><strong>{fmt(snapshot.summary.realizedPnl)}</strong></article>
  </div>
</section>
```

- [ ] **Step 5: Update the evidence-page test to match the new summary**

```tsx
expect(screen.getByText("MODE")).toBeInTheDocument();
expect(screen.getByText("ACTION")).toBeInTheDocument();
expect(screen.getByText("REALIZED PNL")).toBeInTheDocument();
```

- [ ] **Step 6: Re-run focused tests**

Run: `npm test -- tests/unit/market-analysis-dashboard.test.tsx tests/unit/evidence-page.test.tsx`

Expected: PASS with clearer paper/evidence surfaces.

- [ ] **Step 7: Commit**

```bash
git add src/components/dashboard/paper-trading-panel.tsx src/features/market-analysis/market-analysis-dashboard.tsx src/features/evidence-report/evidence-report-page.tsx src/features/evidence-report/model.ts src/app/globals.css tests/unit/market-analysis-dashboard.test.tsx tests/unit/evidence-page.test.tsx
git commit -m "feat: improve paper trading and evidence readability"
```

---

### Task 5: Finish Stage 1 validation and documentation truthfulness

**Files:**
- Modify: `README.md`
- Modify: `docs/development/PROJECT_STATUS_AND_NEXT_STEPS.md`
- Modify: `tests/unit/package-scripts.test.ts` (only if script references change)

- [ ] **Step 1: Write the failing documentation-truth checklist**

Create a local checklist in the plan execution notes and compare actual command output against the docs. The failing condition for this task is textual: current status counts and wording are stale relative to the current test suite and `demo-check` entrypoint.

Required verification targets:

```text
- README only recommends the single demo-check entrypoint.
- PROJECT_STATUS_AND_NEXT_STEPS.md reflects the current Stage ordering.
- Test counts in PROJECT_STATUS_AND_NEXT_STEPS.md match actual command output.
```

- [ ] **Step 2: Run the canonical verification flow**

Run: `EXIT_AFTER_READY=1 NO_OPEN_BROWSER=1 npm run demo-check`

Expected: PASS. Capture the latest totals from the output and use those exact numbers when updating docs.

- [ ] **Step 3: Update README to describe the Stage 1-finished product truthfully**

Keep the README aligned with current scope:

```md
- live/sample analysis with deterministic LONG/SHORT/WAIT
- 30-second market-feed and price refresh that does not rerun analysis
- paper trading preview/open/close plus JSON/CSV ledger export
- evidence page for current local artifact review
- single full test entrypoint: npm run demo-check
```

- [ ] **Step 4: Update the project-status document with current counts and Stage 1 finish criteria**

Refresh the validation section with the latest actual test totals and narrow Stage 1 exit criteria to:

```text
- Dashboard states are visually distinct and understandable.
- Market feed refresh is visible and does not overwrite analysis.
- Funding/OI missing data is consistently explained.
- Paper trading and evidence screens are readable end-to-end.
- demo-check remains the canonical repeatable validation path.
```

- [ ] **Step 5: Re-run final validation**

Run each command separately:

```bash
npm run lint
npm run typecheck
npm test
npm run build
EXIT_AFTER_READY=1 NO_OPEN_BROWSER=1 npm run demo-check
```

Expected: every command exits `0`, tests pass, build passes, and `demo-check` reports success.

- [ ] **Step 6: Commit**

```bash
git add README.md docs/development/PROJECT_STATUS_AND_NEXT_STEPS.md tests/unit/package-scripts.test.ts
git commit -m "docs: sync stage one completion status"
```

---

## Self-Review

- Spec coverage: This plan covers the current user-approved Stage 1 scope only — Dashboard clarity, refresh visibility, missing-data consistency, paper/evidence readability, and repeatable validation. It intentionally excludes Playbook, Strategy Lab, deployment, and submission packaging.
- Placeholder scan: No `TODO`/`TBD` placeholders remain. Each task includes files, focused tests, commands, and expected outcomes.
- Type consistency: The plan uses the existing `AnalyzeResponse`, `MarketFeedResponse`, paper-trading preview/account model, and current route names (`/api/analyze`, `/api/market-feed`, `/api/price`) consistently.


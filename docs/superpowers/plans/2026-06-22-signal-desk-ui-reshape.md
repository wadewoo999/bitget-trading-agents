# Signal Desk UI Reshape Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將首頁重塑為參考 Signal Desk 的交易台布局，採用「左欄控制與判斷、中央圖表與策略、右欄先風險後交易」的閱讀順序，同時保留現有分析、Strategy Support、Strategy Lab、Paper Trading 功能。

**Architecture:** 以既有 `MarketAnalysisDashboard` 為主體，不新增頁面，改為重排現有區塊與少量細分元件責任。版型層級由 `market-analysis-dashboard.tsx` 控制，視覺系統集中在 `globals.css`，既有內容元件只做必要結構調整，不重寫資料流。

**Tech Stack:** Next.js App Router、React Client Components、TypeScript、Vitest、Testing Library、全域 CSS

---

### Task 1: 鎖定新布局的測試契約

**Files:**
- Modify: `tests/unit/market-analysis-dashboard.test.tsx`
- Modify: `tests/unit/app-shell.test.tsx`
- Test: `tests/unit/market-analysis-dashboard.test.tsx`

- [ ] **Step 1: Write the failing dashboard layout assertions**

```tsx
it("renders the signal-desk style layout rails in the correct order", async () => {
  render(<MarketAnalysisDashboard />);

  expect(screen.getByText("Control Rail")).toBeInTheDocument();
  expect(screen.getByText("Central Command")).toBeInTheDocument();
  expect(screen.getByText("Risk Rail")).toBeInTheDocument();
  expect(screen.getByText("Trade Rail")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/market-analysis-dashboard.test.tsx`
Expected: FAIL because the new rail labels and layout containers do not exist yet

- [ ] **Step 3: Add one assertion for central ordering after analysis**

```tsx
await waitFor(() => expect(screen.getByText("Decision Snapshot")).toBeInTheDocument());
const stage = screen.getByLabelText("central-command");
expect(within(stage).getByText("Live Market Feed")).toBeInTheDocument();
expect(within(stage).getByText("Strategy Support")).toBeInTheDocument();
expect(within(stage).getByText("Strategy Lab")).toBeInTheDocument();
```

- [ ] **Step 4: Run test to verify it still fails for the right reason**

Run: `npm test -- tests/unit/market-analysis-dashboard.test.tsx`
Expected: FAIL because `aria-label="central-command"` and the new grouping are missing

- [ ] **Step 5: Commit**

```bash
git add tests/unit/market-analysis-dashboard.test.tsx tests/unit/app-shell.test.tsx
git commit -m "test: define signal desk dashboard layout contract"
```

### Task 2: 重排 dashboard 結構成三區布局

**Files:**
- Modify: `src/features/market-analysis/market-analysis-dashboard.tsx`
- Modify: `src/components/dashboard/analysis-controls.tsx`
- Test: `tests/unit/market-analysis-dashboard.test.tsx`

- [ ] **Step 1: Write the failing accessibility-oriented structure test**

```tsx
expect(screen.getByLabelText("control-rail")).toBeInTheDocument();
expect(screen.getByLabelText("central-command")).toBeInTheDocument();
expect(screen.getByLabelText("action-rail")).toBeInTheDocument();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/market-analysis-dashboard.test.tsx`
Expected: FAIL because these layout landmarks are not rendered

- [ ] **Step 3: Write the minimal JSX restructure**

```tsx
<div className="signal-desk-layout">
  <aside className="control-rail" aria-label="control-rail">
    <AnalysisControls ... />
    <section className="decision-rail">...</section>
  </aside>

  <section className="central-command" aria-label="central-command">
    <section className="central-hero">...</section>
    <StrategySupportPanel ... />
    <StrategyLabPanel ... />
  </section>

  <aside className="action-rail" aria-label="action-rail">
    <section className="risk-rail">...</section>
    <section className="trade-rail">...</section>
  </aside>
</div>
```

- [ ] **Step 4: Keep data flow unchanged while moving blocks**

```tsx
const decisionSnapshot = analysisData ? <DecisionCard data={analysisData} /> : null;
const riskBlock = analysisData ? <AnalysisDetails data={analysisData} /> : null;
const tradeBlock = (
  <PaperTradingPanel
    analysis={analysisData}
    account={account}
    preview={preview}
    ...
  />
);
```

- [ ] **Step 5: Run the targeted tests**

Run: `npm test -- tests/unit/market-analysis-dashboard.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/market-analysis/market-analysis-dashboard.tsx src/components/dashboard/analysis-controls.tsx tests/unit/market-analysis-dashboard.test.tsx
git commit -m "feat: reshape dashboard into signal desk layout"
```

### Task 3: 建立新的視覺系統與版面樣式

**Files:**
- Modify: `src/app/globals.css`
- Test: `tests/unit/app-shell.test.tsx`
- Test: `tests/unit/market-analysis-dashboard.test.tsx`

- [ ] **Step 1: Write the failing class-based smoke test**

```tsx
const root = container.querySelector(".signal-desk-layout");
expect(root).not.toBeNull();
expect(container.querySelector(".control-rail")).not.toBeNull();
expect(container.querySelector(".central-command")).not.toBeNull();
expect(container.querySelector(".action-rail")).not.toBeNull();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/app-shell.test.tsx tests/unit/market-analysis-dashboard.test.tsx`
Expected: FAIL because the new CSS class hooks are absent

- [ ] **Step 3: Add the layout and visual styles**

```css
.signal-desk-layout {
  display: grid;
  grid-template-columns: minmax(250px, 0.8fr) minmax(0, 1.7fr) minmax(260px, 0.9fr);
  gap: 16px;
}

.control-rail,
.central-command,
.action-rail {
  display: grid;
  gap: 14px;
}

.central-hero {
  border: 1px solid var(--line);
  background: linear-gradient(180deg, #0f1c31, #0b1524);
}
```

- [ ] **Step 4: Add mobile collapse rules without changing component order**

```css
@media (max-width: 1100px) {
  .signal-desk-layout {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 5: Run the targeted tests**

Run: `npm test -- tests/unit/app-shell.test.tsx tests/unit/market-analysis-dashboard.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css tests/unit/app-shell.test.tsx tests/unit/market-analysis-dashboard.test.tsx
git commit -m "style: add signal desk layout system"
```

### Task 4: 將風險與交易內容分別落到右欄上下區

**Files:**
- Modify: `src/components/dashboard/analysis-details.tsx`
- Modify: `src/components/dashboard/paper-trading-panel.tsx`
- Modify: `src/features/market-analysis/market-analysis-dashboard.tsx`
- Test: `tests/unit/market-analysis-dashboard.test.tsx`

- [ ] **Step 1: Write the failing split-rail behavior test**

```tsx
const actionRail = screen.getByLabelText("action-rail");
expect(within(actionRail).getByText("Risk Rail")).toBeInTheDocument();
expect(within(actionRail).getByText("Trade Rail")).toBeInTheDocument();
expect(within(actionRail).getByText("Paper Trading")).toBeInTheDocument();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/market-analysis-dashboard.test.tsx`
Expected: FAIL because the right rail has not been separated into risk and trade zones

- [ ] **Step 3: Split `AnalysisDetails` into embeddable sections**

```tsx
export function AnalysisRiskPanel({ data }: { data: AnalyzeResponse }) {
  return (
    <>
      <section className="panel warning">...</section>
      <section className="panel">...</section>
    </>
  );
}
```

- [ ] **Step 4: Place risk content above trading content in the action rail**

```tsx
<aside className="action-rail" aria-label="action-rail">
  <section className="risk-rail">
    <p className="panel-label">Risk Rail</p>
    <AnalysisRiskPanel data={analysisData} />
  </section>
  <section className="trade-rail">
    <p className="panel-label">Trade Rail</p>
    <PaperTradingPanel ... />
  </section>
</aside>
```

- [ ] **Step 5: Run the targeted test**

Run: `npm test -- tests/unit/market-analysis-dashboard.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/analysis-details.tsx src/components/dashboard/paper-trading-panel.tsx src/features/market-analysis/market-analysis-dashboard.tsx tests/unit/market-analysis-dashboard.test.tsx
git commit -m "feat: split action rail into risk and trade sections"
```

### Task 5: 全量驗證與文案對齊

**Files:**
- Modify: `scripts/demo-check.mjs` (only if the manual check text needs updating)
- Modify: `tests/unit/package-scripts.test.ts` (only if script text changes)
- Test: `tests/unit/package-scripts.test.ts`

- [ ] **Step 1: Run the visual-contract regression suite**

Run: `npm test -- tests/unit/create-decision.test.ts tests/unit/indicator-grid.test.tsx tests/unit/strategy-support.test.ts tests/unit/market-analysis-dashboard.test.tsx`
Expected: PASS

- [ ] **Step 2: Update one-click script wording if manual check instructions mention old vertical order**

```js
"確認左欄的控制與決策、中央的 Chart/Strategy Support/Strategy Lab、右欄的風險與 Paper Trading 順序正確"
```

- [ ] **Step 3: Run the script test if wording changed**

Run: `npm test -- tests/unit/package-scripts.test.ts`
Expected: PASS

- [ ] **Step 4: Run full verification**

Run: `npm run lint && npm run typecheck && npm test && npm run build`
Expected: PASS with the dashboard rendering in the new signal-desk structure

- [ ] **Step 5: Commit**

```bash
git add scripts/demo-check.mjs tests/unit/package-scripts.test.ts src tests
git commit -m "feat: complete signal desk ui reshape"
```


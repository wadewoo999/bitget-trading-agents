# Stage 2 GetAgent Playbook and Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first real GetAgent Playbook for this repo, run a real sandbox backtest/evaluation, and store verifiable Playbook evidence in the product without starting public product deployment work.

**Architecture:** Keep Stage 2 narrow. Author one deterministic BTC-only Playbook package inside the repo, validate it locally, run the authenticated GetAgent workflow outside the public web app, then import the resulting public evidence back into the repo as read-only data. Do not mix this stage with Strategy Lab, multi-asset expansion, or Vercel deployment.

**Tech Stack:** Next.js 16, TypeScript, Zod, Vitest, Python 3.11+, GetAgent Playbook package format, GetAgent control-plane API, YAML

---

## File Structure

- New `playbooks/btc-decision-playbook/`
  - Local GetAgent package source for the first publishable BTC strategy
- New `playbooks/btc-decision-playbook/README.md`
  - Human-readable Playbook description for subscribers
- New `playbooks/btc-decision-playbook/manifest.yaml`
  - Playbook manifest and editable runtime config
- New `playbooks/btc-decision-playbook/backtest.yaml`
  - Replay window, venue, instrument, strategy class, and data requirements
- New `playbooks/btc-decision-playbook/src/main.py`
  - GetAgent Playbook entrypoint
- New `playbooks/btc-decision-playbook/src/strategy.py`
  - Deterministic strategy implementation aligned with repo decision logic
- New `playbooks/btc-decision-playbook/src/indicators.py`
  - Indicator preparation used only by the Playbook package
- New `playbooks/btc-decision-playbook/src/risk.py`
  - Sizing / stop / exit helpers inside the Playbook package
- New `playbooks/btc-decision-playbook/src/execution.py`
  - Signal emission and optional follow-trade wrapper
- New `evidence/playbook/README.md`
  - Explains what files were captured and when they are valid
- New `evidence/playbook/latest.json`
  - Repo-side checked-in Playbook evidence snapshot matching `playbookEvidenceSchema`
- New `evidence/playbook/latest-summary.md`
  - Short human-readable interpretation of the latest verified Playbook run
- New `src/features/playbook-evidence/load-playbook-evidence.ts`
  - Reads and validates checked-in Playbook evidence
- Modify `src/features/playbook-evidence/model.ts`
  - Extend evidence contract only if the checked-in evidence needs non-breaking extra fields
- Modify `src/features/evidence-report/evidence-report-page.tsx`
  - Add a read-only Playbook evidence section sourced from repo evidence
- New `tests/unit/playbook-evidence-loader.test.ts`
  - Verifies checked-in evidence is parsed and displayed correctly
- Modify `tests/unit/contracts.test.ts`
  - Keep contract coverage aligned with the final evidence shape
- Modify `README.md`
  - Add Stage 2 local workflow, prerequisites, and current status after the first real Playbook run
- Modify `docs/development/PROJECT_STATUS_AND_NEXT_STEPS.md`
  - Mark Stage 1 complete and turn Stage 2 into active work with exact remaining blockers

Assumption for Stage 2 first version:

- First Playbook version targets `BTCUSDT`
- First execution timeframe uses `4h`
- Decision mode stays `deterministic`
- Backtest support stays `full`
- Execution mode starts with `signal_only`

Reason: this is the lowest-risk path to obtain reproducible sandbox evidence before adding follow-trade complexity.

---

### Task 1: Sync repo status after Stage 1 completion

**Files:**
- Modify: `README.md`
- Modify: `docs/development/PROJECT_STATUS_AND_NEXT_STEPS.md`
- Test: no code test; use repo verification commands

- [ ] **Step 1: Write the expected Stage 1 completion assertions in docs**

Add these exact points to the status update:

```md
- Stage 1 已完成，重點包括：
  - 分析快照與市場即時觀測分離
  - 30 秒自動刷新只更新最新價格
  - K 線與 market context 不再被自動刷新覆寫
  - market feed 可直接顯示 Funding / OI
  - 一鍵驗證流程維持可用
```

- [ ] **Step 2: Update stale verification numbers and scope wording**

Update the status doc values to the current state:

```md
> 評估日期：2026-06-22
> 評估基準：`main` 最新工作區驗證結果

| `npm test` | 22 files、98 tests 全部通過 |
| `npm run build` | 通過 |
```

Also remove mobile-specific wording and replace it with desktop-only QA wording:

```md
- desktop browser smoke test
- desktop visual QA
- browser console 檢查
```

- [ ] **Step 3: Run focused verification for the doc truth source**

Run:

```bash
npm test -- tests/unit/market-analysis-dashboard.test.tsx
```

Expected: PASS with the latest market-feed behavior still green

- [ ] **Step 4: Commit**

```bash
git add README.md docs/development/PROJECT_STATUS_AND_NEXT_STEPS.md
git commit -m "docs: mark stage one complete and activate stage two"
```

---

### Task 2: Author the first deterministic BTC Playbook package

**Files:**
- Create: `playbooks/btc-decision-playbook/README.md`
- Create: `playbooks/btc-decision-playbook/manifest.yaml`
- Create: `playbooks/btc-decision-playbook/backtest.yaml`
- Create: `playbooks/btc-decision-playbook/src/main.py`
- Create: `playbooks/btc-decision-playbook/src/strategy.py`
- Create: `playbooks/btc-decision-playbook/src/indicators.py`
- Create: `playbooks/btc-decision-playbook/src/risk.py`
- Create: `playbooks/btc-decision-playbook/src/execution.py`
- Test: local GetAgent validator

- [ ] **Step 1: Write the package files with the minimal deterministic skeleton**

Create `playbooks/btc-decision-playbook/manifest.yaml` with this baseline:

```yaml
name: btc-decision-playbook
display_name: "BTC Decision Playbook"
description: "Deterministic BTC trend-following Playbook aligned with the repo decision engine."
long_description: |
  This Playbook follows directional BTC contract trends and is designed for users
  who want a structured, repeatable trading signal rather than discretionary
  judgement. It looks for strong directional agreement between trend, momentum,
  participation, and market context before issuing a long or short signal, and
  stays out of the market when conviction is weak. The goal is not to predict
  every reversal but to participate only when the broader structure is clear
  enough to justify taking risk.

  The strategy opens a position only after its directional checks line up and the
  market regime appears supportive. If the environment is mixed or confidence is
  too low, it emits no trade. This behavior mirrors the product principle that
  low-confidence setups should resolve to waiting rather than forcing action.

  Exits are driven by structural invalidation rather than prediction. When trend
  support weakens, momentum fades, or the trade no longer matches the dominant
  direction, the strategy retracts the idea and closes. This keeps the system
  rule-based and explainable rather than reactive to noise.

  Subscribers can tune leverage and margin budget. Higher leverage magnifies both
  gains and drawdowns. Margin budget sets the per-strategy capital denominator the
  platform uses for sizing and return interpretation. Raising either value
  increases risk; neither improves signal quality by itself.

  The strategy can underperform during range-bound conditions, abrupt event-driven
  reversals, and noisy periods where trend and participation lose alignment. It is
  intended for users who prefer a slower, more selective BTC contract workflow and
  understand that even historically clean trend systems can suffer clusters of
  false starts.
market_type: contract
trading_symbols: ["BTCUSDT"]
tags: ["btc", "trend", "deterministic", "contract"]
schedule:
  cron: "0 */4 * * *"
  tz: "Asia/Shanghai"
decision_mode: deterministic
backtest_support: full
runtime_profile: deterministic
execution_mode: signal_only
follow_trade_supported: false
strategy_config:
  trading_symbols: ["BTCUSDT"]
  timeframe: "4h"
  leverage: 3
  margin_budget: "50"
user_config_schema:
  trading_symbols:
    type: array
    item_type: string
    default: ["BTCUSDT"]
    options: ["BTCUSDT"]
    min_items: 1
    max_items: 1
    label: "Trading symbol"
  leverage:
    type: integer
    default: 3
    min: 1
    max: 10
    label: "Leverage"
  margin_budget:
    type: string
    default: "50"
    pattern: "^[0-9]+(\\.[0-9]+)?$"
    label: "Margin budget USDT"
```

- [ ] **Step 2: Write the replay contract**

Create `playbooks/btc-decision-playbook/backtest.yaml` with this baseline:

```yaml
venue:
  name: BINANCE
  account_type: MARGIN
  oms_type: HEDGING
  starting_balances:
    - "10000 USDT"

instrument:
  id: BTCUSDT.BINANCE
  kind: crypto_perpetual
  raw_symbol: BTCUSDT
  base_currency: BTC
  quote_currency: USDT
  settlement_currency: USDT
  price_precision: 2
  size_precision: 6
  price_increment: "0.01"
  size_increment: "0.000001"
  bar_type: BTCUSDT.BINANCE-4-HOUR-LAST-EXTERNAL

strategy:
  module: src.strategy
  class: BtcDecisionStrategy

execution:
  start: "2024-01-01T00:00:00Z"
  end: "2025-12-31T00:00:00Z"

data_requirements:
  required_bar_fields:
    - quote_volume
```

- [ ] **Step 3: Write the failing local validation run**

Run:

```bash
python /Users/wayne/.codex/skills/getagent/scripts/validate.py ./playbooks/btc-decision-playbook
```

Expected: FAIL because `src/main.py` and strategy code are still missing

- [ ] **Step 4: Write minimal implementation files**

Create `playbooks/btc-decision-playbook/src/main.py`:

```python
from src.strategy import run_playbook


if __name__ == "__main__":
    run_playbook()
```

Create `playbooks/btc-decision-playbook/src/strategy.py` with a deterministic placeholder that fetches historical bars, computes replay features, runs the backtest, and emits a hold/long/short signal only through `getagent.runtime`.

The first passing version must:

- import only `getagent.backtest`, `getagent.data`, and `getagent.runtime`
- fetch `BTCUSDT` futures bars
- preserve at least `quote_volume`
- avoid any direct HTTP client
- avoid any LLM path

- [ ] **Step 5: Re-run local validation until it passes**

Run:

```bash
python /Users/wayne/.codex/skills/getagent/scripts/validate.py ./playbooks/btc-decision-playbook
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add playbooks/btc-decision-playbook
git commit -m "feat: add initial btc getagent playbook package"
```

---

### Task 3: Align the Playbook logic with the existing product decision rules

**Files:**
- Modify: `playbooks/btc-decision-playbook/src/strategy.py`
- Modify: `playbooks/btc-decision-playbook/src/indicators.py`
- Modify: `playbooks/btc-decision-playbook/src/risk.py`
- Modify: `playbooks/btc-decision-playbook/README.md`
- Reference: `src/server/decision/create-decision.ts` or current repo decision modules
- Test: local validator plus any repo-side contract tests you add

- [ ] **Step 1: Write the failing alignment checklist as code comments or a local note before changing behavior**

The Playbook must preserve these repo rules:

```text
trend + momentum + participation + crowding
confidence < 60 => WAIT
BTCUSDT only
deterministic only
no stale data pretending to be live
```

- [ ] **Step 2: Port only the replayable subset into Playbook code**

Use these boundaries:

```text
Allowed in first Playbook version:
- EMA trend structure
- RSI / momentum
- price return / volume participation

Do not use in first Playbook backtest:
- point-in-time funding if historical alignment is unavailable
- point-in-time OI if historical alignment is unavailable
- any LLM logic
```

This means the first Playbook version is intentionally a deterministic subset of the product logic, not a one-to-one copy of every live-only context field.

- [ ] **Step 3: Re-run local validation**

Run:

```bash
python /Users/wayne/.codex/skills/getagent/scripts/validate.py ./playbooks/btc-decision-playbook
```

Expected: PASS

- [ ] **Step 4: Add or update repo-side contract coverage if the evidence contract changes**

Run:

```bash
npm test -- tests/unit/contracts.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add playbooks/btc-decision-playbook tests/unit/contracts.test.ts
git commit -m "feat: align playbook strategy with deterministic btc decision rules"
```

---

### Task 4: Execute the authenticated GetAgent workflow and capture real evidence

**Files:**
- Modify: `playbooks/btc-decision-playbook/README.md`
- Create: `evidence/playbook/latest.json`
- Create: `evidence/playbook/latest-summary.md`
- Create: `evidence/playbook/README.md`
- Test: local validator plus real GetAgent run outputs

- [ ] **Step 1: Confirm external prerequisites before any upload**

Required human prerequisites:

```text
1. 已用報名 UID 建立 Playbook 子帳戶
2. 已取得 Playbook ACCESS-KEY
3. 已確認可以對 GetAgent / Playbook control-plane 發起 authenticated 請求
```

Do not proceed to upload until all three are true.

- [ ] **Step 2: Re-run local validation immediately before upload**

Run:

```bash
python /Users/wayne/.codex/skills/getagent/scripts/validate.py ./playbooks/btc-decision-playbook
```

Expected: PASS

- [ ] **Step 3: Upload and start a real sandbox run**

Use the exact GetAgent API surface from the skill references. Do not invent custom endpoints. Capture these outputs:

```text
- draft_id or package identifier
- sandbox run identifier
- public Playbook URL if generated
- verified metrics:
  - totalReturnPct
  - maxDrawdownPct
  - sharpeRatio
  - winRate
  - tradeCount
- real equity curve artifact path or URL
- verifiedAt timestamp
```

- [ ] **Step 4: Write checked-in evidence**

Create `evidence/playbook/latest.json` in this shape:

```json
{
  "playbookUrl": "https://example.com/public-playbook-url",
  "status": "completed",
  "verifiedAt": "2026-06-22T00:00:00.000Z",
  "metrics": {
    "totalReturnPct": 0,
    "maxDrawdownPct": 0,
    "sharpeRatio": 0,
    "winRate": 0,
    "tradeCount": 0
  }
}
```

Only replace the zeros with real verified numbers from the actual run.

- [ ] **Step 5: Write human-readable evidence notes**

Create `evidence/playbook/latest-summary.md` covering:

```md
# Latest Playbook Evidence

- Playbook URL:
- Verified at:
- Symbol:
- Timeframe:
- total return:
- max drawdown:
- sharpe:
- win rate:
- trade count:
- main risk observed:
```

- [ ] **Step 6: Commit**

```bash
git add evidence/playbook playbooks/btc-decision-playbook/README.md
git commit -m "feat: capture verified getagent playbook evidence"
```

---

### Task 5: Surface checked-in Playbook evidence inside the product

**Files:**
- Modify: `src/features/playbook-evidence/model.ts`
- Create: `src/features/playbook-evidence/load-playbook-evidence.ts`
- Modify: `src/features/evidence-report/evidence-report-page.tsx`
- Create: `tests/unit/playbook-evidence-loader.test.ts`
- Modify: `tests/unit/contracts.test.ts`

- [ ] **Step 1: Write the failing loader test**

Create `tests/unit/playbook-evidence-loader.test.ts` expecting:

```ts
import { describe, expect, it } from "vitest";
import { loadPlaybookEvidence } from "@/features/playbook-evidence/load-playbook-evidence";

describe("loadPlaybookEvidence", () => {
  it("reads and validates the checked-in latest Playbook evidence", async () => {
    const evidence = await loadPlaybookEvidence();
    expect(evidence.status).toBe("completed");
    expect(evidence.playbookUrl.startsWith("http")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test -- tests/unit/playbook-evidence-loader.test.ts
```

Expected: FAIL because the loader file does not exist yet

- [ ] **Step 3: Write the minimal loader**

Create `src/features/playbook-evidence/load-playbook-evidence.ts`:

```ts
import { readFile } from "node:fs/promises";
import path from "node:path";
import { playbookEvidenceSchema } from "@/features/playbook-evidence/model";

export async function loadPlaybookEvidence() {
  const filePath = path.join(process.cwd(), "evidence/playbook/latest.json");
  const raw = await readFile(filePath, "utf8");
  return playbookEvidenceSchema.parse(JSON.parse(raw));
}
```

- [ ] **Step 4: Render a read-only Playbook evidence section**

Add a section in `src/features/evidence-report/evidence-report-page.tsx` with these visible fields:

```text
Playbook URL
Verified at
Total Return
Max Drawdown
Sharpe Ratio
Win Rate
Trade Count
```

This section must read only from checked-in evidence and must not trigger external API calls from the public page.

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm test -- tests/unit/playbook-evidence-loader.test.ts tests/unit/contracts.test.ts tests/unit/evidence-page.test.tsx
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/playbook-evidence src/features/evidence-report tests/unit
git commit -m "feat: surface verified playbook evidence in the product"
```

---

### Task 6: Final Stage 2 verification and handoff

**Files:**
- Modify: `README.md`
- Modify: `docs/development/PROJECT_STATUS_AND_NEXT_STEPS.md`

- [ ] **Step 1: Run the full repo verification**

Run:

```bash
npm test
npm run build
```

Expected:

```text
Test Files  22+ passed
Tests  98+ passed
Next.js build passed
```

- [ ] **Step 2: Run the product one-click verification path**

Run:

```bash
npm run demo-check
```

Expected:

```text
sample analyze OK
live analyze OK
price endpoint OK
market-feed endpoint OK
homepage opens
```

- [ ] **Step 3: Update Stage 2 status lines**

Add these exact outcome lines when true:

```md
- GetAgent Playbook package 已建立
- local validation 已通過
- sandbox run evidence 已保存
- repo 內已有只讀 Playbook evidence 顯示
```

- [ ] **Step 4: Commit**

```bash
git add README.md docs/development/PROJECT_STATUS_AND_NEXT_STEPS.md
git commit -m "docs: record stage two playbook verification status"
```

---

## Plan Self-Review

- Spec coverage: This plan covers the next agreed phase only — GetAgent Playbook package, authenticated sandbox evidence, repo-side evidence import, and Stage 2 doc/status sync. It intentionally excludes Strategy Lab, multi-asset expansion, and public product deployment.
- Placeholder scan: No `TODO`, `TBD`, or deferred “add tests later” steps remain. External authenticated steps are explicit blockers rather than placeholders.
- Type consistency: The plan keeps `playbookEvidenceSchema` as the repo evidence contract and uses non-breaking repo-side loader/display additions rather than inventing a new evidence pipeline.


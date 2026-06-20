# Minimum Demo Contract Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the repository documentation and public Zod contracts match the approved deterministic Minimum Executable Demo before market-data, UI, or paper-trading behavior is implemented.

**Architecture:** Treat `docs/development/specs/2026-06-20-minimum-demo-design.md` as the current implementation source of truth while keeping `docs/product/PROJECT_SPEC.md` as the longer-term product target. Align the decision, market-analysis, API, and paper-account contracts with the first Demo, leaving Strategy Lab and Playbook contracts unchanged for later phases.

**Tech Stack:** TypeScript 6, Zod 4, Vitest 4, Next.js 16

---

## Scope and File Map

**Modify:**

- `AGENTS.md`: identify the approved Minimum Demo design as the current implementation authority.
- `README.md`: link the current Demo design separately from the long-term product specification.
- `docs/product/PROJECT_SPEC.md`: explain that it is the long-term target and defer first-version behavior to the Demo design.
- `src/features/decision/model.ts`: replace the LLM contract with deterministic score, category-signal, volatility, and stance-assessment fields.
- `src/features/market-analysis/model.ts`: add stance and data mode, remove historical OI change, and define analysis, price, source, and API error contracts.
- `src/features/paper-trading/model.ts`: add data provenance and versioned browser account state.
- `tests/unit/contracts.test.ts`: retain only Strategy Lab and Playbook tests that are outside this phase.

**Create:**

- `tests/unit/decision-contract.test.ts`: deterministic decision contract tests.
- `tests/unit/market-analysis-contract.test.ts`: analysis request/response, price, and API error contract tests.
- `tests/unit/paper-trading-contract.test.ts`: paper position, ledger, and storage-state contract tests.

**Do not modify:**

- `src/features/strategy-lab/model.ts`
- `src/features/playbook-evidence/model.ts`
- UI files, API route handlers, integrations, fixtures, indicator calculations, or trading behavior

### Task 1: Declare the Current Implementation Authority

**Files:**

- Modify: `AGENTS.md`
- Modify: `README.md`
- Modify: `docs/product/PROJECT_SPEC.md`

- [ ] **Step 1: Add the implementation-precedence section to the product specification**

Insert this section immediately after the title in `docs/product/PROJECT_SPEC.md`:

```markdown
## 文件定位

本文件描述完整產品目標。第一版開發以 [`Minimum Executable Demo Design`](../development/specs/2026-06-20-minimum-demo-design.md) 為實作依據；兩者不一致時，第一版以 Demo Design 為準，完整產品能力於後續階段逐步加入。
```

- [ ] **Step 2: Add the current Demo design to `AGENTS.md`**

Add this item at the beginning of the `詳細文件` list:

```markdown
- 第一版目前實作依據：[`docs/development/specs/2026-06-20-minimum-demo-design.md`](docs/development/specs/2026-06-20-minimum-demo-design.md)
```

Replace the sentence after the list with:

```markdown
實作前先閱讀以上文件。第一版以 Minimum Demo Design 為準；若該設計、完整產品規格與程式行為不一致，先更新規格並確認，再修改程式。
```

- [ ] **Step 3: Distinguish the current Demo from the product roadmap in `README.md`**

Add this item before `Product specification` in the `Project documents` list:

```markdown
- [Current Minimum Demo design](docs/development/specs/2026-06-20-minimum-demo-design.md)
```

Rename the existing product link label to:

```markdown
- [Long-term product specification](docs/product/PROJECT_SPEC.md)
```

- [ ] **Step 4: Verify all three documents reference the same Demo design**

Run:

```bash
rg -n "minimum-demo-design|Minimum Executable Demo" AGENTS.md README.md docs/product/PROJECT_SPEC.md
```

Expected: all three files point to `docs/development/specs/2026-06-20-minimum-demo-design.md`, with the product specification using the correct `../development/specs/` relative path.

- [ ] **Step 5: Commit the documentation authority change**

```bash
git add AGENTS.md README.md docs/product/PROJECT_SPEC.md
git commit -m "Clarify Minimum Demo implementation scope"
```

### Task 2: Replace the LLM Decision Contract with the Deterministic Contract

**Files:**

- Create: `tests/unit/decision-contract.test.ts`
- Modify: `tests/unit/contracts.test.ts`
- Modify: `src/features/decision/model.ts`

- [ ] **Step 1: Remove the obsolete decision test from the shared contract test**

Delete this import from `tests/unit/contracts.test.ts`:

```ts
import { decisionSchema } from "@/features/decision/model";
```

Delete the entire `describe("decision contract", ...)` block. Leave Strategy Lab, Playbook, market-analysis, and paper-trading tests unchanged at this step.

- [ ] **Step 2: Create the failing deterministic decision contract test**

Create `tests/unit/decision-contract.test.ts` with:

```ts
import { describe, expect, it } from "vitest";

import { decisionSchema } from "@/features/decision/model";

const waitDecision = {
  action: "WAIT",
  confidence: 55,
  marketBiasScore: 55,
  stanceAssessment: "insufficient",
  categorySignals: {
    trend: 1,
    momentum: -1,
    participation: 0,
    crowding: 0,
  },
  volatilityRisk: "normal",
  summary: "Trend and momentum conflict.",
  reasons: ["Trend is positive.", "Momentum is negative."],
  riskWarnings: [],
  invalidationCondition: "Reassess after the next closed candle.",
  mode: "deterministic",
} as const;

describe("decision contract", () => {
  it("accepts a deterministic WAIT decision", () => {
    expect(decisionSchema.safeParse(waitDecision).success).toBe(true);
  });

  it("rejects the retired AI mode", () => {
    expect(decisionSchema.safeParse({ ...waitDecision, mode: "ai" }).success).toBe(false);
  });

  it("requires the action and confidence implied by the score", () => {
    expect(
      decisionSchema.safeParse({ ...waitDecision, action: "LONG" }).success,
    ).toBe(false);
    expect(
      decisionSchema.safeParse({ ...waitDecision, confidence: 80 }).success,
    ).toBe(false);
  });

  it.each([
    [40, "SHORT", 60],
    [41, "WAIT", 59],
    [59, "WAIT", 59],
    [60, "LONG", 60],
  ])("maps score %i to %s with confidence %i", (score, action, confidence) => {
    expect(
      decisionSchema.safeParse({
        ...waitDecision,
        marketBiasScore: score,
        action,
        confidence,
      }).success,
    ).toBe(true);
  });
});
```

- [ ] **Step 3: Run the focused test and verify the old contract fails**

Run:

```bash
npm test -- tests/unit/decision-contract.test.ts
```

Expected: FAIL because the current schema does not accept `marketBiasScore`, category signals, stance assessment, or `mode: "deterministic"`.

- [ ] **Step 4: Replace `src/features/decision/model.ts` with the deterministic schema**

Use this complete file:

```ts
import { z } from "zod";

export const decisionActionSchema = z.enum(["LONG", "SHORT", "WAIT"]);
export const decisionModeSchema = z.literal("deterministic");
export const categorySignalSchema = z.union([z.literal(-1), z.literal(0), z.literal(1)]);
export const stanceAssessmentSchema = z.enum([
  "neutral",
  "supported",
  "opposed",
  "insufficient",
]);
export const volatilityRiskSchema = z.enum(["normal", "high"]);

export const decisionCategorySignalsSchema = z.object({
  trend: categorySignalSchema,
  momentum: categorySignalSchema,
  participation: categorySignalSchema,
  crowding: categorySignalSchema,
});

export const decisionSchema = z
  .object({
    action: decisionActionSchema,
    confidence: z.number().int().min(50).max(100),
    marketBiasScore: z.number().int().min(0).max(100),
    stanceAssessment: stanceAssessmentSchema,
    categorySignals: decisionCategorySignalsSchema,
    volatilityRisk: volatilityRiskSchema,
    summary: z.string().min(1),
    reasons: z.array(z.string().min(1)).min(1),
    riskWarnings: z.array(z.string().min(1)),
    invalidationCondition: z.string().min(1),
    mode: decisionModeSchema,
  })
  .superRefine(({ action, confidence, marketBiasScore }, context) => {
    const expectedAction =
      marketBiasScore <= 40 ? "SHORT" : marketBiasScore >= 60 ? "LONG" : "WAIT";
    const expectedConfidence = Math.max(marketBiasScore, 100 - marketBiasScore);

    if (action !== expectedAction) {
      context.addIssue({
        code: "custom",
        path: ["action"],
        message: `Score ${marketBiasScore} requires ${expectedAction}`,
      });
    }

    if (confidence !== expectedConfidence) {
      context.addIssue({
        code: "custom",
        path: ["confidence"],
        message: `Score ${marketBiasScore} requires confidence ${expectedConfidence}`,
      });
    }
  });

export type DecisionAction = z.infer<typeof decisionActionSchema>;
export type DecisionMode = z.infer<typeof decisionModeSchema>;
export type CategorySignal = z.infer<typeof categorySignalSchema>;
export type StanceAssessment = z.infer<typeof stanceAssessmentSchema>;
export type VolatilityRisk = z.infer<typeof volatilityRiskSchema>;
export type DecisionCategorySignals = z.infer<typeof decisionCategorySignalsSchema>;
export type Decision = z.infer<typeof decisionSchema>;
```

- [ ] **Step 5: Run the decision tests and full contract tests**

Run:

```bash
npm test -- tests/unit/decision-contract.test.ts tests/unit/contracts.test.ts
```

Expected: PASS; the deterministic decision tests and the remaining shared contract tests pass.

- [ ] **Step 6: Commit the deterministic decision contract**

```bash
git add src/features/decision/model.ts tests/unit/decision-contract.test.ts tests/unit/contracts.test.ts
git commit -m "Align deterministic decision contract"
```

### Task 3: Align Market Analysis and API Contracts

**Files:**

- Create: `tests/unit/market-analysis-contract.test.ts`
- Modify: `tests/unit/contracts.test.ts`
- Modify: `src/features/market-analysis/model.ts`

- [ ] **Step 1: Remove obsolete market-analysis imports and tests from the shared test file**

Delete this import block from `tests/unit/contracts.test.ts`:

```ts
import {
  analyzeRequestSchema,
  marketSnapshotSchema,
  timeframeSchema,
} from "@/features/market-analysis/model";
```

Delete the entire `describe("market-analysis contracts", ...)` block. Leave paper-trading, Strategy Lab, and Playbook tests unchanged.

- [ ] **Step 2: Create the failing market-analysis contract tests**

Create `tests/unit/market-analysis-contract.test.ts` with:

```ts
import { describe, expect, it } from "vitest";

import {
  analyzeRequestSchema,
  analyzeResponseSchema,
  timeframeSchema,
} from "@/features/market-analysis/model";

const decision = {
  action: "LONG",
  confidence: 75,
  marketBiasScore: 75,
  stanceAssessment: "supported",
  categorySignals: {
    trend: 1,
    momentum: 1,
    participation: 1,
    crowding: 0,
  },
  volatilityRisk: "normal",
  summary: "Trend, momentum, and participation align.",
  reasons: ["EMA structure is bullish."],
  riskWarnings: [],
  invalidationCondition: "Close below EMA20.",
  mode: "deterministic",
} as const;

const snapshot = {
  symbol: "BTCUSDT",
  timeframe: "1h",
  mode: "sample",
  fetchedAt: "2026-06-20T00:00:00.000Z",
  sourceRequestTime: "2026-06-20T00:00:00.000Z",
  lastClosedCandleAt: "2026-06-19T23:00:00.000Z",
  latestPrice: 100000,
  fixtureVersion: "btc-1h-v1",
  indicators: {
    ema20: 101000,
    ema50: 100000,
    ema100: 99000,
    ema200: 98000,
    rsi14: 58,
    macd: 400,
    macdSignal: 300,
    macdHistogram: 100,
    atr14: 1200,
    volumeChangePct: 15,
    priceReturn20Pct: 4,
    fundingRate: 0.00005,
    openInterest: 1200000000,
  },
} as const;

describe("market analysis contracts", () => {
  it.each(["15m", "1h", "4h", "1d"])("accepts timeframe %s", (timeframe) => {
    expect(timeframeSchema.safeParse(timeframe).success).toBe(true);
  });

  it("requires stance and data mode in analysis requests", () => {
    expect(
      analyzeRequestSchema.safeParse({
        symbol: "BTCUSDT",
        timeframe: "1h",
        stance: "long",
        mode: "sample",
      }).success,
    ).toBe(true);
    expect(
      analyzeRequestSchema.safeParse({ symbol: "BTCUSDT", timeframe: "1h" }).success,
    ).toBe(false);
  });

  it("accepts a complete sample analysis response", () => {
    expect(
      analyzeResponseSchema.safeParse({
        snapshot,
        decision,
        dataComplete: true,
        completenessWarnings: [],
        sources: [
          {
            name: "repository fixture",
            requestedAt: "2026-06-20T00:00:00.000Z",
            url: "https://github.com/wadewoo999/bitget-trading-agents",
          },
        ],
      }).success,
    ).toBe(true);
  });

  it("rejects the retired historical OI change field", () => {
    expect(
      analyzeResponseSchema.safeParse({
        snapshot: {
          ...snapshot,
          indicators: { ...snapshot.indicators, openInterestChangePct: 3 },
        },
        decision,
        dataComplete: true,
        completenessWarnings: [],
        sources: [
          {
            name: "repository fixture",
            requestedAt: "2026-06-20T00:00:00.000Z",
            url: "https://github.com/wadewoo999/bitget-trading-agents",
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("requires a fixture version for sample data", () => {
    expect(
      analyzeResponseSchema.safeParse({
        snapshot: { ...snapshot, fixtureVersion: null },
        decision,
        dataComplete: true,
        completenessWarnings: [],
        sources: [
          {
            name: "repository fixture",
            requestedAt: "2026-06-20T00:00:00.000Z",
            url: "https://github.com/wadewoo999/bitget-trading-agents",
          },
        ],
      }).success,
    ).toBe(false);
  });

});
```

- [ ] **Step 3: Run the focused test and verify the missing contracts fail**

Run:

```bash
npm test -- tests/unit/market-analysis-contract.test.ts
```

Expected: FAIL because the current request does not accept `stance` or `mode`, and the response still requires the obsolete `model` field.

- [ ] **Step 4: Replace `src/features/market-analysis/model.ts` with the Demo contract**

Use this complete file:

```ts
import { z } from "zod";

import { decisionSchema } from "@/features/decision/model";

export const timeframeSchema = z.enum(["15m", "1h", "4h", "1d"]);
export const userStanceSchema = z.enum(["unsure", "long", "short"]);
export const marketDataModeSchema = z.enum(["live", "sample"]);

export const marketIndicatorsSchema = z.object({
  ema20: z.number(),
  ema50: z.number(),
  ema100: z.number(),
  ema200: z.number(),
  rsi14: z.number().min(0).max(100),
  macd: z.number(),
  macdSignal: z.number(),
  macdHistogram: z.number(),
  atr14: z.number().nonnegative(),
  volumeChangePct: z.number(),
  priceReturn20Pct: z.number(),
  fundingRate: z.number().nullable(),
  openInterest: z.number().nonnegative().nullable(),
}).strict();

export const marketSnapshotSchema = z
  .object({
    symbol: z.literal("BTCUSDT"),
    timeframe: timeframeSchema,
    mode: marketDataModeSchema,
    fetchedAt: z.string().datetime(),
    sourceRequestTime: z.string().datetime(),
    lastClosedCandleAt: z.string().datetime(),
    latestPrice: z.number().positive(),
    fixtureVersion: z.string().min(1).nullable(),
    indicators: marketIndicatorsSchema,
  })
  .superRefine(({ fixtureVersion, mode }, context) => {
    if (mode === "sample" && fixtureVersion === null) {
      context.addIssue({
        code: "custom",
        path: ["fixtureVersion"],
        message: "Sample data requires a fixture version",
      });
    }
    if (mode === "live" && fixtureVersion !== null) {
      context.addIssue({
        code: "custom",
        path: ["fixtureVersion"],
        message: "Live data cannot declare a fixture version",
      });
    }
  });

export const marketSourceSchema = z.object({
  name: z.string().min(1),
  requestedAt: z.string().datetime(),
  url: z.string().url(),
});

export const analyzeRequestSchema = z.object({
  symbol: z.literal("BTCUSDT"),
  timeframe: timeframeSchema,
  stance: userStanceSchema,
  mode: marketDataModeSchema,
});

export const analyzeResponseSchema = z.object({
  snapshot: marketSnapshotSchema,
  decision: decisionSchema,
  dataComplete: z.boolean(),
  completenessWarnings: z.array(z.string().min(1)),
  sources: z.array(marketSourceSchema).min(1),
});

export type Timeframe = z.infer<typeof timeframeSchema>;
export type UserStance = z.infer<typeof userStanceSchema>;
export type MarketDataMode = z.infer<typeof marketDataModeSchema>;
export type MarketIndicators = z.infer<typeof marketIndicatorsSchema>;
export type MarketSnapshot = z.infer<typeof marketSnapshotSchema>;
export type MarketSource = z.infer<typeof marketSourceSchema>;
export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;
export type AnalyzeResponse = z.infer<typeof analyzeResponseSchema>;
```

- [ ] **Step 5: Run the focused and shared contract tests**

Run:

```bash
npm test -- tests/unit/market-analysis-contract.test.ts tests/unit/contracts.test.ts
```

Expected: PASS; all market-analysis cases and remaining shared contracts pass.

- [ ] **Step 6: Extend the test with price and API error contracts**

Add `apiErrorSchema` and `priceResponseSchema` to the import from `@/features/market-analysis/model`, then add this test inside the existing `describe` block:

```ts
it("defines price and stable API error envelopes", () => {
  expect(
    priceResponseSchema.safeParse({
      symbol: "BTCUSDT",
      mode: "live",
      price: 100000,
      fetchedAt: "2026-06-20T00:00:00.000Z",
      fixtureVersion: null,
    }).success,
  ).toBe(true);
  expect(
    apiErrorSchema.safeParse({
      error: { code: "INSUFFICIENT_CANDLES", message: "At least 250 candles are required." },
    }).success,
  ).toBe(true);
});
```

- [ ] **Step 7: Run the focused test and verify the new exports are missing**

Run:

```bash
npm test -- tests/unit/market-analysis-contract.test.ts
```

Expected: FAIL because `priceResponseSchema` and `apiErrorSchema` are not exported yet.

- [ ] **Step 8: Add the price and API error schemas**

Insert these schemas after `analyzeResponseSchema` in `src/features/market-analysis/model.ts`:

```ts
export const priceQuerySchema = z.object({ mode: marketDataModeSchema });

export const priceResponseSchema = z
  .object({
    symbol: z.literal("BTCUSDT"),
    mode: marketDataModeSchema,
    price: z.number().positive(),
    fetchedAt: z.string().datetime(),
    fixtureVersion: z.string().min(1).nullable(),
  })
  .superRefine(({ fixtureVersion, mode }, context) => {
    if (mode === "sample" && fixtureVersion === null) {
      context.addIssue({ code: "custom", path: ["fixtureVersion"], message: "Sample prices require a fixture version" });
    }
    if (mode === "live" && fixtureVersion !== null) {
      context.addIssue({ code: "custom", path: ["fixtureVersion"], message: "Live prices cannot declare a fixture version" });
    }
  });

export const apiErrorCodeSchema = z.enum([
  "INVALID_INPUT",
  "MARKET_DATA_UNAVAILABLE",
  "INSUFFICIENT_CANDLES",
  "UPSTREAM_TIMEOUT",
  "INTERNAL_ERROR",
]);

export const apiErrorSchema = z.object({
  error: z.object({ code: apiErrorCodeSchema, message: z.string().min(1) }),
});
```

Append these inferred types:

```ts
export type PriceQuery = z.infer<typeof priceQuerySchema>;
export type PriceResponse = z.infer<typeof priceResponseSchema>;
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
```

- [ ] **Step 9: Run the complete market contract tests**

Run:

```bash
npm test -- tests/unit/market-analysis-contract.test.ts tests/unit/contracts.test.ts
```

Expected: PASS.

- [ ] **Step 10: Commit the market and API contracts**

```bash
git add src/features/market-analysis/model.ts tests/unit/market-analysis-contract.test.ts tests/unit/contracts.test.ts
git commit -m "Align Minimum Demo market contracts"
```

### Task 4: Add Versioned Paper-Trading State and Data Provenance

**Files:**

- Create: `tests/unit/paper-trading-contract.test.ts`
- Modify: `tests/unit/contracts.test.ts`
- Modify: `src/features/paper-trading/model.ts`

- [ ] **Step 1: Remove the obsolete paper-trading import and test block**

Delete this import from `tests/unit/contracts.test.ts`:

```ts
import { paperTradeRecordSchema } from "@/features/paper-trading/model";
```

Delete the entire `describe("paper-trading contract", ...)` block. The file should then contain only Strategy Lab and Playbook evidence tests.

- [ ] **Step 2: Create the failing paper-trading contract tests**

Create `tests/unit/paper-trading-contract.test.ts` with:

```ts
import { describe, expect, it } from "vitest";

import {
  paperPositionSchema,
  paperTradeRecordSchema,
} from "@/features/paper-trading/model";

const position = {
  id: "position-1",
  symbol: "BTCUSDT",
  timeframe: "1h",
  mode: "sample",
  side: "LONG",
  entryPrice: 100000,
  quantity: 0.001,
  stopLoss: 98200,
  takeProfit: 103600,
  openedAt: "2026-06-20T00:00:00.000Z",
  decisionSummary: "Trend, momentum, and participation align.",
} as const;

const record = {
  id: "record-1",
  positionId: "position-1",
  timestamp: "2026-06-20T00:00:00.000Z",
  symbol: "BTCUSDT",
  timeframe: "1h",
  mode: "sample",
  event: "OPEN",
  side: "LONG",
  price: 100000,
  quantity: 0.001,
  stopLoss: 98200,
  takeProfit: 103600,
  fee: 0.06,
  pnl: 0,
  balanceBefore: 10000,
  balanceAfter: 9999.94,
  decisionSummary: "Trend, momentum, and participation align.",
} as const;

describe("paper trading contracts", () => {
  it("requires data mode on positions and ledger records", () => {
    expect(paperPositionSchema.safeParse(position).success).toBe(true);
    expect(paperTradeRecordSchema.safeParse(record).success).toBe(true);
    const { mode: _mode, ...recordWithoutMode } = record;
    void _mode;
    expect(paperTradeRecordSchema.safeParse(recordWithoutMode).success).toBe(false);
  });
});
```

- [ ] **Step 3: Run the focused test and verify the missing account contract fails**

Run:

```bash
npm test -- tests/unit/paper-trading-contract.test.ts
```

Expected: FAIL because positions and records do not require data mode.

- [ ] **Step 4: Replace `src/features/paper-trading/model.ts` with the versioned state contract**

Use this complete file:

```ts
import { z } from "zod";

import {
  marketDataModeSchema,
  timeframeSchema,
} from "@/features/market-analysis/model";

export const paperPositionSchema = z.object({
  id: z.string().min(1),
  symbol: z.literal("BTCUSDT"),
  timeframe: timeframeSchema,
  mode: marketDataModeSchema,
  side: z.enum(["LONG", "SHORT"]),
  entryPrice: z.number().positive(),
  quantity: z.number().positive(),
  stopLoss: z.number().positive(),
  takeProfit: z.number().positive(),
  openedAt: z.string().datetime(),
  decisionSummary: z.string().min(1),
});

export const paperTradeRecordSchema = z.object({
  id: z.string().min(1),
  positionId: z.string().min(1),
  timestamp: z.string().datetime(),
  symbol: z.literal("BTCUSDT"),
  timeframe: timeframeSchema,
  mode: marketDataModeSchema,
  event: z.enum(["OPEN", "CLOSE"]),
  side: z.enum(["LONG", "SHORT"]),
  price: z.number().positive(),
  quantity: z.number().positive(),
  stopLoss: z.number().positive(),
  takeProfit: z.number().positive(),
  fee: z.number().nonnegative(),
  pnl: z.number(),
  balanceBefore: z.number().nonnegative(),
  balanceAfter: z.number().nonnegative(),
  decisionSummary: z.string().min(1),
});

export type PaperPosition = z.infer<typeof paperPositionSchema>;
export type PaperTradeRecord = z.infer<typeof paperTradeRecordSchema>;
```

- [ ] **Step 5: Run the focused and shared contract tests**

Run:

```bash
npm test -- tests/unit/paper-trading-contract.test.ts tests/unit/contracts.test.ts
```

Expected: PASS; data mode and the remaining future contracts validate correctly.

- [ ] **Step 6: Extend the test with versioned account state**

Add `INITIAL_PAPER_BALANCE`, `PAPER_STORAGE_KEY`, and `paperAccountSchema` to the paper-trading import, then add these tests inside the existing `describe` block:

```ts
it("exports stable initial account constants", () => {
  expect(INITIAL_PAPER_BALANCE).toBe(10000);
  expect(PAPER_STORAGE_KEY).toBe("bitget-trading-agents:paper-account:v1");
});

it("accepts one versioned account with at most one open position", () => {
  expect(
    paperAccountSchema.safeParse({
      version: 1,
      balance: 9999.94,
      openPosition: position,
      ledger: [record],
    }).success,
  ).toBe(true);
  expect(
    paperAccountSchema.safeParse({
      version: 2,
      balance: INITIAL_PAPER_BALANCE,
      openPosition: null,
      ledger: [],
    }).success,
  ).toBe(false);
});
```

- [ ] **Step 7: Run the focused test and verify account exports are missing**

Run:

```bash
npm test -- tests/unit/paper-trading-contract.test.ts
```

Expected: FAIL because the constants and `paperAccountSchema` are not exported yet.

- [ ] **Step 8: Add the versioned account contract**

Insert these constants after the imports in `src/features/paper-trading/model.ts`:

```ts
export const INITIAL_PAPER_BALANCE = 10_000;
export const PAPER_STORAGE_KEY = "bitget-trading-agents:paper-account:v1";
```

Insert this schema after `paperTradeRecordSchema`:

```ts
export const paperAccountSchema = z.object({
  version: z.literal(1),
  balance: z.number().nonnegative(),
  openPosition: paperPositionSchema.nullable(),
  ledger: z.array(paperTradeRecordSchema),
});
```

Append this type:

```ts
export type PaperAccount = z.infer<typeof paperAccountSchema>;
```

- [ ] **Step 9: Run the complete paper contract tests**

Run:

```bash
npm test -- tests/unit/paper-trading-contract.test.ts tests/unit/contracts.test.ts
```

Expected: PASS.

- [ ] **Step 10: Commit the paper-trading contracts**

```bash
git add src/features/paper-trading/model.ts tests/unit/paper-trading-contract.test.ts tests/unit/contracts.test.ts
git commit -m "Align Minimum Demo paper contracts"
```

### Task 5: Verify the Contract-Alignment Phase

**Files:**

- Verify: all files changed in Tasks 1–4

- [ ] **Step 1: Confirm retired fields and modes are absent from active source and tests**

Run:

```bash
rg -n "openInterestChangePct|rule_fallback|mode: \"ai\"|model: z\.string" src
```

Expected: no output. Negative contract tests may still mention retired values to verify they are rejected.

- [ ] **Step 2: Confirm later-phase modules were not modified**

Run:

```bash
git diff HEAD~4 -- src/features/strategy-lab/model.ts src/features/playbook-evidence/model.ts
```

Expected: no output.

- [ ] **Step 3: Run all repository quality gates**

Run each command separately:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Expected: every command exits 0; all contract and app-shell tests pass; Next.js completes a production build.

- [ ] **Step 4: Inspect final scope and formatting**

Run:

```bash
git diff --check HEAD~4..HEAD
git status --short
git log --oneline -6
```

Expected: no whitespace errors, a clean working tree, and exactly four new focused commits for documentation, decision, market/API, and paper contracts.

## Completion Boundary

This plan ends when the first-version contracts and documentation agree. It does not install Agent Hub packages, create fixtures, calculate indicators, expose API routes, render the product dashboard, persist browser state, or execute paper trades. Those capabilities require separate implementation plans after this contract phase passes.

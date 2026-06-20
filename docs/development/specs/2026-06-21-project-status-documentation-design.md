# Project Status Documentation Sync Design

## 1. Goal

Record the repository-wide assessment completed on 2026-06-21 and align existing documents with the confirmed product direction.

The product does not use the Bitget-sponsored Qwen API at runtime. That API is a development resource for the human participant. The Minimum Demo remains deterministic and uses Bitget Agent Hub market data, user confirmation, paper trading, and auditable evidence.

## 2. Documentation Changes

### New status document

Create `docs/development/PROJECT_STATUS_AND_NEXT_STEPS.md` as the single current-status reference. It will contain:

- Current repository structure and implemented modules.
- Verification evidence from lint, typecheck, 51 automated tests, production build, runtime API checks, and public GitHub status.
- Completion assessment for Phase 2, the Minimum Demo, the full product, and Hackathon submission readiness.
- Implemented capabilities, missing capabilities, technical risks, and submission blockers.
- A priority-ordered delivery sequence:
  1. Agent Hub Live Data.
  2. Paper Trading and evidence.
  3. Public Vercel deployment.
  4. GetAgent Playbook and public evidence.
  5. Submission package.
  6. Strategy Lab and later product expansion.

The document will distinguish measured facts from planning estimates and include the assessment date so it is not mistaken for permanent product truth.

### Existing document alignment

- `README.md`: add the status document to the index and replace the old implementation order with the approved delivery order.
- `AGENTS.md`: link to the new status document and remove runtime LLM-specific engineering rules.
- `docs/product/PROJECT_SPEC.md`: replace runtime LLM decision and Strategy Lab requirements with deterministic, schema-validated decision and strategy generation rules. Remove `ai` and `rule_fallback` modes.
- `.env.example`: remove unused Qwen runtime variables.

### Existing Minimum Demo design

Do not change `docs/development/specs/2026-06-20-minimum-demo-design.md`. It already states that the Minimum Demo has no runtime product LLM and remains the implementation source of truth.

## 3. Product Truth After Sync

The documents must consistently state:

- Qwen is not a product runtime dependency.
- The current implementation is a read-only Sample Market Analysis Dashboard.
- Agent Hub Live Data, Paper Trading, evidence, and public deployment are the immediate priorities.
- GetAgent Playbook is part of the Hackathon delivery.
- Strategy Lab, backtesting, multi-asset, news, on-chain, and macro capabilities remain planned product work and are not cancelled.
- No document may claim an unimplemented capability is operational.

## 4. Non-Goals

- No application code changes.
- No API, trading, deployment, Playbook, or test implementation.
- No changes to official Hackathon source content.
- No fabricated URLs, logs, metrics, backtests, or evidence.

## 5. Verification

- Search all active product documents for stale runtime `Qwen`, `LLM`, `ai`, and `rule_fallback` requirements.
- Confirm all referenced relative paths exist.
- Confirm the new roadmap matches the approved order.
- Run `git diff --check`.
- Verify only documentation and `.env.example` are modified.

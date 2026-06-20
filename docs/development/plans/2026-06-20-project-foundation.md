# Project Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a runnable Next.js and TypeScript foundation for the BTC Trading Decision Agent without implementing trading behavior.

**Architecture:** Use Next.js App Router with a `src/` layout. Keep public contracts inside product feature folders and reserve server-only integrations for later Bitget, Qwen, and backtest implementations.

**Tech Stack:** Next.js 16, React 19, TypeScript 6, Zod 4, Vitest 4, Testing Library, ESLint 9, npm.

---

## Tasks

- [x] Add the Next.js, TypeScript, ESLint, Vitest, environment, and ignore configuration.
- [x] Install exact dependencies and generate `package-lock.json`.
- [x] Write failing App shell and public-contract tests.
- [x] Add the minimum App shell and feature models needed to pass the tests.
- [x] Verify lint, typecheck, unit tests, production build, and dependency audit.

## Module Boundaries

- `src/app`: routing, layout, and page composition.
- `src/features/market-analysis`: live-analysis request and market snapshot contracts.
- `src/features/decision`: AI decision contract and fallback mode.
- `src/features/paper-trading`: simulated position and auditable ledger contracts.
- `src/features/strategy-lab`: profile, timeframe, strategy, and backtest contracts.
- `src/features/playbook-evidence`: public GetAgent evidence contract.
- `src/server`: future server-only exchange, LLM, and backtest integrations.
- `tests`: unit, integration, fixture, and browser coverage as each subsystem is added.

## Acceptance

- The repository runs on Node.js 22 with npm.
- The foundation page identifies the product, Hackathon track, status, and source documents.
- Public schemas accept approved values and reject out-of-scope values.
- No market-data, trading, LLM, or backtest behavior is presented as implemented.
- All repository quality commands pass before commit.

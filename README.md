# Bitget Trading Agents

BTC Trading Decision Agent for the **Bitget AI Base Camp Hackathon S1** Trading Agent track.

## Current status

This repository now includes a Minimum Demo analysis slice that can switch between live Bitget market data and repository sample fixtures. It calculates deterministic BTCUSDT indicators and LONG, SHORT, or WAIT decisions across all four supported timeframes.

The current Dashboard supports `LIVE DATA` and `SAMPLE DATA` analysis, `GET /api/price`, `GET /api/market-feed`, paper-trade preview/confirm/close, localStorage account restore, and JSON/CSV ledger export. It still does not execute real trades or use an LLM.

Analysis snapshots and market-feed refresh are now separated. Decision results stay fixed until the user reruns analysis. The 30-second refresh now updates only latest price, while the candlestick chart and market context remain tied to the current analysis snapshot.

The market feed now displays Funding / OI, and Stage 1 Minimum Demo stabilization is complete.

The active next phase is Stage 2: product completion. Current priority is Strategy Lab, deterministic backtesting, and dashboard / evidence UX polish. GetAgent Playbook, public deployment, and submission packaging are intentionally deferred until the product body is complete.

## Evidence report

After running an analysis and creating at least one matching paper-trading ledger record, use `Generate Evidence Report` in the Dashboard to open `/evidence`.

- `LIVE DATA` evidence is the submission-grade path for paper-trading proof after public deployment.
- `SAMPLE DATA` evidence is demo-only and is clearly labeled as not valid live submission evidence.
- Ledger `JSON` / `CSV` exports remain available separately from the full evidence report artifact.

## Local setup

Requirements: Node.js 22 or newer and npm.

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Single full test entrypoint:

```bash
npm run demo-check
```

This command runs lint, typecheck, tests, production build, starts the built app locally, probes the homepage plus the core `analyze` / `price` / `market-feed` APIs in both `sample` and `live` modes, then opens the local Dashboard so you can inspect the latest UI directly.

Double-click full test on macOS:

- Double-click [Open Bitget Demo.command](/Users/wayne/Desktop/X-Project/bitget%20hackathon/Open%20Bitget%20Demo.command)
- It runs the same `demo-check` flow as above
- It verifies the current feature set, starts the local demo, then opens the homepage in your browser
- Keep the opened terminal window running while you inspect the latest UI and interactions

Legacy aliases `npm run smoke` and `npm run open-visual-check` now both forward to `npm run demo-check` so the repository uses one consistent testing path.

One-command live evidence export:

```bash
npm run export-live-evidence
```

This command runs tests and build, starts the production app locally, finds the first live timeframe that returns `LONG` or `SHORT`, then exports a live paper-trading evidence bundle under `evidence/live/`.

Double-click live evidence export on macOS:

- Double-click [Export Live Evidence.command](/Users/wayne/Desktop/X-Project/bitget%20hackathon/Export%20Live%20Evidence.command)
- It creates a fresh evidence folder containing `analysis.json`, `paper-ledger.json`, `paper-ledger.csv`, `manifest.json`, and `summary.md`

## Project documents

- [Current Minimum Demo design](docs/development/specs/2026-06-20-minimum-demo-design.md)
- [Current status, gaps, and next steps](docs/development/PROJECT_STATUS_AND_NEXT_STEPS.md)
- [Long-term product specification](docs/product/PROJECT_SPEC.md)
- [Official hackathon requirements](docs/hackathon/OFFICIAL_HACKATHON_REQUIREMENTS.md)
- [Development specs and plans](docs/development/)
- [Agent instructions](AGENTS.md)

## Repository structure

- `src/app/`: Next.js pages and route handlers
- `src/features/`: product modules and their public contracts
- `docs/product/`: product requirements and acceptance criteria
- `docs/hackathon/`: official event rules and submission requirements
- `docs/development/`: approved designs and implementation plans
- `tests/`: unit, integration, fixture, and end-to-end tests as they are introduced

## Planned implementation order

1. Strategy Lab, deterministic backtesting, and product completion
2. GetAgent Playbook, sandbox evidence, and live evidence chain
3. Public deployment, README, operation guide, evidence links, demo video, and submission package

The MVP is simulation-first and does not execute real-money trades. The Hackathon-sponsored Qwen API is a development resource for the participant, not a runtime product dependency.

# Bitget Trading Agents

BTC Trading Decision Agent for the **Bitget AI Base Camp Hackathon S1** Trading Agent track.

## Current status

This repository is currently the project foundation. It defines the application structure and public contracts, but it does not yet provide market analysis, AI decisions, paper trading, backtesting, or live trading.

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

## Project documents

- [Current Minimum Demo design](docs/development/specs/2026-06-20-minimum-demo-design.md)
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

1. Market analysis
2. Decision engine
3. Paper trading
4. Strategy Lab and backtesting
5. GetAgent Playbook evidence

The MVP is simulation-first and does not execute real-money trades.

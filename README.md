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

- [Product specification](docs/PROJECT_SPEC.md)
- [Official hackathon requirements](docs/OFFICIAL_HACKATHON_REQUIREMENTS.md)
- [Agent instructions](AGENTS.md)

## Planned implementation order

1. Market analysis
2. Decision engine
3. Paper trading
4. Strategy Lab and backtesting
5. GetAgent Playbook evidence

The MVP is simulation-first and does not execute real-money trades.

# Paper Trading Evidence Summary

**Generated:** 2026-06-24
**Source:** BTC Trading Decision Agent — Live Bitget Market Data
**Account Initial Balance:** 10,000 USDT

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Trades | 5 |
| Symbol | BTCUSDT |
| Timeframe | 1h |
| Direction | All SHORT |
| Win Rate | 60% (3 wins, 2 losses) |
| Total PnL | -49.59 USDT |
| Final Balance | 9,950.40 USDT |
| Max Drawdown | -0.6% |
| Time Span | 2026-06-23 16:39 ~ 2026-06-24 06:17 UTC |

---

## Trade Log

| # | Open (UTC) | Close (UTC) | Side | Entry | Exit | Qty | PnL | Balance |
|---|------------|-------------|------|-------|------|-----|-----|---------|
| 1 | 06/23 16:39 | 06/23 17:21 | SHORT | 62,571.5 | 62,549.3 | 0.140 | +3.11 | 9,992.60 |
| 2 | 06/24 03:43 | 06/24 04:59 | SHORT | 62,776.0 | 62,749.4 | 0.159 | +4.23 | 9,984.84 |
| 3 | 06/24 05:00 | 06/24 05:15 | SHORT | 62,734.7 | 62,777.8 | 0.159 | -6.86 | 9,965.99 |
| 4 | 06/24 05:17 | 06/24 05:47 | SHORT | 62,799.5 | 62,909.4 | 0.159 | -17.44 | 9,936.59 |
| 5 | 06/24 05:48 | 06/24 06:17 | SHORT | 62,920.6 | 62,757.7 | 0.158 | +25.73 | 9,950.41 |

---

## Notes

- All trades executed live via Bitget public API (USDT-FUTURES market)
- Position sizing: 1% risk per trade via ATR-based stop loss
- Fee rate: 0.06% per trade (both open and close)
- Decision engine: Deterministic (no runtime LLM)
- Evidence files: `paper-ledger.json` (full records) + `paper-ledger.csv` (spreadsheet format)

---

## Files

```
report/
├── paper-ledger.json           # Full trade records (machine-readable)
├── paper-ledger.csv            # Same data in spreadsheet format
├── paper-ledger-summary.md     # This summary
├── live-data-availability-report.md  # Symbol/timeframe availability audit
└── archive/
    ├── paper-ledger-v1.json
    ├── paper-ledger-v2.json
    ├── paper-ledger-v3.json
    └── paper-ledger-v4.json
```

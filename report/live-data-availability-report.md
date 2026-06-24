# Live Data Availability Audit Report

**Generated:** 2026-06-23T13:42:33.884Z

**Source:** Bitget USDT-FUTURES API

**Test Coverage:** 9 symbols × 4 timeframes = 36 combinations

## Executive Summary

| Metric | Count |
|--------|-------|
| Total Tests | 36 |
| ✅ Fully Operational | 27 |
| ⚠️ Insufficient Data | 9 |
| ❌ Errors | 0 |
| **Availability Rate** | **75.0%** |

## Error Classification

| Error Type | Count | Description |
|------------|-------|-------------|
| INSUFFICIENT_CANDLES | 9 | API returns candles but fewer than 250 required for analysis |

## Per-Symbol Error Summary

| Symbol | Failed Timeframes | Status |
|--------|-------------------|--------|
| BTCUSDT | 1d | ⚠️ 1d |
| ETHUSDT | 1d | ⚠️ 1d |
| SOLUSDT | 1d | ⚠️ 1d |
| HYPEUSDT | 1d | ⚠️ 1d |
| BNBUSDT | 1d | ⚠️ 1d |
| XRPUSDT | 1d | ⚠️ 1d |
| SUIUSDT | 1d | ⚠️ 1d |
| DOGEUSDT | 1d | ⚠️ 1d |
| ZECUSDT | 1d | ⚠️ 1d |

## Detailed Results

### Result Matrix

| Symbol | 15m | 1h | 4h | 1d |
|--------|-----|----|----|----|
| BTCUSDT | ✅ (400) | ✅ (400) | ✅ (400) | ⚠️ (90) |
| ETHUSDT | ✅ (400) | ✅ (400) | ✅ (400) | ⚠️ (90) |
| SOLUSDT | ✅ (400) | ✅ (400) | ✅ (400) | ⚠️ (90) |
| HYPEUSDT | ✅ (400) | ✅ (400) | ✅ (400) | ⚠️ (90) |
| BNBUSDT | ✅ (400) | ✅ (400) | ✅ (400) | ⚠️ (90) |
| XRPUSDT | ✅ (400) | ✅ (400) | ✅ (400) | ⚠️ (90) |
| SUIUSDT | ✅ (400) | ✅ (400) | ✅ (400) | ⚠️ (90) |
| DOGEUSDT | ✅ (400) | ✅ (400) | ✅ (400) | ⚠️ (90) |
| ZECUSDT | ✅ (400) | ✅ (400) | ✅ (400) | ⚠️ (90) |

### Error Details

#### BTCUSDT / 1d

- **Error Type:** INSUFFICIENT_CANDLES
- **Error Message:** Only 90 candles available (need 250)
- **Candles Returned:** 90
- **Ticker:** ✅
- **Funding:** ✅
- **Open Interest:** ✅

#### ETHUSDT / 1d

- **Error Type:** INSUFFICIENT_CANDLES
- **Error Message:** Only 90 candles available (need 250)
- **Candles Returned:** 90
- **Ticker:** ✅
- **Funding:** ✅
- **Open Interest:** ✅

#### SOLUSDT / 1d

- **Error Type:** INSUFFICIENT_CANDLES
- **Error Message:** Only 90 candles available (need 250)
- **Candles Returned:** 90
- **Ticker:** ✅
- **Funding:** ✅
- **Open Interest:** ✅

#### HYPEUSDT / 1d

- **Error Type:** INSUFFICIENT_CANDLES
- **Error Message:** Only 90 candles available (need 250)
- **Candles Returned:** 90
- **Ticker:** ✅
- **Funding:** ✅
- **Open Interest:** ✅

#### BNBUSDT / 1d

- **Error Type:** INSUFFICIENT_CANDLES
- **Error Message:** Only 90 candles available (need 250)
- **Candles Returned:** 90
- **Ticker:** ✅
- **Funding:** ✅
- **Open Interest:** ✅

#### XRPUSDT / 1d

- **Error Type:** INSUFFICIENT_CANDLES
- **Error Message:** Only 90 candles available (need 250)
- **Candles Returned:** 90
- **Ticker:** ✅
- **Funding:** ✅
- **Open Interest:** ✅

#### SUIUSDT / 1d

- **Error Type:** INSUFFICIENT_CANDLES
- **Error Message:** Only 90 candles available (need 250)
- **Candles Returned:** 90
- **Ticker:** ✅
- **Funding:** ✅
- **Open Interest:** ✅

#### DOGEUSDT / 1d

- **Error Type:** INSUFFICIENT_CANDLES
- **Error Message:** Only 90 candles available (need 250)
- **Candles Returned:** 90
- **Ticker:** ✅
- **Funding:** ✅
- **Open Interest:** ✅

#### ZECUSDT / 1d

- **Error Type:** INSUFFICIENT_CANDLES
- **Error Message:** Only 90 candles available (need 250)
- **Candles Returned:** 90
- **Ticker:** ✅
- **Funding:** ✅
- **Open Interest:** ✅

## Root Cause Analysis

### HYPEUSDT

HYPE is a relatively new token. Bitget may have:
- Limited historical data for longer timeframes (4h, 1d)
- Shorter trading history since listing
- Possible API inconsistencies for newer contracts

### XRPUSDT

XRP has known regulatory history but is actively traded. Errors may indicate:
- Temporary API data gaps for 1d timeframe
- Possible symbol naming differences (XRPUSDT vs XRPUSDT_UMCBL)

### ZECUSDT

ZEC is a lower-volume privacy coin. Potential issues:
- May not be supported in USDT-FUTURES market
- Lower liquidity leads to data availability issues
- Possible delisting or limited contract support

## Recommendations

### Immediate Actions

1. **Remove Unsupported Symbols:** If symbols consistently fail (e.g., ZECUSDT), consider removing them from the dropdown or showing a "data unavailable" badge.
2. **Graceful Degradation:** For symbols with insufficient candles (< 250), consider:
   - Lowering the analysis threshold (e.g., to 80 candles for basic indicators)
   - Showing a warning to users instead of blocking analysis
   - Falling back to available data with reduced indicator accuracy
3. **Per-Symbol Timeframe Validation:** Add a validation layer that checks which timeframes are available per symbol before showing them in the UI.

### Long-term Improvements

1. **Caching Strategy:** Cache successful API responses to reduce dependency on real-time availability.
2. **Circuit Breaker:** Implement a circuit breaker pattern for consistently failing symbols/timeframes.
3. **Health Check Endpoint:** Add a `/api/health` endpoint that reports symbol availability status.
4. **User Feedback:** Show clear error messages explaining WHY a particular symbol/timeframe is unavailable.

---

*Report generated by live-data-audit.mjs*

import { writeFile } from "node:fs/promises";

const SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "HYPEUSDT",
  "BNBUSDT",
  "XRPUSDT",
  "SUIUSDT",
  "DOGEUSDT",
  "ZECUSDT",
];

const TIMEFRAMES = ["15m", "1h", "4h", "1d"];

const BITGET_BASE_URL = "https://api.bitget.com";
const PRODUCT_TYPE = "USDT-FUTURES";
const REQUEST_TIMEOUT_MS = 15000;

const timeframeConfig = {
  "15m": { granularity: "15m", intervalMs: 15 * 60 * 1000 },
  "1h": { granularity: "1H", intervalMs: 60 * 60 * 1000 },
  "4h": { granularity: "4H", intervalMs: 4 * 60 * 60 * 1000 },
  "1d": { granularity: "1D", intervalMs: 24 * 60 * 60 * 1000 },
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestBitget(pathname, params) {
  const url = new URL(pathname, BITGET_BASE_URL);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), cache: "no-store" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  const payload = await response.json();
  if (payload.code !== "00000") {
    throw new Error(`Bitget API error: ${payload.msg || payload.code}`);
  }
  return { data: payload.data, requestTime: payload.requestTime };
}

async function testSymbolTimeframe(symbol, timeframe) {
  const result = {
    symbol,
    timeframe,
    timestamp: new Date().toISOString(),
    ticker: { status: "pending", error: null, data: null },
    candles: { status: "pending", error: null, count: 0, hasEnough: false },
    funding: { status: "pending", error: null, data: null },
    openInterest: { status: "pending", error: null, data: null },
    overall: "pending",
    errorType: null,
    errorMessage: null,
  };

  try {
    // Test ticker
    try {
      const tickerRes = await requestBitget("/api/v2/mix/market/ticker", {
        symbol,
        productType: PRODUCT_TYPE,
      });
      result.ticker = { status: "ok", error: null, data: tickerRes.data?.[0] };
    } catch (error) {
      result.ticker = { status: "error", error: error.message, data: null };
    }

    await delay(200);

    // Test candles with pagination (matching production logic)
    try {
      const { granularity } = timeframeConfig[timeframe];
      let allCandles = [];
      let endTime = Date.now();
      
      while (allCandles.length < 300) {
        const candlesRes = await requestBitget("/api/v2/mix/market/history-candles", {
          symbol,
          productType: PRODUCT_TYPE,
          granularity,
          limit: 200,
          endTime,
        });
        
        if (!candlesRes.data || candlesRes.data.length === 0) break;
        
        allCandles.push(...candlesRes.data);
        
        const oldestOpenTime = Math.min(...candlesRes.data.map((row) => Number(row[0])));
        if (!Number.isFinite(oldestOpenTime) || candlesRes.data.length < 200) break;
        
        endTime = oldestOpenTime - 1;
      }
      
      const count = allCandles.length;
      const minRequired = timeframe === "1d" ? 80 : 250;
      result.candles = {
        status: "ok",
        error: null,
        count,
        hasEnough: count >= minRequired,
      };
    } catch (error) {
      result.candles = { status: "error", error: error.message, count: 0, hasEnough: false };
    }

    await delay(200);

    // Test funding rate
    try {
      const fundingRes = await requestBitget("/api/v2/mix/market/current-fund-rate", {
        symbol,
        productType: PRODUCT_TYPE,
      });
      result.funding = { status: "ok", error: null, data: fundingRes.data?.[0] };
    } catch (error) {
      result.funding = { status: "error", error: error.message, data: null };
    }

    await delay(200);

    // Test open interest
    try {
      const oiRes = await requestBitget("/api/v2/mix/market/open-interest", {
        symbol,
        productType: PRODUCT_TYPE,
      });
      result.openInterest = { status: "ok", error: null, data: oiRes.data?.openInterestList?.[0] };
    } catch (error) {
      result.openInterest = { status: "error", error: error.message, data: null };
    }

    // Determine overall status
    const hasErrors = [result.ticker, result.candles, result.funding, result.openInterest].some(
      (r) => r.status === "error"
    );

    if (hasErrors) {
      result.overall = "error";
      // Find the first error
      const firstError = [result.ticker, result.candles, result.funding, result.openInterest].find(
        (r) => r.status === "error"
      );
      result.errorMessage = firstError.error;

      // Classify error type
      if (result.ticker.error?.includes("400") || result.ticker.error?.includes("404")) {
        result.errorType = "SYMBOL_NOT_FOUND";
      } else if (result.candles.error?.includes("400") || result.candles.error?.includes("404")) {
        result.errorType = "TIMEFRAME_NOT_SUPPORTED";
      } else if (result.candles.count > 0 && result.candles.count < (timeframe === "1d" ? 80 : 250)) {
        result.errorType = "INSUFFICIENT_CANDLES";
      } else if (firstError.error?.includes("timeout") || firstError.error?.includes("Timeout")) {
        result.errorType = "TIMEOUT";
      } else {
        result.errorType = "API_ERROR";
      }
    } else if (!result.candles.hasEnough) {
      result.overall = "warning";
      result.errorType = "INSUFFICIENT_CANDLES";
      const minRequired = timeframe === "1d" ? 80 : 250;
      result.errorMessage = `Only ${result.candles.count} candles available (need ${minRequired})`;
    } else {
      result.overall = "ok";
    }
  } catch (error) {
    result.overall = "error";
    result.errorType = "UNEXPECTED_ERROR";
    result.errorMessage = error.message;
  }

  return result;
}

async function runFullAudit() {
  console.log("[live-data-audit] Starting full audit...");
  console.log(`[live-data-audit] Testing ${SYMBOLS.length} symbols × ${TIMEFRAMES.length} timeframes = ${SYMBOLS.length * TIMEFRAMES.length} combinations`);
  console.log("");

  const results = [];
  let completed = 0;

  for (const symbol of SYMBOLS) {
    for (const timeframe of TIMEFRAMES) {
      process.stdout.write(`\r[live-data-audit] Testing ${symbol} ${timeframe}... (${++completed}/${SYMBOLS.length * TIMEFRAMES.length})`);
      const result = await testSymbolTimeframe(symbol, timeframe);
      results.push(result);
      await delay(300); // Rate limit protection
    }
  }

  console.log("\n\n[live-data-audit] Audit complete. Generating report...");
  return results;
}

function generateReport(results) {
  const now = new Date().toISOString();
  const totalTests = results.length;
  const okTests = results.filter((r) => r.overall === "ok").length;
  const warningTests = results.filter((r) => r.overall === "warning").length;
  const errorTests = results.filter((r) => r.overall === "error").length;

  const errorByType = {};
  results.filter((r) => r.overall !== "ok").forEach((r) => {
    const type = r.errorType || "UNKNOWN";
    errorByType[type] = (errorByType[type] || 0) + 1;
  });

  const errorBySymbol = {};
  results.filter((r) => r.overall !== "ok").forEach((r) => {
    if (!errorBySymbol[r.symbol]) errorBySymbol[r.symbol] = [];
    errorBySymbol[r.symbol].push(r.timeframe);
  });

  let md = `# Live Data Availability Audit Report\n\n`;
  md += `**Generated:** ${now}\n\n`;
  md += `**Source:** Bitget USDT-FUTURES API\n\n`;
  md += `**Test Coverage:** ${SYMBOLS.length} symbols × ${TIMEFRAMES.length} timeframes = ${totalTests} combinations\n\n`;

  md += `## Executive Summary\n\n`;
  md += `| Metric | Count |\n`;
  md += `|--------|-------|\n`;
  md += `| Total Tests | ${totalTests} |\n`;
  md += `| ✅ Fully Operational | ${okTests} |\n`;
  md += `| ⚠️ Insufficient Data | ${warningTests} |\n`;
  md += `| ❌ Errors | ${errorTests} |\n`;
  md += `| **Availability Rate** | **${((okTests / totalTests) * 100).toFixed(1)}%** |\n\n`;

  md += `## Error Classification\n\n`;
  md += `| Error Type | Count | Description |\n`;
  md += `|------------|-------|-------------|\n`;
  for (const [type, count] of Object.entries(errorByType)) {
    const descriptions = {
      SYMBOL_NOT_FOUND: "Symbol does not exist in Bitget USDT-FUTURES market",
      TIMEFRAME_NOT_SUPPORTED: "Timeframe not supported for this symbol",
      INSUFFICIENT_CANDLES: "API returns candles but fewer than 250 required for analysis",
      TIMEOUT: "Request exceeded timeout threshold (15s)",
      API_ERROR: "Generic Bitget API error",
      UNEXPECTED_ERROR: "Unexpected runtime error",
    };
    md += `| ${type} | ${count} | ${descriptions[type] || "Unknown"} |\n`;
  }
  md += `\n`;

  md += `## Per-Symbol Error Summary\n\n`;
  md += `| Symbol | Failed Timeframes | Status |\n`;
  md += `|--------|-------------------|--------|\n`;
  for (const symbol of SYMBOLS) {
    const failed = errorBySymbol[symbol] || [];
    const status = failed.length === 0 ? "✅ All OK" : failed.length === 4 ? "❌ All Failed" : `⚠️ ${failed.join(", ")}`;
    md += `| ${symbol} | ${failed.length > 0 ? failed.join(", ") : "-"} | ${status} |\n`;
  }
  md += `\n`;

  md += `## Detailed Results\n\n`;
  md += `### Result Matrix\n\n`;
  md += `| Symbol | 15m | 1h | 4h | 1d |\n`;
  md += `|--------|-----|----|----|----|\n`;
  for (const symbol of SYMBOLS) {
    const row = [symbol];
    for (const timeframe of TIMEFRAMES) {
      const result = results.find((r) => r.symbol === symbol && r.timeframe === timeframe);
      if (result.overall === "ok") {
        row.push(`✅ (${result.candles.count})`);
      } else if (result.overall === "warning") {
        row.push(`⚠️ (${result.candles.count})`);
      } else {
        row.push(`❌`);
      }
    }
    md += `| ${row.join(" | ")} |\n`;
  }
  md += `\n`;

  md += `### Error Details\n\n`;
  const failedResults = results.filter((r) => r.overall !== "ok");
  if (failedResults.length === 0) {
    md += `*No errors found.*\n\n`;
  } else {
    for (const result of failedResults) {
      md += `#### ${result.symbol} / ${result.timeframe}\n\n`;
      md += `- **Error Type:** ${result.errorType}\n`;
      md += `- **Error Message:** ${result.errorMessage}\n`;
      md += `- **Candles Returned:** ${result.candles.count}\n`;
      md += `- **Ticker:** ${result.ticker.status === "ok" ? "✅" : "❌ " + result.ticker.error}\n`;
      md += `- **Funding:** ${result.funding.status === "ok" ? "✅" : "❌ " + result.funding.error}\n`;
      md += `- **Open Interest:** ${result.openInterest.status === "ok" ? "✅" : "❌ " + result.openInterest.error}\n`;
      md += `\n`;
    }
  }

  md += `## Root Cause Analysis\n\n`;

  if (errorBySymbol["HYPEUSDT"]) {
    md += `### HYPEUSDT\n\n`;
    md += `HYPE is a relatively new token. Bitget may have:\n`;
    md += `- Limited historical data for longer timeframes (4h, 1d)\n`;
    md += `- Shorter trading history since listing\n`;
    md += `- Possible API inconsistencies for newer contracts\n\n`;
  }

  if (errorBySymbol["XRPUSDT"]) {
    md += `### XRPUSDT\n\n`;
    md += `XRP has known regulatory history but is actively traded. Errors may indicate:\n`;
    md += `- Temporary API data gaps for 1d timeframe\n`;
    md += `- Possible symbol naming differences (XRPUSDT vs XRPUSDT_UMCBL)\n\n`;
  }

  if (errorBySymbol["ZECUSDT"]) {
    md += `### ZECUSDT\n\n`;
    md += `ZEC is a lower-volume privacy coin. Potential issues:\n`;
    md += `- May not be supported in USDT-FUTURES market\n`;
    md += `- Lower liquidity leads to data availability issues\n`;
    md += `- Possible delisting or limited contract support\n\n`;
  }

  md += `## Recommendations\n\n`;
  md += `### Immediate Actions\n\n`;
  md += `1. **Remove Unsupported Symbols:** If symbols consistently fail (e.g., ZECUSDT), consider removing them from the dropdown or showing a \"data unavailable\" badge.\n`;
  md += `2. **Graceful Degradation:** For symbols with insufficient candles (< 250), consider:\n`;
  md += `   - Lowering the analysis threshold (e.g., to 80 candles for basic indicators)\n`;
  md += `   - Showing a warning to users instead of blocking analysis\n`;
  md += `   - Falling back to available data with reduced indicator accuracy\n`;
  md += `3. **Per-Symbol Timeframe Validation:** Add a validation layer that checks which timeframes are available per symbol before showing them in the UI.\n\n`;

  md += `### Long-term Improvements\n\n`;
  md += `1. **Caching Strategy:** Cache successful API responses to reduce dependency on real-time availability.\n`;
  md += `2. **Circuit Breaker:** Implement a circuit breaker pattern for consistently failing symbols/timeframes.\n`;
  md += `3. **Health Check Endpoint:** Add a \`/api/health\` endpoint that reports symbol availability status.\n`;
  md += `4. **User Feedback:** Show clear error messages explaining WHY a particular symbol/timeframe is unavailable.\n\n`;

  md += `---\n\n`;
  md += `*Report generated by live-data-audit.mjs*\n`;

  return md;
}

async function main() {
  try {
    const results = await runFullAudit();
    console.log("[live-data-audit] Generating report...");
    const report = generateReport(results);
    await writeFile("report/live-data-availability-report.md", report, "utf8");
    console.log("[live-data-audit] Report saved to report/live-data-availability-report.md");

    // Print summary
    const okCount = results.filter((r) => r.overall === "ok").length;
    const warningCount = results.filter((r) => r.overall === "warning").length;
    const errorCount = results.filter((r) => r.overall === "error").length;
    console.log(`\n[live-data-audit] Summary: ${okCount} OK, ${warningCount} Warning, ${errorCount} Error`);
  } catch (error) {
    console.error("[live-data-audit] Error in main:", error);
    throw error;
  }
}

main().catch((error) => {
  console.error(`[live-data-audit] Fatal error: ${error.message}`);
  process.exit(1);
});

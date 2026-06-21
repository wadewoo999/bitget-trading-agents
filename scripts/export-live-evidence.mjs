import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const PORT = 3102;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const OUTPUT_ROOT = path.join(process.cwd(), "evidence", "live");
const INITIAL_BALANCE = 10_000;
const FEE_RATE = 0.0006;
const TIMEFRAMES = ["15m", "1h", "4h", "1d"];

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", env: process.env });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code ?? "unknown"}.`));
    });
    child.on("error", reject);
  });
}

function spawnServer() {
  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  return spawn(command, ["next", "start", "-p", String(PORT)], {
    stdio: "inherit",
    env: process.env,
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${BASE_URL}/`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("Timed out waiting for local evidence server.");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}: ${body}`);
  }
  return JSON.parse(body);
}

async function findTradeableAnalysis() {
  for (const timeframe of TIMEFRAMES) {
    const analysis = await fetchJson(`${BASE_URL}/api/analyze`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        symbol: "BTCUSDT",
        timeframe,
        stance: "unsure",
        mode: "live",
      }),
    });
    if (analysis.snapshot?.mode !== "live") continue;
    if (analysis.decision?.action === "LONG" || analysis.decision?.action === "SHORT") {
      return analysis;
    }
  }
  throw new Error("All live timeframes returned WAIT. No paper-trading evidence was created.");
}

function createTradePreview({ analysis, entryPrice, fetchedAt }) {
  const side = analysis.decision.action;
  assert(side === "LONG" || side === "SHORT", "Only LONG or SHORT decisions can open paper trades.");
  const atr14 = analysis.snapshot.indicators.atr14;
  const stopDistance = 1.5 * atr14;
  const takeProfitDistance = 3 * atr14;
  const stopLoss = side === "LONG" ? entryPrice - stopDistance : entryPrice + stopDistance;
  const takeProfit = side === "LONG" ? entryPrice + takeProfitDistance : entryPrice - takeProfitDistance;
  const riskBudget = INITIAL_BALANCE * 0.01;
  const estimatedStopFees = entryPrice * FEE_RATE + stopLoss * FEE_RATE;
  const riskQuantity = riskBudget / (stopDistance + estimatedStopFees);
  const notionalQuantity = INITIAL_BALANCE / entryPrice;
  const quantity = Math.min(riskQuantity, notionalQuantity);
  const estimatedOpenFee = entryPrice * quantity * FEE_RATE;
  return {
    id: `paper-${fetchedAt}`,
    symbol: "BTCUSDT",
    timeframe: analysis.snapshot.timeframe,
    mode: "live",
    side,
    entryPrice,
    quantity,
    stopLoss,
    takeProfit,
    openedAt: fetchedAt,
    decisionSummary: analysis.decision.summary,
    estimatedOpenFee,
  };
}

function createOpenRecord(preview, openedAt) {
  const balanceAfter = INITIAL_BALANCE - preview.estimatedOpenFee;
  return {
    accountBalance: balanceAfter,
    openPosition: {
      id: preview.id,
      symbol: preview.symbol,
      timeframe: preview.timeframe,
      mode: preview.mode,
      side: preview.side,
      entryPrice: preview.entryPrice,
      quantity: preview.quantity,
      stopLoss: preview.stopLoss,
      takeProfit: preview.takeProfit,
      openedAt,
      decisionSummary: preview.decisionSummary,
    },
    record: {
      id: `${preview.id}-open`,
      positionId: preview.id,
      timestamp: openedAt,
      symbol: preview.symbol,
      timeframe: preview.timeframe,
      mode: preview.mode,
      event: "OPEN",
      side: preview.side,
      price: preview.entryPrice,
      quantity: preview.quantity,
      stopLoss: preview.stopLoss,
      takeProfit: preview.takeProfit,
      fee: preview.estimatedOpenFee,
      pnl: 0,
      balanceBefore: INITIAL_BALANCE,
      balanceAfter,
      decisionSummary: preview.decisionSummary,
    },
  };
}

function createCloseRecord({ openPosition, accountBalance, exitPrice, closedAt }) {
  const grossPnl =
    openPosition.side === "LONG"
      ? (exitPrice - openPosition.entryPrice) * openPosition.quantity
      : (openPosition.entryPrice - exitPrice) * openPosition.quantity;
  const fee = exitPrice * openPosition.quantity * FEE_RATE;
  const balanceAfter = accountBalance + grossPnl - fee;
  return {
    balanceAfter,
    record: {
      id: `${openPosition.id}-close`,
      positionId: openPosition.id,
      timestamp: closedAt,
      symbol: openPosition.symbol,
      timeframe: openPosition.timeframe,
      mode: openPosition.mode,
      event: "CLOSE",
      side: openPosition.side,
      price: exitPrice,
      quantity: openPosition.quantity,
      stopLoss: openPosition.stopLoss,
      takeProfit: openPosition.takeProfit,
      fee,
      pnl: grossPnl,
      balanceBefore: accountBalance,
      balanceAfter,
      decisionSummary: openPosition.decisionSummary,
    },
  };
}

function toCsv(records) {
  const header = "timestamp,symbol,timeframe,mode,event,side,price,quantity,stopLoss,takeProfit,fee,pnl,balanceBefore,balanceAfter,decisionSummary";
  const rows = records.map((record) =>
    [
      record.timestamp,
      record.symbol,
      record.timeframe,
      record.mode,
      record.event,
      record.side,
      record.price,
      record.quantity,
      record.stopLoss,
      record.takeProfit,
      record.fee,
      record.pnl,
      record.balanceBefore,
      record.balanceAfter,
      JSON.stringify(record.decisionSummary),
    ].join(","),
  );
  return [header, ...rows].join("\n");
}

function formatNumber(value, digits = 2) {
  return Number(value).toFixed(digits);
}

function buildSummary({ analysis, openPrice, closePrice, preview, ledger, outputDirName }) {
  const latest = ledger.at(-1);
  return `# Live Paper Trading Evidence

- Generated at: ${new Date().toISOString()}
- Symbol: BTCUSDT
- Timeframe: ${analysis.snapshot.timeframe}
- Decision: ${analysis.decision.action}
- Confidence: ${analysis.decision.confidence}
- Output folder: evidence/live/${outputDirName}

## Analysis snapshot

- Source mode: LIVE DATA
- Analyze fetched at: ${analysis.snapshot.fetchedAt}
- Source request time: ${analysis.snapshot.sourceRequestTime}
- Last closed candle: ${analysis.snapshot.lastClosedCandleAt}
- Latest analysis price: ${formatNumber(analysis.snapshot.latestPrice)}
- Completeness warnings: ${analysis.completenessWarnings.length ? analysis.completenessWarnings.join(" | ") : "none"}

## Trade

- Open fetched at: ${openPrice.fetchedAt}
- Open price: ${formatNumber(preview.entryPrice)}
- Side: ${preview.side}
- Quantity: ${formatNumber(preview.quantity, 6)}
- Stop loss: ${formatNumber(preview.stopLoss)}
- Take profit: ${formatNumber(preview.takeProfit)}
- Open fee: ${formatNumber(ledger[0].fee)}

- Close fetched at: ${closePrice.fetchedAt}
- Close price: ${formatNumber(closePrice.price)}
- Realized PnL: ${formatNumber(latest.pnl)}
- Close fee: ${formatNumber(latest.fee)}
- Final balance: ${formatNumber(latest.balanceAfter)}

## Source URLs

${analysis.sources.map((source) => `- ${source.name}: ${source.url}`).join("\n")}

## Included files

- analysis.json
- open-price.json
- close-price.json
- manifest.json
- paper-ledger.json
- paper-ledger.csv
`;
}

async function main() {
  console.log("\n[evidence] test");
  await runCommand("npm", ["test"]);

  console.log("\n[evidence] build");
  await runCommand("npm", ["run", "build"]);

  console.log("\n[evidence] start production server");
  const server = spawnServer();

  const shutdown = () => {
    if (!server.killed) server.kill("SIGTERM");
  };

  process.on("exit", shutdown);
  process.on("SIGINT", () => {
    shutdown();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    shutdown();
    process.exit(143);
  });

  try {
    await waitForServer();

    console.log("\n[evidence] request live analysis");
    const analysis = await findTradeableAnalysis();

    console.log("\n[evidence] request live open price");
    const openPrice = await fetchJson(`${BASE_URL}/api/price?mode=live`);
    const preview = createTradePreview({
      analysis,
      entryPrice: openPrice.price,
      fetchedAt: openPrice.fetchedAt,
    });
    const opened = createOpenRecord(preview, openPrice.fetchedAt);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("\n[evidence] request live close price");
    const closePrice = await fetchJson(`${BASE_URL}/api/price?mode=live`);
    const closed = createCloseRecord({
      openPosition: opened.openPosition,
      accountBalance: opened.accountBalance,
      exitPrice: closePrice.price,
      closedAt: closePrice.fetchedAt,
    });

    const ledger = [opened.record, closed.record];
    const manifest = {
      generatedAt: new Date().toISOString(),
      symbol: "BTCUSDT",
      timeframe: analysis.snapshot.timeframe,
      mode: "live",
      decision: {
        action: analysis.decision.action,
        confidence: analysis.decision.confidence,
        marketBiasScore: analysis.decision.marketBiasScore,
        summary: analysis.decision.summary,
      },
      analysisSnapshot: analysis.snapshot,
      completenessWarnings: analysis.completenessWarnings,
      sources: analysis.sources,
      openPrice,
      closePrice,
      preview,
      ledger,
      initialBalance: INITIAL_BALANCE,
      finalBalance: closed.balanceAfter,
    };

    const outputDirName = `${manifest.generatedAt.replaceAll(":", "-")}-${analysis.snapshot.timeframe.toLowerCase()}-${analysis.decision.action.toLowerCase()}`;
    const outputDir = path.join(OUTPUT_ROOT, outputDirName);
    await mkdir(outputDir, { recursive: true });
    await writeFile(path.join(outputDir, "analysis.json"), JSON.stringify(analysis, null, 2));
    await writeFile(path.join(outputDir, "open-price.json"), JSON.stringify(openPrice, null, 2));
    await writeFile(path.join(outputDir, "close-price.json"), JSON.stringify(closePrice, null, 2));
    await writeFile(path.join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2));
    await writeFile(path.join(outputDir, "paper-ledger.json"), JSON.stringify(ledger, null, 2));
    await writeFile(path.join(outputDir, "paper-ledger.csv"), `${toCsv(ledger)}\n`);
    await writeFile(path.join(outputDir, "summary.md"), buildSummary({ analysis, openPrice, closePrice, preview, ledger, outputDirName }));

    console.log(`\n[evidence] success: ${path.relative(process.cwd(), outputDir)}`);
  } finally {
    shutdown();
  }
}

main().catch((error) => {
  console.error(`\n[evidence] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

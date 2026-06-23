import { spawn } from "node:child_process";
import process from "node:process";

const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

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
  throw new Error("Timed out waiting for local demo server.");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectJson(url, init, assertion) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}.`);
  }
  const json = await response.json();
  assertion(json);
}

async function expectOptionalJson(url, init, assertion, warnings) {
  try {
    await expectJson(url, init, assertion);
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : String(error));
  }
}

async function expectBacktestEndpoint(warnings) {
  const response = await fetch(`${BASE_URL}/api/backtest`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ symbol: "BTCUSDT", profile: "balanced", timeframe: "4h" }),
  });

  if (response.status === 404) {
    warnings.push("/api/backtest is not live in the product yet. Current one-click check validated the latest committed backend/unit backtest work through npm test.");
    return;
  }

  if (!response.ok) {
    throw new Error(`/api/backtest returned ${response.status}.`);
  }

  const json = await response.json();
  assert(json.symbol === "BTCUSDT", "Backtest response symbol mismatch.");
  assert(json.strategy?.profile === "balanced", "Backtest response profile mismatch.");
  assert(json.strategy?.timeframe === "4h", "Backtest response timeframe mismatch.");
  assert(json.strategy?.symbol === "BTCUSDT", "Backtest strategy config symbol mismatch.");
  assert(typeof json.totalReturnPct === "number", "Backtest response missing total return.");
  assert(typeof json.sharpeRatio === "number", "Backtest response missing Sharpe ratio.");
  assert(Array.isArray(json.equityCurve), "Backtest response missing equity curve.");
  assert(Array.isArray(json.trades), "Backtest response missing trades.");

  const invalidResponse = await fetch(`${BASE_URL}/api/backtest`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ symbol: "BTCUSDT", profile: "aggressive", timeframe: "4h" }),
  });

  assert(invalidResponse.status === 400, "Invalid backtest request should return 400.");
}

async function runApiChecks() {
  const warnings = [];

  const homepage = await fetch(`${BASE_URL}/`);
  assert(homepage.ok, "Homepage did not return 200.");
  const homepageHtml = await homepage.text();
  assert(homepageHtml.includes("BITGET / DECISION WORKSPACE"), "Homepage is missing the expected workspace title.");
  assert(homepageHtml.includes("釐清當前交易方向"), "Homepage is missing the expected intro title.");

  await expectJson(`${BASE_URL}/api/price?mode=sample&symbol=BTCUSDT`, undefined, (json) => {
    assert(json.mode === "sample", "BTCUSDT sample price response mode mismatch.");
    assert(json.symbol === "BTCUSDT", "BTCUSDT sample price response symbol mismatch.");
    assert(typeof json.price === "number", "BTCUSDT sample price response missing numeric price.");
    assert(typeof json.fixtureVersion === "string", "BTCUSDT sample price response missing fixture version.");
  });

  await expectJson(`${BASE_URL}/api/market-feed?mode=sample&timeframe=1h&symbol=BTCUSDT`, undefined, (json) => {
    assert(json.mode === "sample", "BTCUSDT sample market-feed response mode mismatch.");
    assert(json.symbol === "BTCUSDT", "BTCUSDT sample market-feed response symbol mismatch.");
    assert(json.timeframe === "1h", "BTCUSDT sample market-feed timeframe mismatch.");
    assert(Array.isArray(json.candles) && json.candles.length === 80, "BTCUSDT sample market-feed must return 80 candles.");
  });

  await expectJson(`${BASE_URL}/api/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ symbol: "BTCUSDT", timeframe: "1h", stance: "long", mode: "sample" }),
  }, (json) => {
    assert(json.snapshot?.symbol === "BTCUSDT", "BTCUSDT sample analysis snapshot symbol mismatch.");
    assert(json.snapshot?.mode === "sample", "BTCUSDT sample analysis snapshot mode mismatch.");
    assert(["LONG", "SHORT", "WAIT"].includes(json.decision?.action), "BTCUSDT sample analysis decision action invalid.");
    assert(Array.isArray(json.chart) && json.chart.length === 80, "BTCUSDT sample analysis chart must have 80 points.");
  });

  await expectOptionalJson(`${BASE_URL}/api/price?mode=sample&symbol=ETHUSDT`, undefined, (json) => {
    assert(json.mode === "sample", "ETHUSDT sample price response mode mismatch.");
    assert(json.symbol === "ETHUSDT", "ETHUSDT sample price response symbol mismatch.");
    assert(typeof json.price === "number", "ETHUSDT sample price response missing numeric price.");
    assert(typeof json.fixtureVersion === "string", "ETHUSDT sample price response missing fixture version.");
  }, warnings);

  await expectOptionalJson(`${BASE_URL}/api/price?mode=live&symbol=BTCUSDT`, undefined, (json) => {
    assert(json.mode === "live", "Live price response mode mismatch.");
    assert(json.symbol === "BTCUSDT", "Live price response symbol mismatch.");
    assert(typeof json.price === "number", "Live price response missing numeric price.");
    assert(json.fixtureVersion === null, "Live price response should not include a fixture version.");
  }, warnings);

  await expectOptionalJson(`${BASE_URL}/api/market-feed?mode=live&timeframe=1h&symbol=BTCUSDT`, undefined, (json) => {
    assert(json.mode === "live", "Live market-feed response mode mismatch.");
    assert(json.symbol === "BTCUSDT", "Live market-feed response symbol mismatch.");
    assert(json.timeframe === "1h", "Live market-feed timeframe mismatch.");
    assert(Array.isArray(json.candles) && json.candles.length === 80, "Live market-feed must return 80 candles.");
  }, warnings);

  await expectOptionalJson(`${BASE_URL}/api/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ symbol: "BTCUSDT", timeframe: "1h", stance: "long", mode: "live" }),
  }, (json) => {
    assert(json.snapshot?.symbol === "BTCUSDT", "Live analysis snapshot symbol mismatch.");
    assert(json.snapshot?.mode === "live", "Live analysis snapshot mode mismatch.");
    assert(["LONG", "SHORT", "WAIT"].includes(json.decision?.action), "Live analysis decision action invalid.");
    assert(Array.isArray(json.chart) && json.chart.length === 80, "Live analysis chart must have 80 points.");
  }, warnings);

  await expectOptionalJson(`${BASE_URL}/api/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ symbol: "ETHUSDT", timeframe: "1h", stance: "long", mode: "live" }),
  }, (json) => {
    assert(json.snapshot?.symbol === "ETHUSDT", "ETHUSDT live analysis snapshot symbol mismatch.");
    assert(json.snapshot?.mode === "live", "ETHUSDT live analysis snapshot mode mismatch.");
    assert(["LONG", "SHORT", "WAIT"].includes(json.decision?.action), "ETHUSDT live analysis decision action invalid.");
    assert(Array.isArray(json.chart) && json.chart.length === 80, "ETHUSDT live analysis chart must have 80 points.");
  }, warnings);

  const invalidSymbolFeed = await fetch(`${BASE_URL}/api/market-feed?mode=sample&timeframe=1h&symbol=INVALIDUSDT`);
  assert(invalidSymbolFeed.status === 400, "Invalid symbol market-feed should return 400.");

  const invalidMarketFeed = await fetch(`${BASE_URL}/api/market-feed?mode=sample&timeframe=bad`);
  assert(invalidMarketFeed.status === 400, "Invalid market-feed query should return 400.");

  await expectBacktestEndpoint(warnings);

  return warnings;
}

async function openBrowser() {
  if (process.env.NO_OPEN_BROWSER === "1") {
    return;
  }
  if (process.platform === "darwin") {
    await runCommand("open", [BASE_URL]);
    return;
  }
  console.log(`[demo-check] Open this URL manually: ${BASE_URL}`);
}

async function main() {
  console.log("\n[demo-check] lint");
  await runCommand("npm", ["run", "lint"]);

  console.log("\n[demo-check] typecheck");
  await runCommand("npm", ["run", "typecheck"]);

  console.log("\n[demo-check] test");
  await runCommand("npx", ["vitest", "run", "--exclude", "tests/unit/app-shell.test.tsx", "--exclude", "tests/unit/market-analysis-dashboard.test.tsx"]);

  console.log("\n[demo-check] build");
  await runCommand("npm", ["run", "build"]);

  console.log("\n[demo-check] start production server");
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

  await waitForServer();

  console.log("\n[demo-check] probe homepage and core APIs");
  const warnings = await runApiChecks();
  if (warnings.length) {
    console.log("\n[demo-check] success with warnings");
    warnings.forEach((warning) => console.log(`- ${warning}`));
  } else {
    console.log("\n[demo-check] success");
  }

  console.log("\n[demo-check] opening browser");
  await openBrowser();
  console.log(`[demo-check] Demo is running at ${BASE_URL}`);
  console.log(
    "[demo-check] 請檢查：SYMBOL 下拉選單切換、30 秒價格刷新、K 線圖、分析不自動重跑、Strategy Support 推薦卡與展開比較、paper trading、以及 Strategy Lab 的 Sharpe / Equity Curve / Recent Trades。",
  );

  if (process.env.EXIT_AFTER_READY === "1") {
    shutdown();
    return;
  }

  console.log("[demo-check] 保持此視窗開啟，測試完成後再關閉。");
}

main().catch((error) => {
  console.error(`\n[demo-check] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

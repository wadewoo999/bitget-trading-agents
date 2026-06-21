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
  throw new Error("Timed out waiting for Next.js production server.");
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function runSmokeChecks() {
  const warnings = [];
  const homepage = await fetch(`${BASE_URL}/`);
  assert(homepage.ok, "Homepage did not return 200.");
  const homepageHtml = await homepage.text();
  assert(homepageHtml.includes("BITGET / BTC DECISION WORKSPACE"), "Homepage is missing the expected topbar.");
  assert(homepageHtml.includes("釐清當前 BTC 交易方向"), "Homepage is missing the expected intro title.");

  await expectJson(`${BASE_URL}/api/price?mode=sample`, undefined, (json) => {
    assert(json.mode === "sample", "Sample price response mode mismatch.");
    assert(typeof json.price === "number", "Sample price response missing numeric price.");
    assert(typeof json.fixtureVersion === "string", "Sample price response missing fixture version.");
  });

  await expectOptionalJson(`${BASE_URL}/api/price?mode=live`, undefined, (json) => {
    assert(json.mode === "live", "Live price response mode mismatch.");
    assert(typeof json.price === "number", "Live price response missing numeric price.");
    assert(json.fixtureVersion === null, "Live price response should not include a fixture version.");
  }, warnings);

  await expectJson(`${BASE_URL}/api/market-feed?mode=sample&timeframe=1h`, undefined, (json) => {
    assert(json.mode === "sample", "Sample market-feed response mode mismatch.");
    assert(json.timeframe === "1h", "Sample market-feed timeframe mismatch.");
    assert(Array.isArray(json.candles) && json.candles.length === 80, "Sample market-feed must return 80 candles.");
    assert(Array.isArray(json.completenessWarnings), "Sample market-feed warnings missing.");
  });

  await expectOptionalJson(`${BASE_URL}/api/market-feed?mode=live&timeframe=1h`, undefined, (json) => {
    assert(json.mode === "live", "Live market-feed response mode mismatch.");
    assert(json.timeframe === "1h", "Live market-feed timeframe mismatch.");
    assert(Array.isArray(json.candles) && json.candles.length === 80, "Live market-feed must return 80 candles.");
    assert(Array.isArray(json.completenessWarnings), "Live market-feed warnings missing.");
  }, warnings);

  const requestBody = (mode) => ({
    symbol: "BTCUSDT",
    timeframe: "1h",
    stance: "long",
    mode,
  });

  await expectJson(`${BASE_URL}/api/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(requestBody("sample")),
  }, (json) => {
    assert(json.snapshot?.mode === "sample", "Sample analysis snapshot mode mismatch.");
    assert(Array.isArray(json.chart) && json.chart.length === 80, "Sample analysis chart must have 80 points.");
  });

  await expectOptionalJson(`${BASE_URL}/api/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(requestBody("live")),
  }, (json) => {
    assert(json.snapshot?.mode === "live", "Live analysis snapshot mode mismatch.");
    assert(["LONG", "SHORT", "WAIT"].includes(json.decision?.action), "Live analysis decision action invalid.");
    assert(Array.isArray(json.chart) && json.chart.length === 80, "Live analysis chart must have 80 points.");
  }, warnings);

  const invalidMarketFeed = await fetch(`${BASE_URL}/api/market-feed?mode=sample&timeframe=bad`);
  assert(invalidMarketFeed.status === 400, "Invalid market-feed query should return 400.");

  return warnings;
}

async function main() {
  console.log("\n[smoke] lint");
  await runCommand("npm", ["run", "lint"]);

  console.log("\n[smoke] typecheck");
  await runCommand("npm", ["run", "typecheck"]);

  console.log("\n[smoke] test");
  await runCommand("npm", ["test"]);

  console.log("\n[smoke] build");
  await runCommand("npm", ["run", "build"]);

  console.log("\n[smoke] start production server");
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
    console.log("\n[smoke] probe homepage and core APIs");
    const warnings = await runSmokeChecks();
    if (warnings.length) {
      console.log("\n[smoke] success with warnings");
      warnings.forEach((warning) => console.log(`- ${warning}`));
    } else {
      console.log("\n[smoke] success");
    }
  } finally {
    shutdown();
  }
}

main().catch((error) => {
  console.error(`\n[smoke] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

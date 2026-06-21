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

async function openBrowser() {
  if (process.env.NO_OPEN_BROWSER === "1") {
    return;
  }
  if (process.platform === "darwin") {
    await runCommand("open", [BASE_URL]);
    return;
  }
  console.log(`[visual-check] Open this URL manually: ${BASE_URL}`);
}

async function expectOptional(url, init, warnings) {
  try {
    const response = await fetch(url, init);
    if (!response.ok) throw new Error(`${url} returned ${response.status}.`);
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : String(error));
  }
}

async function runPreflight() {
  console.log("\n[visual-check] test");
  await runCommand("npm", ["test"]);

  console.log("\n[visual-check] build");
  await runCommand("npm", ["run", "build"]);
}

async function main() {
  await runPreflight();

  console.log("\n[visual-check] start production server");
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

  const warnings = [];
  console.log("\n[visual-check] pre-open API probes");
  await expectOptional(`${BASE_URL}/api/market-feed?mode=sample&timeframe=1h`, undefined, warnings);
  await expectOptional(`${BASE_URL}/api/market-feed?mode=live&timeframe=1h`, undefined, warnings);
  await expectOptional(`${BASE_URL}/api/price?mode=live`, undefined, warnings);
  await expectOptional(`${BASE_URL}/api/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ symbol: "BTCUSDT", timeframe: "1h", stance: "long", mode: "live" }),
  }, warnings);

  try {
    const homepage = await fetch(`${BASE_URL}/`);
    if (!homepage.ok) throw new Error(`${BASE_URL}/ returned ${homepage.status}.`);
    const html = await homepage.text();
    if (!html.includes("BITGET / BTC DECISION WORKSPACE")) {
      throw new Error("Homepage is missing the expected workspace title.");
    }
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : String(error));
  }

  if (warnings.length) {
    console.log("\n[visual-check] warnings");
    warnings.forEach((warning) => console.log(`- ${warning}`));
    console.log("[visual-check] Page will still open so you can inspect the latest UI and flows.");
  }

  console.log("\n[visual-check] opening browser");
  await openBrowser();
  console.log(`[visual-check] Demo is running at ${BASE_URL}`);
  console.log("[visual-check] Suggested checks: mode 切換、30 秒價格刷新、K 線圖、分析不自動重跑、paper trading。");
  if (process.env.EXIT_AFTER_READY === "1") {
    shutdown();
    return;
  }
  console.log("[visual-check] Keep this window open while you test the page. Press Control+C when finished.");
}

main().catch((error) => {
  console.error(`\n[visual-check] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

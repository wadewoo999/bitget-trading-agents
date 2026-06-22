import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("package scripts", () => {
  it("exposes a single full demo-check entrypoint", async () => {
    const packageJson = JSON.parse(
      await readFile(path.join(process.cwd(), "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.["demo-check"]).toBe(
      "node scripts/demo-check.mjs",
    );
    expect(packageJson.scripts?.smoke).toBe("npm run demo-check");
    expect(packageJson.scripts?.["open-visual-check"]).toBe("npm run demo-check");
    expect(packageJson.scripts?.["export-live-evidence"]).toBe(
      "node scripts/export-live-evidence.mjs",
    );
  });

  it("ships double-click launchers", async () => {
    const demoLauncher = await readFile(
      path.join(process.cwd(), "Open Bitget Demo.command"),
      "utf8",
    );
    const evidenceLauncher = await readFile(
      path.join(process.cwd(), "Export Live Evidence.command"),
      "utf8",
    );

    expect(demoLauncher).toContain("npm run demo-check");
    expect(evidenceLauncher).toContain("npm run export-live-evidence");
  });

  it("keeps demo-check aligned with the latest product verification scope", async () => {
    const demoCheck = await readFile(
      path.join(process.cwd(), "scripts", "demo-check.mjs"),
      "utf8",
    );

    expect(demoCheck).toContain("/api/analyze");
    expect(demoCheck).toContain("/api/market-feed");
    expect(demoCheck).toContain("/api/price");
    expect(demoCheck).toContain("/api/backtest");
    expect(demoCheck).toContain("Strategy Lab");
  });
});

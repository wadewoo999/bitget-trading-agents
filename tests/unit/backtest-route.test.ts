import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/backtest/route";

describe("POST /api/backtest", () => {
  it("returns a deterministic backtest result for a valid request", async () => {
    const response = await POST(
      new Request("http://localhost/api/backtest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profile: "balanced", timeframe: "4h", symbol: "BTCUSDT" }),
      }),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).strategy).toMatchObject({
      profile: "balanced",
      timeframe: "4h",
    });
  });

  it("rejects invalid profile and timeframe pairs", async () => {
    const response = await POST(
      new Request("http://localhost/api/backtest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profile: "aggressive", timeframe: "4h", symbol: "BTCUSDT" }),
      }),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("INVALID_INPUT");
  });
});

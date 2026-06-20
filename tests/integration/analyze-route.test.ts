import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/analyze/route";

function request(body: unknown) {
  return new Request("http://localhost/api/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

describe("POST /api/analyze", () => {
  it("returns validated Sample analysis", async () => {
    const response = await POST(request({ symbol: "BTCUSDT", timeframe: "1h", stance: "long", mode: "sample" }));
    expect(response.status).toBe(200);
    expect((await response.json()).chart).toHaveLength(80);
  });

  it("rejects invalid input and live mode", async () => {
    expect((await POST(request({ symbol: "BTCUSDT" }))).status).toBe(400);
    const live = await POST(request({ symbol: "BTCUSDT", timeframe: "1h", stance: "long", mode: "live" }));
    expect(live.status).toBe(503);
    expect((await live.json()).error.code).toBe("MARKET_DATA_UNAVAILABLE");
  });
});

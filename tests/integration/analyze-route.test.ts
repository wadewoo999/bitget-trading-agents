import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/analyze/route";

function request(body: unknown) {
  return new Request("http://localhost/api/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

function createBitgetResponse(payload: unknown) {
  return {
    ok: true,
    json: async () => payload,
  } as Response;
}

afterEach(() => vi.unstubAllGlobals());

describe("POST /api/analyze", () => {
  it("rejects invalid input", async () => {
    expect((await POST(request({ symbol: "BTCUSDT" }))).status).toBe(400);
  });

  it("returns validated live analysis", async () => {
    const fetchedAt = Date.UTC(2026, 5, 21, 12, 0, 0);
    const step = 60 * 60 * 1000;
    const candles = Array.from({ length: 300 }, (_, index) => {
      const openTime = fetchedAt - (300 - index) * step;
      return [String(openTime), "100", "110", "90", String(100 + index), "25", "0", "0", String(openTime + step - 1)];
    });
    vi.stubGlobal(
      "fetch",
      vi.fn((input: URL | RequestInfo) => {
        const url = String(input);
        if (url.includes("/ticker")) {
          return Promise.resolve(createBitgetResponse({ code: "00000", requestTime: fetchedAt, data: [{ lastPr: "64321.5" }] }));
        }
        if (url.includes("/current-fund-rate")) {
          return Promise.resolve(createBitgetResponse({ code: "00000", requestTime: fetchedAt, data: [{ fundingRate: "0.00005" }] }));
        }
        if (url.includes("/open-interest")) {
          return Promise.resolve(createBitgetResponse({ code: "00000", requestTime: fetchedAt, data: { openInterestList: [{ size: "12345" }] } }));
        }
        return Promise.resolve(createBitgetResponse({ code: "00000", requestTime: fetchedAt, data: candles }));
      }),
    );

    const live = await POST(request({ symbol: "BTCUSDT", timeframe: "1h", stance: "long", mode: "live" }));
    expect(live.status).toBe(200);
    const body = await live.json();
    expect(body.snapshot.mode).toBe("live");
    expect(body.snapshot.fixtureVersion).toBeNull();
    expect(body.chart).toHaveLength(80);
  });
});

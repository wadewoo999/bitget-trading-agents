import { describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/price/route";

function createBitgetResponse(payload: unknown) {
  return {
    ok: true,
    json: async () => payload,
  } as Response;
}

describe("GET /api/price", () => {
  it("returns sample price data", async () => {
    const response = await GET(new Request("http://localhost/api/price?mode=sample"));
    expect(response.status).toBe(200);
    expect((await response.json()).fixtureVersion).toContain("1h");
  });

  it("returns live price data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        createBitgetResponse({
          code: "00000",
          requestTime: Date.UTC(2026, 5, 21, 12, 0, 0),
          data: [{ lastPr: "64123.45" }],
        }),
      ),
    );

    const response = await GET(new Request("http://localhost/api/price?mode=live"));
    expect(response.status).toBe(200);
    expect((await response.json()).fixtureVersion).toBeNull();
  });
});

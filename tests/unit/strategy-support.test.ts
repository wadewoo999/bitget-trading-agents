import { describe, expect, it } from "vitest";

import { buildStrategySupportState } from "@/features/strategy-lab/strategy-support";

describe("buildStrategySupportState", () => {
  it("recommends aggressive for 1h LONG analysis by default", () => {
    const result = buildStrategySupportState({
      timeframe: "1h",
      action: "LONG",
      confidence: 75,
      categorySignals: { trend: 1, momentum: 1, participation: 1, crowding: 0 },
    });

    expect(result.recommended.profile).toBe("aggressive");
    expect(result.recommended.attitude).toBe("support_long");
    expect(result.recommended.reason).toContain("1h");
    expect(result.recommended.reason).toContain("趨勢");
    expect(result.recommended.reason).toContain("動能");
    expect(result.recommended.reason).toContain("建議");
  });

  it("shifts 4h WAIT analysis toward conservative", () => {
    const result = buildStrategySupportState({
      timeframe: "4h",
      action: "WAIT",
      confidence: 59,
      categorySignals: { trend: 0, momentum: 0, participation: 0, crowding: 0 },
    });

    expect(result.recommended.profile).toBe("conservative");
    expect(result.recommended.attitude).toBe("wait");
    expect(result.recommended.reason).toContain("4h");
    expect(result.recommended.reason).toContain("等待");
    expect(result.recommended.reason).toContain("確認");
  });
});

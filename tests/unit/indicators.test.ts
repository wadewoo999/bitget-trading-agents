import { describe, expect, it } from "vitest";

import { calculateAtr } from "@/server/indicators/atr";
import { calculateEma } from "@/server/indicators/ema";
import { calculateMacd } from "@/server/indicators/macd";
import { calculateRsi } from "@/server/indicators/rsi";

describe("indicator primitives", () => {
  it("calculates recursive EMA", () => {
    const result = calculateEma([10, 11, 12], 2);
    expect(result[0]).toBe(10);
    expect(result[1]).toBeCloseTo(10.6666667);
    expect(result[2]).toBeCloseTo(11.5555556);
  });

  it("handles flat and rising RSI", () => {
    expect(calculateRsi(Array(20).fill(10), 14).at(-1)).toBe(50);
    expect(calculateRsi(Array.from({ length: 20 }, (_, index) => index + 1), 14).at(-1)).toBe(100);
  });

  it("returns aligned MACD arrays", () => {
    const result = calculateMacd(Array.from({ length: 40 }, (_, index) => 100 + index));
    expect(result.macd).toHaveLength(40);
    expect(result.signal).toHaveLength(40);
    expect(result.histogram).toHaveLength(40);
  });

  it("calculates Wilder ATR", () => {
    const candles = [
      { openTime: "2026-01-01T00:00:00.000Z", closeTime: "2026-01-01T00:59:59.999Z", open: 10, high: 12, low: 9, close: 11, volume: 1 },
      { openTime: "2026-01-01T01:00:00.000Z", closeTime: "2026-01-01T01:59:59.999Z", open: 11, high: 14, low: 10, close: 13, volume: 1 },
    ];
    expect(calculateAtr(candles, 1)).toEqual([3, 4]);
  });
});

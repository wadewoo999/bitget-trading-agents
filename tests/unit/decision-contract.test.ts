import { describe, expect, it } from "vitest";

import { decisionSchema } from "@/features/decision/model";

const waitDecision = {
  action: "WAIT",
  confidence: 55,
  marketBiasScore: 55,
  stanceAssessment: "insufficient",
  categorySignals: {
    trend: 1,
    momentum: -1,
    participation: 0,
    crowding: 0,
  },
  volatilityRisk: "normal",
  summary: "Trend and momentum conflict.",
  reasons: ["Trend is positive.", "Momentum is negative."],
  riskWarnings: [],
  invalidationCondition: "Reassess after the next closed candle.",
  mode: "deterministic",
} as const;

describe("decision contract", () => {
  it("accepts a deterministic WAIT decision", () => {
    expect(decisionSchema.safeParse(waitDecision).success).toBe(true);
  });

  it("rejects the retired AI mode", () => {
    expect(decisionSchema.safeParse({ ...waitDecision, mode: "ai" }).success).toBe(false);
  });

  it("requires the action and confidence implied by the score", () => {
    expect(decisionSchema.safeParse({ ...waitDecision, action: "LONG" }).success).toBe(false);
    expect(decisionSchema.safeParse({ ...waitDecision, confidence: 80 }).success).toBe(false);
  });

  it.each([
    [40, "SHORT", 60],
    [41, "WAIT", 59],
    [59, "WAIT", 59],
    [60, "LONG", 60],
  ])("maps score %i to %s with confidence %i", (score, action, confidence) => {
    expect(
      decisionSchema.safeParse({
        ...waitDecision,
        marketBiasScore: score,
        action,
        confidence,
      }).success,
    ).toBe(true);
  });
});

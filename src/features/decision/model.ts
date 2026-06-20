import { z } from "zod";

export const decisionActionSchema = z.enum(["LONG", "SHORT", "WAIT"]);
export const decisionModeSchema = z.literal("deterministic");
export const categorySignalSchema = z.union([z.literal(-1), z.literal(0), z.literal(1)]);
export const stanceAssessmentSchema = z.enum([
  "neutral",
  "supported",
  "opposed",
  "insufficient",
]);
export const volatilityRiskSchema = z.enum(["normal", "high"]);

export const decisionCategorySignalsSchema = z.object({
  trend: categorySignalSchema,
  momentum: categorySignalSchema,
  participation: categorySignalSchema,
  crowding: categorySignalSchema,
});

export const decisionSchema = z
  .object({
    action: decisionActionSchema,
    confidence: z.number().int().min(50).max(100),
    marketBiasScore: z.number().int().min(0).max(100),
    stanceAssessment: stanceAssessmentSchema,
    categorySignals: decisionCategorySignalsSchema,
    volatilityRisk: volatilityRiskSchema,
    summary: z.string().min(1),
    reasons: z.array(z.string().min(1)).min(1),
    riskWarnings: z.array(z.string().min(1)),
    invalidationCondition: z.string().min(1),
    mode: decisionModeSchema,
  })
  .superRefine(({ action, confidence, marketBiasScore }, context) => {
    const expectedAction =
      marketBiasScore <= 40 ? "SHORT" : marketBiasScore >= 60 ? "LONG" : "WAIT";
    const expectedConfidence = Math.max(marketBiasScore, 100 - marketBiasScore);

    if (action !== expectedAction) {
      context.addIssue({
        code: "custom",
        path: ["action"],
        message: `Score ${marketBiasScore} requires ${expectedAction}`,
      });
    }

    if (confidence !== expectedConfidence) {
      context.addIssue({
        code: "custom",
        path: ["confidence"],
        message: `Score ${marketBiasScore} requires confidence ${expectedConfidence}`,
      });
    }
  });

export type DecisionAction = z.infer<typeof decisionActionSchema>;
export type DecisionMode = z.infer<typeof decisionModeSchema>;
export type CategorySignal = z.infer<typeof categorySignalSchema>;
export type StanceAssessment = z.infer<typeof stanceAssessmentSchema>;
export type VolatilityRisk = z.infer<typeof volatilityRiskSchema>;
export type DecisionCategorySignals = z.infer<typeof decisionCategorySignalsSchema>;
export type Decision = z.infer<typeof decisionSchema>;

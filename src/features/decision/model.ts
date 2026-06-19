import { z } from "zod";

export const decisionActionSchema = z.enum(["LONG", "SHORT", "WAIT"]);
export const decisionModeSchema = z.enum(["ai", "rule_fallback"]);

export const decisionSchema = z.object({
  action: decisionActionSchema,
  confidence: z.number().min(0).max(100),
  summary: z.string().min(1),
  reasons: z.array(z.string().min(1)),
  riskWarnings: z.array(z.string().min(1)),
  invalidationCondition: z.string().min(1),
  entry: z.number().positive().optional(),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
  positionSizePct: z.number().positive().max(100).optional(),
  mode: decisionModeSchema,
});

export type DecisionAction = z.infer<typeof decisionActionSchema>;
export type DecisionMode = z.infer<typeof decisionModeSchema>;
export type Decision = z.infer<typeof decisionSchema>;

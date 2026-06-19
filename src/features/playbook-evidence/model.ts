import { z } from "zod";

export const playbookEvidenceSchema = z.object({
  playbookUrl: z.string().url(),
  status: z.literal("completed"),
  verifiedAt: z.string().datetime(),
  metrics: z.object({
    totalReturnPct: z.number(),
    maxDrawdownPct: z.number().nonnegative(),
    sharpeRatio: z.number(),
    winRate: z.number().min(0).max(1),
    tradeCount: z.number().int().nonnegative(),
  }),
});

export type PlaybookEvidence = z.infer<typeof playbookEvidenceSchema>;

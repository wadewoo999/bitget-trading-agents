import { z } from "zod";

import { analyzeResponseSchema, userStanceSchema, type AnalyzeResponse, type UserStance } from "@/features/market-analysis/model";
import { paperAccountSchema, paperTradeRecordSchema, type PaperAccount } from "@/features/paper-trading/model";

export const EVIDENCE_REPORT_STORAGE_KEY = "bitget-trading-agents:evidence-report:v1";

export const evidenceVerificationStatusSchema = z.literal("live-paper-evidence");

export const evidenceTradeSummarySchema = z.object({
  recordCount: z.number().int().nonnegative(),
  openCount: z.number().int().nonnegative(),
  closeCount: z.number().int().nonnegative(),
  totalFees: z.number().nonnegative(),
  realizedPnl: z.number(),
  latestEventAt: z.string().datetime(),
  verificationStatus: evidenceVerificationStatusSchema,
});

export const evidenceReportSnapshotSchema = z.object({
  generatedAt: z.string().datetime(),
  request: z.object({
    stance: userStanceSchema,
  }),
  analysis: analyzeResponseSchema,
  ledger: z.array(paperTradeRecordSchema).min(1),
  accountBalance: z.number().nonnegative(),
  summary: evidenceTradeSummarySchema,
  submissionNotes: z.object({
    isLiveMode: z.boolean(),
    isSubmissionReady: z.boolean(),
    warningText: z.string().min(1),
  }),
});

export type EvidenceVerificationStatus = z.infer<typeof evidenceVerificationStatusSchema>;
export type EvidenceTradeSummary = z.infer<typeof evidenceTradeSummarySchema>;
export type EvidenceReportSnapshot = z.infer<typeof evidenceReportSnapshotSchema>;

export function getMatchingEvidenceLedger(analysis: AnalyzeResponse, account: PaperAccount) {
  return account.ledger.filter(
    (record) =>
      record.symbol === analysis.snapshot.symbol &&
      record.timeframe === analysis.snapshot.timeframe &&
      record.mode === analysis.snapshot.mode,
  );
}

export function hasMatchingEvidenceLedger(analysis: AnalyzeResponse | null, account: PaperAccount) {
  return analysis ? getMatchingEvidenceLedger(analysis, account).length > 0 : false;
}

export function buildEvidenceReportSnapshot({
  analysis,
  account,
  stance,
  generatedAt,
}: {
  analysis: AnalyzeResponse;
  account: PaperAccount;
  stance: UserStance;
  generatedAt: string;
}): EvidenceReportSnapshot {
  const ledger = getMatchingEvidenceLedger(analysis, account);
  if (!ledger.length) throw new Error("No matching ledger records for the current analysis.");

  const verificationStatus: EvidenceVerificationStatus = "live-paper-evidence";
  const warningText = "Live market data matched with paper trading records.";

  const summary = {
    recordCount: ledger.length,
    openCount: ledger.filter((record) => record.event === "OPEN").length,
    closeCount: ledger.filter((record) => record.event === "CLOSE").length,
    totalFees: ledger.reduce((sum, record) => sum + record.fee, 0),
    realizedPnl: ledger.reduce((sum, record) => sum + record.pnl, 0),
    latestEventAt: ledger.reduce((latest, record) => (record.timestamp > latest ? record.timestamp : latest), ledger[0].timestamp),
    verificationStatus,
  } satisfies EvidenceTradeSummary;

  return evidenceReportSnapshotSchema.parse({
    generatedAt,
    request: { stance },
    analysis,
    ledger,
    accountBalance: account.balance,
    summary,
    submissionNotes: {
      isLiveMode: true,
      isSubmissionReady: ledger.length > 0,
      warningText,
    },
  });
}

export function saveEvidenceReportSnapshot(storage: Pick<Storage, "setItem">, snapshot: EvidenceReportSnapshot) {
  storage.setItem(EVIDENCE_REPORT_STORAGE_KEY, JSON.stringify(snapshot));
}

export function loadEvidenceReportSnapshot(storage: Pick<Storage, "getItem">) {
  const raw = storage.getItem(EVIDENCE_REPORT_STORAGE_KEY);
  if (!raw) return null;
  try {
    return evidenceReportSnapshotSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function exportEvidenceReportJson(snapshot: EvidenceReportSnapshot) {
  return JSON.stringify(snapshot, null, 2);
}

export function assertPaperAccount(account: PaperAccount) {
  return paperAccountSchema.parse(account);
}

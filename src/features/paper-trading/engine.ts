import type { AnalyzeResponse } from "@/features/market-analysis/model";
import {
  INITIAL_PAPER_BALANCE,
  PAPER_STORAGE_KEY,
  paperAccountSchema,
  type PaperAccount,
  type PaperPosition,
  type PaperTradeRecord,
} from "@/features/paper-trading/model";

const FEE_RATE = 0.0006;

export interface TradePreview extends PaperPosition {
  estimatedOpenFee: number;
}

export function createInitialPaperAccount(): PaperAccount {
  return { version: 1, balance: INITIAL_PAPER_BALANCE, openPosition: null, ledger: [] };
}

function getSide(analysis: AnalyzeResponse): "LONG" | "SHORT" {
  if (analysis.decision.action === "WAIT") throw new Error("WAIT decisions cannot open paper trades.");
  return analysis.decision.action;
}

export function createTradePreview({
  account,
  analysis,
  entryPrice,
  fetchedAt,
}: {
  account: PaperAccount;
  analysis: AnalyzeResponse;
  entryPrice: number;
  fetchedAt: string;
}): TradePreview {
  if (account.openPosition) throw new Error("Only one open position is allowed.");
  const side = getSide(analysis);
  const atr14 = analysis.snapshot.indicators.atr14;
  const stopDistance = 1.5 * atr14;
  const takeProfitDistance = 3 * atr14;
  const stopLoss = side === "LONG" ? entryPrice - stopDistance : entryPrice + stopDistance;
  const takeProfit = side === "LONG" ? entryPrice + takeProfitDistance : entryPrice - takeProfitDistance;
  const riskBudget = account.balance * 0.01;
  const estimatedStopFees = entryPrice * FEE_RATE + stopLoss * FEE_RATE;
  const riskQuantity = riskBudget / (stopDistance + estimatedStopFees);
  const notionalQuantity = account.balance / entryPrice;
  const quantity = Math.min(riskQuantity, notionalQuantity);
  const estimatedOpenFee = entryPrice * quantity * FEE_RATE;
  return {
    id: `paper-${fetchedAt}`,
    symbol: analysis.snapshot.symbol,
    timeframe: analysis.snapshot.timeframe,
    mode: analysis.snapshot.mode,
    side,
    entryPrice,
    quantity,
    stopLoss,
    takeProfit,
    openedAt: fetchedAt,
    decisionSummary: analysis.decision.summary,
    estimatedOpenFee,
  };
}

export function confirmTradePreview({
  account,
  preview,
  openedAt,
}: {
  account: PaperAccount;
  preview: TradePreview;
  openedAt: string;
}): PaperAccount {
  if (account.openPosition) throw new Error("Only one open position is allowed.");
  const fee = preview.estimatedOpenFee;
  const balanceAfter = account.balance - fee;
  const openRecord: PaperTradeRecord = {
    id: `${preview.id}-open`,
    positionId: preview.id,
    timestamp: openedAt,
    symbol: preview.symbol,
    timeframe: preview.timeframe,
    mode: preview.mode,
    event: "OPEN",
    side: preview.side,
    price: preview.entryPrice,
    quantity: preview.quantity,
    stopLoss: preview.stopLoss,
    takeProfit: preview.takeProfit,
    fee,
    pnl: 0,
    balanceBefore: account.balance,
    balanceAfter,
    decisionSummary: preview.decisionSummary,
  };
  const position: PaperPosition = {
    id: preview.id,
    symbol: preview.symbol,
    timeframe: preview.timeframe,
    mode: preview.mode,
    side: preview.side,
    entryPrice: preview.entryPrice,
    quantity: preview.quantity,
    stopLoss: preview.stopLoss,
    takeProfit: preview.takeProfit,
    openedAt,
    decisionSummary: preview.decisionSummary,
  };
  return paperAccountSchema.parse({
    version: 1,
    balance: balanceAfter,
    openPosition: position,
    ledger: [...account.ledger, openRecord],
  });
}

export function closeOpenPosition({
  account,
  exitPrice,
  closedAt,
}: {
  account: PaperAccount;
  exitPrice: number;
  closedAt: string;
}): PaperAccount {
  const position = account.openPosition;
  if (!position) throw new Error("No open position to close.");
  const grossPnl =
    position.side === "LONG"
      ? (exitPrice - position.entryPrice) * position.quantity
      : (position.entryPrice - exitPrice) * position.quantity;
  const fee = exitPrice * position.quantity * FEE_RATE;
  const balanceAfter = account.balance + grossPnl - fee;
  const closeRecord: PaperTradeRecord = {
    id: `${position.id}-close`,
    positionId: position.id,
    timestamp: closedAt,
    symbol: position.symbol,
    timeframe: position.timeframe,
    mode: position.mode,
    event: "CLOSE",
    side: position.side,
    price: exitPrice,
    quantity: position.quantity,
    stopLoss: position.stopLoss,
    takeProfit: position.takeProfit,
    fee,
    pnl: grossPnl,
    balanceBefore: account.balance,
    balanceAfter,
    decisionSummary: position.decisionSummary,
  };
  return paperAccountSchema.parse({
    version: 1,
    balance: balanceAfter,
    openPosition: null,
    ledger: [...account.ledger, closeRecord],
  });
}

export function savePaperAccount(storage: Pick<Storage, "setItem">, account: PaperAccount) {
  storage.setItem(PAPER_STORAGE_KEY, JSON.stringify(account));
}

export function loadPaperAccount(storage: Pick<Storage, "getItem" | "removeItem">) {
  const raw = storage.getItem(PAPER_STORAGE_KEY);
  if (!raw) return { account: createInitialPaperAccount(), didReset: false };
  try {
    return { account: paperAccountSchema.parse(JSON.parse(raw)), didReset: false };
  } catch {
    storage.removeItem(PAPER_STORAGE_KEY);
    return { account: createInitialPaperAccount(), didReset: true };
  }
}

export function exportLedgerJson(account: PaperAccount) {
  return JSON.stringify(account.ledger, null, 2);
}

export function exportLedgerCsv(account: PaperAccount) {
  const header = "timestamp,symbol,timeframe,mode,event,side,price,quantity,stopLoss,takeProfit,fee,pnl,balanceBefore,balanceAfter,decisionSummary";
  const rows = account.ledger.map((record) =>
    [
      record.timestamp,
      record.symbol,
      record.timeframe,
      record.mode,
      record.event,
      record.side,
      record.price,
      record.quantity,
      record.stopLoss,
      record.takeProfit,
      record.fee,
      record.pnl,
      record.balanceBefore,
      record.balanceAfter,
      JSON.stringify(record.decisionSummary),
    ].join(","),
  );
  return [header, ...rows].join("\n");
}

"use client";

import type { AnalyzeResponse } from "@/features/market-analysis/model";
import type { PaperAccount } from "@/features/paper-trading/model";
import type { TradePreview } from "@/features/paper-trading/engine";

function fmt(value: number) {
  return value.toFixed(2);
}

export function PaperTradingPanel({
  analysis,
  account,
  preview,
  resetNotice,
  loading,
  onPreview,
  onConfirm,
  onCancel,
  onClose,
  onExportJson,
  onExportCsv,
  onGenerateEvidenceReport,
  canGenerateEvidenceReport,
}: {
  analysis: AnalyzeResponse | null;
  account: PaperAccount;
  preview: TradePreview | null;
  resetNotice: string | null;
  loading: boolean;
  onPreview: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  onClose: () => void;
  onExportJson: () => void;
  onExportCsv: () => void;
  onGenerateEvidenceReport: () => void;
  canGenerateEvidenceReport: boolean;
}) {
  const canPreview = !!analysis && (analysis.decision.action === "LONG" || analysis.decision.action === "SHORT") && !account.openPosition && !preview;
  const previewRiskBudget = preview ? account.balance * 0.01 : null;
  return <section className="panel paper-panel"><div className="paper-header"><div><p className="panel-label">PAPER TRADING</p><h2>模擬帳戶</h2></div><div className="paper-balance">Balance {fmt(account.balance)} USDT</div></div>{resetNotice && <div className="paper-notice">{resetNotice}</div>}{account.openPosition && !resetNotice && <div className="paper-notice">已恢復本地模擬帳戶狀態。</div>}{preview ? <div className="paper-card compact-card"><p className="panel-label">TRADE PREVIEW</p><p className="paper-status-line">{preview.side} · {preview.symbol} · {preview.timeframe} · {preview.mode.toUpperCase()}</p><div className="paper-detail-grid"><span>Entry {fmt(preview.entryPrice)}</span><span>Quantity {preview.quantity.toFixed(6)}</span><span>Stop {fmt(preview.stopLoss)}</span><span>Take Profit {fmt(preview.takeProfit)}</span><span>Open Fee {fmt(preview.estimatedOpenFee)}</span><span>Risk Budget {fmt(previewRiskBudget ?? 0)}</span></div><div className="paper-actions compact-actions"><button className="analyze-button" disabled={loading} onClick={onConfirm}>確認模擬開倉</button><button className="secondary-button" disabled={loading} onClick={onCancel}>取消預覽</button></div></div> : account.openPosition ? <div className="paper-card compact-card"><p className="panel-label">OPEN POSITION</p><h3>目前持倉</h3><div className="paper-detail-grid"><span>{account.openPosition.side} · {account.openPosition.symbol} · {account.openPosition.mode.toUpperCase()}</span><span>Entry {fmt(account.openPosition.entryPrice)}</span><span>Quantity {account.openPosition.quantity.toFixed(6)}</span><span>Stop {fmt(account.openPosition.stopLoss)}</span><span>Take Profit {fmt(account.openPosition.takeProfit)}</span><span>Opened {account.openPosition.openedAt}</span></div><div className="paper-actions compact-actions"><button className="analyze-button" disabled={loading} onClick={onClose}>手動平倉</button></div></div> : <div className="paper-card compact-card"><p className="panel-label">NEXT ACTION</p>{analysis?.decision.action === "WAIT" ? <p className="paper-status-line">WAIT 結果不可建立模擬交易。</p> : canPreview ? <div className="paper-actions compact-actions"><button className="analyze-button" disabled={loading} onClick={onPreview}>預覽模擬交易</button></div> : <p className="paper-status-line">先完成一次 LONG / SHORT 分析後再建立模擬交易。</p>}</div>}<div className="paper-card compact-card"><div className="paper-summary"><p className="panel-label">Ledger</p><span>{account.ledger.length} records</span></div>{account.ledger.length ? <><ul className="ledger-list">{account.ledger.slice().reverse().map((record) => <li key={record.id}>{record.event} · {record.side} · {record.mode.toUpperCase()} · {fmt(record.price)}</li>)}</ul><div className="paper-actions compact-actions"><button className="secondary-button" onClick={onExportJson}>匯出 JSON</button><button className="secondary-button" onClick={onExportCsv}>匯出 CSV</button><button className="secondary-button" disabled={!canGenerateEvidenceReport || loading} onClick={onGenerateEvidenceReport}>Generate Evidence Report</button></div></> : <div className="paper-actions compact-actions"><button className="secondary-button" disabled>Generate Evidence Report</button></div>}</div></section>;
}

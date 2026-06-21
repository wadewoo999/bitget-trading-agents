"use client";

import { useState } from "react";
import Link from "next/link";

import { exportEvidenceReportJson, loadEvidenceReportSnapshot, type EvidenceReportSnapshot } from "@/features/evidence-report/model";

function fmt(value: number) {
  return value.toFixed(2);
}

function fmtDate(value: string) {
  return new Date(value).toLocaleString("zh-TW");
}

function stanceLabel(value: EvidenceReportSnapshot["request"]["stance"]) {
  return value === "long" ? "偏多" : value === "short" ? "偏空" : "未預設";
}

function downloadFile(name: string, content: string, mime: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mime });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

function restoreSnapshot() {
  if (typeof window === "undefined") return null;
  return loadEvidenceReportSnapshot(window.sessionStorage);
}

export function EvidenceReportPage() {
  const [snapshot] = useState<EvidenceReportSnapshot | null>(restoreSnapshot);

  if (!snapshot) {
    return (
      <main className="workspace">
        <section className="panel empty-state">
          <p className="panel-label">EVIDENCE REPORT</p>
          <h1>No evidence snapshot found</h1>
          <p>Generate an evidence report from the dashboard before opening this page.</p>
          <Link className="secondary-link" href="/">Back to Dashboard</Link>
        </section>
      </main>
    );
  }

  const warnings = [...snapshot.analysis.completenessWarnings, ...snapshot.analysis.decision.riskWarnings];
  const badgeText = snapshot.summary.verificationStatus === "live-paper-evidence" ? "LIVE PAPER EVIDENCE" : "SAMPLE DEMO ONLY";

  return (
    <main className="workspace evidence-report">
      <header className="topbar">
        <Link className="brand" href="/">BITGET / BTC DECISION WORKSPACE</Link>
        <span className={`data-badge ${snapshot.summary.verificationStatus === "live-paper-evidence" ? "live" : "sample"}`}>{badgeText}</span>
      </header>
      <section className="intro">
        <p>EVIDENCE REPORT</p>
        <h1>Evidence Report</h1>
        <p className="summary">Hackathon Submission Artifact</p>
        <span>Generated at {fmtDate(snapshot.generatedAt)}</span>
      </section>
      <section className="panel">
        <div className="indicator-grid">
          <article className="metric"><p className="panel-label">MODE</p><strong>{snapshot.analysis.snapshot.mode.toUpperCase()}</strong><small>{snapshot.analysis.snapshot.timeframe}</small></article>
          <article className="metric"><p className="panel-label">ACTION</p><strong>{snapshot.analysis.decision.action}</strong><small>{snapshot.analysis.decision.marketBiasScore} / 100</small></article>
          <article className="metric"><p className="panel-label">CONFIDENCE</p><strong>{snapshot.analysis.decision.confidence}</strong><small>{snapshot.analysis.decision.stanceAssessment}</small></article>
          <article className="metric"><p className="panel-label">REALIZED PNL</p><strong>{fmt(snapshot.summary.realizedPnl)}</strong><small>USDT</small></article>
        </div>
      </section>
      <section className="panel">
        <div className="report-actions">
          <div>
            <p className="panel-label">ANALYSIS CONTEXT</p>
            <h2>BTCUSDT · {snapshot.analysis.snapshot.timeframe}</h2>
          </div>
          <button className="secondary-button report-download" onClick={() => downloadFile("evidence-report.json", exportEvidenceReportJson(snapshot), "application/json")}>
            Download Evidence JSON
          </button>
        </div>
        <div className="detail-grid">
          <article className="panel report-subpanel">
            <ul>
              <li>Symbol {snapshot.analysis.snapshot.symbol}</li>
              <li>Timeframe {snapshot.analysis.snapshot.timeframe}</li>
              <li>Stance {stanceLabel(snapshot.request.stance)}</li>
              <li>Mode {snapshot.analysis.snapshot.mode.toUpperCase()}</li>
              <li>Source Request {fmtDate(snapshot.analysis.snapshot.sourceRequestTime)}</li>
              <li>Last Closed Candle {fmtDate(snapshot.analysis.snapshot.lastClosedCandleAt)}</li>
              {snapshot.analysis.snapshot.fixtureVersion ? <li>Fixture {snapshot.analysis.snapshot.fixtureVersion}</li> : null}
            </ul>
          </article>
          <article className="panel report-subpanel">
            <p className="panel-label">SUBMISSION NOTE</p>
            <p className="summary">{snapshot.submissionNotes.warningText}</p>
            <p className="summary">
              {snapshot.submissionNotes.isSubmissionReady
                ? "This live artifact can be linked as paper trading evidence after public deployment."
                : "This artifact is for demo and validation only, not live submission proof."}
            </p>
          </article>
        </div>
      </section>
      <section className="panel">
        <p className="panel-label">DECISION SUMMARY</p>
        <div className="decision-card">
          <div>
            <div className={`decision-action ${snapshot.analysis.decision.action.toLowerCase()}`}>
              {snapshot.analysis.decision.action}
              <span>{snapshot.analysis.decision.marketBiasScore} / 100</span>
            </div>
            <p className="summary">Confidence {snapshot.analysis.decision.confidence}</p>
            <p className="summary">Stance {snapshot.analysis.decision.stanceAssessment}</p>
          </div>
          <div>
            <p className="summary">{snapshot.analysis.decision.summary}</p>
            <p className="panel-label spaced">Invalidation</p>
            <p className="invalidation">{snapshot.analysis.decision.invalidationCondition}</p>
          </div>
        </div>
        <div className="detail-grid">
          <article className="panel report-subpanel">
            <p className="panel-label">REASONS</p>
            <ul>{snapshot.analysis.decision.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
          </article>
          <article className="panel report-subpanel warning">
            <p className="panel-label">WARNINGS</p>
            <ul>{warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul>
          </article>
        </div>
      </section>
      <section className="panel">
        <p className="panel-label">PAPER TRADING EVIDENCE</p>
        <div className="indicator-grid">
          <article className="metric"><p className="panel-label">BALANCE</p><strong>{fmt(snapshot.accountBalance)}</strong><small>USDT</small></article>
          <article className="metric"><p className="panel-label">REALIZED PNL</p><strong>{fmt(snapshot.summary.realizedPnl)}</strong><small>USDT</small></article>
          <article className="metric"><p className="panel-label">TOTAL FEES</p><strong>{fmt(snapshot.summary.totalFees)}</strong><small>USDT</small></article>
          <article className="metric"><p className="panel-label">LEDGER RECORDS</p><strong>{snapshot.summary.recordCount}</strong><small>Latest {fmtDate(snapshot.summary.latestEventAt)}</small></article>
        </div>
      </section>
      <section className="panel">
        <div className="paper-summary">
          <p className="panel-label">LEDGER TABLE</p>
          <span>{snapshot.summary.recordCount} records</span>
        </div>
        <div className="ledger-table-wrap">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Event</th>
                <th>Side</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Fee</th>
                <th>PnL</th>
                <th>Balance Before</th>
                <th>Balance After</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.ledger.map((record) => (
                <tr key={record.id}>
                  <td>{fmtDate(record.timestamp)}</td>
                  <td>{record.event}</td>
                  <td>{record.side}</td>
                  <td>{fmt(record.price)}</td>
                  <td>{record.quantity.toFixed(6)}</td>
                  <td>{fmt(record.fee)}</td>
                  <td>{fmt(record.pnl)}</td>
                  <td>{fmt(record.balanceBefore)}</td>
                  <td>{fmt(record.balanceAfter)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

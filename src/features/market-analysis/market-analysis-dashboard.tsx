"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnalysisControls } from "@/components/dashboard/analysis-controls";
import { AnalysisDetails } from "@/components/dashboard/analysis-details";
import { DecisionCard } from "@/components/dashboard/decision-card";
import {
  buildEvidenceReportSnapshot,
  hasMatchingEvidenceLedger,
  saveEvidenceReportSnapshot,
} from "@/features/evidence-report/model";
import { IndicatorGrid } from "@/components/dashboard/indicator-grid";
import { MarketChart } from "@/components/dashboard/market-chart";
import { PaperTradingPanel } from "@/components/dashboard/paper-trading-panel";
import {
  analyzeResponseSchema,
  marketFeedResponseSchema,
  priceResponseSchema,
  type AnalyzeResponse,
  type MarketDataMode,
  type MarketFeedResponse,
  type Timeframe,
  type UserStance,
} from "@/features/market-analysis/model";
import {
  closeOpenPosition,
  confirmTradePreview,
  createInitialPaperAccount,
  createTradePreview,
  exportLedgerCsv,
  exportLedgerJson,
  loadPaperAccount,
  savePaperAccount,
  type TradePreview,
} from "@/features/paper-trading/engine";
import type { PaperAccount } from "@/features/paper-trading/model";

function restoreInitialAccount(): PaperAccount {
  if (typeof window === "undefined") return createInitialPaperAccount();
  return loadPaperAccount(window.localStorage).account;
}

function restoreInitialResetNotice(): string | null {
  if (typeof window === "undefined") return null;
  return loadPaperAccount(window.localStorage).didReset
    ? "偵測到損壞或過期的本地帳戶資料，已重設為初始帳戶。"
    : null;
}

export function MarketAnalysisDashboard() {
  const router = useRouter();
  const [timeframe, setTimeframe] = useState<Timeframe>("1h");
  const [stance, setStance] = useState<UserStance>("unsure");
  const [mode, setMode] = useState<MarketDataMode>("sample");
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalyzeResponse | null>(null);
  const [marketFeed, setMarketFeed] = useState<MarketFeedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [marketFeedError, setMarketFeedError] = useState<string | null>(null);
  const [marketFeedStatus, setMarketFeedStatus] = useState<"idle" | "refreshing" | "updated">("idle");
  const [marketFeedPriceDirection, setMarketFeedPriceDirection] = useState<"first" | "up" | "down" | "flat">("first");
  const [account, setAccount] = useState<PaperAccount>(restoreInitialAccount);
  const [preview, setPreview] = useState<TradePreview | null>(null);
  const [resetNotice] = useState<string | null>(restoreInitialResetNotice);
  const marketFeedRequestSequenceRef = useRef(0);
  const previousMarketFeedPriceRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    savePaperAccount(window.localStorage, account);
  }, [account]);

  useEffect(() => {
    let disposed = false;
    let timeoutId: number | null = null;
    const controller = new AbortController();

    async function refreshMarketFeed() {
      const requestSequence = ++marketFeedRequestSequenceRef.current;
      setMarketFeedStatus("refreshing");

      try {
        const response = await fetch(`/api/market-feed?mode=${mode}&timeframe=${timeframe}`, {
          signal: controller.signal,
        });
        const json: unknown = await response.json();
        if (!response.ok) throw new Error("最新市場資料暫時無法更新。");
        const parsed = marketFeedResponseSchema.safeParse(json);
        if (!parsed.success) throw new Error("市場資料格式無效。");
        if (disposed || requestSequence !== marketFeedRequestSequenceRef.current) return;
        const previousPrice = previousMarketFeedPriceRef.current;
        setMarketFeedPriceDirection(
          previousPrice === null
            ? "first"
            : parsed.data.price > previousPrice
              ? "up"
              : parsed.data.price < previousPrice
                ? "down"
                : "flat",
        );
        previousMarketFeedPriceRef.current = parsed.data.price;
        setMarketFeed(parsed.data);
        setMarketFeedError(null);
        setMarketFeedStatus("updated");
      } catch (reason) {
        if (controller.signal.aborted || disposed || requestSequence !== marketFeedRequestSequenceRef.current) return;
        setMarketFeedError(reason instanceof Error ? reason.message : "最新市場資料暫時無法更新。");
      } finally {
        if (disposed || controller.signal.aborted || requestSequence !== marketFeedRequestSequenceRef.current) return;
        timeoutId = window.setTimeout(() => {
          void refreshMarketFeed();
        }, 30000);
      }
    }

    void refreshMarketFeed();

    return () => {
      disposed = true;
      marketFeedRequestSequenceRef.current += 1;
      controller.abort();
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [mode, timeframe]);

  async function analyze() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ symbol: "BTCUSDT", timeframe, stance, mode }),
      });
      const json: unknown = await response.json();
      if (!response.ok) throw new Error("分析暫時無法完成。");
      const parsed = analyzeResponseSchema.safeParse(json);
      if (!parsed.success) throw new Error("分析資料格式無效。");
      setAnalysisData(parsed.data);
    } catch (reason) {
      setAnalysisData(null);
      setError(reason instanceof Error ? reason.message : "分析暫時無法完成。");
    } finally {
      setLoading(false);
    }
  }

  async function fetchTradePrice(targetMode: MarketDataMode) {
    const response = await fetch(`/api/price?mode=${targetMode}`);
    const json: unknown = await response.json();
    if (!response.ok) throw new Error("價格暫時無法取得。");
    const parsed = priceResponseSchema.safeParse(json);
    if (!parsed.success) throw new Error("價格資料格式無效。");
    return { price: parsed.data.price, fetchedAt: parsed.data.fetchedAt };
  }

  async function previewTrade() {
    if (!analysisData) return;
    setLoading(true);
    setError(null);

    try {
      const latest = await fetchTradePrice(analysisData.snapshot.mode);
      setPreview(
        createTradePreview({
          account,
          analysis: analysisData,
          entryPrice: latest.price,
          fetchedAt: latest.fetchedAt,
        }),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "價格暫時無法取得。");
    } finally {
      setLoading(false);
    }
  }

  function confirmPreview() {
    if (!preview) return;
    setAccount(confirmTradePreview({ account, preview, openedAt: preview.openedAt }));
    setPreview(null);
  }

  async function closeTrade() {
    if (!account.openPosition) return;
    setLoading(true);
    setError(null);

    try {
      const latest = await fetchTradePrice(account.openPosition.mode);
      setAccount(closeOpenPosition({ account, exitPrice: latest.price, closedAt: latest.fetchedAt }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "價格暫時無法取得。");
    } finally {
      setLoading(false);
    }
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

  function generateEvidenceReport() {
    if (typeof window === "undefined" || !analysisData) return;

    try {
      const snapshot = buildEvidenceReportSnapshot({
        analysis: analysisData,
        account,
        stance,
        generatedAt: new Date().toISOString(),
      });
      saveEvidenceReportSnapshot(window.sessionStorage, snapshot);
      router.push("/evidence");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Evidence report 暫時無法建立。");
    }
  }

  const currentMarketFeed = marketFeed?.mode === mode && marketFeed?.timeframe === timeframe ? marketFeed : null;
  const activeMode = analysisData?.snapshot.mode ?? currentMarketFeed?.mode ?? mode;
  const canGenerateEvidenceReport = hasMatchingEvidenceLedger(analysisData, account);
  const sampleFeedHint =
    mode === "sample"
      ? "此模式每 30 秒重新抓取一次，但內容為固定快照，價格與 K 線不會隨市場變動。"
      : null;
  const marketFeedPriceDirectionLabel =
    marketFeedPriceDirection === "first"
      ? "首次載入"
      : marketFeedPriceDirection === "up"
        ? "較前次上升"
        : marketFeedPriceDirection === "down"
          ? "較前次下降"
          : "與前次持平";

  return (
    <main className="workspace">
      <header className="topbar">
        <a className="brand" href="https://github.com/wadewoo999/bitget-trading-agents">
          BITGET / BTC DECISION WORKSPACE
        </a>
        <span className={activeMode === "live" ? "data-badge live" : "data-badge sample"}>
          {activeMode === "live" ? "LIVE DATA" : "SAMPLE DATA"}
        </span>
      </header>

      <section className="intro">
        <p>BITGET AI BASE CAMP HACKATHON S1</p>
        <h1>釐清當前 BTC 交易方向</h1>
        <span>
          {activeMode === "live"
            ? "選擇時間級別、資料模式與初始觀點，系統會用即時 Bitget 市場資料整理下一步。"
            : "選擇時間級別與你的初始觀點，系統會用可追溯樣本資料整理下一步。"}
        </span>
      </section>

      <div className="workspace-grid">
        <AnalysisControls
          timeframe={timeframe}
          stance={stance}
          mode={mode}
          loading={loading}
          onTimeframe={(value) => {
            setTimeframe(value);
            setMarketFeedError(null);
          }}
          onStance={setStance}
          onMode={(value) => {
            setMode(value);
            setPreview(null);
            setMarketFeedError(null);
          }}
          onAnalyze={analyze}
        />

        <div className="results">
          {(currentMarketFeed || marketFeedError || marketFeedStatus === "refreshing") && (
            <section className="panel market-feed-panel" aria-label="市場即時觀測">
              <div className="panel-header">
                <div>
                  <p className="panel-label">市場即時觀測</p>
                  <h2>Live Market Feed</h2>
                </div>
                <span className={marketFeedStatus === "refreshing" ? "market-feed-status refreshing" : "market-feed-status"}>
                  {marketFeedStatus === "refreshing" ? "更新中…" : marketFeedStatus === "updated" ? "剛剛更新" : "等待首次更新"}
                </span>
              </div>
              <p className="panel-summary">此區塊每 30 秒刷新，但不會改寫分析快照。</p>
              {currentMarketFeed && (
                <>
                  <MarketChart
                    timeframe={currentMarketFeed.timeframe}
                    price={currentMarketFeed.price}
                    fetchedAt={currentMarketFeed.fetchedAt}
                    candles={currentMarketFeed.candles}
                  />
                  <div className="market-feed-meta">
                    <span>上次更新：{new Date(currentMarketFeed.fetchedAt).toLocaleTimeString("zh-TW", { hour12: false })}</span>
                    <span>模式：{currentMarketFeed.mode.toUpperCase()}</span>
                    <span>級別：{currentMarketFeed.timeframe}</span>
                    <span className={`price-delta ${marketFeedPriceDirection}`}>{marketFeedPriceDirectionLabel}</span>
                  </div>
                  {currentMarketFeed.completenessWarnings.length > 0 && (
                    <ul aria-label="市場資料警告">
                      {currentMarketFeed.completenessWarnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  )}
                  {sampleFeedHint && <p className="market-feed-note">{sampleFeedHint}</p>}
                </>
              )}

              {marketFeedError && (
                <div className="market-feed-error" role="alert">
                  {marketFeedError}
                </div>
              )}
            </section>
          )}

          {error && (
            <div className="error-panel" role="alert">
              {error}
            </div>
          )}

          {analysisData ? (
            <>
              <section className="panel snapshot-panel" aria-label="分析快照">
                <div className="panel-header">
                  <div>
                    <p className="panel-label">分析快照</p>
                    <h2>Decision Snapshot</h2>
                  </div>
                  <span className="panel-meta">產生時間：{new Date(analysisData.snapshot.fetchedAt).toLocaleTimeString("zh-TW", { hour12: false })}</span>
                </div>
                <p className="panel-summary">此分析結果會保持固定；若要刷新判斷，請重新執行分析。</p>
                <DecisionCard data={analysisData} />
              </section>
              <PaperTradingPanel
                analysis={analysisData}
                account={account}
                preview={preview}
                resetNotice={resetNotice}
                loading={loading}
                onPreview={previewTrade}
                onConfirm={confirmPreview}
                onCancel={() => setPreview(null)}
                onClose={closeTrade}
                onExportJson={() => downloadFile("paper-ledger.json", exportLedgerJson(account), "application/json")}
                onExportCsv={() => downloadFile("paper-ledger.csv", exportLedgerCsv(account), "text/csv")}
                onGenerateEvidenceReport={generateEvidenceReport}
                canGenerateEvidenceReport={canGenerateEvidenceReport}
              />
              <IndicatorGrid data={analysisData} />
              <AnalysisDetails data={analysisData} />
            </>
          ) : (
            !error && (
              <>
                <PaperTradingPanel
                  analysis={null}
                  account={account}
                  preview={preview}
                  resetNotice={resetNotice}
                  loading={loading}
                  onPreview={previewTrade}
                  onConfirm={confirmPreview}
                  onCancel={() => setPreview(null)}
                  onClose={closeTrade}
                  onExportJson={() => downloadFile("paper-ledger.json", exportLedgerJson(account), "application/json")}
                  onExportCsv={() => downloadFile("paper-ledger.csv", exportLedgerCsv(account), "text/csv")}
                  onGenerateEvidenceReport={generateEvidenceReport}
                  canGenerateEvidenceReport={canGenerateEvidenceReport}
                />
                <section className="panel empty-state">
                  <p className="panel-label">READY</p>
                  <h2>選擇條件後開始分析</h2>
                  <p>
                    {mode === "live"
                      ? "結果將顯示 0–100 score、方向、EMA 圖表與 live completeness warnings。"
                      : "結果將顯示 0–100 score、方向、EMA 圖表、理由與風險。"}
                  </p>
                </section>
              </>
            )
          )}
        </div>
      </div>

      <footer className="workspace-footer">
        <span>{activeMode === "live" ? "LIVE / SAMPLE MARKET ANALYSIS · MINIMUM DEMO" : "SAMPLE MARKET ANALYSIS · PHASE 2+"}</span>
        <span>NO REAL TRADING</span>
      </footer>
    </main>
  );
}

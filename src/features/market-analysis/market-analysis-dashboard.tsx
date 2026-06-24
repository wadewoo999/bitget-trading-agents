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
import { StrategySupportPanel } from "@/components/dashboard/strategy-support-panel";
import { StrategyLabPanel } from "@/components/dashboard/strategy-lab-panel";
import {
  analyzeResponseSchema,
  marketFeedResponseSchema,
  priceResponseSchema,
  type AnalyzeResponse,
  type MarketDataMode,
  type MarketFeedResponse,
  type PriceResponse,
  type Symbol,
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
import type { StrategyProfile, StrategyTimeframe } from "@/features/strategy-lab/model";

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

function formatMarketContextValue(label: string, value: number | null, formatter: (input: number) => string) {
  return value === null ? `${label} 不可用` : `${label} ${formatter(value)}`;
}

export function MarketAnalysisDashboard() {
  const router = useRouter();
  const [symbol, setSymbol] = useState<Symbol>("BTCUSDT");
  const [timeframe, setTimeframe] = useState<Timeframe>("1h");
  const [stance, setStance] = useState<UserStance>("unsure");
  const [mode] = useState<MarketDataMode>("live");
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalyzeResponse | null>(null);
  const [marketFeed, setMarketFeed] = useState<MarketFeedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [marketFeedError, setMarketFeedError] = useState<string | null>(null);
  const [priceData, setPriceData] = useState<PriceResponse | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [marketFeedStatus, setMarketFeedStatus] = useState<"idle" | "refreshing" | "updated">("idle");
  const [marketFeedPriceDirection, setMarketFeedPriceDirection] = useState<"first" | "up" | "down" | "flat">("first");
  const [account, setAccount] = useState<PaperAccount>(restoreInitialAccount);
  const [preview, setPreview] = useState<TradePreview | null>(null);
  const [resetNotice] = useState<string | null>(restoreInitialResetNotice);
  const [strategyLabProfile, setStrategyLabProfile] = useState<StrategyProfile>("balanced");
  const [strategyLabTimeframe, setStrategyLabTimeframe] = useState<StrategyTimeframe>("4h");
  const [strategyLabNotice, setStrategyLabNotice] = useState<string | null>(null);
  const marketFeedRequestSequenceRef = useRef(0);
  const priceRequestSequenceRef = useRef(0);
  const previousMarketFeedPriceRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    savePaperAccount(window.localStorage, account);
  }, [account]);

  useEffect(() => {
    let disposed = false;
    const controller = new AbortController();

    async function loadMarketFeed() {
      const requestSequence = ++marketFeedRequestSequenceRef.current;
      setMarketFeed(null);
      setMarketFeedError(null);

      try {
        const response = await fetch(`/api/market-feed?mode=${mode}&timeframe=${timeframe}&symbol=${symbol}`, {
          signal: controller.signal,
        });
        const json: unknown = await response.json();
        if (!response.ok) throw new Error("最新市場資料暫時無法更新。");
        const parsed = marketFeedResponseSchema.safeParse(json);
        if (!parsed.success) throw new Error("市場資料格式無效。");
        if (disposed || requestSequence !== marketFeedRequestSequenceRef.current) return;
        setMarketFeed(parsed.data);
        setMarketFeedError(null);
      } catch (reason) {
        if (controller.signal.aborted || disposed || requestSequence !== marketFeedRequestSequenceRef.current) return;
        setMarketFeedError(reason instanceof Error ? reason.message : "最新市場資料暫時無法更新。");
      }
    }

    void loadMarketFeed();

    return () => {
      disposed = true;
      marketFeedRequestSequenceRef.current += 1;
      controller.abort();
    };
  }, [mode, timeframe, symbol]);

  useEffect(() => {
    let disposed = false;
    let timeoutId: number | null = null;
    const controller = new AbortController();

    async function refreshLatestPrice() {
      const requestSequence = ++priceRequestSequenceRef.current;
      if (requestSequence === 1) {
        previousMarketFeedPriceRef.current = null;
        setPriceData(null);
        setPriceError(null);
        setMarketFeedStatus("idle");
        setMarketFeedPriceDirection("first");
      }
      setMarketFeedStatus("refreshing");

      try {
        const response = await fetch(`/api/price?mode=${mode}&symbol=${symbol}`, {
          signal: controller.signal,
        });
        const json: unknown = await response.json();
        if (!response.ok) throw new Error("最新市場資料暫時無法更新。");
        const parsed = priceResponseSchema.safeParse(json);
        if (!parsed.success) throw new Error("價格資料格式無效。");
        if (disposed || requestSequence !== priceRequestSequenceRef.current) return;
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
        setPriceData(parsed.data);
        setPriceError(null);
        setMarketFeedStatus("updated");
      } catch (reason) {
        if (controller.signal.aborted || disposed || requestSequence !== priceRequestSequenceRef.current) return;
        setPriceError(reason instanceof Error ? reason.message : "最新市場資料暫時無法更新。");
      } finally {
        if (disposed || controller.signal.aborted || requestSequence !== priceRequestSequenceRef.current) return;
        timeoutId = window.setTimeout(() => {
          void refreshLatestPrice();
        }, 30000);
      }
    }

    void refreshLatestPrice();

    return () => {
      disposed = true;
      priceRequestSequenceRef.current += 1;
      controller.abort();
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [mode, timeframe, symbol]);

  async function analyze() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ symbol, timeframe, stance, mode }),
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

  async function fetchTradePrice(targetMode: MarketDataMode, targetSymbol?: Symbol) {
    const response = await fetch(`/api/price?mode=${targetMode}&symbol=${targetSymbol ?? symbol}`);
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
      const latest = await fetchTradePrice(analysisData.snapshot.mode, analysisData.snapshot.symbol);
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
      const latest = await fetchTradePrice(account.openPosition.mode, account.openPosition.symbol);
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

  function applyStrategyLabSelection(profile: StrategyProfile, timeframe: StrategyTimeframe) {
    setStrategyLabProfile(profile);
    setStrategyLabTimeframe(timeframe);
    setStrategyLabNotice(`目前已帶入：${profile === "aggressive" ? "激進" : profile === "balanced" ? "平衡" : "穩健"} · ${timeframe}`);
  }

  function updateStrategyLabSelection(profile: StrategyProfile, timeframe: StrategyTimeframe) {
    setStrategyLabProfile(profile);
    setStrategyLabTimeframe(timeframe);
    setStrategyLabNotice(null);
  }

  const currentMarketFeed = marketFeed?.mode === mode && marketFeed?.timeframe === timeframe && marketFeed?.symbol === symbol ? marketFeed : null;
  const activeMode = analysisData?.snapshot.mode ?? currentMarketFeed?.mode ?? mode;
  const canGenerateEvidenceReport = hasMatchingEvidenceLedger(analysisData, account);
  const currentPriceData = priceData?.mode === mode && priceData?.symbol === symbol ? priceData : null;
  const displayPrice = currentPriceData?.price ?? currentMarketFeed?.price ?? null;
  const displayFetchedAt = currentPriceData?.fetchedAt ?? currentMarketFeed?.fetchedAt ?? null;
  const marketObservationError = marketFeedError ?? priceError;
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
      <div className="signal-desk-layout">
        <aside aria-label="control-rail" className="control-rail">
          <section className="rail-shell">
            <div className="rail-header">
              <h2>Control Rail</h2>
            </div>

            <AnalysisControls
              symbol={symbol}
              timeframe={timeframe}
              stance={stance}
              loading={loading}
              onSymbol={(value) => {
                setSymbol(value);
                setAnalysisData(null);
                setPreview(null);
                setMarketFeedError(null);
                setPriceError(null);
              }}
              onTimeframe={(value) => {
                setTimeframe(value);
                setMarketFeedError(null);
              }}
              onStance={setStance}
              onAnalyze={analyze}
            />

            {analysisData ? (
              <section className="panel left-judgement-panel">
                <div className="panel-header">
                  <div>
                    <p className="panel-label">市場判讀拆解</p>
                    <h3>Signal Breakdown</h3>
                  </div>
                </div>
                <IndicatorGrid data={analysisData} />
              </section>
            ) : null}
          </section>
        </aside>

        <section aria-label="central-command" className="central-command">
          <div className="rail-header central-command-header">
            <h2>Central Command</h2>
          </div>

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
              {currentMarketFeed && displayPrice !== null && displayFetchedAt && (
                <>
                  <MarketChart
                    timeframe={currentMarketFeed.timeframe}
                    price={displayPrice}
                    fetchedAt={displayFetchedAt}
                    candles={currentMarketFeed.candles}
                  />
                  <div className="market-feed-meta">
                    <span>上次更新：{new Date(displayFetchedAt).toLocaleTimeString("zh-TW", { hour12: false })}</span>
                    <span>模式：{currentMarketFeed.mode.toUpperCase()}</span>
                    <span>級別：{currentMarketFeed.timeframe}</span>
                    <span>
                      {formatMarketContextValue("Funding", currentMarketFeed.fundingRate, (value) => `${(value * 100).toFixed(4)}%`)}
                    </span>
                    <span>{formatMarketContextValue("OI", currentMarketFeed.openInterest, (value) => value.toFixed(0))}</span>
                    <span className={`price-delta ${marketFeedPriceDirection}`}>{marketFeedPriceDirectionLabel}</span>
                  </div>
                  {currentMarketFeed.completenessWarnings.length > 0 && (
                    <ul aria-label="市場資料警告">
                      {currentMarketFeed.completenessWarnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  )}
                </>
              )}

              {marketObservationError && (
                <div className="market-feed-error" role="alert">
                  {marketObservationError}
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
                <DecisionCard data={analysisData} />
              </section>
              <StrategySupportPanel analysis={analysisData} onApplyStrategyLab={applyStrategyLabSelection} />
              <StrategyLabPanel
                symbol={symbol}
                selectedNotice={strategyLabNotice}
                selectedProfile={strategyLabProfile}
                selectedTimeframe={strategyLabTimeframe}
                onSelectionChange={updateStrategyLabSelection}
              />
            </>
          ) : (
            !error && (
              <section className="panel empty-state">
                <p className="panel-label">READY</p>
                <h2>選擇條件後開始分析</h2>
                <p>
                  結果會先整理即時市場觀測，再產出固定 decision、strategy support 與 strategy lab 驗證入口。
                </p>
              </section>
            )
          )}
        </section>

        <aside aria-label="action-rail" className="action-rail">
          <section className="action-rail-section risk-rail">
            <div className="rail-header">
              <h2>Risk Rail</h2>
            </div>
            {analysisData ? (
              <AnalysisDetails data={analysisData} />
            ) : (
              <section className="panel empty-risk-panel">
                <p className="panel-label">風險摘要</p>
                <h3>等待分析結果</h3>
              </section>
            )}
          </section>

          <section className="action-rail-section trade-rail">
            <div className="rail-header">
              <h2>Trade Rail</h2>
            </div>
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
          </section>
        </aside>
      </div>

      <footer className="workspace-footer">
        <span>LIVE MARKET ANALYSIS · MINIMUM DEMO</span>
        <span>NO REAL TRADING</span>
      </footer>
    </main>
  );
}

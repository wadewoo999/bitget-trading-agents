# BTC Trading Decision Agent — Product Spec

## 文件定位

本文件描述完整產品目標。第一版開發以 [`Minimum Executable Demo Design`](../development/specs/2026-06-20-minimum-demo-design.md) 為實作依據；兩者不一致時，第一版以 Demo Design 為準，完整產品能力於後續階段逐步加入。

## 1. 產品定位

目標使用者是對當前市場方向沒有明確判斷，或面對互相衝突訊號時難以採取行動的 crypto 交易者。

產品不是自動交易機器人，也不承諾獲利。它把市場資料、技術指標與衍生品資訊整理為可解釋的決策，讓使用者理解：

- 當前偏多、偏空或應等待。
- 哪些證據支持判斷。
- 哪些風險可能推翻判斷。
- 若採取行動，合理的 entry、stop loss、take profit 與 position size 為何。

## 2. MVP 範圍

### 2.1 包含

- `BTCUSDT` 單一交易標的。
- 即時盤面分析 timeframe：`15m`、`1h`、`4h`、`1d`。
- Agent Hub 市場資料。
- 技術與衍生品指標計算。
- Deterministic、schema-validated Decision Engine。
- 使用者確認後建立 paper trade。
- Paper position 手動平倉與 ledger 匯出。
- 引導式 Strategy Lab。
- 可重現回測。
- 一個完成 sandbox backtest 並公開發布的 GetAgent Playbook。
- 無需登入即可使用的公開 Vercel Demo。

### 2.2 不包含

- 真實資金下單。
- 多幣種。
- 新聞、鏈上、宏觀資料。
- 背景排程或全自動交易。
- 匿名使用者動態 upload 或 publish Playbook。
- 任意 AI 生成程式碼執行。

## 3. 主要使用流程

### 3.1 市場分析

1. 使用者選擇 timeframe。
2. 系統取得 BTCUSDT market data。
3. 系統計算技術與衍生品指標。
4. 規則引擎產生市場狀態與風險限制。
5. Deterministic Decision Engine 根據結構化資料產生決策。
6. Schema 與風險規則拒絕不完整、不一致或低信心結果。
7. UI 顯示 `LONG`、`SHORT` 或 `WAIT`、信心、理由、風險及失效條件。

### 3.2 Paper Trading

1. 只有完整資料產生的 `LONG` 或 `SHORT` deterministic decision 可建立交易。
2. 系統預填 entry、quantity、stop loss、take profit 與風險金額。
3. 使用者確認後才開啟 position。
4. 使用者以目前市場價格手動平倉。
5. 系統計算 fee、PnL 與 balance change。
6. Ledger 可匯出 JSON 與 CSV。

### 3.3 Strategy Lab

1. 使用者選擇 risk profile、允許的 timeframe 及補充策略想法。
2. 系統依 profile、allowlisted indicators 與使用者想法產生受 schema 限制的 `StrategyConfig`。
3. 系統驗證所有條件只使用 allowlisted indicators。
4. 系統載入歷史資料並執行 deterministic backtest。
5. UI 顯示規則、metrics、equity curve 與 trades。
6. Strategy Lab 不改寫即時 Decision Agent，也不自動建立 paper trade。

## 4. 市場資料與指標

### 4.1 資料來源

Server-side 透過 Bitget Agent Hub 的 `bitget-core` 讀取：

- Futures candles。
- Futures ticker。
- Current / historical funding rate。
- Current / historical open interest。

所有資料需保留來源、request time 與最後一根已收盤 candle 的時間。

### 4.2 指標

- EMA 20、50、100、200。
- RSI 14。
- MACD。
- ATR 14。
- 成交量變化。
- Funding rate。
- Open interest 與其變化。

即時 candles 不完整、數量不足或時間不連續時，不得產生 AI 交易建議。

## 5. Decision Engine

規則引擎先產生：

- 趨勢：`bullish | bearish | range`
- 動能：`strengthening | weakening | neutral`
- 衍生品風險：`crowded | normal | unavailable`
- 波動風險：`high | medium | low`

Decision Engine 只能根據已驗證的 market snapshot 與 rule state 回傳：

```ts
type Timeframe = "15m" | "1h" | "4h" | "1d";
type DecisionAction = "LONG" | "SHORT" | "WAIT";

interface Decision {
  action: DecisionAction;
  confidence: number;
  summary: string;
  reasons: string[];
  riskWarnings: string[];
  invalidationCondition: string;
  entry?: number;
  stopLoss?: number;
  takeProfit?: number;
  positionSizePct?: number;
  mode: "deterministic";
}
```

### 5.1 強制風險規則

- `confidence < 60` → `WAIT`。
- 必要 market data 不完整 → 停止分析。
- 訊號嚴重衝突 → `WAIT`。
- 單筆模擬風險上限為帳戶餘額的 1%。
- Decision output 未通過 schema validation 時不得建立 paper trade。
- 不提供或呼叫真實下單能力。

## 6. API 契約

### 6.1 `POST /api/analyze`

Request：

```ts
interface AnalyzeRequest {
  symbol: "BTCUSDT";
  timeframe: "15m" | "1h" | "4h" | "1d";
}
```

Response 必須包含：

- `MarketSnapshot`
- `Decision`
- 資料來源與時間
- 資料完整性狀態
- Decision mode 與規則版本

### 6.2 `POST /api/backtest`

Request 包含 profile、timeframe 與可選的自然語言補充。Response 包含：

- 經驗證的 `StrategyConfig`
- period start / end
- total return
- max drawdown
- Sharpe ratio
- win rate
- trade count
- equity curve
- trades
- fee 與 slippage 假設

## 7. Paper Trading 契約

初始模擬資金固定並顯示於 UI。Ledger 每筆至少包含：

```ts
interface PaperTradeRecord {
  timestamp: string;
  symbol: "BTCUSDT";
  timeframe: string;
  event: "OPEN" | "CLOSE";
  side: "LONG" | "SHORT";
  price: number;
  quantity: number;
  stopLoss: number;
  takeProfit: number;
  fee: number;
  pnl: number;
  balanceBefore: number;
  balanceAfter: number;
  decisionSummary: string;
}
```

資料儲存在 browser storage；公開提交另保存一次真實 Demo run 的匯出檔供評委核查。

## 8. Strategy Lab

### 8.1 Profile

| Profile | Timeframe | 行為 |
|---|---|---|
| 激進 | 15m、1h | 較高進場頻率、較小確認門檻，但仍受 1% 風險上限約束 |
| 平衡 | 4h、1d | 中等訊號門檻與 position size |
| 穩健 | 1d、1week | 較高確認門檻、較小 position size、較寬 stop loss |

`1week` 只用於 Strategy Lab，不加入主要盤面分析。

### 8.2 回測規則

- 使用最近 1,500 根已收盤 candles。
- 前 200 根作 indicator warm-up。
- 禁止 look-ahead。
- 預設單邊 fee：0.06%。
- 預設單邊 slippage：0.02%。
- 使用 funding 或 OI 時，必須取得 timestamp-aligned historical data。
- 無法取得必要歷史資料時拒絕回測，不以目前值代替歷史值。

## 9. GetAgent Playbook

- 建立一個與 MVP 策略邏輯一致的 BTC Playbook。
- 依序完成 local validation、upload、sandbox run、結果檢查、confirm、publish。
- 公開頁只讀展示 Playbook link、metrics 與真實 equity curve snapshot。
- `ACCESS-KEY` 只在受控開發流程中使用，不提供給匿名 Demo。
- 不得偽造回測曲線、metrics 或 execution evidence。

## 10. 錯誤與安全

- 必要資料失敗：停止分析並顯示失敗來源。
- 非必要衍生品資料失敗：標示 unavailable，不假造數值。
- Decision output schema invalid：停止分析，不產生交易建議。
- 不在 client bundle、repository、log、error response 或匯出檔中保存 secrets。
- 所有 API input 與 external response 必須 schema validate。
- Public endpoint 需限制輸入範圍與請求頻率。

## 11. 測試

### Unit

- EMA 20／50／100／200、RSI、MACD、ATR fixture。
- `confidence = 59` 強制 `WAIT`；`confidence = 60` 不觸發此規則。
- Position sizing、fee、PnL 與 balance calculation。
- Strategy profile 與 timeframe validation。
- Backtest warm-up、no look-ahead、fee 與 slippage。

### Integration

- Agent Hub response → normalized snapshot。
- Snapshot → rule state → deterministic decision schema → risk validation。
- Confirm → paper position → close → ledger export。
- StrategyConfig → historical data → backtest output。
- Decision schema failure → 停止分析且禁止交易。

### Browser / Acceptance

- 公開頁面無需登入。
- 四個主要 timeframe 都能執行分析。
- LONG／SHORT 必須確認後才開倉。
- 三種 Strategy profile 都能完成有效回測。
- 可查看及匯出交易紀錄。
- 可查看 Playbook evidence。
- Production build、secret scan 與公開 URL smoke test 通過。

## 12. 交付順序

1. 文件與 repository 基礎。
2. Next.js／TypeScript Vertical Slice。
3. Agent Hub 與 indicator pipeline。
4. Decision Engine 與 paper trading。
5. Strategy Lab 與 backtest。
6. GetAgent Playbook。
7. Evidence、README、Vercel 與 submission materials。

詳細官方活動規則見 [`OFFICIAL_HACKATHON_REQUIREMENTS.md`](../hackathon/OFFICIAL_HACKATHON_REQUIREMENTS.md)。

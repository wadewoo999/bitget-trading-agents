# Live 市場更新與圖表刷新設計

> 日期：2026-06-21
> 範圍：修復 `funding / OI` 缺失呈現，並新增每 30 秒更新的最新價格與 K 線圖，不自動重跑分析結果。

## 1. 目標

把目前的市場分析頁補成更接近可用產品的狀態：

- `funding / OI` 缺失時不再誤顯示成 `0`
- 頁面持續顯示最新價格與最近一段 K 線
- `sample` / `live` 兩種模式都支援固定 30 秒更新
- 分析結果維持為使用者主動觸發的快照，不會被背景更新偷偷改寫

這一輪只處理市場觀測層，不處理：

- 自動重跑 decision
- 自動更新 reasons / risk / score
- 持倉自動止盈止損
- Strategy Lab 或 backtest

## 2. 問題定義

目前頁面把兩種不同性質的資料混在一起：

1. 分析快照
   - 方向
   - 分數
   - 理由
   - 風險
   - 指標判讀

2. 市場觀測
   - 最新價格
   - 最新更新時間
   - 當前時間級別圖表

如果每 30 秒直接重打 `/api/analyze`，會導致：

- decision card 自動改變
- reasons 與 warnings 自動變化
- 使用者看到的 paper trading preview 與先前分析快照脫鉤
- evidence / ledger 的依據不穩定

因此分析快照與市場觀測必須拆成兩條資料流。

## 3. 設計原則

- 分析結果只在使用者按下分析時更新
- 市場價格與圖表可由系統每 30 秒背景刷新
- 市場刷新失敗時保留上一筆成功資料，不清空畫面
- `null` 必須明確顯示為不可用，不得偽裝成 `0`
- `sample` 與 `live` 必須共用同一種前端資料契約

## 4. 方案選擇

### 採用方案

新增獨立的市場資料 API，專門服務最新價格與圖表更新。

原因：

- 能把「分析快照」與「市場觀測」拆開
- 不需要讓 `/api/analyze` 承擔兩種責任
- 前端可以固定 30 秒刷新而不影響 analysis state
- 後續若要加入持倉浮動盈虧，也能重用這條市場資料流

### 不採用方案

直接每 30 秒重打 `/api/analyze`。

不採用原因：

- 會違反分析快照應保持固定的需求
- 會讓決策與交易流程變得不可追溯
- 會使 UI 行為不穩定

## 5. 資料流設計

### 5.1 分析快照資料流

- 來源：`POST /api/analyze`
- 觸發：使用者手動點擊分析
- 更新內容：
  - score
  - action
  - confidence
  - reasons
  - warnings
  - indicators
  - 分析用 chart

這份資料在成功返回後保持不變，直到使用者再次分析。

### 5.2 市場觀測資料流

- 來源：新 API
- 觸發：
  - 頁面初次載入
  - 使用者切換 mode
  - 使用者切換 timeframe
  - 每 30 秒輪詢
- 更新內容：
  - 最新價格
  - 最近一段 candles
  - 當前更新時間
  - 資料完整性 warning

這份資料只用來更新價格與 K 線圖。

## 6. API 設計

新增：

### `GET /api/market-feed?mode=live|sample&timeframe=15m|1h|4h|1d`

回傳欄位：

```ts
{
  symbol: "BTCUSDT";
  mode: "live" | "sample";
  timeframe: "15m" | "1h" | "4h" | "1d";
  price: number;
  fetchedAt: string;
  fixtureVersion: string | null;
  completenessWarnings: string[];
  candles: Array<{
    openTime: string;
    closeTime: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}
```

規則：

- `sample`：`fixtureVersion` 必須有值
- `live`：`fixtureVersion` 必須是 `null`
- `candles` 只回最近一段圖表需要的資料，不回整套 analysis
- `funding / OI` 缺失不阻止 API 成功，只透過 `completenessWarnings` 表達

## 7. Server 設計

### 7.1 sample 模式

- 直接從既有 fixture 取資料
- `price` 使用 fixture ticker
- `candles` 使用 fixture 最近一段 candles
- 若 fixture 本身有 funding / OI，即照常保留；若未來缺失，走相同 warning 流程

### 7.2 live 模式

- 重用既有 live provider
- `price` 來自 ticker
- `candles` 來自 normalized closed candles
- `funding / OI` 可缺失，但不允許用舊值或 sample 值補齊

### 7.3 共用 market-feed 組裝

應新增一個 server 層共用流程，把 `sample` / `live` 轉成同一種 market-feed response shape，避免 route 直接拼裝兩套路徑。

## 8. 前端設計

### 8.1 State 拆分

`MarketAnalysisDashboard` 內至少拆成兩塊 state：

- `analysisData`
  - 使用者手動分析後更新
- `marketFeed`
  - 每 30 秒更新一次

兩者不能共用同一份 state。

### 8.2 輪詢規則

- 頁面載入時立即抓一次 `marketFeed`
- `mode` 或 `timeframe` 改變時立即重抓
- 成功後啟動 30 秒 interval
- 離開頁面或依賴改變時清掉 interval

### 8.3 失敗處理

- 若輪詢失敗：
  - 保留上一筆成功資料
  - 顯示「最新價格更新失敗」提示
  - 不清空 K 線圖
- 若首次載入就失敗：
  - 顯示明確 market-feed error panel

## 9. `funding / OI` 缺失修復

目前 `IndicatorGrid` 把 `fundingRate ?? 0` 當成數值顯示，這會把缺失誤導成中性。

修正規則：

- `fundingRate === null`
  - 顯示「不可用」
  - 不顯示 `0.0000%`
- `openInterest === null`
  - 顯示「不可用」
  - 不顯示數字假值
- crowding signal 若因 funding 缺失而為中性，需保留，但文字要明確說明中性是因資料缺失，不是因市場真的中性

## 10. 圖表設計

目前圖表是 Close + EMA 折線圖。這輪改成 K 線圖為主。

第一版 K 線圖建議範圍：

- 顯示最近固定數量的 candles
- 每根 K 線依漲跌分色
- 顯示當前 timeframe
- 顯示最新更新時間
- 疊加一條 EMA20 作為趨勢輔助

這輪不做：

- 十字準星
- 缩放拖曳
- 多條 EMA 疊圖
- 成交量副圖

原因是本輪重點是補完整性與產品感，不是做 full-featured charting terminal。

## 11. 畫面資訊層級

建議在現有 dashboard 上新增一個市場觀測區塊，包含：

- 最新價格
- 更新時間
- 當前 mode
- 當前 timeframe
- K 線圖

另外在分析結果區塊保留：

- 分析時間
- 最後收盤時間
- 這份分析不會自動更新的提示

讓使用者清楚區分：

- 「現在盤面長怎樣」
- 「這份分析是什麼時候做的」

## 12. 測試設計

### Unit

- `funding / OI` 缺失時，UI 顯示為不可用
- market-feed response schema 對 `sample` / `live` 都成立
- `fixtureVersion` 規則正確

### Integration

- `GET /api/market-feed` 在 `sample` / `live` 皆可成功返回
- mandatory 市場資料缺失時返回穩定 error envelope
- optional `funding / OI` 缺失時 API 仍成功，並附 warning

### UI

- 輪詢只更新 `marketFeed`，不覆蓋既有 `analysisData`
- 切換 `timeframe` 會刷新對應 K 線圖
- 切換 `mode` 會刷新對應價格與資料來源
- 輪詢失敗時保留上一筆圖表資料

## 13. 驗收標準

- `funding / OI` 缺失時不再顯示成 `0`
- 頁面可在 `sample` / `live` 模式下每 30 秒刷新價格與 K 線圖
- 刷新市場資料時，分析結果不自動變動
- `npm test` 通過
- `npm run build` 通過
- 手動檢查時能清楚區分分析時間與市場更新時間

## 14. 實作順序

1. 修復 `funding / OI` 缺失顯示
2. 新增 market-feed contract 與 API
3. 建立 server 共用 market-feed 組裝流程
4. 在 dashboard 新增獨立 `marketFeed` state 與 30 秒輪詢
5. 將圖表改為 K 線圖並接上新資料流
6. 補測試與文件

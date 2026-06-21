# 專案現況評估與下一步

> 評估日期：2026-06-21
> 評估基準：`main` commit `405f481` 及當日 repository 驗證結果
> 本文件是時間點快照；功能完成度變更後必須同步更新。

## 1. 結論

專案已完成 Phase 2 Sample Market Analysis、live market analysis slice，以及第一版 paper trading lifecycle，但尚未完成可核查 evidence 與公開部署，因此仍未達到 Hackathon 提交所需的完整狀態。

目前最重要的缺口不是基礎架構，而是產品本體尚未補完；在產品完成前，不應優先投入公開部署與 submission 包裝。

以下百分比是依已實作功能、規格驗收條件及提交材料所做的規劃估算，不是自動測量結果：

| 範圍 | 估算完成度 |
|---|---:|
| Phase 2 Sample Market Analysis | 90% |
| Minimum Executable Demo | 72% |
| 完整產品 | 20% |
| Hackathon submission readiness | 30% |

## 2. Repository 結構

```text
bitget-trading-agents/
├── AGENTS.md
├── README.md
├── docs/
│   ├── development/           # 現況、設計與實作計畫
│   ├── hackathon/             # 官方規則鏡像
│   └── product/               # 完整產品規格
├── fixtures/market/           # 四種 timeframe 的 Bitget 歷史快照
├── scripts/                   # Fixture 擷取工具
├── src/
│   ├── app/                   # Next.js 頁面與 API routes
│   ├── components/dashboard/  # Dashboard UI
│   ├── features/              # Public contracts
│   └── server/                # Fixture、indicator、decision pipeline
└── tests/
    ├── unit/
    └── integration/
```

目前模組邊界清楚，可以在既有架構上增加 Live provider、paper trading、backtest 與 evidence，不需要重建 repository。

## 3. 已完成內容

### 3.1 Market Analysis

- 交易標的：`BTCUSDT`。
- Timeframe：`15m`、`1h`、`4h`、`1d`。
- 使用者觀點：`unsure`、`long`、`short`。
- 指標：EMA 20／50／100／200、RSI 14、MACD、ATR 14、volume change、20-bar price return、funding rate、current OI。
- Decision：0–100 market bias score、`LONG`／`SHORT`／`WAIT`、confidence、理由、風險與失效條件。
- 風險規則：`confidence < 60` 必須為 `WAIT`。
- 圖表：最近 80 根已收盤 candle 的 K 線圖與 EMA20。
- UI 可切換 `LIVE DATA` / `SAMPLE DATA`，並依 mode 顯示對應 badge、source metadata 與 warnings。
- Live mode 直接請求 Bitget public futures ticker、candles、funding rate 與 open interest。
- Live mode 會移除未收盤 candle，驗證 chronological、unique 與至少 250 根 closed candles。
- funding rate 與 open interest 缺失時明確標記 unavailable，不以 fixture 或舊值補齊。
- 市場頁已分離 analysis snapshot 與 market feed。
- 最新價格與 K 線圖可每 30 秒刷新。
- 刷新市場觀測資料時，不會自動改寫既有 decision。

### 3.2 可重現資料

- 四份 committed Bitget futures fixture。
- 每份包含 300 根 chronological、unique、closed candles。
- 保留 ticker、funding rate、current OI、來源 URL、request time、capture time 與 fixture version。
- Sample runtime 與自動測試使用相同 fixture。
- Next.js production output trace 已確認包含四份 fixture。

### 3.3 Contracts 與邊界

已建立並測試：

- Market Analysis contract。
- Deterministic Decision contract。
- Paper Trading account、position 與 ledger contract。
- Strategy profile、StrategyConfig 與 BacktestResult contract。
- GetAgent Playbook evidence contract。

Strategy Lab 與 Playbook 目前只有 contract，不能視為功能已完成。

### 3.4 Paper Trading

- Dashboard 已支援依分析結果建立模擬交易 preview。
- `LONG` / `SHORT` 可確認開倉；`WAIT` 不可建立模擬交易。
- 每個 browser 同時只允許一個 open BTCUSDT position。
- 開倉與平倉都透過 `/api/price` 取價，並計算 0.06% fee、realized PnL 與 balance change。
- localStorage 會保存 versioned account、open position 與 ledger；損壞資料會自動 reset。
- Ledger 已可匯出 JSON 與 CSV。

### 3.5 驗證證據

2026-06-21 執行結果：

| 驗證 | 結果 |
|---|---|
| `npm run lint` | 通過 |
| `npm run typecheck` | 通過 |
| `npm test` | 22 files、97 tests 全部通過 |
| `npm run build` | Next.js production build 通過 |
| Production `/api/analyze` | sample / live mode 均成功回應 |
| `npm run demo-check` | 通過，且維持為唯一標準一鍵驗證入口 |
| GitHub repository | Public |
| Git working tree | 持續開發中，非乾淨狀態 |

內建瀏覽器控制在當日受到執行環境 metadata 問題阻擋，因此 mobile layout、browser console 與真實 E2E 視覺驗收仍需補做。

## 4. 尚未完成內容

| 項目 | 目前狀態 | 優先級 |
|---|---|---:|
| 可核查 paper trading evidence | 已有一鍵匯出腳本，尚未提交首份產物 | P0 |
| Public Vercel Demo | 未部署 | P0 |
| GetAgent Playbook | 未建立 | P1 |
| Playbook sandbox backtest 與公開 evidence | 未建立 | P1 |
| Submission README／影片／表單材料 | 未完成 | P1 |
| Strategy Lab UI | 僅有 contract | P2 |
| Deterministic backtest engine | 未實作 | P2 |
| Browser E2E／mobile QA | 未完成 | P2 |
| GitHub Actions CI | 未建立 | P3 |

## 5. Hackathon 提交缺口

依 repository 保存的官方規則，交易 Agent 需要 public repository 或公開發布連結，並優先要求包含時間戳、交易對、方向、價格、數量及帳戶餘額變化的 paper trading 或實盤記錄。

目前 repository 已為 public，但仍缺少：

1. 可核查 paper trading log。
2. 無需登入的公開 Demo URL。
3. 可公開驗證的 live / paper evidence 鏈。
4. GetAgent Playbook 及真實 sandbox evidence。
5. 完整 README、Demo 操作說明與 submission materials。

Sample 分析輸出不能當成 Live paper-trading evidence。

## 6. 技術風險

### P0

- 尚未提交首份 live paper trading evidence 檔與對外證據鏈。
- 尚無 public deployment 與 production smoke test。

### P1

- Fixture schema 接受至少 250 根 candles，而 committed Phase 2 fixture 固定為 300 根；規格語意需在 Live normalization 階段明確區分。
- Sample warning 同時存在於 completeness 與 decision warnings，UI 可能重複顯示。
- 部分 TSX 與 server files 過度壓縮，雖不影響功能，但降低 code review 可讀性。
- Public API 尚未加入 rate limiting。
- README 尚缺 public URL、操作範例、evidence、架構與限制說明。

### P2

- 沒有 automated browser E2E 與 CI。
- Repository 尚未設定 homepage、topics 與 license。

## 7. 已確認的產品方向

- Bitget 提供的 Qwen API 是參賽者的開發資源，不是本產品 runtime dependency。
- Minimum Demo 使用 deterministic、schema-validated Decision Engine，不呼叫 runtime Qwen／LLM。
- Agent Hub 提供 Live market data；系統根據已驗證資料產生決策。
- 使用者確認後才建立 paper trade；產品不執行真實資金交易。
- GetAgent Playbook 是 Hackathon delivery 與策略 evidence 的一部分。
- 多幣種、新聞、鏈上與宏觀資料仍是後續產品範圍，不是取消項目。

## 8. 下一步

### Stage 1：Minimum Demo 補全與穩定化

1. 補強 Dashboard 視覺完成度、live 狀態提示與 evidence 頁可讀性。
2. 補齊 desktop / mobile / console smoke test。
3. 檢查並修正 market feed、paper trading、ledger、restore 與匯出流程中的體驗斷點。
4. 讓目前 Demo 達到穩定、可重跑、可展示，但仍不以對外公開為目標。

Stage 1 收尾完成標準：

- Dashboard 已能清楚區分分析快照與市場即時觀測。
- market feed 刷新有可見狀態與價格變化提示，且不覆寫分析結論。
- funding / OI 缺失時，資料完整性與風險提醒分開顯示。
- paper trading preview、open position、ledger、evidence 頁都具備可讀性。
- `demo-check` 持續可用，作為唯一標準重跑驗證流程。

### Stage 2：GetAgent Playbook

1. 建立與產品決策邏輯一致的 BTC strategy Playbook。
2. 完成 validation、upload、sandbox backtest、confirm 與 publish。
3. 保存公開 URL、metrics、equity curve 與驗證時間。
4. 不偽造 backtest 或 execution evidence。

### Stage 3：Strategy Lab 與產品擴充

完成前兩段後，再依序加入：

- Strategy Lab 與 deterministic backtest。
- `1week` Strategy timeframe。
- 多幣種。
- 新聞資料。
- 鏈上資料。
- 宏觀資料。

### Stage 4：公開部署與提交材料

當 Stage 1–3 都達到可展示水準後，最後才處理：

1. 公開部署。
2. 完整 README。
3. 操作說明。
4. evidence links。
5. Demo 影片。
6. 提交材料。
7. 驗證 public URL 無需登入，並完成部署後 smoke test。

## 9. 執行原則

```text
Minimum Demo completion and stabilization
→ GetAgent Playbook and evidence
→ Strategy Lab and later product expansion
→ Public deployment and submission package
```

每一階段先形成可運行、可驗證、可提交的證據，再開始下一階段。

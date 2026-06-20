# 專案現況評估與下一步

> 評估日期：2026-06-21
> 評估基準：`main` commit `405f481` 及當日 repository 驗證結果
> 本文件是時間點快照；功能完成度變更後必須同步更新。

## 1. 結論

專案已完成 Phase 2 的 read-only Sample Market Analysis，但尚未完成 Minimum Demo，也尚未達到 Hackathon 提交所需的完整狀態。

目前最重要的缺口不是基礎架構，而是 Live market data、paper trading、可核查 evidence 與公開部署。

以下百分比是依已實作功能、規格驗收條件及提交材料所做的規劃估算，不是自動測量結果：

| 範圍 | 估算完成度 |
|---|---:|
| Phase 2 Sample Market Analysis | 90% |
| Minimum Executable Demo | 40% |
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

### 3.1 Sample Market Analysis

- 交易標的：`BTCUSDT`。
- Timeframe：`15m`、`1h`、`4h`、`1d`。
- 使用者觀點：`unsure`、`long`、`short`。
- 指標：EMA 20／50／100／200、RSI 14、MACD、ATR 14、volume change、20-bar price return、funding rate、current OI。
- Decision：0–100 market bias score、`LONG`／`SHORT`／`WAIT`、confidence、理由、風險與失效條件。
- 風險規則：`confidence < 60` 必須為 `WAIT`。
- 圖表：最近 80 根已收盤 candle 的 Close 與 EMA。
- UI 持續顯示 `SAMPLE DATA`、fixture version、擷取時間與最後收盤時間，不將歷史快照偽裝為即時資料。

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

Paper Trading、Strategy Lab 與 Playbook 目前只有 contract，不能視為功能已完成。

### 3.4 驗證證據

2026-06-21 執行結果：

| 驗證 | 結果 |
|---|---|
| `npm run lint` | 通過 |
| `npm run typecheck` | 通過 |
| `npm test` | 13 files、51 tests 全部通過 |
| `npm run build` | Next.js production build 通過 |
| Production `/api/analyze` | 四個 timeframe 均成功回應 |
| GitHub repository | Public |
| Git working tree | 評估開始時乾淨 |

內建瀏覽器控制在當日受到執行環境 metadata 問題阻擋，因此 mobile layout、browser console 與真實 E2E 視覺驗收仍需補做。

## 4. 尚未完成內容

| 項目 | 目前狀態 | 優先級 |
|---|---|---:|
| Agent Hub Live market data | 未實作 | P0 |
| Live data normalization 與完整性警告 | 未實作 | P0 |
| `GET /api/price` | 僅有 contract | P0 |
| Paper trade preview／confirm／close | 僅有 contract | P0 |
| 1% risk sizing、fee、PnL | 未實作 | P0 |
| localStorage account／ledger | 未實作 | P0 |
| JSON／CSV ledger export | 未實作 | P0 |
| 可核查 paper trading evidence | 未產生 | P0 |
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
3. Agent Hub runtime 整合。
4. GetAgent Playbook 及真實 sandbox evidence。
5. 完整 README、Demo 操作說明與 submission materials。

Sample 分析輸出不能當成 Live paper-trading evidence。

## 6. 技術風險

### P0

- `live` request 目前固定回傳 `MARKET_DATA_UNAVAILABLE`。
- `/api/analyze` 尚未依原因區分 `MARKET_DATA_UNAVAILABLE`、`INSUFFICIENT_CANDLES` 與 `UPSTREAM_TIMEOUT`。
- 尚未建立 paper trading lifecycle，無法產生官方要求的 ledger。
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

### Stage 1：Agent Hub Live Data

1. 建立 server-only Agent Hub provider。
2. 取得 ticker、300 candles、funding rate 與 current OI。
3. 移除未收盤 candle，驗證 chronological、unique 與最低 250 根資料。
4. Mandatory data 失敗時停止分析；funding／OI 缺失時標示 unavailable。
5. Live response 不得混入 Sample fixture。
6. 實作 `GET /api/price?mode=live|sample`。

### Stage 2：Paper Trading 與 evidence

1. 建立 preview、confirm、open、manual close lifecycle。
2. 實作 1% risk sizing、0.06% fee、PnL 與 balance calculation。
3. 限制每個 browser 同時只能有一個 open position。
4. 以 versioned localStorage 保存 account、position 與 ledger。
5. 實作 JSON／CSV export。
6. 產生並保存一份可核查的 Live paper trading evidence。

### Stage 3：Public Vercel deployment

1. 部署目前可運行閉環。
2. 驗證 public URL 無需登入。
3. 完成 desktop、mobile、browser console 與 API smoke test。
4. 將 URL 加入 GitHub homepage 與 README。

### Stage 4：GetAgent Playbook

1. 建立與產品決策邏輯一致的 BTC strategy Playbook。
2. 完成 validation、upload、sandbox backtest、confirm 與 publish。
3. 保存公開 URL、metrics、equity curve 與驗證時間。
4. 不偽造 backtest 或 execution evidence。

### Stage 5：Submission package

1. 補完整 README、架構圖、操作方式、限制與 evidence links。
2. 準備 paper ledger、Playbook evidence 與必要回測資料。
3. 錄製不超過三分鐘的公開 Demo 影片。
4. 重新核對官方提交表單、UID、截止時間及社群公告。
5. 準備官方互動帖與開發日記連結。

### Stage 6：Strategy Lab 與產品擴充

完成提交必要閉環後，再依序加入：

- Strategy Lab 與 deterministic backtest。
- `1week` Strategy timeframe。
- 多幣種。
- 新聞資料。
- 鏈上資料。
- 宏觀資料。

## 9. 執行原則

```text
Agent Hub Live Data
→ Paper Trading and evidence
→ Public Vercel deployment
→ GetAgent Playbook and evidence
→ Submission package
→ Strategy Lab and later product expansion
```

每一階段先形成可運行、可驗證、可提交的證據，再開始下一階段。

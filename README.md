# BTC Trading Decision Agent

協助 Crypto 交易者在市場方向模糊、訊號衝突時，快速理解盤面並決定下一步行動。

核心流程：**市場資料 → 技術指標計算 → 決策引擎 → 用戶確認 → Paper Trading 驗證**

- **Simulation-first**：所有交易均為模擬交易，不涉及真實資金
- **Deterministic**：決策引擎不使用 LLM，結果穩定可重現

---

## 功能

- 多幣種盤面分析（9 幣種 × 4 時間級別）
- 技術指標計算（EMA 排列、RSI、MACD、成交量、ATR）
- 衍生品資料整合（Funding Rate、Open Interest）
- 決策引擎輸出 LONG / SHORT / WAIT（含信心分數與理由）
- Paper Trading 開倉、持倉監控、平倉、損益結算
- 交易紀錄匯出（JSON / CSV）

---

## 本地運行

需求：Node.js 22 以上 + npm

```bash
npm install
npm run dev
```

瀏覽器開啟 `http://localhost:3000` 即可使用 Dashboard。

一鍵驗證：

```bash
npm run demo-check
```

執行 lint、型別檢查、單元測試、建置、API 探測，確認所有功能正常。

---

## 使用流程

1. 選擇幣種（BTCUSDT / ETHUSDT / SOLUSDT 等 9 種）
2. 選擇時間級別（15m / 1h / 4h / 1d）
3. 選擇策略模式（激進 / 平衡 / 穩健）
4. 點擊「分析盤面」取得決策建議
5. 檢視技術指標與信心分數
6. 如 confidence ≥ 60，可點擊「開倉」建立 Paper Trade
7. 在持倉區塊點擊「平倉」結算損益
8. 透過「下載交易紀錄」匯出 JSON 或 CSV

---

## 支援範圍

| 項目 | 內容 |
|------|------|
| 交易標的 | BTCUSDT、ETHUSDT、SOLUSDT、HYPEUSDT、BNBUSDT、XRPUSDT、SUIUSDT、DOGEUSDT、ZECUSDT |
| 時間級別 | 15m、1h、4h、1d |
| 策略模式 | 激進（15m + 1h）、平衡（4h + 1d）、穩健（1d + 1week） |
| 資料來源 | Bitget 公開 API（USDT-FUTURES 市場） |

---

## 決策邏輯

- 多維度評分：趨勢（EMA 排列）、動能（RSI、MACD）、參與度（成交量、OI）、資金（Funding Rate）
- Confidence < 60 自動輸出 **WAIT**
- 每次決策附帶完整理由與指標數值，可供追溯

---

## 專案結構

- `src/app/`：Next.js 頁面、API 路由、Dashboard
- `src/server/`：決策引擎、指標計算、市場資料擷取
- `src/features/`：產品邏輯與狀態管理
- `src/components/`：UI 元件
- `scripts/`：驗證腳本與 macOS 啟動器
- `tests/`：單元與整合測試
- `report/`：Paper Trading 交易紀錄與分析報告
- `docs/`：產品規格、開發文件與設計規劃

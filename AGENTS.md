# AGENTS.md

## 專案目標

本專案是為參加 **Bitget AI Base Camp Hackathon S1**「交易 Agent」賽道而建立的產品。

建立 BTC Trading Decision Agent，協助 crypto 交易者在市場情勢模糊、訊號衝突或自身觀點不清楚時，理解當前盤面並決定下一步行動。

核心流程：

```text
市場資料 → 技術與衍生品指標 → AI 綜合判斷 → 使用者確認 → Paper Trading
```

## MVP 邊界

- 交易標的：`BTCUSDT`
- 主要分析 timeframe：`15m`、`1h`、`4h`、`1d`
- 核心能力：盤面分析、AI 決策、使用者確認、paper trading、Strategy Lab、回測、GetAgent Playbook 證據
- Strategy profile：
  - 激進：`15m`、`1h`
  - 平衡：`4h`、`1d`
  - 穩健：`1d`、`1week`

## 產品演進

- 第一版先以最小可行產品驗證完整流程、技術可行性與使用價值。
- MVP 驗證通過後，以現有架構為基礎持續擴充，直至完成完整產品。
- 多幣種、新聞、鏈上與宏觀資料是後續開發範圍，不是排除或取消的功能。
- 每個階段先確保既有功能穩定、可驗證，再加入下一批能力。

## 產品原則

- Simulation-first，不執行真實資金交易。
- AI 先判斷，使用者確認後才建立 paper trade。
- `confidence < 60` 必須輸出 `WAIT`。
- 結果必須能追溯資料來源、輸入、時間與決策理由。
- 回測與 paper trading 證據必須可重現、可匯出、可供評委核查。
- 公開 Demo 不得暴露 API Key、Token 或其他 secrets。
- 優先完成最小可運行閉環；確認可行後，再依產品演進順序加入後續功能。

## 工程原則

- 保持模組邊界清楚，避免不必要的抽象與重構。
- 即時資料失敗時不得以舊資料偽裝最新結果。
- LLM 失敗時必須明確標示 fallback，不得偽裝成 AI 判斷。
- 所有外部輸入、LLM 輸出與 API response 都需通過 schema validation。
- 不提交 secrets、私有憑證、個人帳戶資料或不可公開的交易紀錄。

## 詳細文件

- 完整產品規格、資料契約、風險規則與驗收標準：[`docs/product/PROJECT_SPEC.md`](docs/product/PROJECT_SPEC.md)
- 官方活動規則、提交要求與原始內容鏡像：[`docs/hackathon/OFFICIAL_HACKATHON_REQUIREMENTS.md`](docs/hackathon/OFFICIAL_HACKATHON_REQUIREMENTS.md)

實作前先閱讀以上兩份文件；若文件與程式行為不一致，先更新規格並確認，再修改程式。

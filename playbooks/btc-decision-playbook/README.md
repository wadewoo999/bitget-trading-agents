# BTC Decision Playbook

本 Playbook 是針對 `BTCUSDT`、`4h` timeframe 的第一版 deterministic 決策策略，目標是把 repo 目前的 BTC Decision Engine 收斂成一個可回放、可回測、可驗證的 GetAgent package。這一版只保留可重播的技術面與成交參與度訊號，不依賴歷史對齊尚未確認的 funding / open interest，因此更適合作為第一個最小可用回測版本。

## 策略

策略核心分成三個方向：趨勢、動能、參與度。趨勢看 close 與 EMA20 / EMA50 / EMA100 / EMA200 的排序；動能看 MACD histogram 與 RSI band 是否同向；參與度看當前成交量是否高於前 20 根平均，且 price return 是否和方向一致。三者綜合後形成 market bias score，再依波動風險做保守調整。

這一版明確保留產品原則：低信心不強迫出手。當訊號不足、彼此衝突，或分數落在中性區時，策略輸出 `WAIT`，在 GetAgent signal 中對應 `hold`。

## 開倉（开仓）

- 只有在 warm-up 完成後才允許決策。
- 當趨勢、動能、參與度加權後得到明確偏多，且 confidence 達到可行動區間時，發出 `LONG`。
- 當三類訊號加權後得到明確偏空，且 confidence 達到可行動區間時，發出 `SHORT`。
- 若分數不足、波動過高後被壓回中性，或結構沒有明顯方向，則維持 `WAIT` / `hold`。

## 平倉（平仓）

- 已有 `LONG` 倉位時，只要最新 deterministic decision 不再支持 `LONG`，就平倉。
- 已有 `SHORT` 倉位時，只要最新 deterministic decision 不再支持 `SHORT`，就平倉。
- 若方向直接反轉，策略會先平舊倉，再依新方向開新倉。
- live execution 預設是 `signal_only`，因此正式執行階段只發 signal，不直接跟單。

## 參數

- `leverage`：只影響部位放大程度，不會提高訊號品質。數值越高，收益與 drawdown 都會同步放大。
- `margin_budget`：定義每個策略實例願意拿來承擔風險的保證金預算，也作為平台解讀策略報酬率的基準。
- `trading_symbols`：第一版固定只允許 `BTCUSDT`，避免 package 名稱、回測合約、signal symbol 與 README 描述不一致。

## 風險（风险）

- 這是偏 trend-following 的策略，在盤整、假突破、事件驅動急反轉時容易連續被洗出。
- 第一版故意不使用 funding / OI crowding，代表它比 repo live analysis 少了一層衍生品擁擠度保護。
- `WAIT` 很多不代表策略失效，反而是刻意遵守「低信心先不交易」的產品規則。
- 回測結果只能證明這套 deterministic 規則在指定歷史區間中的表現，不保證未來市場仍會維持相同結構。

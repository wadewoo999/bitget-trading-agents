# Strategy Support and Strategy Lab Design

## 1. 目的

本設計要同時解決兩個問題：

1. `Strategy Lab` 不能只是獨立附屬功能，而要成為主頁分析的策略支撐層。
2. 主頁目前的 `LONG / SHORT / WAIT` 分析過於單薄，需要補上一層「哪種策略風格支持這個結論」。

本設計不改變產品的核心定位。主頁仍然先做即時市場分析；`Strategy Lab` 則提供策略驗證、歷史回測與風格比較。

## 2. 設計原則

- 主頁與 `Strategy Lab` 必須共享同一套預設策略定義，不能各自發展不同邏輯。
- 第一版只做預設策略，不做自由策略編輯器。
- 主頁顯示摘要，不顯示完整回測明細。
- `Strategy Lab` 顯示完整回測明細，但不改寫主頁即時決策，也不自動建立 paper trade。
- 策略推薦規則必須簡單、可解釋、可重現。

## 3. 產品結構

產品分成三層：

### 3.1 即時市場分析層

延續目前主頁既有能力：

- timeframe 選擇
- mode 選擇
- stance 輸入
- market snapshot
- indicators
- deterministic decision engine
- `LONG / SHORT / WAIT`
- paper trading

這一層回答：

- 現在市場怎麼看？

### 3.2 策略支援層

這是新增在主頁上的一層，位於即時 decision 與 paper trading 之間。

它不直接改寫主頁 decision，而是補充：

- 目前最推薦哪一種策略風格
- 該策略是否支持當前方向
- 另外兩種策略是否也支持
- 這些策略在歷史上的簡短表現如何

這一層回答：

- 如果要依某種交易風格參與現在市場，哪一種風格最合適？

### 3.3 Strategy Lab 層

`Strategy Lab` 是完整策略驗證區。

它負責：

- profile 選擇
- timeframe 選擇
- optional idea 輸入
- 顯示策略規則
- 執行 deterministic backtest
- 顯示 metrics、equity curve、recent trades

這一層回答：

- 這套策略在過去是否可行？

## 4. 預設策略模型

第一版只做三個預設策略：

- 激進
- 平衡
- 穩健

三個策略不是三套完全獨立的世界觀，而是共用同一套核心分析骨架：

- trend
- momentum
- participation
- volatility

差異只在：

- 適用 timeframe
- 進場門檻
- 出場門檻
- 風險偏好

### 4.1 激進策略

- 適用 timeframe：`15m`、`1h`
- 定位：較快節奏、較早進場、較容忍雜訊
- 主頁角色：回答短線視角是否支持目前方向

策略特徵：

- 訊號數量較多
- 假突破容忍度較高
- 回撤通常較大
- 更容易支持當下進場

### 4.2 平衡策略

- 適用 timeframe：`4h`、`1d`
- 定位：中間型、穩定度與訊號品質折衷
- 主頁角色：主頁推薦策略的預設優先候選

策略特徵：

- trend、momentum、participation 都需要明確支持
- 訊號數量中等
- 穩定度最適合一般使用者

### 4.3 穩健策略

- 適用 timeframe：`1d`、`1week`
- 定位：較慢、較保守、較重視結構清晰度
- 主頁角色：在盤面不乾淨時提供保守視角

策略特徵：

- 訊號最少
- 最容易輸出 `WAIT`
- 回撤通常較小
- 容易錯過較早期的趨勢啟動

## 5. 主頁推薦策略規則

主頁推薦策略不是靜態寫死，而是由三段規則組成。

### 5.1 基礎預設

- `15m` / `1h`：優先激進
- `4h`：優先平衡
- `1d`：優先穩健

### 5.2 保守修正

如果目前主頁 decision 是 `WAIT`，代表盤面不夠乾淨，推薦策略需往更保守方向偏移一級。

例：

- `4h` 原本預設平衡 → 修正為穩健優先

### 5.3 積極修正

如果目前 confidence 很高，且 trend / momentum / participation 高度一致，推薦策略可往更積極方向偏移一級。

例：

- `4h` 原本預設平衡 → 若市場結構極強，可提示激進策略也支持

### 5.4 設計限制

- 第一版只允許偏移一級，不做更複雜的推薦分數模型。
- 推薦策略必須能用簡短文案解釋原因。

## 6. 主頁 UI 設計

### 6.1 區塊位置

新增「策略支援」區塊，放在：

- `Decision Card` 下方
- `Paper Trading` 上方

主頁閱讀順序變成：

1. 即時市場結論
2. 推薦策略與其他策略支援情況
3. Paper Trading

### 6.2 推薦策略卡

主頁預設只顯示一張推薦策略主卡，內容固定包含：

- 策略名稱
- 策略態度：
  - 支持 `LONG`
  - 支持 `SHORT`
  - 建議 `WAIT`
  - 保留
- 推薦原因
- 適用 timeframe
- 簡短歷史摘要：
  - win rate
  - max drawdown
  - trade count
- CTA：
  - 查看策略詳情
  - 前往 `Strategy Lab` 驗證

這張卡的用途不是展示完整回測，而是建立：

- 現在市場結論
- 哪種交易風格最支持這個結論

之間的連結。

### 6.3 其他兩個策略的展開比較

主頁允許使用者展開查看另外兩個策略，但預設不展開。

另外兩張卡為簡版卡，只顯示：

- 策略名稱
- 策略態度
- 一句原因
- 一行歷史摘要
- 前往 `Strategy Lab`

比較欄位固定一致：

- 策略態度
- 信號嚴格度
- 歷史勝率
- 最大回撤
- 是否適合目前 timeframe

## 7. Strategy Lab UI 設計

`Strategy Lab` 保持為完整策略驗證區，不搬完整內容回主頁。

建議固定閱讀順序：

1. 策略選擇區
   - profile
   - timeframe
   - optional idea
2. 策略設定摘要
   - entry rules
   - exit rules
   - risk per trade
3. 回測結果摘要卡
   - total return
   - win rate
   - max drawdown
   - sharpe ratio
   - trade count
4. equity curve
5. recent trades
6. 補充說明
   - fee
   - slippage
   - data source
   - limitations

## 8. 主頁與 Strategy Lab 的資料流

資料流定義如下：

1. 主頁先執行既有 `/api/analyze`
2. 系統根據：
   - timeframe
   - decision action
   - confidence
   - trend / momentum / participation 一致性
   算出推薦策略
3. 主頁顯示：
   - 推薦策略主卡
   - 其他兩個策略的簡版比較
4. 使用者進入 `Strategy Lab` 時：
   - 自動帶入推薦策略
   - 自動帶入目前 timeframe
5. `Strategy Lab` 顯示完整回測結果

重要邊界：

- 主頁不是回測頁
- `Strategy Lab` 不是即時決策頁
- 兩者共享策略模板與回測摘要，但不混成同一個功能

## 9. 實作邊界

### 9.1 本階段包含

- 三個預設策略
- deterministic backtest
- 主頁策略支援摘要
- `Strategy Lab` 驗證頁
- 主頁到 `Strategy Lab` 的預設帶入

### 9.2 本階段不包含

- 自由策略編輯器
- 使用者自訂完整 entry / exit 規則
- 用 live data 即時重跑完整 backtest
- 用 `Strategy Lab` 直接建立 paper trade
- 多幣種策略

## 10. 建議實作順序

1. 上線 `/api/backtest`
2. 完成 `Strategy Lab` panel UI
3. 在主頁新增推薦策略卡
4. 加入另外兩個策略的展開比較
5. 補上主頁進入 `Strategy Lab` 的預設帶入
6. 最後補強文案、可讀性與視覺整理

## 11. 驗收標準

完成後應滿足：

- 主頁仍保留目前即時分析主流程
- 主頁新增一個可解釋的推薦策略區塊
- 使用者可展開查看另外兩個策略
- `Strategy Lab` 能顯示完整回測摘要與明細
- 主頁與 `Strategy Lab` 共用同一套預設策略定義
- `Strategy Lab` 不會自動建立 paper trade
- 使用者可從主頁順暢進入 `Strategy Lab` 驗證推薦策略

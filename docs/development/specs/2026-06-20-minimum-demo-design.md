# Minimum Executable Demo Design

## 1. Goal

Build the first executable and verifiable vertical slice of the BTC Trading Decision Agent for the Bitget AI Base Camp Hackathon S1 Trading Agent track.

The Demo must let a user:

1. Choose a BTCUSDT timeframe and initial market stance.
2. Analyze either live Bitget data or clearly labeled sample data.
3. Receive an explainable deterministic LONG, SHORT, or WAIT decision.
4. Confirm the system direction before opening one paper position.
5. Manually close the position and export an auditable ledger.

This version does not include Strategy Lab, a runtime LLM, real-money trading, multi-asset support, news, on-chain data, or macro data.

## 2. User Inputs

### Timeframe

- `15m`
- `1h`
- `4h`
- `1d`

### Initial stance

- `unsure`: the system provides its direction without comparing it to a user thesis.
- `long`: the system reports whether data supports, opposes, or is insufficient for a long thesis.
- `short`: the system reports whether data supports, opposes, or is insufficient for a short thesis.

### Data mode

- `live`: fetch current Bitget market data through the Agent Hub `bitget-core` package.
- `sample`: load a frozen repository fixture and display `SAMPLE DATA` persistently.

Sample mode is a fallback and reproducibility tool. It must never be presented as current market data or submitted as live paper-trading evidence.

## 3. Architecture

Use one Next.js deployment with two boundaries.

### Server

- Validate API input.
- Fetch live data through `bitget-core`, or load the selected sample fixture.
- Normalize ticker, candles, funding, and open-interest responses.
- Calculate indicators.
- Produce the deterministic decision and risk warnings.
- Return source timestamps and data-completeness metadata.
- Never expose Bitget credentials or provide a real trading endpoint.

### Browser

- Collect timeframe, stance, and mode.
- Render analysis, score, reasons, warnings, and invalidation condition.
- Calculate and persist one paper position and its ledger.
- Store paper state in localStorage only.
- Export JSON and CSV.

No database, authentication, background worker, MCP sidecar, or product LLM is used in this Demo.

## 4. Market Data

### Live mode

For `BTCUSDT`, request:

- Current futures ticker.
- 300 futures candles for the selected timeframe.
- Current funding rate.
- Current open interest.

Remove an in-progress candle before analysis. At least 250 closed, chronological, non-duplicated candles are required.

Candles and ticker are mandatory. Funding and OI are optional context:

- Missing candles or ticker: reject the analysis.
- Missing funding: mark the field unavailable, use a neutral crowding signal, and add a warning.
- Missing OI: mark the context field unavailable and add a warning; OI does not affect the Demo score.
- Never substitute a fixture or stale value inside a live response.

### Sample mode

Store one immutable fixture per timeframe under `fixtures/market/`. Each fixture contains:

- 300 closed candles.
- Ticker.
- Funding rate.
- Open interest.
- Source URL identifiers.
- Capture timestamp.
- Fixture version.

The same fixtures drive Sample mode and automated tests.

## 5. Indicators

Calculate from closed candles only:

- EMA 20, 50, 100, and 200.
- RSI 14.
- MACD and histogram.
- ATR 14.
- Current volume change against the preceding 20-bar average.
- Current funding rate.
- Current OI as non-directional market context.

[Bitget's public OI endpoint](https://www.bitget.com/api-doc/classic/contract/market/Get-Open-Interest) and the current Agent Hub tool expose a point-in-time OI snapshot but no historical OI series. The Demo therefore displays current OI without using it in the directional score. A later phase may add a shared database and scheduler to accumulate historical OI and calculate timeframe-aligned changes.

The API response exposes calculated values, not all 300 raw candles. The UI may receive only the most recent chart window needed for display.

## 6. Deterministic Decision Engine

### Category signals

Each directional category emits `-1`, `0`, or `1`.

- Trend, weight 40:
  - `1` when `close > EMA20 > EMA50 > EMA100 > EMA200`.
  - `-1` for the exact reverse ordering.
  - `0` otherwise.
- Momentum, weight 25:
  - `1` when MACD histogram is positive and RSI is between 50 and 70.
  - `-1` when MACD histogram is negative and RSI is between 30 and 50.
  - `0` otherwise. RSI outside 30–70 adds an overextended warning.
- Participation, weight 20:
  - `1` when the 20-bar price return is positive and current volume is above its preceding 20-bar average.
  - `-1` when the return is negative and current volume is above that average.
  - `0` otherwise.
- Crowding, weight 10:
  - `1` when funding is below `-0.01%`, indicating short crowding.
  - `-1` when funding is above `0.01%`, indicating long crowding.
  - `0` inside that range or when funding is unavailable.

Calculate the raw score:

```text
rawScore = 50 + 0.5 × (
  40 × trend
  + 25 × momentum
  + 20 × participation
  + 10 × crowding
)
```

### Volatility risk

Calculate `ATR14 / close` for the latest 100 valid bars. When the current ratio is above its 80th percentile, mark volatility high and move the raw score 10% toward neutral:

```text
marketBiasScore = 50 + (rawScore - 50) × 0.9
```

Otherwise, `marketBiasScore = rawScore`. Round the final score to an integer and clamp it to `0–100`.

### Decision and confidence

```text
0–40   → SHORT
41–59  → WAIT
60–100 → LONG

confidence = max(marketBiasScore, 100 - marketBiasScore)
```

Therefore every actionable result has confidence of at least 60, and `confidence < 60` always produces WAIT.

### Stance assessment

- `unsure`: assessment is `neutral`.
- User `long` + system LONG: `supported`.
- User `long` + system SHORT: `opposed`.
- User `short` + system SHORT: `supported`.
- User `short` + system LONG: `opposed`.
- Any user stance + system WAIT: `insufficient`.

The decision includes category signals, human-readable reasons, warnings, and one invalidation condition derived from the nearest relevant EMA and latest closed candle.

## 7. APIs

### `POST /api/analyze`

Request:

```ts
interface AnalyzeRequest {
  symbol: "BTCUSDT";
  timeframe: "15m" | "1h" | "4h" | "1d";
  stance: "unsure" | "long" | "short";
  mode: "live" | "sample";
}
```

Response adds the existing market and decision contracts plus:

- `marketBiasScore`.
- `stanceAssessment`.
- Category signals.
- Latest ticker price and ATR used for paper-trade preview.
- `mode`, source timestamps, last closed candle timestamp, fixture version when applicable, and completeness warnings.

### `GET /api/price?mode=live|sample`

Return the current BTCUSDT ticker used at paper open or close time. Sample mode returns the fixture ticker and remains visibly labeled sample.

### Errors

Return a stable JSON envelope:

```ts
interface ApiError {
  error: {
    code:
      | "INVALID_INPUT"
      | "MARKET_DATA_UNAVAILABLE"
      | "INSUFFICIENT_CANDLES"
      | "UPSTREAM_TIMEOUT"
      | "INTERNAL_ERROR";
    message: string;
  };
}
```

Do not expose upstream response bodies, credentials, or stack traces.

## 8. Paper Trading

### Account rules

- Initial balance: 10,000 USDT.
- At most one open BTCUSDT position per browser.
- Actionable direction is always the system LONG or SHORT result; the user cannot reverse it.
- WAIT and failed analyses cannot create a position.
- Opening and closing fee: 0.06% each side.
- No leverage; position notional cannot exceed current balance.

### Preview

At confirmation time, call `/api/price` and use that value as entry.

```text
stopDistance = 1.5 × ATR14
takeProfitDistance = 3 × ATR14
riskBudget = currentBalance × 0.01
estimatedStopFees = entry × 0.0006 + stopPrice × 0.0006
riskQuantity = riskBudget / (stopDistance + estimatedStopFees)
notionalQuantity = currentBalance / entry
quantity = min(riskQuantity, notionalQuantity)
```

LONG uses `entry - stopDistance` and `entry + takeProfitDistance`; SHORT reverses them.

### Lifecycle

- User confirms or cancels the preview.
- Confirm creates an OPEN record and deducts the opening fee.
- An open position blocks another OPEN.
- User manually closes at the latest `/api/price` value.
- CLOSE calculates realized PnL, closing fee, and new balance.
- SL and TP are displayed as risk references but are not background-triggered in this Demo.

Persist account, open position, and ledger in localStorage with a versioned storage key. Corrupt or unsupported stored data resets safely to the initial account and displays a reset notice.

Every ledger record includes data mode. JSON and CSV exports preserve timestamp, symbol, timeframe, side, event, price, quantity, fee, PnL, and balance before/after.

## 9. User Interface

Use one page with these states:

```text
Initial → Loading → Decision → Preview → Position Open → Closed
             ↘ Error
```

The page contains:

- Persistent Live or Sample badge and source timestamp.
- Timeframe selector.
- Initial stance selector.
- Analyze action.
- Price chart window and indicator summary.
- Decision card with score, action, confidence, stance assessment, reasons, warnings, and invalidation.
- Paper-trade preview or current-position card.
- Account balance, ledger summary, and JSON/CSV export.

No page should display simulated metrics as live data. Loading, incomplete-data, API failure, and localStorage reset states are explicit.

## 10. Verification

### Unit tests

- EMA 20/50/100/200, RSI, MACD, and ATR against known fixtures.
- Bullish score produces LONG, bearish score produces SHORT, conflict produces WAIT.
- Score stays inside `0–100`; confidence matches the score formula.
- All stance-assessment combinations.
- Position quantity includes fee risk, respects 1% risk, and caps notional at balance.
- LONG and SHORT PnL, fees, and balance changes.
- Single-position restriction, storage restore/reset, and JSON/CSV export.

### Integration tests

- Agent Hub response normalization to analysis response.
- Mandatory-data failure and optional derivatives-data warning.
- Live and Sample modes never mix sources.
- Analyze input validation and error envelope.
- Price endpoint in both modes.

### Browser acceptance

1. Public Vercel URL works without login.
2. User selects timeframe, stance, and Live or Sample.
3. Decision displays score, direction, confidence, reasons, warnings, timestamps, and source mode.
4. LONG/SHORT can be previewed and confirmed; WAIT cannot.
5. A second position is blocked while one is open.
6. Manual close updates balance and ledger.
7. Reload restores account state.
8. JSON and CSV download successfully.
9. Sample records remain labeled sample.
10. No real trading operation or credential appears in client code, logs, exports, or repository.

## 11. Deliverables

- Public GitHub source and reproducible fixtures.
- Public Vercel Demo.
- Automated test suite.
- One exported Live paper-trading evidence file.
- README covering setup, validation commands, architecture, data modes, limitations, and evidence format.

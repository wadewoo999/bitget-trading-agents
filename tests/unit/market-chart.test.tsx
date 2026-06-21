import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MarketChart } from "@/components/dashboard/market-chart";

function buildCandles() {
  return [
    {
      openTime: "2026-06-20T00:00:00.000Z",
      closeTime: "2026-06-20T00:59:59.999Z",
      open: 100000,
      high: 100120,
      low: 99920,
      close: 100080,
      volume: 1000,
    },
    {
      openTime: "2026-06-20T01:00:00.000Z",
      closeTime: "2026-06-20T01:59:59.999Z",
      open: 100080,
      high: 100180,
      low: 100000,
      close: 100040,
      volume: 1200,
    },
    {
      openTime: "2026-06-20T02:00:00.000Z",
      closeTime: "2026-06-20T02:59:59.999Z",
      open: 100040,
      high: 100220,
      low: 100010,
      close: 100200,
      volume: 1400,
    },
  ];
}

describe("MarketChart", () => {
  it("renders candlesticks with timeframe-aware header and latest market meta", () => {
    const { container } = render(
      <MarketChart
        timeframe="1h"
        price={100200}
        fetchedAt="2026-06-20T02:30:00.000Z"
        candles={buildCandles()}
      />,
    );

    expect(screen.getByText("最新價格")).toBeInTheDocument();
    expect(screen.getByText("1h")).toBeInTheDocument();
    expect(screen.getByText("100200.00")).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "BTCUSDT 1h candlestick chart" })).toBeInTheDocument();
    expect(container.querySelectorAll("[data-candle-body='true']")).toHaveLength(3);
    expect(container.querySelector("[data-ema-line='ema20']")).not.toBeNull();
  });

  it("renders a single candle without invalid chart coordinates", () => {
    const { container } = render(
      <MarketChart
        timeframe="15m"
        price={100080}
        fetchedAt="2026-06-20T00:15:00.000Z"
        candles={[buildCandles()[0]!]}
      />,
    );

    const body = container.querySelector("[data-candle-body='true']");
    const emaLine = container.querySelector("[data-ema-line='ema20']");

    expect(body).not.toBeNull();
    expect(body?.getAttribute("x")).not.toContain("NaN");
    expect(body?.getAttribute("y")).not.toContain("NaN");
    expect(emaLine?.getAttribute("d")).toContain("M350,");
    expect(emaLine?.getAttribute("d")).not.toContain("NaN");
  });
});

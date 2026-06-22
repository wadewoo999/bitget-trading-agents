import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import HomePage from "@/app/page";

describe("HomePage", () => {
  it("renders the real Sample analysis workspace", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: "釐清當前 BTC 交易方向" })).toBeInTheDocument();
    expect(screen.getByText(/SAMPLE DATA/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "分析市場" })).toBeInTheDocument();

    const controls = screen.getByText("TIMEFRAME").closest("aside");
    expect(controls).not.toBeNull();
    ["15m", "1h", "4h", "1d"].forEach((label) =>
      expect(within(controls as HTMLElement).getByRole("button", { name: label })).toBeInTheDocument(),
    );
  });
});

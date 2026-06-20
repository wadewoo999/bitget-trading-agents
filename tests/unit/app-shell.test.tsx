import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "@/app/page";

describe("HomePage", () => {
  it("identifies the product and its hackathon track", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: "BTC Trading Decision Agent" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Bitget AI Base Camp Hackathon S1/i),
    ).toBeInTheDocument();
    expect(screen.getByText("MVP Foundation")).toBeInTheDocument();
  });

  it("links to the approved project documents", () => {
    render(<HomePage />);

    expect(screen.getByRole("link", { name: "Product specification" })).toHaveAttribute(
      "href",
      "https://github.com/wadewoo999/bitget-trading-agents/blob/main/docs/product/PROJECT_SPEC.md",
    );
    expect(screen.getByRole("link", { name: "Hackathon requirements" })).toHaveAttribute(
      "href",
      "https://github.com/wadewoo999/bitget-trading-agents/blob/main/docs/hackathon/OFFICIAL_HACKATHON_REQUIREMENTS.md",
    );
  });
});

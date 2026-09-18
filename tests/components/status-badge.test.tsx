import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CircleCheck } from "lucide-react";

import { StatusBadge } from "@/components/shared/status-badge";

describe("StatusBadge", () => {
  it("always renders the text label", () => {
    render(<StatusBadge tone="success" label="Paid" />);
    expect(screen.getByText("Paid")).toBeInTheDocument();
  });

  it("exposes the tone for styling and tests", () => {
    render(<StatusBadge tone="danger" label="Overdue" />);
    expect(screen.getByText("Overdue")).toHaveAttribute("data-tone", "danger");
  });

  it("applies the tone classes without needing !important", () => {
    render(<StatusBadge tone="success" label="Paid" />);
    const badge = screen.getByText("Paid");

    expect(badge.className).toContain("text-success");
    expect(badge.className).toContain("bg-success/15");

    // No important-flagged colour utility, leading (`!bg-x`) or trailing
    // (`bg-x!`). The primitive's own `[&>svg]:size-3!` is unrelated sizing.
    expect(badge.className).not.toMatch(/(?:^|\s)!(?:bg|text|border|ring)-/);
    expect(badge.className).not.toMatch(/(?:bg|text|border|ring)-[a-z0-9./-]+!/);
  });

  it("uses the colourless status shell so tones are not fought by the primitive", () => {
    render(<StatusBadge tone="warning" label="Unpaid" />);
    const badge = screen.getByText("Unpaid");

    expect(badge).toHaveAttribute("data-variant", "status");
    // The secondary variant's surface class is what previously forced `!`.
    expect(badge.className).not.toContain("control-surface-secondary");
  });

  it("hides a decorative icon from assistive technology", () => {
    const { container } = render(
      <StatusBadge tone="info" label="Sent" icon={CircleCheck} />,
    );

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("renders no icon when none is supplied", () => {
    const { container } = render(<StatusBadge tone="neutral" label="Draft" />);
    expect(container.querySelector("svg")).toBeNull();
  });

  it("merges a caller className without losing the tone", () => {
    render(<StatusBadge tone="attention" label="Expired" className="mt-1" />);
    const badge = screen.getByText("Expired");

    expect(badge.className).toContain("mt-1");
    expect(badge.className).toContain("text-orange-700");
  });
});

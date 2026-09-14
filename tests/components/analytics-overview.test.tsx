import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { AnalyticsDeltaPill } from "@/features/analytics/components/analytics-delta-pill";
import { AnalyticsFunnelVisual } from "@/features/analytics/components/analytics-funnel-visual";
import { AnalyticsKpiCard } from "@/features/analytics/components/analytics-kpi-card";
import { CheckCircle2, FileText, Globe } from "lucide-react";

describe("AnalyticsDeltaPill", () => {
  it("labels positive movement as an increase versus the prior period", () => {
    render(<AnalyticsDeltaPill label="+12%" direction="up" />);
    const pill = screen.getByLabelText("Change versus prior period: +12%");
    expect(pill).toHaveTextContent("+12%");
    expect(pill.className).toContain("text-success");
  });

  it("inverts sentiment for lower-is-better metrics", () => {
    render(<AnalyticsDeltaPill label="−8%" direction="down" inverted />);
    expect(screen.getByLabelText("Change versus prior period: −8%").className).toContain(
      "text-success",
    );
  });

  it("renders flat movement as neutral", () => {
    render(<AnalyticsDeltaPill label="No change" direction="flat" />);
    expect(screen.getByLabelText("Change versus prior period: No change").className).toContain(
      "text-muted-foreground",
    );
  });
});

describe("AnalyticsKpiCard", () => {
  it("renders the icon tile, title, value, and delta pill", () => {
    render(
      <AnalyticsKpiCard
        icon={CheckCircle2}
        title="Won"
        value="12"
        delta={{ label: "+20%", direction: "up" }}
        description="80% acceptance"
      />,
    );
    expect(screen.getByText("Won")).toBeVisible();
    expect(screen.getByText("12")).toBeVisible();
    expect(screen.getByText("80% acceptance")).toBeVisible();
    expect(screen.getByLabelText("Change versus prior period: +20%")).toBeVisible();
  });

  it("flat variant renders borderless stat blocks without card chrome", () => {
    const { container } = render(
      <AnalyticsKpiCard variant="flat" icon={CheckCircle2} title="Won" value="12" />,
    );
    expect(container.querySelector('[data-slot="card"]')).toBeNull();
    expect(screen.getByText("Won")).toBeVisible();
    expect(screen.getByText("12")).toBeVisible();
  });

  it("flat variant supports a custom value treatment for attention metrics", () => {
    render(
      <AnalyticsKpiCard
        variant="flat"
        icon={CheckCircle2}
        title="Overdue"
        value="3"
        valueClassName="text-destructive"
      />,
    );
    expect(screen.getByText("3").className).toContain("text-destructive");
  });
});

describe("AnalyticsFunnelVisual", () => {
  const steps = [
    { label: "Visitors", count: 100 },
    { label: "Submissions", count: 40 },
    { label: "Quoted", count: 15 },
    { label: "Accepted", count: 5 },
  ];

  it("shows each stage as a share of the first stage with legend totals", () => {
    render(<AnalyticsFunnelVisual steps={steps} />);
    const visual = screen.getByRole("img");
    expect(visual).toHaveAttribute(
      "aria-label",
      "Funnel: Visitors 100, Submissions 40, Quoted 15, Accepted 5",
    );
    // Per-stage pills read as % of the first stage (100%, 40%, 15%, 5%).
    expect(within(visual).getByText("100%")).toBeVisible();
    expect(within(visual).getByText("40%")).toBeVisible();
    expect(within(visual).getByText("5%")).toBeVisible();
    // Legend rows carry the raw counts.
    expect(screen.getByText("Visitors")).toBeVisible();
    expect(screen.getByText("Accepted")).toBeVisible();
  });

  it("renders an empty state when there is no funnel activity", () => {
    render(<AnalyticsFunnelVisual steps={[]} />);
    expect(screen.getByText(/No funnel activity yet/)).toBeVisible();
  });
});

describe("AnalyticsKpiCard icons", () => {
  it("marks decorative icons as hidden from assistive tech", () => {
    const { container } = render(
      <AnalyticsKpiCard icon={FileText} title="Quotes sent" value="3" />,
    );
    expect(container.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  });

  it("renders the call-site icon component", () => {
    const { container } = render(
      <AnalyticsKpiCard icon={Globe} title="Sources" value="5" />,
    );
    expect(container.querySelector("svg")).not.toBeNull();
  });
});

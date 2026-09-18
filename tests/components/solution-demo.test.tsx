import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { solutionDetails } from "@/components/marketing/solutions-data";
import { SolutionDemo } from "@/components/marketing/solutions/solution-demo";

const contractors = solutionDetails["contractors-home-services"];
const creative = solutionDetails["creative-marketing"];

describe("SolutionDemo journey", () => {
  it("opens on the first stage with a persistent identity bar", () => {
    render(<SolutionDemo tabs={contractors.demoTabs} />);

    expect(
      screen.getByRole("heading", {
        name: contractors.demoTabs[0]?.stageHeadline,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Sarah Jenkins.*Kitchen Renovation.*\$21,400/),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(4);
    expect(screen.getByRole("tab", { selected: true })).toHaveTextContent(
      "Project inquiry",
    );
  });

  it("switching tabs updates the narrative and mock while the identity persists", async () => {
    const user = userEvent.setup();
    render(<SolutionDemo tabs={contractors.demoTabs} />);

    await user.click(screen.getByRole("tab", { name: /Paid/ }));

    expect(
      screen.getByRole("heading", {
        name: contractors.demoTabs[3]?.stageHeadline,
      }),
    ).toBeInTheDocument();
    // Stage mocks reuse the decorative homepage mock frame (aria-hidden),
    // so assert on the tabpanel's rendered text instead of a11y queries.
    const panel = screen.getByRole("tabpanel");
    expect(panel.textContent).toContain("Balance due");
    expect(panel.textContent).toContain("$0");
    // The same record never changes.
    expect(
      screen.getByText(/Sarah Jenkins.*Kitchen Renovation.*\$21,400/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: contractors.demoTabs[0]?.stageHeadline,
      }),
    ).not.toBeInTheDocument();
  });

  it("marks visited stages complete and supports arrow-key travel", async () => {
    const user = userEvent.setup();
    render(<SolutionDemo tabs={contractors.demoTabs} />);

    const tablist = screen.getByRole("tablist");
    const firstTab = within(tablist).getByRole("tab", {
      name: /Project inquiry/,
    });
    firstTab.focus();
    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("tab", { selected: true })).toHaveTextContent(
      "Quote",
    );
    expect(
      screen.getByRole("heading", {
        name: contractors.demoTabs[1]?.stageHeadline,
      }),
    ).toBeInTheDocument();
  });

  it("renders industry-specific stages (approval instead of follow-up)", async () => {
    const user = userEvent.setup();
    render(<SolutionDemo tabs={creative.demoTabs} />);

    expect(
      screen.getByText(/Northstar Studio.*Brand Identity.*\$4,800/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Approval/ }));

    expect(
      screen.getByRole("heading", {
        name: creative.demoTabs[2]?.stageHeadline,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Northstar Studio.*Brand Identity.*\$4,800/),
    ).toBeInTheDocument();
  });

  it("renders nothing without tabs", () => {
    const { container } = render(<SolutionDemo tabs={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

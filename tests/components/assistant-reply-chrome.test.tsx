import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import { CopyButton } from "@/components/shared/chat/copy-button";
import {
  ToolProcessDisclosure,
  type ToolStep,
} from "@/components/shared/chat/tool-process-disclosure";
import { ToolResultRenderer } from "@/features/owner-assistant/components/tool-result-cards";
import type { ConfirmationRequiredResult } from "@/features/owner-assistant/types";

const STEPS: ToolStep[] = [
  {
    id: "call_1",
    toolName: "search_inquiries",
    label: "Searching inquiries",
    input: { status: "new", limit: 5 },
  },
  {
    id: "call_2",
    toolName: "get_inquiry_stats",
    label: "Calculating inquiry stats",
    failed: true,
  },
];

describe("ToolProcessDisclosure", () => {
  it("summarises the run and reveals the steps on click", async () => {
    const user = userEvent.setup();
    render(<ToolProcessDisclosure steps={STEPS} />);

    const trigger = screen.getByRole("button", {
      name: /Worked with 2 tools/,
    });
    // Collapsed by default: the process is available, not in the way.
    expect(screen.queryByRole("list")).not.toBeInTheDocument();

    await user.click(trigger);

    const steps = await screen.findByRole("list");
    expect(steps).toHaveTextContent("Searching inquiries");
    expect(steps).toHaveTextContent(
      "search_inquiries(status: new, limit: 5)",
    );
    expect(steps).toHaveTextContent("get_inquiry_stats()");
  });

  it("names a single-step run after that step", () => {
    render(<ToolProcessDisclosure steps={[STEPS[0]]} />);

    expect(
      screen.getByRole("button", { name: /Searching inquiries/ }),
    ).toBeInTheDocument();
  });

  it("renders nothing when a turn ran no tools", () => {
    const { container } = render(<ToolProcessDisclosure steps={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe("CopyButton", () => {
  const writeText = vi.fn(async () => {});

  beforeEach(() => {
    writeText.mockClear();
    // `userEvent.setup()` installs its own clipboard stub, so this suite drives
    // the button with `fireEvent` and keeps the spy that the component sees.
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
  });

  it("copies the reply and announces the confirmation", async () => {
    render(<CopyButton value="Three inquiries came in this week." />);

    fireEvent.click(screen.getByRole("button", { name: "Copy reply" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        "Three inquiries came in this week.",
      );
    });
    // The only visual change is the icon, so the state is announced politely.
    expect(
      await screen.findByRole("button", { name: "Copied" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Copied to clipboard")).toBeInTheDocument();
  });
});

describe("ToolResultRenderer confirmations", () => {
  it("fires confirm and cancel callbacks with the confirmation id", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const confirmation: ConfirmationRequiredResult = {
      type: "confirmation_required",
      confirmationId: "confirm_123",
      operation: "send_quote",
      parameters: {},
      confirmationPrompt: "Send quote Q-12 to Ana?",
      riskLevel: "high",
      summary: "Confirmation required to send quote",
    };

    render(
      <ToolResultRenderer
        businessSlug="demo"
        onCancel={onCancel}
        onConfirm={onConfirm}
        result={confirmation}
      />,
    );

    expect(screen.getByText("Send quote Q-12 to Ana?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledWith("confirm_123");

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledWith("confirm_123");
  });

  it("renders structured inquiry lists as scannable cards", () => {
    render(
      <ToolResultRenderer
        businessSlug="demo"
        result={{
          type: "inquiry_list",
          summary: "Found 1 inquiries",
          data: {
            results: [
              {
                id: "inq_1",
                customerName: "Ana Torres",
                customerEmail: "ana@example.com",
                status: "new",
                serviceCategory: "Signage",
                source: "manual-dashboard",
                aiAssisted: false,
                createdAt: new Date("2026-09-01T10:00:00Z").toISOString(),
              },
            ],
            total: 1,
            hasMore: false,
          },
        }}
      />,
    );

    expect(screen.getByText("Ana Torres")).toBeInTheDocument();
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
  });
});

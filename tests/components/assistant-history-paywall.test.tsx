import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

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
    <a href={typeof href === "string" ? href : "#"} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/features/owner-assistant/actions", () => ({
  listAssistantSessionsAction: vi.fn(async () => ({
    sessions: [
      {
        id: "oas_1",
        title: "First conversation",
        lastMessageAt: new Date("2026-09-01T10:00:00Z").toISOString(),
        createdAt: new Date("2026-09-01T09:00:00Z").toISOString(),
      },
      {
        id: "oas_2",
        title: null,
        lastMessageAt: new Date("2026-08-30T10:00:00Z").toISOString(),
        createdAt: new Date("2026-08-30T09:00:00Z").toISOString(),
      },
    ],
    total: 2,
    hasMore: false,
  })),
  renameAssistantSessionAction: vi.fn(async () => ({ ok: true })),
  deleteAssistantSessionAction: vi.fn(async () => ({ ok: true })),
}));

import {
  listAssistantSessionsAction,
  renameAssistantSessionAction,
  deleteAssistantSessionAction,
} from "@/features/owner-assistant/actions";
import { AssistantHistorySidebar } from "@/features/owner-assistant/components/assistant-history-sidebar";
import { ToolResultRenderer } from "@/features/owner-assistant/components/tool-result-cards";
import type { ConfirmationRequiredResult } from "@/features/owner-assistant/types";

describe("AssistantHistorySidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists conversations with titles and supports collapse", async () => {
    render(
      <AssistantHistorySidebar businessSlug="demo" activeSessionId="oas_1" />,
    );

    expect(await screen.findByText("First conversation")).toBeInTheDocument();
    expect(screen.getByText("New conversation")).toBeInTheDocument();

    const collapse = screen.getByRole("button", { name: "Collapse history" });
    fireEvent.click(collapse);

    expect(
      screen.getByRole("button", { name: "Expand history" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("First conversation")).not.toBeInTheDocument();
  });

  it("renames a conversation through the server action", async () => {
    render(
      <AssistantHistorySidebar businessSlug="demo" activeSessionId="oas_1" />,
    );

    await screen.findByText("First conversation");

    fireEvent.click(
      screen.getByRole("button", { name: "Rename conversation First conversation" }),
    );

    const input = screen.getByLabelText("Conversation title");
    fireEvent.change(input, { target: { value: "Renamed thread" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(renameAssistantSessionAction).toHaveBeenCalledWith({
        businessSlug: "demo",
        sessionId: "oas_1",
        title: "Renamed thread",
      });
    });
    expect(await screen.findByText("Renamed thread")).toBeInTheDocument();
  });

  it("deletes a conversation after a two-step confirm", async () => {
    render(
      <AssistantHistorySidebar businessSlug="demo" activeSessionId="oas_2" />,
    );

    await screen.findByText("First conversation");

    fireEvent.click(
      screen.getByRole("button", { name: "Delete conversation First conversation" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(deleteAssistantSessionAction).toHaveBeenCalledWith({
        businessSlug: "demo",
        sessionId: "oas_1",
      });
    });
    expect(screen.queryByText("First conversation")).not.toBeInTheDocument();
  });

  it("opens history in a sheet on mobile", async () => {
    render(
      <AssistantHistorySidebar businessSlug="demo" activeSessionId={null} />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Open conversation history" }),
    );

    // The sheet portals a second copy alongside the hidden desktop list.
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("First conversation");
    expect(listAssistantSessionsAction).toHaveBeenCalled();
  });
});

describe("ToolResultRenderer confirmations", () => {
  it("fires confirm and cancel callbacks with the confirmation id", async () => {
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
        result={confirmation}
        businessSlug="demo"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText("Send quote Q-12 to Ana?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledWith("confirm_123");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledWith("confirm_123");
  });

  it("renders structured inquiry lists as scannable cards", () => {
    render(
      <ToolResultRenderer
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
        businessSlug="demo"
      />,
    );

    expect(screen.getByText("Ana Torres")).toBeInTheDocument();
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
  });
});

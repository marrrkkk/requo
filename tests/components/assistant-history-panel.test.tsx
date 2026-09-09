import type { ReactNode } from "react";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  deleteAssistantSessionActionMock,
  listAssistantSessionsActionMock,
  pushMock,
  renameAssistantSessionActionMock,
  useIsMobileMock,
} = vi.hoisted(() => ({
  deleteAssistantSessionActionMock: vi.fn(),
  listAssistantSessionsActionMock: vi.fn(),
  pushMock: vi.fn(),
  renameAssistantSessionActionMock: vi.fn(),
  useIsMobileMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={typeof href === "string" ? href : "#"} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: useIsMobileMock,
}));

vi.mock("@/features/owner-assistant/actions", () => ({
  deleteAssistantSessionAction: deleteAssistantSessionActionMock,
  listAssistantSessionsAction: listAssistantSessionsActionMock,
  renameAssistantSessionAction: renameAssistantSessionActionMock,
}));

import { AssistantHistoryPanel } from "@/features/owner-assistant/components/assistant-history-panel";
import { clearAssistantHistoryCache } from "@/features/owner-assistant/components/assistant-history-cache";

const SESSIONS = [
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
];

/**
 * Open the panel and wait for the first page of conversations.
 *
 * The list lives inside the popover (or sheet) content, so nothing is fetched
 * or rendered until the trigger is used — every list assertion goes through
 * here.
 */
async function openHistory(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole("button", { name: "Open conversation history" }),
  );
  await screen.findByText("First conversation");
}

describe("AssistantHistoryPanel", () => {
  beforeEach(() => {
    clearAssistantHistoryCache();
    pushMock.mockReset();
    useIsMobileMock.mockReset();
    useIsMobileMock.mockReturnValue(false);
    listAssistantSessionsActionMock.mockReset();
    listAssistantSessionsActionMock.mockResolvedValue({
      sessions: SESSIONS,
      total: SESSIONS.length,
      hasMore: false,
    });
    renameAssistantSessionActionMock.mockReset();
    renameAssistantSessionActionMock.mockResolvedValue({ ok: true });
    deleteAssistantSessionActionMock.mockReset();
    deleteAssistantSessionActionMock.mockResolvedValue({ ok: true });
  });

  it("loads conversations only once the panel is opened", async () => {
    const user = userEvent.setup();
    render(<AssistantHistoryPanel activeSessionId="oas_1" businessSlug="demo" />);

    expect(listAssistantSessionsActionMock).not.toHaveBeenCalled();
    expect(screen.queryByText("First conversation")).not.toBeInTheDocument();

    await openHistory(user);

    expect(listAssistantSessionsActionMock).toHaveBeenCalledWith({
      businessSlug: "demo",
      limit: 20,
      offset: 0,
    });
    expect(screen.getByText("2 saved conversations")).toBeInTheDocument();
    // The untitled session still gets a readable label.
    expect(screen.getByText("New conversation")).toBeInTheDocument();
  });

  it("labels the list and marks the open conversation as current", async () => {
    const user = userEvent.setup();
    render(<AssistantHistoryPanel activeSessionId="oas_1" businessSlug="demo" />);

    await openHistory(user);

    expect(
      screen.getByRole("list", { name: "Past conversations" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /First conversation/ }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("link", { name: /New conversation/ }),
    ).not.toHaveAttribute("aria-current");
  });

  it("renames a conversation through the server action", async () => {
    const user = userEvent.setup();
    render(<AssistantHistoryPanel activeSessionId="oas_1" businessSlug="demo" />);

    await openHistory(user);

    await user.click(
      screen.getByRole("button", {
        name: "Rename conversation First conversation",
      }),
    );

    const input = screen.getByLabelText("Conversation title");
    await user.clear(input);
    await user.type(input, "Renamed thread");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(renameAssistantSessionActionMock).toHaveBeenCalledWith({
        businessSlug: "demo",
        sessionId: "oas_1",
        title: "Renamed thread",
      });
    });
    expect(await screen.findByText("Renamed thread")).toBeInTheDocument();
  });

  it("deletes a conversation after a two-step confirm", async () => {
    const user = userEvent.setup();
    render(<AssistantHistoryPanel activeSessionId="oas_2" businessSlug="demo" />);

    await openHistory(user);

    await user.click(
      screen.getByRole("button", {
        name: "Delete conversation First conversation",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(deleteAssistantSessionActionMock).toHaveBeenCalledWith({
        businessSlug: "demo",
        sessionId: "oas_1",
      });
    });
    expect(screen.queryByText("First conversation")).not.toBeInTheDocument();
    // Deleting a conversation the owner is not reading leaves them in place.
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("opens history in a titled sheet on mobile", async () => {
    useIsMobileMock.mockReturnValue(true);
    const user = userEvent.setup();
    render(<AssistantHistoryPanel activeSessionId={null} businessSlug="demo" />);

    await openHistory(user);

    // The mobile path is a sheet, named by its (visually hidden) title; the
    // desktop popover carries no accessible name.
    const sheet = await screen.findByRole("dialog", { name: "Conversations" });
    expect(sheet).toHaveTextContent("First conversation");
  });

  it("navigates away when the conversation being read is deleted", async () => {
    const user = userEvent.setup();
    render(<AssistantHistoryPanel activeSessionId="oas_1" businessSlug="demo" />);

    await openHistory(user);

    await user.click(
      screen.getByRole("button", {
        name: "Delete conversation First conversation",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/demo/assistant");
    });
  });

  it("reopens instantly from cache while revalidating in the background", async () => {
    const user = userEvent.setup();
    render(<AssistantHistoryPanel activeSessionId="oas_1" businessSlug="demo" />);

    await openHistory(user);
    expect(listAssistantSessionsActionMock).toHaveBeenCalledTimes(1);

    // Close the popover, then hang the next fetch: cached rows must still
    // paint immediately with no loading skeleton.
    await user.keyboard("{Escape}");
    listAssistantSessionsActionMock.mockImplementationOnce(
      () => new Promise(() => {}),
    );

    await user.click(
      screen.getByRole("button", { name: "Open conversation history" }),
    );

    // Cached content is synchronous — no `findBy` wait, no skeleton.
    expect(screen.getByText("First conversation")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Loading conversations"),
    ).not.toBeInTheDocument();
    expect(listAssistantSessionsActionMock).toHaveBeenCalledTimes(2);
  });
});

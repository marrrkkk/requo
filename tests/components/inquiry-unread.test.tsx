import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BoarduiMainSidebar } from "@/components/shell/boardui-main-sidebar";
import {
  NavBadgeProvider,
  NavBadgeSync,
} from "@/components/shell/nav-badge-context";
import { markInquiryViewedAction } from "@/features/inquiries/actions";
import { InquiryViewedTracker } from "@/features/inquiries/components/inquiry-viewed-tracker";
import {
  isInquiryViewedLocally,
} from "@/features/inquiries/components/inquiry-viewed-store";
import { InquiryListCards } from "@/features/inquiries/components/inquiry-list-cards";
import { InquiryListTable } from "@/features/inquiries/components/inquiry-list-table";
import type { DashboardInquiryListItem } from "@/features/inquiries/types";

vi.mock("next/navigation", () => ({
  usePathname: () => "/acme/home",
}));

vi.mock("@/features/inquiries/actions", () => ({
  markInquiryViewedAction: vi.fn(),
}));

function listItem(overrides: Partial<DashboardInquiryListItem>): DashboardInquiryListItem {
  return {
    id: "inq_1",
    businessInquiryFormId: null,
    inquiryFormName: null,
    inquiryFormSlug: null,
    source: "manual",
    customerName: "Uma Unread",
    customerEmail: "uma@example.com",
    serviceCategory: null,
    budgetText: null,
    status: "new",
    recordState: "active",
    subject: null,
    archivedAt: null,
    escalated: false,
    pendingFollowUpCount: 0,
    nextFollowUpDueAt: null,
    hasDuplicateFlag: false,
    isUnread: false,
    submittedAt: new Date("2026-09-01T10:00:00Z"),
    createdAt: new Date("2026-09-01T10:00:00Z"),
    ...overrides,
  };
}

describe("Inquiries nav badge", () => {
  it("shows the unread count on the Inquiries row once streamed in", () => {
    render(
      <NavBadgeProvider>
        <NavBadgeSync value={4} />
        <BoarduiMainSidebar businessSlug="acme" />
      </NavBadgeProvider>,
    );

    expect(
      screen.getByRole("link", { name: "Inquiries, 4 unread" }),
    ).toBeDefined();
  });

  it("hides the badge at zero and while still streaming", () => {
    const { unmount } = render(
      <NavBadgeProvider>
        <NavBadgeSync value={0} />
        <BoarduiMainSidebar businessSlug="acme" />
      </NavBadgeProvider>,
    );

    expect(screen.getByRole("link", { name: "Inquiries" })).toBeDefined();
    expect(screen.queryByRole("link", { name: "Inquiries, 0 unread" })).toBeNull();
    unmount();

    render(
      <NavBadgeProvider>
        <BoarduiMainSidebar businessSlug="acme" />
      </NavBadgeProvider>,
    );

    expect(screen.getByRole("link", { name: "Inquiries" })).toBeDefined();
  });
});

describe("Inquiries list unread rows", () => {
  const unread = listItem({ id: "inq_unread", isUnread: true });
  const read = listItem({
    id: "inq_read",
    customerName: "Rita Read",
    customerEmail: "rita@example.com",
  });

  it("marks unread table rows with a dot, screen-reader text, and bold name", () => {
    const { container } = render(
      <InquiryListTable inquiries={[unread, read]} businessSlug="acme" />,
    );

    // Exactly one unread marker across both rows.
    expect(screen.getAllByText("Unread:")).toHaveLength(1);
    expect(
      container.querySelectorAll('span[aria-hidden="true"].rounded-full'),
    ).toHaveLength(1);

    expect(
      screen.getByRole("link", { name: "Uma Unread" }).className,
    ).toContain("font-semibold");
    expect(
      screen.getByRole("link", { name: "Rita Read" }).className,
    ).not.toContain("font-semibold");
  });

  it("marks unread card rows with a dot and screen-reader text", () => {
    const { container } = render(
      <InquiryListCards inquiries={[unread, read]} businessSlug="acme" />,
    );

    expect(screen.getAllByText("Unread:")).toHaveLength(1);
    expect(
      container.querySelectorAll('span[aria-hidden="true"].rounded-full'),
    ).toHaveLength(1);
  });
});

describe("InquiryViewedTracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderTracker(inquiryId: string, marked: boolean) {
    vi.mocked(markInquiryViewedAction).mockResolvedValue({ marked });

    render(
      <NavBadgeProvider>
        <NavBadgeSync value={4} />
        <InquiryViewedTracker inquiryId={inquiryId} isUnreadInitially />
        <BoarduiMainSidebar businessSlug="acme" />
      </NavBadgeProvider>,
    );
  }

  it("marks the id locally and decrements the badge on first view", async () => {
    renderTracker("inq_track_first", true);

    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: "Inquiries, 3 unread" }),
      ).toBeDefined();
    });
    expect(isInquiryViewedLocally("inq_track_first")).toBe(true);
    expect(markInquiryViewedAction).toHaveBeenCalledWith("inq_track_first");
  });

  it("marks the id locally but keeps the badge on revisits", async () => {
    renderTracker("inq_track_revisit", false);

    // Badge streams in at 4 and must stay there — the server already knew
    // this inquiry (stale detail payload said unread, DB said viewed).
    await waitFor(() => {
      expect(markInquiryViewedAction).toHaveBeenCalledWith(
        "inq_track_revisit",
      );
    });
    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: "Inquiries, 4 unread" }),
      ).toBeDefined();
    });
    expect(
      screen.queryByRole("link", { name: "Inquiries, 3 unread" }),
    ).toBeNull();
    expect(isInquiryViewedLocally("inq_track_revisit")).toBe(true);
  });

  it("does nothing when the detail already shows read", () => {
    vi.mocked(markInquiryViewedAction).mockResolvedValue({ marked: true });

    render(
      <NavBadgeProvider>
        <NavBadgeSync value={4} />
        <InquiryViewedTracker
          inquiryId="inq_track_already_read"
          isUnreadInitially={false}
        />
        <BoarduiMainSidebar businessSlug="acme" />
      </NavBadgeProvider>,
    );

    expect(markInquiryViewedAction).not.toHaveBeenCalled();
    expect(isInquiryViewedLocally("inq_track_already_read")).toBe(false);
  });
});

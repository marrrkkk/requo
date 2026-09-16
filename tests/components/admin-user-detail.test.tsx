import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

const { replaceMock, refreshMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("@/hooks/use-progress-router", () => ({
  useProgressRouter: () => ({ replace: replaceMock, refresh: refreshMock }),
}));

vi.mock("@/features/admin/mutations", () => ({
  forceVerifyEmailAction: vi.fn(),
  revokeAllSessionsAction: vi.fn(),
  suspendUserAction: vi.fn(),
  unsuspendUserAction: vi.fn(),
  promoteToAdminAction: vi.fn(),
  demoteFromAdminAction: vi.fn(),
  deleteUserAction: vi.fn(),
  manualPlanOverrideAction: vi.fn(),
  forceCancelSubscriptionAction: vi.fn(),
}));

import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminUserDetail } from "@/features/admin/components/admin-user-detail";
import type { AdminUserDetail as AdminUserDetailPayload } from "@/features/admin/types";

function makeUser(
  overrides: Partial<AdminUserDetailPayload> = {},
): AdminUserDetailPayload {
  return {
    id: "user_1",
    email: "owen@example.com",
    name: "Owen Owner",
    emailVerified: false,
    banned: false,
    banReason: null,
    role: "user",
    createdAt: new Date("2026-08-01T09:00:00Z"),
    lastSessionAt: new Date("2026-09-10T09:00:00Z"),
    subscription: null,
    ownedBusinesses: [
      { id: "biz_1", name: "Acme Plumbing", slug: "acme", plan: "pro" },
    ],
    activeSessionCount: 2,
    recentAuditLogs: [
      {
        id: "audit_1",
        adminUserId: "admin_1",
        adminEmail: "admin@example.com",
        action: "user.suspend",
        targetType: "user",
        targetId: "user_1",
        metadata: null,
        ipAddress: null,
        userAgent: null,
        createdAt: new Date("2026-09-11T09:00:00Z"),
      },
    ],
    canDemoteTarget: true,
    ...overrides,
  };
}

function renderDetail(user: AdminUserDetailPayload) {
  return render(
    <TooltipProvider>
      <AdminUserDetail adminUserId="admin_1" user={user} />
    </TooltipProvider>,
  );
}

describe("AdminUserDetail", () => {
  it("renders identity in the header with account badges", () => {
    renderDetail(makeUser());

    const header = screen
      .getByRole("heading", { name: "owen@example.com" })
      .closest(".dashboard-detail-header")!;
    const headerScope = within(header as HTMLElement);
    expect(headerScope.getByText("Owen Owner")).toBeInTheDocument();
    expect(headerScope.getByText("User")).toBeInTheDocument();
    expect(headerScope.getByText("Active")).toBeInTheDocument();
    expect(headerScope.getByText("Unverified")).toBeInTheDocument();
  });

  it("renders the toolbar with user actions but no billing actions", () => {
    renderDetail(makeUser());

    for (const label of [
      "Verify email",
      "Revoke sessions",
      "Suspend",
      "Promote to admin",
      "Impersonate",
      "Delete",
    ]) {
      expect(
        screen.getByRole("button", { name: new RegExp(label) }),
      ).toBeInTheDocument();
    }
    // Plans live on businesses only — no account billing actions here.
    expect(
      screen.queryByRole("button", { name: /Change plan/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Cancel subscription/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Billing")).not.toBeInTheDocument();
    expect(screen.queryByText(/account subscription/i)).not.toBeInTheDocument();
  });

  it("renders overview stats, businesses feed, and audit feed", () => {
    renderDetail(makeUser());

    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Acme Plumbing")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open" }),
    ).toHaveAttribute("href", "/admin/businesses/biz_1");
    expect(screen.getByText("Suspended user")).toBeInTheDocument();
  });

  it("keeps record metadata in the sidebar without raw ids or back links", () => {
    renderDetail(makeUser());

    const record = screen
      .getByText("Record")
      .closest('[data-slot="card"]') as HTMLElement;
    const recordScope = within(record);
    expect(recordScope.getByText("Created")).toBeInTheDocument();
    expect(recordScope.getByText("Last session")).toBeInTheDocument();
    expect(recordScope.queryByText(/user_1/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /back to users/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/all users/i)).not.toBeInTheDocument();
  });

  it("shows Reinstate instead of Suspend for suspended users", () => {
    renderDetail(makeUser({ banned: true, banReason: "Spam" }));

    expect(screen.getAllByText("Suspended").length).toBeGreaterThan(0);
    expect(screen.getByText("Spam")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Reinstate/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Suspend$/ }),
    ).not.toBeInTheDocument();
  });
});

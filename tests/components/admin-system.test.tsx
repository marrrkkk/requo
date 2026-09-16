import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/admin/audit-logs",
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

import { AdminAuditTable } from "@/features/admin/components/system/admin-audit-table";
import {
  AdminAccountsRoster,
  AdminRecentAuditPreview,
} from "@/features/admin/components/system/admin-system-page";
import type {
  AdminAuditLogRow,
  AdminUserRow,
} from "@/features/admin/types";

function makeAuditRow(overrides: Partial<AdminAuditLogRow> = {}): AdminAuditLogRow {
  return {
    id: "log_1",
    adminUserId: "admin_1",
    adminEmail: "root@example.com",
    action: "user.suspend",
    targetType: "user",
    targetId: "user_9",
    metadata: { targetEmail: "bad@example.com", reason: "spam" },
    ipAddress: "203.0.113.7",
    userAgent: "Mozilla/5.0",
    createdAt: new Date("2026-09-13T08:00:00Z"),
    ...overrides,
  };
}

function makeAdmin(overrides: Partial<AdminUserRow> = {}): AdminUserRow {
  return {
    id: "admin_1",
    email: "root@example.com",
    name: "Root Admin",
    emailVerified: true,
    banned: false,
    banReason: null,
    role: "admin",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    lastSessionAt: new Date("2026-09-13T07:00:00Z"),
    ...overrides,
  };
}

describe("AdminAuditTable", () => {
  it("renders action badges with labels, targets, and metadata", () => {
    render(
      <AdminAuditTable
        hasActiveFilters={false}
        items={[makeAuditRow()]}
      />,
    );

    const badge = screen.getByText("Suspended user");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("title", "user.suspend");
    expect(screen.getByText("user_9")).toBeInTheDocument();
    expect(screen.getByText(/bad@example.com/)).toBeInTheDocument();
  });

  it("marks confirmation failures as destructive", () => {
    render(
      <AdminAuditTable
        hasActiveFilters={false}
        items={[makeAuditRow({ action: "confirmation.failed", metadata: null })]}
      />,
    );

    expect(
      screen.getByText("Password re-confirmation failed"),
    ).toBeInTheDocument();
  });

  it("names empty states with and without filters", () => {
    const { rerender } = render(
      <AdminAuditTable hasActiveFilters={false} items={[]} />,
    );

    expect(
      screen.getByText(
        "Audit entries will appear here as admins view pages or run actions.",
      ),
    ).toBeInTheDocument();

    rerender(<AdminAuditTable hasActiveFilters items={[]} />);
    expect(
      screen.getByText(
        "No audit entries match the current filters. Try clearing one to broaden the view.",
      ),
    ).toBeInTheDocument();
  });
});

describe("AdminAccountsRoster", () => {
  it("renders each admin with status and an Open link", () => {
    render(
      <AdminAccountsRoster
        accounts={[
          makeAdmin(),
          makeAdmin({
            id: "admin_2",
            email: "suspended@example.com",
            banned: true,
            banReason: "compromised",
          }),
        ]}
      />,
    );

    expect(screen.getByText("root@example.com")).toBeInTheDocument();
    expect(screen.getByText("Suspended")).toBeInTheDocument();
    const links = screen.getAllByRole("link", { name: "Open" });
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "/admin/users/admin_1");
  });

  it("names the empty roster", () => {
    render(<AdminAccountsRoster accounts={[]} />);

    expect(screen.getByText("No admin accounts found.")).toBeInTheDocument();
  });
});

describe("AdminRecentAuditPreview", () => {
  it("renders recent entries with human labels", () => {
    render(
      <AdminRecentAuditPreview
        items={[
          makeAuditRow(),
          makeAuditRow({ id: "log_2", action: "view.dashboard" }),
        ]}
      />,
    );

    expect(screen.getByText("Suspended user")).toBeInTheDocument();
    expect(screen.getByText("Viewed dashboard")).toBeInTheDocument();
  });

  it("names the empty preview", () => {
    render(<AdminRecentAuditPreview items={[]} />);

    expect(screen.getByText("No admin activity yet.")).toBeInTheDocument();
  });
});

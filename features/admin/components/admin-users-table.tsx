"use client";

import { Users } from "lucide-react";

import { TruncatedTextWithTooltip } from "@/components/shared/truncated-text-with-tooltip";
import {
  AdminDataTable,
  type AdminDataTableColumn,
} from "@/features/admin/components/primitives/admin-data-table";
import {
  AdminUserStatusBadge,
  getAdminUserAccountStatus,
} from "@/features/admin/components/primitives/admin-status-badges";
import { getAdminUserDetailPath } from "@/features/admin/navigation";
import type { AdminUserRow } from "@/features/admin/types";

/** Short, repo-consistent date formatter for table cells. */
const tableDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatTableDate(value: Date | null): string {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return tableDateFormatter.format(date);
}

const adminUserColumns: AdminDataTableColumn<AdminUserRow>[] = [
  {
    id: "email",
    header: "Email",
    width: "w-[18rem]",
    cell: (user) => (
      <TruncatedTextWithTooltip
        className="table-link"
        href={getAdminUserDetailPath(user.id)}
        prefetch={true}
        text={user.email}
      />
    ),
  },
  {
    id: "name",
    header: "Name",
    width: "w-[12rem]",
    cell: (user) => (
      <TruncatedTextWithTooltip
        className="table-emphasis"
        href={getAdminUserDetailPath(user.id)}
        prefetch={true}
        text={user.name || "—"}
      />
    ),
  },
  {
    id: "status",
    header: "Status",
    width: "w-[9rem]",
    cell: (user) => (
      <AdminUserStatusBadge status={getAdminUserAccountStatus(user)} />
    ),
  },
  {
    id: "created",
    header: "Created",
    width: "w-[8rem]",
    cell: (user) => (
      <span className="text-sm text-muted-foreground">
        {formatTableDate(user.createdAt)}
      </span>
    ),
  },
  {
    id: "lastSession",
    header: "Last session",
    width: "w-[8rem]",
    cell: (user) => (
      <span className="text-sm text-muted-foreground">
        {formatTableDate(user.lastSessionAt)}
      </span>
    ),
  },
];

type AdminUsersTableProps = {
  users: AdminUserRow[];
  hasActiveFilters: boolean;
  toolbar?: React.ReactNode;
  pagination?: React.ReactNode;
};

/**
 * Admin users list on the shared `AdminDataTable`.
 *
 * Fixed `createdAt DESC` ordering (the list query owns it) — no sortable
 * columns. Account status renders through `AdminUserStatusBadge` so the
 * list shows the same suspended/unverified/admin treatment as the rest of
 * the console. Below `xl` each row becomes a `MobileRecordRow` card.
 */
export function AdminUsersTable({
  users,
  hasActiveFilters,
  toolbar,
  pagination,
}: AdminUsersTableProps) {
  return (
    <AdminDataTable
      columns={adminUserColumns}
      empty={{
        title: hasActiveFilters ? "No users match these filters." : "No users yet",
        description: hasActiveFilters
          ? "Try a different email, name, or status filter."
          : "No users yet. Sign-ups will appear here.",
        icon: Users,
      }}
      getRowHref={(user) => getAdminUserDetailPath(user.id)}
      getRowId={(user) => user.id}
      minWidthClass="min-w-[60rem]"
      mobileCard={(user) => ({
        title: user.email,
        subtitle: user.name || "No name",
        statusBadge: (
          <AdminUserStatusBadge status={getAdminUserAccountStatus(user)} />
        ),
        metadata: <span>Created {formatTableDate(user.createdAt)}</span>,
      })}
      pagination={pagination}
      rows={users}
      toolbar={toolbar}
    />
  );
}

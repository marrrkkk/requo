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
import { formatProductDate } from "@/features/admin/components/product/admin-product-format";
import { getAdminUserDetailPath } from "@/features/admin/navigation";
import type { AdminUserRow } from "@/features/admin/types";

const adminUserColumns: AdminDataTableColumn<AdminUserRow>[] = [
  {
    id: "user",
    header: "User",
    width: "w-[20rem]",
    cell: (user) => {
      const href = getAdminUserDetailPath(user.id);

      return (
        <div className="table-meta-stack max-w-full">
          <TruncatedTextWithTooltip
            className="table-link"
            href={href}
            prefetch={true}
            text={user.name || user.email}
          />
          <TruncatedTextWithTooltip
            className="table-supporting-text"
            href={href}
            prefetch={true}
            text={user.name ? user.email : "No name set"}
          />
        </div>
      );
    },
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
        {formatProductDate(user.createdAt)}
      </span>
    ),
  },
  {
    id: "lastSession",
    header: "Last session",
    width: "w-[8rem]",
    cell: (user) => (
      <span className="text-sm text-muted-foreground">
        {formatProductDate(user.lastSessionAt)}
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
 * the console. `flush` renders the table edge to edge inside the page's
 * list card (one frame, like the businesses list) instead of nesting a
 * second bordered container. Below `xl` each row becomes a `MobileRecordRow`
 * card.
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
      flush
      minWidthClass="min-w-[60rem]"
      mobileCard={(user) => ({
        title: user.name || user.email,
        subtitle: user.name ? user.email : "No name set",
        statusBadge: (
          <AdminUserStatusBadge status={getAdminUserAccountStatus(user)} />
        ),
        metadata: <span>Created {formatProductDate(user.createdAt)}</span>,
      })}
      pagination={pagination}
      rows={users}
      toolbar={toolbar}
    />
  );
}

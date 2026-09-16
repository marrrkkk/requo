"use client";

import { Mail } from "lucide-react";

import { TruncatedTextWithTooltip } from "@/components/shared/truncated-text-with-tooltip";
import { Badge } from "@/components/ui/badge";
import {
  AdminDataTable,
  type AdminDataTableColumn,
} from "@/features/admin/components/primitives/admin-data-table";
import { AdminEmailStatusBadge } from "@/features/admin/components/primitives/admin-status-badges";
import { formatAiDateTime } from "@/features/admin/components/ai/admin-ai-format";
import { getAdminEmailDetailPath } from "@/features/admin/navigation";
import type { AdminEmailRow } from "@/features/admin/types";

const adminEmailColumns: AdminDataTableColumn<AdminEmailRow>[] = [
  {
    id: "email",
    header: "Email",
    width: "w-[20rem]",
    cell: (row) => {
      const href = getAdminEmailDetailPath(row.id);

      return (
        <div className="table-meta-stack max-w-full">
          <TruncatedTextWithTooltip
            className="table-link"
            href={href}
            prefetch={true}
            text={row.subject}
          />
          <TruncatedTextWithTooltip
            className="table-supporting-text"
            href={href}
            prefetch={true}
            text={row.recipient || "No recipient"}
          />
        </div>
      );
    },
  },
  {
    id: "status",
    header: "Status",
    width: "w-[8rem]",
    cell: (row) => <AdminEmailStatusBadge status={row.status} />,
  },
  {
    id: "type",
    header: "Type",
    width: "w-[9rem]",
    cell: (row) => <Badge variant="ghost">{row.type}</Badge>,
  },
  {
    id: "business",
    header: "Business",
    width: "w-[12rem]",
    cell: (row) => (
      <TruncatedTextWithTooltip
        className="table-emphasis"
        href={getAdminEmailDetailPath(row.id)}
        prefetch={true}
        text={row.businessName || "—"}
      />
    ),
  },
  {
    id: "created",
    header: "Created",
    width: "w-[11rem]",
    cell: (row) => (
      <span className="text-sm whitespace-nowrap text-muted-foreground">
        {formatAiDateTime(row.createdAt)}
      </span>
    ),
  },
];

type AdminEmailsTableProps = {
  items: AdminEmailRow[];
  hasActiveFilters: boolean;
  toolbar?: React.ReactNode;
  pagination?: React.ReactNode;
};

/**
 * Admin emails list on the shared `AdminDataTable`.
 *
 * Fixed `createdAt DESC` ordering — no sortable columns. Delivery status
 * renders through `AdminEmailStatusBadge`. `flush` renders the table edge
 * to edge inside the page's list card (one frame, like the inquiries
 * list) instead of nesting a second bordered container. Below `xl` each
 * row becomes a `MobileRecordRow` card.
 */
export function AdminEmailsTable({
  items,
  hasActiveFilters,
  toolbar,
  pagination,
}: AdminEmailsTableProps) {
  return (
    <AdminDataTable
      columns={adminEmailColumns}
      empty={{
        title: hasActiveFilters
          ? "No emails match these filters."
          : "No emails yet",
        description: hasActiveFilters
          ? "Try a different subject, recipient, key, or filter."
          : "Transactional emails from every business will appear here.",
        icon: Mail,
      }}
      getRowHref={(row) => getAdminEmailDetailPath(row.id)}
      getRowId={(row) => row.id}
      flush
      minWidthClass="min-w-[64rem]"
      mobileCard={(row) => ({
        title: row.subject,
        subtitle: `${row.recipient || "No recipient"} · ${row.businessName || "No business"}`,
        statusBadge: <AdminEmailStatusBadge status={row.status} />,
        metadata: <span>Created {formatAiDateTime(row.createdAt)}</span>,
      })}
      pagination={pagination}
      rows={items}
      toolbar={toolbar}
    />
  );
}

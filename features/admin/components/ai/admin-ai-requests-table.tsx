"use client";

import { Cpu } from "lucide-react";

import { TruncatedTextWithTooltip } from "@/components/shared/truncated-text-with-tooltip";
import {
  AdminDataTable,
  type AdminDataTableColumn,
} from "@/features/admin/components/primitives/admin-data-table";
import { AdminAiStatusBadge } from "@/features/admin/components/primitives/admin-status-badges";
import {
  formatAiDateTime,
  formatCompactCount,
} from "@/features/admin/components/ai/admin-ai-format";
import type { AdminAiRequestRow } from "@/features/admin/types";

const adminAiRequestColumns: AdminDataTableColumn<AdminAiRequestRow>[] = [
  {
    id: "created",
    header: "Time",
    width: "w-[11rem]",
    cell: (row) => (
      <span className="text-sm whitespace-nowrap text-muted-foreground">
        {formatAiDateTime(row.createdAt)}
      </span>
    ),
  },
  {
    id: "provider",
    header: "Provider",
    width: "w-[8rem]",
    cell: (row) => (
      <span className="text-sm font-medium text-foreground">{row.provider}</span>
    ),
  },
  {
    id: "model",
    header: "Model",
    width: "w-[16rem]",
    cell: (row) => (
      <TruncatedTextWithTooltip
        className="font-mono text-xs text-foreground"
        text={row.model}
      />
    ),
  },
  {
    id: "task",
    header: "Task",
    width: "w-[10rem]",
    cell: (row) => (
      <TruncatedTextWithTooltip
        className="font-mono text-xs text-muted-foreground"
        text={row.taskType}
      />
    ),
  },
  {
    id: "status",
    header: "Status",
    width: "w-[7rem]",
    cell: (row) => (
      <AdminAiStatusBadge
        status={row.status === "error" ? "error" : "success"}
      />
    ),
  },
  {
    id: "tokens",
    header: "Tokens",
    width: "w-[7rem]",
    align: "right",
    cell: (row) => (
      <span className="text-sm tabular-nums text-foreground">
        {formatCompactCount(row.totalTokens)}
      </span>
    ),
  },
  {
    id: "latency",
    header: "Latency",
    width: "w-[7rem]",
    align: "right",
    cell: (row) => (
      <span className="text-sm tabular-nums text-muted-foreground">
        {row.latencyMs.toLocaleString("en-US")} ms
      </span>
    ),
  },
];

type AdminAiRequestsTableProps = {
  items: AdminAiRequestRow[];
  hasActiveFilters: boolean;
  toolbar?: React.ReactNode;
  pagination?: React.ReactNode;
};

/**
 * Admin AI request log on the shared `AdminDataTable`.
 *
 * Fixed `createdAt DESC` ordering — no sortable columns, no row detail
 * page. Failed rows carry the error badge; the message itself lives on
 * the Errors page. `flush` renders the table edge to edge inside the
 * page's list card (one frame, like the inquiries list) instead of
 * nesting a second bordered container.
 */
export function AdminAiRequestsTable({
  items,
  hasActiveFilters,
  toolbar,
  pagination,
}: AdminAiRequestsTableProps) {
  return (
    <AdminDataTable
      columns={adminAiRequestColumns}
      empty={{
        title: hasActiveFilters
          ? "No requests match these filters."
          : "No AI calls yet",
        description: hasActiveFilters
          ? "Try widening the provider, model, task, status, or date filters."
          : "Per-call provider, model, latency, and token records will appear here.",
        icon: Cpu,
      }}
      getRowId={(row) => row.id}
      flush
      minWidthClass="min-w-[72rem]"
      pagination={pagination}
      rows={items}
      toolbar={toolbar}
    />
  );
}

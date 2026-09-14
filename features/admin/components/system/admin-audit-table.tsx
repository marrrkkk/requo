"use client";

import { ScrollText } from "lucide-react";

import { TruncatedTextWithTooltip } from "@/components/shared/truncated-text-with-tooltip";
import { Badge } from "@/components/ui/badge";
import {
  AdminDataTable,
  type AdminDataTableColumn,
} from "@/features/admin/components/primitives/admin-data-table";
import {
  ADMIN_DASHBOARD_TARGET_ID,
  type AdminAction,
} from "@/features/admin/constants";
import {
  getAdminActionLabel,
  getAdminTargetTypeLabel,
} from "@/features/admin/labels";
import type { AdminAuditLogRow } from "@/features/admin/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const viewActionPrefixes = ["view."] as const;
const destructiveActionPrefixes = ["user.", "subscription.", "impersonation."];
const failureActions = new Set<AdminAction>(["confirmation.failed"]);

function getActionBadgeVariant(
  action: AdminAction,
): "default" | "secondary" | "destructive" | "outline" {
  if (failureActions.has(action)) {
    return "destructive";
  }

  if (viewActionPrefixes.some((prefix) => action.startsWith(prefix))) {
    return "secondary";
  }

  if (destructiveActionPrefixes.some((prefix) => action.startsWith(prefix))) {
    return "outline";
  }

  return "default";
}

function formatMetadataExcerpt(
  metadata: Record<string, unknown> | null,
): string | null {
  if (!metadata) {
    return null;
  }

  const keys = Object.keys(metadata);

  if (keys.length === 0) {
    return null;
  }

  try {
    return JSON.stringify(metadata);
  } catch {
    return null;
  }
}

function formatMetadataPretty(
  metadata: Record<string, unknown> | null,
): string | null {
  if (!metadata) {
    return null;
  }

  try {
    const pretty = JSON.stringify(metadata, null, 2);
    return pretty && pretty !== "{}" ? pretty : null;
  } catch {
    return null;
  }
}

function formatTargetIdForDisplay(targetId: string): string {
  if (targetId === ADMIN_DASHBOARD_TARGET_ID) {
    return "—";
  }

  return targetId;
}

const absoluteTimestampFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const adminAuditColumns: AdminDataTableColumn<AdminAuditLogRow>[] = [
  {
    id: "when",
    header: "When",
    width: "w-[11rem]",
    cell: (entry) => (
      <span
        className="block truncate text-sm font-medium text-foreground"
        suppressHydrationWarning
        title={entry.createdAt.toISOString()}
      >
        {absoluteTimestampFormatter.format(entry.createdAt)}
      </span>
    ),
  },
  {
    id: "admin",
    header: "Admin",
    width: "w-[14rem]",
    cell: (entry) => (
      <div className="table-meta-stack max-w-full">
        <TruncatedTextWithTooltip
          className="table-emphasis"
          text={entry.adminEmail}
        />
        <span className="truncate font-mono text-xs text-muted-foreground">
          {entry.adminUserId ?? "(removed)"}
        </span>
      </div>
    ),
  },
  {
    id: "action",
    header: "Action",
    width: "w-[13rem]",
    cell: (entry) => (
      <div className="flex flex-col items-start gap-1.5">
        <Badge variant={getActionBadgeVariant(entry.action)}>
          {getAdminActionLabel(entry.action)}
        </Badge>
        <span className="font-mono text-xs text-muted-foreground">
          {entry.action}
        </span>
      </div>
    ),
  },
  {
    id: "target",
    header: "Target",
    width: "w-[14rem]",
    cell: (entry) => (
      <div className="flex flex-col gap-1">
        <span className="meta-label">
          {getAdminTargetTypeLabel(entry.targetType)}
        </span>
        <TruncatedTextWithTooltip
          className="font-mono text-sm text-foreground"
          text={formatTargetIdForDisplay(entry.targetId)}
        />
      </div>
    ),
  },
  {
    id: "metadata",
    header: "Metadata",
    width: "w-[14rem]",
    cell: (entry) => {
      const excerpt = formatMetadataExcerpt(entry.metadata);
      const pretty = formatMetadataPretty(entry.metadata);

      if (!excerpt) {
        return <span className="text-xs text-muted-foreground">—</span>;
      }

      return (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block cursor-default truncate font-mono text-xs leading-5 text-muted-foreground">
                {excerpt}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-md whitespace-pre-wrap break-words">
              <pre className="font-mono text-xs leading-5">
                {pretty ?? excerpt}
              </pre>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    id: "request",
    header: "Request",
    width: "w-[11rem]",
    cell: (entry) => (
      <span
        className="block truncate font-mono text-xs text-muted-foreground"
        title={entry.userAgent ?? undefined}
      >
        {entry.ipAddress ?? "—"}
      </span>
    ),
  },
];

type AdminAuditTableProps = {
  items: AdminAuditLogRow[];
  hasActiveFilters: boolean;
  toolbar?: React.ReactNode;
  pagination?: React.ReactNode;
};

/**
 * Admin audit log on the shared `AdminDataTable`.
 *
 * Fixed `createdAt DESC` ordering (the list query owns it) — no sortable
 * columns, no row detail page. The metadata column keeps the excerpt +
 * pretty-JSON tooltip so the full row payload stays inspectable without
 * a dedicated detail view: audit rows carry `metadata` only, never
 * before/after JSON.
 */
export function AdminAuditTable({
  items,
  hasActiveFilters,
  toolbar,
  pagination,
}: AdminAuditTableProps) {
  return (
    <AdminDataTable
      columns={adminAuditColumns}
      empty={{
        title: "No audit entries",
        description: hasActiveFilters
          ? "No audit entries match the current filters. Try clearing one to broaden the view."
          : "Audit entries will appear here as admins view pages or run actions.",
        icon: ScrollText,
      }}
      getRowId={(entry) => entry.id}
      minWidthClass="min-w-[76rem]"
      pagination={pagination}
      rows={items}
      toolbar={toolbar}
    />
  );
}

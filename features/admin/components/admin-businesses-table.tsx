"use client";

import { Briefcase } from "lucide-react";

import { TruncatedTextWithTooltip } from "@/components/shared/truncated-text-with-tooltip";
import { Badge } from "@/components/ui/badge";
import {
  AdminDataTable,
  type AdminDataTableColumn,
} from "@/features/admin/components/primitives/admin-data-table";
import { getAdminBusinessDetailPath } from "@/features/admin/navigation";
import type { AdminBusinessRow } from "@/features/admin/types";
import { planMeta, type BusinessPlan } from "@/lib/plans";

function AdminBusinessPlanBadge({ plan }: { plan: BusinessPlan }) {
  return (
    <Badge variant={plan === "free" ? "outline" : "secondary"}>
      {planMeta[plan].label}
    </Badge>
  );
}

function formatAdminDate(value: Date) {
  return value.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const adminBusinessColumns: AdminDataTableColumn<AdminBusinessRow>[] = [
  {
    id: "business",
    header: "Business",
    width: "w-[18rem]",
    cell: (item) => {
      const href = getAdminBusinessDetailPath(item.id);

      return (
        <div className="table-meta-stack max-w-full">
          <TruncatedTextWithTooltip
            className="table-link"
            href={href}
            prefetch={true}
            text={item.name}
          />
          <TruncatedTextWithTooltip
            className="table-supporting-text"
            href={href}
            prefetch={true}
            text={item.slug}
          />
        </div>
      );
    },
  },
  {
    id: "owner",
    header: "Owner",
    width: "w-[16rem]",
    cell: (item) => (
      <TruncatedTextWithTooltip
        className="table-emphasis"
        href={getAdminBusinessDetailPath(item.id)}
        prefetch={true}
        text={item.ownerEmail}
      />
    ),
  },
  {
    id: "plan",
    header: "Plan",
    width: "w-[8rem]",
    cell: (item) => <AdminBusinessPlanBadge plan={item.plan} />,
  },
  {
    id: "members",
    header: "Members",
    width: "w-[8rem]",
    align: "right",
    cell: (item) => (
      <span className="text-sm tabular-nums text-muted-foreground">
        {item.memberCount.toLocaleString()}
      </span>
    ),
  },
  {
    id: "created",
    header: "Created",
    width: "w-[10rem]",
    cell: (item) => (
      <span className="text-sm text-muted-foreground">
        {formatAdminDate(item.createdAt)}
      </span>
    ),
  },
];

type AdminBusinessesTableProps = {
  items: AdminBusinessRow[];
  hasActiveFilters: boolean;
  toolbar?: React.ReactNode;
  pagination?: React.ReactNode;
};

/**
 * Admin businesses list on the shared `AdminDataTable`.
 *
 * Fixed `createdAt DESC` ordering (the list query owns it) — no sortable
 * columns. Below `xl` each row becomes a `MobileRecordRow` card.
 */
export function AdminBusinessesTable({
  items,
  hasActiveFilters,
  toolbar,
  pagination,
}: AdminBusinessesTableProps) {
  return (
    <AdminDataTable
      columns={adminBusinessColumns}
      empty={{
        title: hasActiveFilters ? "No matching businesses" : "No businesses yet",
        description: hasActiveFilters
          ? "No businesses match these filters. Try clearing the search or plan filter."
          : "No businesses have been created yet.",
        icon: Briefcase,
      }}
      getRowHref={(item) => getAdminBusinessDetailPath(item.id)}
      getRowId={(item) => item.id}
      minWidthClass="min-w-[72rem]"
      mobileCard={(item) => ({
        title: item.name,
        subtitle: `${item.slug} · ${item.ownerEmail}`,
        statusBadge: <AdminBusinessPlanBadge plan={item.plan} />,
        metadata: (
          <span>
            {item.memberCount.toLocaleString()}{" "}
            {item.memberCount === 1 ? "member" : "members"} · Created{" "}
            {formatAdminDate(item.createdAt)}
          </span>
        ),
      })}
      pagination={pagination}
      rows={items}
      toolbar={toolbar}
    />
  );
}

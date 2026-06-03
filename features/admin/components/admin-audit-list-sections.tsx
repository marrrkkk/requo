import { ScrollText } from "lucide-react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { AdminAuditTable } from "@/features/admin/components/admin-audit-table";
import { AdminListContentFallback } from "@/features/admin/components/list/admin-list-content-fallback";
import { AdminListControlsFallback } from "@/features/admin/components/list/admin-list-controls-fallback";
import type { AdminAction, AdminTargetType } from "@/features/admin/constants";
import { listAdminAuditLogs } from "@/features/admin/queries";
import { adminAuditLogListFiltersSchema } from "@/features/admin/schemas";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

export function AdminAuditListPageShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardPage>
      <PageHeader
        description="Every admin view and high-trust action, newest first."
        eyebrow="Admin"
        title="Audit"
      />
      {children}
    </DashboardPage>
  );
}

export async function AdminAuditListContentSection({
  rawParams,
}: {
  rawParams: SearchParamsRecord;
}) {
  const filters = adminAuditLogListFiltersSchema.safeParse(rawParams).data ?? {
    page: 1,
    pageSize: 50,
  };

  const { items, total } = await listAdminAuditLogs(filters);
  const pageSize = filters.pageSize;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, filters.page), totalPages);

  if (items.length === 0 && !hasAuditFilters(filters)) {
    return (
      <div className="data-list-empty-state flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center">
        <ScrollText className="size-8 text-muted-foreground" />
        <p className="font-medium text-foreground">No audit entries yet</p>
        <p className="text-sm text-muted-foreground">
          Admin views and actions will appear here.
        </p>
      </div>
    );
  }

  return (
    <AdminAuditTable
      currentPage={currentPage}
      filters={{
        adminUserId: filters.adminUserId ?? "",
        action: (filters.action ?? "all") as AdminAction | "all",
        targetType: (filters.targetType ?? "all") as AdminTargetType | "all",
        targetId: filters.targetId ?? "",
      }}
      items={items}
      pageSize={pageSize}
      searchParams={rawParams}
      totalItems={total}
      totalPages={totalPages}
    />
  );
}

function hasAuditFilters(
  filters: ReturnType<typeof adminAuditLogListFiltersSchema.safeParse>["data"],
) {
  if (!filters) return false;
  return Boolean(
    filters.adminUserId?.trim() ||
      filters.action ||
      filters.targetType ||
      filters.targetId?.trim(),
  );
}

export { AdminListControlsFallback, AdminListContentFallback };

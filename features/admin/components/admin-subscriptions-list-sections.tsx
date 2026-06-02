import { CreditCard } from "lucide-react";

import { DataListPagination } from "@/components/shared/data-list-pagination";
import {
  DashboardEmptyState,
  DashboardTableContainer,
} from "@/components/shared/dashboard-layout";
import { AdminListContentFallback } from "@/features/admin/components/list/admin-list-content-fallback";
import { AdminListControlsFallback } from "@/features/admin/components/list/admin-list-controls-fallback";
import { AdminSubscriptionsFilters } from "@/features/admin/components/admin-subscriptions-filters";
import { AdminSubscriptionsTableBody } from "@/features/admin/components/admin-subscriptions-table-body";
import { ADMIN_SUBSCRIPTIONS_PATH } from "@/features/admin/navigation";
import { listAdminSubscriptions } from "@/features/admin/queries";
import { adminSubscriptionsListFiltersSchema } from "@/features/admin/schemas";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type AdminSubscriptionsListSectionsProps = {
  rawParams: SearchParamsRecord;
};

export async function AdminSubscriptionsListControlsSection({
  rawParams,
}: AdminSubscriptionsListSectionsProps) {
  const filters =
    adminSubscriptionsListFiltersSchema.safeParse(rawParams).data ?? {
      page: 1,
      pageSize: 25,
    };
  const { total } = await listAdminSubscriptions(filters);

  return <AdminSubscriptionsFilters filters={filters} resultCount={total} />;
}

export async function AdminSubscriptionsListContentSection({
  rawParams,
}: AdminSubscriptionsListSectionsProps) {
  const filters =
    adminSubscriptionsListFiltersSchema.safeParse(rawParams).data ?? {
      page: 1,
      pageSize: 25,
    };

  const { items, total } = await listAdminSubscriptions(filters);
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));
  const currentPage = Math.min(Math.max(1, filters.page), totalPages);
  const hasFilters = Boolean(
    filters.search?.trim() || filters.status || filters.provider,
  );

  if (items.length === 0) {
    return (
      <DashboardEmptyState
        description={
          hasFilters
            ? "No subscriptions match the current filters."
            : "No account subscriptions have been created yet."
        }
        icon={CreditCard}
        title="No subscriptions found"
        variant="list"
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <DashboardTableContainer>
        <AdminSubscriptionsTableBody items={items} />
      </DashboardTableContainer>
      <DataListPagination
        currentPage={currentPage}
        pageSize={filters.pageSize}
        pathname={ADMIN_SUBSCRIPTIONS_PATH}
        searchParams={rawParams}
        totalItems={total}
        totalPages={totalPages}
      />
    </div>
  );
}

export { AdminListControlsFallback, AdminListContentFallback };

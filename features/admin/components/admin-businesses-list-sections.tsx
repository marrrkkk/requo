import { Briefcase } from "lucide-react";

import { DataListPagination } from "@/components/shared/data-list-pagination";
import {
  DashboardEmptyState,
  DashboardTableContainer,
} from "@/components/shared/dashboard-layout";
import { AdminBusinessesFilters } from "@/features/admin/components/admin-businesses-filters";
import { AdminBusinessesListCards } from "@/features/admin/components/admin-businesses-list-cards";
import { AdminBusinessesTableBody } from "@/features/admin/components/admin-businesses-table";
import { AdminListContentFallback } from "@/features/admin/components/list/admin-list-content-fallback";
import { AdminListControlsFallback } from "@/features/admin/components/list/admin-list-controls-fallback";
import { ADMIN_BUSINESSES_PATH } from "@/features/admin/navigation";
import { listAdminBusinesses } from "@/features/admin/queries";
import { adminBusinessesListFiltersSchema } from "@/features/admin/schemas";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type AdminBusinessesListSectionsProps = {
  rawParams: SearchParamsRecord;
};

export async function AdminBusinessesListControlsSection({
  rawParams,
}: AdminBusinessesListSectionsProps) {
  const filters = adminBusinessesListFiltersSchema.safeParse(rawParams).data ?? {
    page: 1,
    pageSize: 25,
  };
  const { total } = await listAdminBusinesses(filters);

  return <AdminBusinessesFilters filters={filters} resultCount={total} />;
}

export async function AdminBusinessesListContentSection({
  rawParams,
}: AdminBusinessesListSectionsProps) {
  const filters =
    adminBusinessesListFiltersSchema.safeParse(rawParams).data ?? {
      page: 1,
      pageSize: 25,
    };

  const { items, total } = await listAdminBusinesses(filters);
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));
  const currentPage = Math.min(Math.max(1, filters.page), totalPages);
  const hasFilters = Boolean(filters.search?.trim() || filters.plan);

  if (items.length === 0) {
    return (
      <DashboardEmptyState
        description={
          hasFilters
            ? "No businesses match these filters. Try clearing the search or plan filter."
            : "No businesses have been created yet."
        }
        icon={Briefcase}
        title={hasFilters ? "No matching businesses" : "No businesses yet"}
        variant="list"
      />
    );
  }

  const firstItemIndex = (currentPage - 1) * filters.pageSize + 1;
  const lastItemIndex = Math.min(currentPage * filters.pageSize, total);

  return (
    <div className="flex flex-col gap-5">
      <AdminBusinessesListCards items={items} />
      <DashboardTableContainer className="hidden xl:block">
        <AdminBusinessesTableBody
          firstItemIndex={firstItemIndex}
          items={items}
          lastItemIndex={lastItemIndex}
          totalItems={total}
        />
      </DashboardTableContainer>
      <DataListPagination
        currentPage={currentPage}
        pageSize={filters.pageSize}
        pathname={ADMIN_BUSINESSES_PATH}
        searchParams={rawParams}
        totalItems={total}
        totalPages={totalPages}
      />
    </div>
  );
}

export { AdminListControlsFallback, AdminListContentFallback };

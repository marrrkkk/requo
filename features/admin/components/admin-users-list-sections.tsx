import { Users } from "lucide-react";

import { DataListPagination } from "@/components/shared/data-list-pagination";
import { DashboardEmptyState } from "@/components/shared/dashboard-layout";
import { AdminListContentFallback } from "@/features/admin/components/list/admin-list-content-fallback";
import { AdminListControlsFallback } from "@/features/admin/components/list/admin-list-controls-fallback";
import { AdminUsersFilters } from "@/features/admin/components/admin-users-filters";
import { AdminUsersListCards } from "@/features/admin/components/admin-users-list-cards";
import { AdminUsersTable } from "@/features/admin/components/admin-users-table";
import { ADMIN_USERS_PATH } from "@/features/admin/navigation";
import { listAdminUsers } from "@/features/admin/queries";
import {
  adminUsersListFiltersSchema,
  type AdminUsersListFilters,
} from "@/features/admin/schemas";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type AdminUsersListSectionsProps = {
  rawParams: SearchParamsRecord;
};

export async function AdminUsersListControlsSection({
  rawParams,
}: AdminUsersListSectionsProps) {
  const filters = adminUsersListFiltersSchema.safeParse(rawParams).data ?? {
    page: 1,
    pageSize: 25,
    status: "all" as const,
  };
  const { total } = await listAdminUsers(filters);

  return <AdminUsersFilters filters={filters} resultCount={total} />;
}

export async function AdminUsersListContentSection({
  rawParams,
}: AdminUsersListSectionsProps) {
  const filters =
    adminUsersListFiltersSchema.safeParse(rawParams).data ??
    ({
      page: 1,
      pageSize: 25,
      status: "all",
    } satisfies AdminUsersListFilters);

  const { items, total } = await listAdminUsers(filters);
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));
  const hasFilters = Boolean(
    filters.search?.trim() || (filters.status && filters.status !== "all"),
  );

  if (items.length === 0) {
    return (
      <DashboardEmptyState
        description={
          hasFilters
            ? "Try a different email, name, or status filter."
            : "No users yet. Sign-ups will appear here."
        }
        icon={Users}
        title={hasFilters ? "No users match these filters." : "No users yet"}
        variant="list"
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <AdminUsersListCards users={items} />
      <div className="hidden xl:block">
        <AdminUsersTable users={items} />
      </div>
      <DataListPagination
        currentPage={filters.page}
        pageSize={filters.pageSize}
        pathname={ADMIN_USERS_PATH}
        searchParams={rawParams}
        totalItems={total}
        totalPages={totalPages}
      />
    </div>
  );
}

export { AdminListControlsFallback, AdminListContentFallback };

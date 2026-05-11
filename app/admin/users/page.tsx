import type { Metadata } from "next";
import { Suspense } from "react";

import { DataListPagination } from "@/components/shared/data-list-pagination";
import {
  DashboardEmptyState,
  DashboardSection,
} from "@/components/shared/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAdminUser } from "@/features/admin/access";
import { wrapAdminRouteWithViewLog } from "@/features/admin/audit";
import { AdminUsersTable } from "@/features/admin/components/admin-users-table";
import { AdminUsersToolbar } from "@/features/admin/components/admin-users-toolbar";
import { ADMIN_USERS_PATH } from "@/features/admin/navigation";
import { listAdminUsers } from "@/features/admin/queries";
import { adminUsersListFiltersSchema } from "@/features/admin/schemas";
import { createNoIndexMetadata } from "@/lib/seo/site";

import AdminLoading from "../loading";

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Users · Requo admin",
  description: "Search, inspect, and support Requo users.",
});

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type AdminUsersPageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

/**
 * Admin users list (task 12.2 / Req 3.1, 3.2, 3.3, 3.4).
 *
 * Uses the `q`, `page`, and `pageSize` URL params so the view stays
 * linkable. Default ordering is `createdAt desc` (Req 3.4) — the
 * server query handles that; the toolbar surfaces the ordering.
 *
 * The top-level component stays sync + wraps the async body in
 * `<Suspense>` so `cacheComponents` can stream the dynamic list
 * independently of the admin shell. The layout already writes a
 * `view.dashboard` audit row for the shell render; we refine the audit
 * here to `view.users` via `wrapAdminRouteWithViewLog` per Req 10.1.
 */
export default function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminUsersPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminUsersPageContent({
  searchParams,
}: AdminUsersPageProps) {
  const { session, user: admin } = await requireAdminUser();
  const rawParams = await searchParams;

  const renderPage = wrapAdminRouteWithViewLog(
    async () => renderUsersPage(rawParams),
    {
      adminUserId: admin.id,
      adminEmail: admin.email,
      impersonatedUserId: session.session?.impersonatedBy
        ? session.user.id
        : null,
    },
    {
      action: "view.users",
      targetType: "user",
    },
  );

  return renderPage();
}

async function renderUsersPage(rawParams: SearchParamsRecord) {
  const filters = adminUsersListFiltersSchema.parse(rawParams);
  const { items, total } = await listAdminUsers(filters);
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  return (
    <>
      <Suspense fallback={<AdminUsersToolbarFallback />}>
        <AdminUsersToolbar
          initialSearch={filters.search ?? ""}
          resultCount={total}
        />
      </Suspense>

      {items.length === 0 ? (
        <DashboardEmptyState
          description={
            filters.search
              ? "Try a different email or name."
              : "No users yet. Sign-ups will appear here."
          }
          title={
            filters.search ? "No users match that search." : "No users yet"
          }
          variant="list"
        />
      ) : (
        <DashboardSection
          contentClassName="flex flex-col gap-4"
          description="Newest sign-ups first. Click any row to open the detail page."
          title="Users"
        >
          <AdminUsersTable users={items} />
          <DataListPagination
            currentPage={filters.page}
            pageSize={filters.pageSize}
            pathname={ADMIN_USERS_PATH}
            searchParams={rawParams}
            totalItems={total}
            totalPages={totalPages}
          />
        </DashboardSection>
      )}
    </>
  );
}

function AdminUsersToolbarFallback() {
  return (
    <div className="toolbar-panel">
      <div className="flex flex-col gap-4">
        <div className="data-list-toolbar-summary">
          <Skeleton className="h-4 w-full max-w-sm rounded-md" />
          <Skeleton className="h-7 w-28 rounded-full" />
        </div>
        <div className="data-list-toolbar-grid">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

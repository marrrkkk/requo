import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import {
  AdminListContentFallback,
  AdminListControlsFallback,
} from "@/features/admin/components/admin-users-list-sections";

/**
 * Structural loading state for the admin users page.
 *
 * Composes the same fallbacks the page's Suspense boundaries use, so the shell
 * and the resolved page agree. This previously hand-rolled a `<table>` that
 * diverged from `AdminListContentFallback` on column count (6 vs 5), row count
 * (8 vs 10) and the pagination footer — and had no `xl:hidden` counterpart at
 * all, so the results area was simply blank on mobile while loading.
 */
export default function AdminUsersLoading() {
  return (
    <DashboardPage>
      <PageHeader title="Users" />
      <div className="dashboard-table-shell" data-list-card>
        <AdminListControlsFallback />
        <AdminListContentFallback />
      </div>
    </DashboardPage>
  );
}

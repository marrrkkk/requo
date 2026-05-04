import {
  DashboardPage,
  DashboardToolbar,
} from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AdminTableSkeleton,
  AdminPaginationSkeleton,
} from "@/features/admin/components/admin-common";

export default function AdminAuditLogsLoading() {
  return (
    <DashboardPage>
      <PageHeader
        title="Audit logs"
        description="Review internal admin access and support actions. Sensitive detail views and all mutations are recorded here."
      />

      <DashboardToolbar>
        <div className="flex flex-col gap-4">
          <div className="data-list-toolbar-summary">
            <Skeleton className="h-4 w-full max-w-sm rounded-md" />
            <Skeleton className="h-7 w-28 rounded-full" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div className="flex flex-col gap-2" key={index}>
                <Skeleton className="h-3 w-16 rounded-md" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ))}
            <div className="flex items-end">
              <Skeleton className="h-10 w-28 rounded-xl" />
            </div>
          </div>
        </div>
      </DashboardToolbar>

      <div className="flex flex-col gap-5">
        <AdminTableSkeleton columns={6} rows={6} />
        <AdminPaginationSkeleton />
      </div>
    </DashboardPage>
  );
}

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminListContentFallback } from "@/features/admin/components/list/admin-list-content-fallback";
import { AdminListControlsFallback } from "@/features/admin/components/list/admin-list-controls-fallback";

export default function AdminEmailsLoading() {
  return (
    <DashboardPage>
      <PageHeader
        description="Transactional email delivery and failures."
        title="Emails"
      />
      <div className="section-panel space-y-3">
        <Skeleton className="h-5 w-32 rounded-md" />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton className="h-24 w-full rounded-lg" key={index} />
          ))}
        </div>
      </div>
      <div className="dashboard-table-shell" data-list-card>
        <AdminListControlsFallback />
        <AdminListContentFallback />
      </div>
    </DashboardPage>
  );
}

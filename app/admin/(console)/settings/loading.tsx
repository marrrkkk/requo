import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminSettingsLoading() {
  return (
    <DashboardPage>
      <PageHeader
        description="Admin access, health checks, and configuration."
        eyebrow="Admin"
        title="Settings"
      />
      <div className="flex flex-col gap-6">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="section-panel space-y-4">
          <Skeleton className="h-5 w-40 rounded-md" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton className="h-20 w-full rounded-lg" key={index} />
            ))}
          </div>
        </div>
      </div>
    </DashboardPage>
  );
}

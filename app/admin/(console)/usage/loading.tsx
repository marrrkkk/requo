import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminUsageLoading() {
  return (
    <DashboardPage>
      <PageHeader
        description="Who is consuming platform resources."
        eyebrow="Admin"
        title="Usage"
      />
      <div className="flex flex-col gap-6">
        <div className="section-panel space-y-4">
          <Skeleton className="h-5 w-32 rounded-md" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton className="h-12 w-full rounded-lg" key={index} />
            ))}
          </div>
        </div>
        <div className="section-panel space-y-4">
          <Skeleton className="h-5 w-32 rounded-md" />
          <Skeleton className="h-[280px] w-full rounded-lg" />
        </div>
      </div>
    </DashboardPage>
  );
}

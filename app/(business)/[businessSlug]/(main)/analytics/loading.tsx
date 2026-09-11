import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <DashboardPage className="bg-surface-default">
      <PageHeader
        actions={
          <div className="flex items-center gap-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-14 rounded-lg" />
            ))}
          </div>
        }
        title="Analytics"
      />

      <div className="flex flex-col gap-6">
        {/* Tab navigation skeleton */}
        <div className="rounded-lg bg-surface-muted p-1">
          <Skeleton className="h-9 w-48 rounded-lg" />
        </div>

        {/* Core metrics — 5-card grid matching BasicAnalyticsView */}
        <div>
          <Skeleton className="mb-4 h-3 w-36 rounded-md" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex min-h-28 flex-col justify-between rounded-lg border bg-card p-5"
              >
                <Skeleton className="h-3 w-24 rounded-md" />
                <Skeleton className="h-7 w-16 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        {/* Sparkline / chart placeholder */}
        <Skeleton className="h-[280px] w-full rounded-xl" />
      </div>
    </DashboardPage>
  );
}
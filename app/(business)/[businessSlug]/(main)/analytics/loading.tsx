import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <DashboardPage>
      <PageHeader
        eyebrow="Analytics"
        title="Performance"
        description="How your inquiry-to-quote pipeline is performing over the last 30 days."
      />

      <div className="flex flex-col gap-6">
        {/* Tab navigation skeleton */}
        <div className="rounded-lg bg-surface-muted p-1">
          <Skeleton className="h-9 w-48 rounded-lg" />
        </div>

        {/* Basic view card grid skeleton — Traffic section */}
        <div>
          <Skeleton className="mb-4 h-3 w-36 rounded-md" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
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

        {/* Basic view card grid skeleton — Quotes section */}
        <div>
          <Skeleton className="mb-4 h-3 w-36 rounded-md" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (
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
      </div>
    </DashboardPage>
  );
}

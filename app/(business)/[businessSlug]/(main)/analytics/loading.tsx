import { DashboardPage, DashboardStatsGrid } from "@/components/shared/dashboard-layout";
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

      <div className="flex flex-col gap-10">
        {/* Free tier — basic metrics */}
        <section>
          <div className="flex flex-col gap-6">
            <div>
              <Skeleton className="h-3 w-32 rounded-md mb-4" />
              <DashboardStatsGrid className="sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex min-h-28 flex-col justify-between rounded-xl border bg-card p-5"
                  >
                    <Skeleton className="h-3 w-24 rounded-md" />
                    <Skeleton className="h-7 w-16 rounded-md" />
                  </div>
                ))}
              </DashboardStatsGrid>
            </div>
            <div>
              <Skeleton className="h-3 w-32 rounded-md mb-4" />
              <DashboardStatsGrid className="sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex min-h-28 flex-col justify-between rounded-xl border bg-card p-5"
                  >
                    <Skeleton className="h-3 w-24 rounded-md" />
                    <Skeleton className="h-7 w-16 rounded-md" />
                  </div>
                ))}
              </DashboardStatsGrid>
            </div>
          </div>
        </section>

        {/* Pro tier — trends, funnel, form breakdown */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              Performance
            </h2>
            <span className="meta-label">Pro</span>
          </div>
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex min-h-28 flex-col justify-between rounded-xl border bg-card p-5"
                >
                  <Skeleton className="h-3 w-24 rounded-md" />
                  <Skeleton className="h-7 w-16 rounded-md" />
                </div>
              ))}
            </div>
            <div className="min-h-[280px] rounded-xl border bg-card p-5">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="mt-6 h-[220px] w-full rounded-lg" />
            </div>
          </div>
        </section>

        {/* Business tier — workflow, timing */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              Operations
            </h2>
            <span className="meta-label">Business</span>
          </div>
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex min-h-28 flex-col justify-between rounded-xl border bg-card p-5"
                >
                  <Skeleton className="h-3 w-24 rounded-md" />
                  <Skeleton className="h-7 w-16 rounded-md" />
                </div>
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Skeleton className="h-40 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
            </div>
          </div>
        </section>
      </div>
    </DashboardPage>
  );
}

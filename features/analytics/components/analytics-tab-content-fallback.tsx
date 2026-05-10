import {
  DashboardDetailLayout,
  DashboardSidebarStack,
  DashboardStatsGrid,
} from "@/components/shared/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { analyticsSections, type AnalyticsSectionId } from "@/features/analytics/config";

export function AnalyticsTabContentFallback({
  activeTab,
}: {
  activeTab: AnalyticsSectionId;
}) {
  if (activeTab === analyticsSections.conversion.id) {
    return <ConversionTabFallback />;
  }

  if (activeTab === analyticsSections.workflow.id) {
    return <WorkflowTabFallback />;
  }

  return <OverviewTabFallback />;
}

function MetricCardSkeleton() {
  return (
    <div className="info-tile">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-3 w-24 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-3 w-32 rounded-md" />
        </div>
        <Skeleton className="size-10 rounded-xl" />
      </div>
    </div>
  );
}

function OverviewTabFallback() {
  return (
    <div className="flex flex-col gap-6">
      <DashboardStatsGrid>
        {Array.from({ length: 4 }).map((_, index) => (
          <MetricCardSkeleton key={index} />
        ))}
      </DashboardStatsGrid>

      <DashboardStatsGrid className="sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <MetricCardSkeleton key={`secondary-${index}`} />
        ))}
      </DashboardStatsGrid>

      <DashboardDetailLayout>
        <div className="min-w-0 flex flex-col gap-6">
          {/* Funnel card */}
          <section className="section-panel p-5 sm:p-6">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-6 w-36 rounded-md" />
                <Skeleton className="h-4 w-72 rounded-md" />
              </div>
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div className="flex items-center justify-between gap-4" key={index}>
                    <Skeleton className="h-4 w-40 rounded-md" />
                    <Skeleton className="h-4 w-16 rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Trend overview chart */}
          <section className="section-panel p-5 sm:p-6">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-6 w-44 rounded-md" />
                <Skeleton className="h-4 w-56 rounded-md" />
              </div>
              <Skeleton className="h-[362px] w-full rounded-xl" />
            </div>
          </section>
        </div>

        <DashboardSidebarStack>
          {/* Status breakdown */}
          <section className="section-panel p-5 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="space-y-2">
                <Skeleton className="h-6 w-40 rounded-md" />
                <Skeleton className="h-4 w-56 rounded-md" />
              </div>
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/80 px-3 py-2.5"
                    key={index}
                  >
                    <Skeleton className="h-5 w-28 rounded-md" />
                    <Skeleton className="h-5 w-10 rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Backlog card */}
          <section className="section-panel p-5 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="space-y-2">
                <Skeleton className="h-6 w-40 rounded-md" />
                <Skeleton className="h-4 w-64 rounded-md" />
              </div>
              <div className="grid gap-3">
                {Array.from({ length: 2 }).map((_, index) => (
                  <MetricCardSkeleton key={`backlog-${index}`} />
                ))}
              </div>
            </div>
          </section>
        </DashboardSidebarStack>
      </DashboardDetailLayout>
    </div>
  );
}

function ConversionTabFallback() {
  return (
    <div className="flex flex-col gap-6">
      <DashboardStatsGrid>
        {Array.from({ length: 6 }).map((_, index) => (
          <MetricCardSkeleton key={index} />
        ))}
      </DashboardStatsGrid>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(18rem,0.42fr)]">
        {/* Conversion trend chart */}
        <section className="section-panel p-5 sm:p-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-44 rounded-md" />
              <Skeleton className="h-4 w-64 rounded-md" />
            </div>
            <Skeleton className="h-[362px] w-full rounded-xl" />
          </div>
        </section>

        {/* Funnel card */}
        <section className="section-panel p-5 sm:p-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-44 rounded-md" />
              <Skeleton className="h-4 w-64 rounded-md" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div className="flex items-center justify-between gap-4" key={index}>
                  <Skeleton className="h-4 w-40 rounded-md" />
                  <Skeleton className="h-4 w-16 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Revenue trend chart */}
      <section className="section-panel p-5 sm:p-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-44 rounded-md" />
            <Skeleton className="h-4 w-64 rounded-md" />
          </div>
          <Skeleton className="h-[362px] w-full rounded-xl" />
        </div>
      </section>

      {/* Form performance table */}
      <section className="section-panel overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-4 sm:px-6">
          <div className="space-y-2">
            <Skeleton className="h-6 w-44 rounded-md" />
            <Skeleton className="h-4 w-64 rounded-md" />
          </div>
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
        <div className="divide-y divide-border/70">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"
              key={index}
            >
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-4 w-44 rounded-md" />
                <Skeleton className="h-3 w-56 rounded-md" />
              </div>
              <div className="flex items-center gap-2 sm:justify-end">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function WorkflowTabFallback() {
  return (
    <div className="flex flex-col gap-6">
      <DashboardStatsGrid className="sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <MetricCardSkeleton key={index} />
        ))}
      </DashboardStatsGrid>

      <DashboardDetailLayout>
        <div className="min-w-0 flex flex-col gap-6">
          {/* Quote timing card */}
          <section className="section-panel p-5 sm:p-6">
            <div className="flex flex-col gap-5">
              <div className="space-y-2">
                <Skeleton className="h-6 w-32 rounded-md" />
                <Skeleton className="h-4 w-full max-w-2xl rounded-md" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <MetricCardSkeleton key={index} />
                ))}
              </div>
            </div>
          </section>
        </div>

        <DashboardSidebarStack>
          {/* Quote status mix */}
          <section className="section-panel p-5 sm:p-6">
            <div className="flex flex-col gap-5">
              <div className="space-y-2">
                <Skeleton className="h-6 w-40 rounded-md" />
                <Skeleton className="h-4 w-64 rounded-md" />
              </div>
              <div className="grid gap-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/80 px-3 py-2.5"
                    key={index}
                  >
                    <Skeleton className="h-5 w-28 rounded-md" />
                    <Skeleton className="h-5 w-10 rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        </DashboardSidebarStack>
      </DashboardDetailLayout>

      {/* Operational alerts + Follow-up activity cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <section className="section-panel p-5 sm:p-6" key={index}>
            <div className="flex flex-col gap-5">
              <div className="space-y-2">
                <Skeleton className="h-6 w-44 rounded-md" />
                <Skeleton className="h-4 w-full max-w-xl rounded-md" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((__, metricIndex) => (
                  <MetricCardSkeleton key={`${index}-${metricIndex}`} />
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

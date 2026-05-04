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
  return (
    <div className="flex flex-col gap-6">
      <DashboardStatsGrid className="sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="info-tile" key={index}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-1 flex-col gap-3">
                <Skeleton className="h-3 w-24 rounded-md" />
                <Skeleton className="h-8 w-20 rounded-md" />
                <Skeleton className="h-3 w-32 rounded-md" />
              </div>
              <Skeleton className="size-10 rounded-xl" />
            </div>
          </div>
        ))}
      </DashboardStatsGrid>

      {activeTab === analyticsSections.overview.id ? (
        <DashboardDetailLayout>
          <div className="min-w-0 flex flex-col gap-6">
            <section className="section-panel p-5 sm:p-6">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-6 w-36 rounded-md" />
                  <Skeleton className="h-4 w-44 rounded-md" />
                </div>
                <Skeleton className="h-72 w-full rounded-2xl" />
              </div>
            </section>

            <section className="section-panel p-5 sm:p-6">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-6 w-36 rounded-md" />
                  <Skeleton className="h-4 w-52 rounded-md" />
                </div>
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      className="flex items-center justify-between gap-4"
                      key={index}
                    >
                      <Skeleton className="h-4 w-28 rounded-md" />
                      <Skeleton className="h-4 w-16 rounded-md" />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <DashboardSidebarStack>
            {Array.from({ length: 2 }).map((_, index) => (
              <section className="section-panel p-5 sm:p-6" key={index}>
                <div className="flex flex-col gap-4">
                  <Skeleton className="h-6 w-32 rounded-md" />
                  {Array.from({ length: 4 }).map((__, rowIndex) => (
                    <div
                      className="flex items-center justify-between gap-4"
                      key={rowIndex}
                    >
                      <Skeleton className="h-4 w-24 rounded-md" />
                      <Skeleton className="h-4 w-12 rounded-md" />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </DashboardSidebarStack>
        </DashboardDetailLayout>
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(18rem,0.42fr)]">
            <section className="section-panel p-5 sm:p-6">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-6 w-36 rounded-md" />
                  <Skeleton className="h-4 w-52 rounded-md" />
                </div>
                <Skeleton className="h-72 w-full rounded-2xl" />
              </div>
            </section>

            <section className="section-panel p-5 sm:p-6">
              <div className="flex flex-col gap-4">
                <Skeleton className="h-6 w-32 rounded-md" />
                {Array.from({ length: 4 }).map((_, index) => (
                  <div className="info-tile shadow-none" key={index}>
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-3 w-24 rounded-md" />
                      <Skeleton className="h-5 w-20 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {activeTab === analyticsSections.conversion.id ? (
            <section className="section-panel p-5 sm:p-6">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-6 w-36 rounded-md" />
                  <Skeleton className="h-4 w-48 rounded-md" />
                </div>
                <Skeleton className="h-56 w-full rounded-2xl" />
              </div>
            </section>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="section-panel p-5 sm:p-6">
              <div className="flex flex-col gap-4">
                <Skeleton className="h-6 w-40 rounded-md" />
                <div className="grid gap-3 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div className="info-tile" key={index}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-1 flex-col gap-3">
                          <Skeleton className="h-3 w-24 rounded-md" />
                          <Skeleton className="h-8 w-16 rounded-md" />
                          <Skeleton className="h-3 w-32 rounded-md" />
                        </div>
                        <Skeleton className="size-10 rounded-xl" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="section-panel p-5 sm:p-6">
              <div className="flex flex-col gap-4">
                <Skeleton className="h-6 w-36 rounded-md" />
                <div className="grid gap-3 sm:grid-cols-2">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div className="info-tile" key={index}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-1 flex-col gap-3">
                          <Skeleton className="h-3 w-24 rounded-md" />
                          <Skeleton className="h-8 w-16 rounded-md" />
                          <Skeleton className="h-3 w-32 rounded-md" />
                        </div>
                        <Skeleton className="size-10 rounded-xl" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

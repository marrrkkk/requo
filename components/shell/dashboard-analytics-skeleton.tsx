import {
  DashboardDetailLayout,
  DashboardPage,
  DashboardSidebarStack,
  DashboardStatsGrid,
} from "@/components/shared/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardAnalyticsSkeleton() {
  return (
    <DashboardPage>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-20 rounded-md" />
        <Skeleton className="h-11 w-full max-w-lg rounded-2xl" />
      </div>

      <DashboardStatsGrid>
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="info-tile" key={index}>
            <div className="flex items-start gap-3.5">
              <Skeleton className="size-10 rounded-xl" />
              <div className="flex flex-1 flex-col gap-3">
                <Skeleton className="h-3 w-24 rounded-md" />
                <Skeleton className="h-8 w-20 rounded-md" />
                <Skeleton className="h-3 w-32 rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </DashboardStatsGrid>

      <DashboardDetailLayout>
        <section className="section-panel p-5 sm:p-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-36 rounded-md" />
              <Skeleton className="h-4 w-44 rounded-md" />
            </div>
            <Skeleton className="h-72 w-full rounded-2xl" />
          </div>
        </section>

        <DashboardSidebarStack>
          <section className="section-panel p-5 sm:p-6">
            <div className="flex flex-col gap-4">
              <Skeleton className="h-6 w-32 rounded-md" />
              {Array.from({ length: 5 }).map((_, index) => (
                <div className="flex items-center justify-between gap-4" key={index}>
                  <Skeleton className="h-4 w-24 rounded-md" />
                  <Skeleton className="h-4 w-12 rounded-md" />
                </div>
              ))}
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
        </DashboardSidebarStack>
      </DashboardDetailLayout>
    </DashboardPage>
  );
}

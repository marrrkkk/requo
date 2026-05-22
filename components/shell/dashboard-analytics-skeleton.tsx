import { DashboardStatsGrid } from "@/components/shared/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardAnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-10">
      {/* Free tier skeleton */}
      <div className="flex flex-col gap-4">
        <Skeleton className="h-3 w-32 rounded-md" />
        <DashboardStatsGrid className="sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </DashboardStatsGrid>
        <DashboardStatsGrid>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </DashboardStatsGrid>
      </div>

      {/* Pro tier skeleton */}
      <div className="flex flex-col gap-4">
        <Skeleton className="h-5 w-40 rounded-md" />
        <DashboardStatsGrid>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </DashboardStatsGrid>
        <Skeleton className="h-[280px] rounded-xl" />
      </div>

      {/* Business tier skeleton */}
      <div className="flex flex-col gap-4">
        <Skeleton className="h-5 w-36 rounded-md" />
        <DashboardStatsGrid className="sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </DashboardStatsGrid>
      </div>
    </div>
  );
}

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";

function CardHeroSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex min-h-28 flex-col gap-2.5 rounded-xl border border-border/60 bg-muted/40 p-4"
        >
          <Skeleton className="size-7 rounded-lg" />
          <Skeleton className="h-3 w-24 rounded-md" />
          <Skeleton className="h-6 w-20 rounded-md" />
        </div>
      ))}
    </div>
  );
}

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

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:gap-5">
        {/* Tab navigation skeleton */}
        <div className="rounded-lg bg-surface-muted p-1">
          <Skeleton className="h-9 w-48 rounded-lg" />
        </div>

        {/* Overview cards: heading + hero KPIs + funnel/donut + trend + money */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-40 rounded-md" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <CardHeroSkeleton />
        <div className="grid gap-3 sm:gap-4 xl:grid-cols-2">
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-36 w-full rounded-xl" />
      </div>
    </DashboardPage>
  );
}

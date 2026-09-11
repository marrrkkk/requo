import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function FollowUpsLoading() {
  return (
    <DashboardPage>
      <PageHeader title="Follow-ups" />

      {/* Search bar placeholder */}
      <div className="relative max-w-sm" aria-hidden="true">
        <Skeleton className="h-9 w-full rounded-md sm:h-8" />
      </div>

      {/* Board columns skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex min-h-48 flex-col gap-3 rounded-xl bg-muted/50 p-4"
          >
            <div className="flex items-center gap-2">
              <Skeleton className="size-4 rounded-full" />
              <Skeleton className="h-4 w-20 rounded-md" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </DashboardPage>
  );
}

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function DashboardMembersSkeleton() {
  return (
    <DashboardPage className="dashboard-side-stack">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 max-w-3xl flex-1">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-full max-w-sm rounded-lg sm:h-7" />
            <Skeleton className="h-4 w-full max-w-md rounded-md" />
          </div>
        </div>

        <div className="dashboard-actions w-full sm:[&>*]:w-auto xl:w-auto xl:max-w-xl xl:justify-end">
          <Skeleton className="h-9 w-full rounded-md sm:h-8 sm:w-32" />
          <Skeleton className="h-9 w-full rounded-md sm:h-8 sm:w-36" />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-9 w-full max-w-sm rounded-md sm:h-8" />
        </div>

        <div className="overflow-hidden rounded-xl border border-border/70 bg-background/50 shadow-sm">
          <div className="flex flex-col">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                className={cn(index > 0 && "border-t border-border/70")}
                key={index}
              >
                <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <Skeleton className="size-8 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Skeleton className="h-4 w-28 rounded-md" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                        <Skeleton className="h-6 w-12 rounded-full" />
                      </div>
                      <Skeleton className="h-4 w-40 rounded-md" />
                    </div>
                  </div>

                  <Skeleton className="size-8 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardPage>
  );
}

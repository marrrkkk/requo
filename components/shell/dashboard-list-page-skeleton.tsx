import { DashboardListResultsSkeleton } from "@/components/shared/dashboard-list-results-skeleton";
import { DashboardPage } from "@/components/shared/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";

type DashboardListPageSkeletonProps = {
  variant?: "inquiries" | "quotes";
};

export function DashboardListPageSkeleton({
  variant = "inquiries",
}: DashboardListPageSkeletonProps) {
  const isInquiryList = variant === "inquiries";
  const actionSkeletons = isInquiryList ? ["w-36"] : ["w-28", "w-36"];

  return (
    <DashboardPage>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 max-w-3xl flex-1">
          <div className="flex flex-col gap-2">
            <Skeleton className={`h-4 rounded-md ${isInquiryList ? "w-20" : "w-16"}`} />
            <Skeleton
              className={`h-5 w-full rounded-lg sm:h-6 ${isInquiryList ? "max-w-md" : "max-w-sm"}`}
            />
          </div>
        </div>

        <div className="dashboard-actions w-full sm:w-auto xl:w-auto xl:max-w-xl xl:justify-end">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:gap-2">
            {actionSkeletons.map((width) => (
              <Skeleton
                key={`secondary-${width}`}
                className={`h-9 w-full rounded-md sm:h-8 sm:w-auto ${width}`}
              />
            ))}
          </div>
          <Skeleton
            className={`h-11 w-full rounded-md sm:h-8 sm:w-auto ${isInquiryList ? "sm:w-44" : "sm:w-36"}`}
          />
        </div>
      </div>

      <div className="dashboard-table-shell" data-list-card>
        <div className="data-list-toolbar-strip" aria-hidden="true">
          <div className="data-list-toolbar-grid">
            <Skeleton className="h-9 min-w-0 flex-1 rounded-md sm:h-8" />
            <Skeleton className="hidden h-9 min-w-0 flex-1 rounded-md sm:block sm:h-8" />
            {isInquiryList ? (
              <Skeleton className="hidden h-9 w-32 rounded-md sm:block sm:h-8" />
            ) : null}
            <Skeleton className="h-9 w-20 shrink-0 rounded-md sm:h-8" />
          </div>
          <Skeleton className="h-4 w-28 rounded-md" />
        </div>

        <DashboardListResultsSkeleton variant={variant} />
      </div>
    </DashboardPage>
  );
}

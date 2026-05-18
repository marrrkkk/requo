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
  const toolbarHasSecondaryFilter = isInquiryList;

  return (
    <DashboardPage>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0 max-w-3xl flex-1">
          <div className="flex flex-col gap-3">
            <Skeleton className={`h-4 rounded-md ${isInquiryList ? "w-20" : "w-16"}`} />
            <Skeleton
              className={`h-11 w-full rounded-2xl ${isInquiryList ? "max-w-md" : "max-w-sm"}`}
            />
          </div>
        </div>

        <div className="flex w-full flex-col-reverse gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end xl:w-auto xl:max-w-xl">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:gap-2">
            {actionSkeletons.map((width) => (
              <Skeleton
                key={`secondary-${width}`}
                className={`h-10 w-full rounded-xl sm:w-auto ${width}`}
              />
            ))}
          </div>
          <Skeleton
            className={`h-10 w-full rounded-xl sm:w-auto ${isInquiryList ? "sm:w-44" : "sm:w-36"}`}
          />
        </div>
      </div>

      <div className="toolbar-panel">
        <div className="flex flex-col gap-4">
          <div className="data-list-toolbar-summary">
            <Skeleton
              className={`h-4 w-full rounded-md ${isInquiryList ? "max-w-sm" : "max-w-xs"}`}
            />
            <Skeleton className="h-7 w-28 rounded-full" />
          </div>

          <div className="data-list-toolbar-grid items-end">
            <div className="flex flex-col gap-2.5">
              <Skeleton
                className={`h-3 rounded-md ${isInquiryList ? "w-28" : "w-24"}`}
              />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>

            <div className="flex flex-col gap-2.5 sm:max-w-[14rem] xl:w-[12rem] xl:max-w-[14rem] xl:shrink-0">
              <Skeleton className="h-3 w-24 rounded-md" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>

            {toolbarHasSecondaryFilter ? (
              <div className="hidden flex-col gap-2.5 sm:flex sm:max-w-[14rem] xl:w-[12rem] xl:max-w-[14rem] xl:shrink-0">
                <Skeleton className="h-3 w-16 rounded-md" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ) : null}

            <div className="data-list-toolbar-actions">
              <Skeleton className="h-10 flex-1 rounded-xl sm:hidden" />
              <Skeleton className="h-10 w-20 rounded-xl" />
              <Skeleton className="hidden size-5 rounded-full sm:block" />
            </div>
          </div>
        </div>
      </div>

      <DashboardListResultsSkeleton variant={variant} />
    </DashboardPage>
  );
}

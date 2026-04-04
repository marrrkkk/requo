import { DashboardPage, DashboardTableContainer } from "@/components/shared/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";

type DashboardListPageSkeletonProps = {
  variant?: "inquiries" | "quotes";
};

export function DashboardListPageSkeleton({
  variant = "inquiries",
}: DashboardListPageSkeletonProps) {
  const isInquiryList = variant === "inquiries";

  return (
    <DashboardPage>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex max-w-3xl flex-1 flex-col gap-3">
          <Skeleton className="h-3.5 w-24 rounded-md" />
          <Skeleton className="h-10 w-full max-w-sm rounded-xl" />
        </div>
        <Skeleton
          className={`h-10 w-full rounded-xl ${isInquiryList ? "sm:w-40" : "sm:w-36"}`}
        />
      </div>

      <div className="toolbar-panel">
        <div className="flex flex-col gap-4">
          <div className="data-list-toolbar-summary">
            <Skeleton className="h-4 w-full max-w-md rounded-md" />
            <Skeleton className="h-7 w-28 rounded-full" />
          </div>

          <div className="data-list-toolbar-grid">
            <div className="flex flex-col gap-2.5">
              <Skeleton className="h-3 w-28 rounded-md" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>

            <div className="flex flex-col gap-2.5 sm:max-w-[14rem] lg:max-w-none">
              <Skeleton className="h-3 w-24 rounded-md" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>

            {isInquiryList ? (
              <div className="data-list-toolbar-actions lg:self-end">
                <Skeleton className="h-10 w-full rounded-xl sm:w-32" />
                <Skeleton className="h-10 w-full rounded-xl sm:w-24" />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <DashboardTableContainer>
        <div className="overflow-hidden rounded-[1.1rem] border border-border/60 bg-background/70">
          <div className="grid grid-cols-[1.8fr_1.4fr_1.1fr_1fr_1fr_1fr] gap-4 border-b border-border/60 px-5 py-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-3 w-full rounded-md" />
            ))}
          </div>

          <div className="divide-y divide-border/60">
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <div
                key={rowIndex}
                className="grid grid-cols-[1.8fr_1.4fr_1.1fr_1fr_1fr_1fr] gap-4 px-5 py-4"
              >
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-32 rounded-md" />
                  <Skeleton className="h-3 w-40 rounded-md" />
                </div>
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-4 w-24 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </DashboardTableContainer>

      <div className="data-list-mobile-grid">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="section-panel p-5">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Skeleton className="h-5 w-32 rounded-md" />
                  <Skeleton className="h-4 w-40 rounded-md" />
                </div>
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((__, tileIndex) => (
                  <div key={tileIndex} className="info-tile h-full px-3.5 py-3 shadow-none">
                    <Skeleton className="h-3 w-16 rounded-md" />
                    <Skeleton className="mt-3 h-4 w-full rounded-md" />
                  </div>
                ))}
              </div>

              <div className="border-t border-border/60 pt-4">
                <Skeleton className="h-9 w-full rounded-lg sm:w-32" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardPage>
  );
}

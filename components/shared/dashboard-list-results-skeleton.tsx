import { DashboardTableContainer } from "@/components/shared/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";

type DashboardListResultsSkeletonProps = {
  variant?: "inquiries" | "quotes";
};

export function DashboardListResultsSkeleton({
  variant = "inquiries",
}: DashboardListResultsSkeletonProps) {
  const isInquiryList = variant === "inquiries";
  const tableColumns = isInquiryList
    ? "grid-cols-[1.8fr_1.3fr_1.3fr_0.9fr_1fr]"
    : "grid-cols-[1.8fr_1.4fr_0.9fr_0.9fr_1fr]";
  const mobileTileCount = 3;
  const rowSkeletonClasses = isInquiryList
    ? [
        "h-4 w-24 rounded-md",
        "h-4 w-24 rounded-md",
        "h-4 w-24 rounded-md",
        "h-6 w-24 rounded-full",
      ]
    : [
        "h-4 w-24 rounded-md",
        "h-4 w-24 rounded-md",
        "h-4 w-20 rounded-md",
        "h-6 w-24 rounded-full",
      ];

  return (
    <>
      <DashboardTableContainer>
        <div className="overflow-hidden rounded-[1.1rem] border border-border/60 bg-background/70">
          <div className={`grid gap-4 border-b border-border/60 px-5 py-3 ${tableColumns}`}>
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-3 w-full rounded-md" />
            ))}
          </div>

          <div className="divide-y divide-border/60">
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <div
                key={rowIndex}
                className={`grid gap-4 px-5 py-4 ${tableColumns}`}
              >
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-32 rounded-md" />
                  <Skeleton className="h-3 w-40 rounded-md" />
                </div>
                {rowSkeletonClasses.map((className, index) => (
                  <Skeleton
                    key={index}
                    className={className}
                  />
                ))}
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

              <div className={`grid gap-3 ${isInquiryList ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                {Array.from({ length: mobileTileCount }).map((__, tileIndex) => (
                  <div key={tileIndex} className="info-tile h-full px-3.5 py-3 shadow-none">
                    <Skeleton className="h-3 w-16 rounded-md" />
                    <Skeleton className="mt-3 h-4 w-full rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-4 w-40 rounded-md" />
        <Skeleton className="h-9 w-full max-w-xs rounded-xl" />
      </div>
    </>
  );
}

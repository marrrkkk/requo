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
      <DashboardTableContainer className="hidden min-h-[360px] xl:block">
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

      <div className="flex flex-col gap-2.5 min-h-[300px] xl:hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-background px-3.5 py-3 shadow-xs"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-4 w-36 rounded-md" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3.5 w-48 rounded-md" />
              <div className="mt-0.5 flex items-center gap-2">
                <Skeleton className="h-3 w-20 rounded-md" />
                <Skeleton className="h-3 w-24 rounded-md" />
              </div>
            </div>
            <Skeleton className="size-4 shrink-0 rounded-full" />
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

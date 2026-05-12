import { Skeleton } from "@/components/ui/skeleton";

export default function BusinessDashboardLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-36 rounded-md" />
        <Skeleton className="h-4 w-full max-w-xl rounded-md" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="info-tile" key={`dashboard-tile-${index}`}>
            <Skeleton className="h-3 w-24 rounded-md" />
            <Skeleton className="mt-2 h-7 w-16 rounded-md" />
            <Skeleton className="mt-2 h-3 w-28 rounded-md" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div className="section-panel space-y-4 p-6" key={`dashboard-section-${index}`}>
            <Skeleton className="h-5 w-36 rounded-md" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton className="h-12 w-full rounded-md" key={`dashboard-row-${index}-${j}`} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

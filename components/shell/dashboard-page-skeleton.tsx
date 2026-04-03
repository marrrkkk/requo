import { Skeleton } from "@/components/ui/skeleton";

export function DashboardPageSkeleton() {
  return (
    <div className="dashboard-page gap-8">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-24 rounded-md" />
        <Skeleton className="h-10 w-full max-w-sm rounded-xl" />
        <Skeleton className="h-4 w-full max-w-2xl rounded-md" />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Skeleton className="h-10 w-full max-w-md rounded-xl" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="section-panel p-5">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-6 w-44 rounded-md" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </div>

        <div className="section-panel p-5">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-6 w-32 rounded-md" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

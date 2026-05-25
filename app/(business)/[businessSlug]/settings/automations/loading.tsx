import { Skeleton } from "@/components/ui/skeleton";

export default function AutomationsSettingsLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page header skeleton */}
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-20 rounded-md" />
        <Skeleton className="h-11 w-full max-w-sm rounded-2xl" />
        <Skeleton className="h-4 w-[22rem] rounded-md" />
      </div>

      {/* Usage banner skeleton */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/70 px-4 py-3.5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-4 w-12 rounded-md" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>

      {/* List skeleton */}
      <div className="section-panel p-6">
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-6 w-28 rounded-md" />
              <Skeleton className="h-4 w-52 rounded-md" />
            </div>
            <Skeleton className="h-9 w-36 rounded-lg" />
          </div>

          <div className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border/70">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-4 px-4 py-3.5"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-40 rounded-md" />
                  <Skeleton className="h-3 w-56 rounded-md" />
                </div>
                <Skeleton className="h-5 w-9 rounded-full" />
                <Skeleton className="size-8 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

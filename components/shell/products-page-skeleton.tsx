import { Skeleton } from "@/components/ui/skeleton";

/**
 * Products page skeleton fallback — matches the structure of the
 * BusinessProductLibraryManager component.
 */
export function ProductsPageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* Stats summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-xl border border-border/75 bg-card/97 p-4"
          >
            <Skeleton className="size-8 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-7 w-16 rounded" />
              <Skeleton className="h-3 w-24 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar: tabs + buttons */}
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-full max-w-md rounded-lg" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>

      {/* Entries list */}
      <div className="overflow-hidden rounded-xl border border-border/75">
        <div className="divide-y divide-border/60">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-3 px-4 py-3.5 sm:items-center sm:gap-4 sm:px-5 sm:py-4"
            >
              <Skeleton className="mt-0.5 size-9 rounded-lg sm:mt-0" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Skeleton className="h-4 w-40 rounded" />
                  <Skeleton className="h-3 w-32 rounded" />
                </div>
                <Skeleton className="h-4 w-20 rounded" />
              </div>
              <Skeleton className="size-8 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

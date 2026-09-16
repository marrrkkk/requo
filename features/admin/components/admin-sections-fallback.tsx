import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic section fallback for admin dashboard pages (overview, AI, usage,
 * system) while their aggregate queries stream in.
 *
 * Covers only the page body — the route `PageHeader` renders synchronously
 * above it, so the title paints instantly on sibling navigations.
 */
export function AdminSectionsFallback() {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="info-tile" key={index}>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-24 rounded-md" />
              <Skeleton className="h-8 w-16 rounded-md" />
              <Skeleton className="h-3 w-28 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <section
            className="section-panel space-y-4"
            data-padding="none"
            key={index}
          >
            <div className="flex items-center justify-between gap-4 border-b border-border/70 px-4 py-3 sm:px-5">
              <Skeleton className="h-6 w-32 rounded-md" />
              <Skeleton className="h-9 w-24 rounded-md sm:h-8" />
            </div>
            <div className="flex flex-col gap-2 px-4 pb-4 sm:px-5 sm:pb-5">
              {Array.from({ length: 3 }).map((__, rowIndex) => (
                <Skeleton className="h-9 w-full rounded-lg" key={rowIndex} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Section-level fallback for admin detail collection boundaries.
 *
 * Each detail feed (messages, items, payments, …) streams behind its own
 * Suspense boundary; this stands in for one section while its query
 * resolves. The page shell and sibling sections stay rendered.
 */
export function AdminDetailSectionFallback({ rows = 3 }: { rows?: number }) {
  return (
    <div className="section-panel space-y-4">
      <Skeleton className="h-5 w-40 rounded-md" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton className="h-9 w-full rounded-lg" key={index} />
        ))}
      </div>
    </div>
  );
}

/**
 * Header fallback for admin detail pages while the core row resolves.
 *
 * The core query is a single indexed lookup, so this is brief — it only
 * covers the identity header, never the whole page.
 */
export function AdminDetailHeaderFallback() {
  return (
    <header className="dashboard-detail-header">
      <div className="dashboard-detail-header-copy">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24 rounded-md" />
          <Skeleton className="h-8 w-64 max-w-full rounded-lg" />
          <Skeleton className="h-4 w-48 max-w-full rounded-md" />
        </div>
        <div className="dashboard-detail-header-meta">
          <Skeleton className="h-8 w-28 rounded-full" />
          <Skeleton className="h-8 w-32 rounded-full" />
        </div>
      </div>
      <div className="dashboard-detail-header-actions">
        <Skeleton className="h-9 w-full rounded-md sm:h-8 sm:w-28" />
        <Skeleton className="h-9 w-full rounded-md sm:h-8 sm:w-24" />
      </div>
    </header>
  );
}

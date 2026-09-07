import { Skeleton } from "@/components/ui/skeleton";

export function AdminListControlsFallback() {
  return (
    <div className="data-list-toolbar-strip" aria-hidden="true">
      <div className="data-list-toolbar-grid">
        <Skeleton className="h-9 min-w-0 flex-1 rounded-md sm:h-8" />
        <Skeleton className="hidden h-9 min-w-0 flex-1 rounded-md sm:block sm:h-8" />
        <Skeleton className="h-9 w-20 shrink-0 rounded-md sm:h-8" />
      </div>
      <Skeleton className="h-4 w-28 rounded-md" />
    </div>
  );
}

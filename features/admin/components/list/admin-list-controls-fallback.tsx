import { Skeleton } from "@/components/ui/skeleton";

export function AdminListControlsFallback() {
  return (
    <div className="toolbar-panel">
      <div className="flex flex-col gap-4">
        <div className="data-list-toolbar-summary">
          <Skeleton className="h-4 w-full max-w-sm rounded-md" />
          <Skeleton className="h-7 w-28 rounded-full" />
        </div>
        <div className="data-list-toolbar-grid">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

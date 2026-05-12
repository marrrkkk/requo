import { Skeleton } from "@/components/ui/skeleton";

export default function AdminAuditLogsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-40 rounded-md" />
        <Skeleton className="h-4 w-full max-w-lg rounded-md" />
      </div>
      <div className="section-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
          <Skeleton className="h-5 w-32 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <div className="divide-y divide-border/70">
          {Array.from({ length: 8 }).map((_, index) => (
            <div className="flex items-center justify-between gap-3 px-5 py-4" key={`audit-row-${index}`}>
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-56 rounded-md" />
                <Skeleton className="h-3 w-40 rounded-md" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

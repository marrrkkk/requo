import { Skeleton } from "@/components/ui/skeleton";

export default function AdminBusinessDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-24 rounded-md" />
        <Skeleton className="h-8 w-64 rounded-lg" />
        <Skeleton className="h-4 w-full max-w-lg rounded-md" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="info-tile" key={`biz-tile-${index}`}>
            <Skeleton className="h-3 w-24 rounded-md" />
            <Skeleton className="mt-2 h-6 w-32 rounded-md" />
          </div>
        ))}
      </div>
      <div className="section-panel space-y-4 p-6">
        <Skeleton className="h-5 w-32 rounded-md" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    </div>
  );
}

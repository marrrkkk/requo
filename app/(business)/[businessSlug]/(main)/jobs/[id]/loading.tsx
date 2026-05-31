import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-10 w-64 rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>
    </div>
  );
}


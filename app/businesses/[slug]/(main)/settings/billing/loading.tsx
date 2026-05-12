import { Skeleton } from "@/components/ui/skeleton";

export default function BusinessBillingLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-32 rounded-md" />
        <Skeleton className="h-4 w-full max-w-lg rounded-md" />
      </div>
      <div className="section-panel space-y-4 p-6">
        <Skeleton className="h-5 w-32 rounded-md" />
        <Skeleton className="h-4 w-full max-w-md rounded-md" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
    </div>
  );
}

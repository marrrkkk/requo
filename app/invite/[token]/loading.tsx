import { Skeleton } from "@/components/ui/skeleton";

export default function InviteLoading() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <Skeleton className="h-8 w-56 rounded-lg" />
        <Skeleton className="h-4 w-full rounded-md" />
      </div>
      <div className="section-panel space-y-4 p-6">
        <Skeleton className="h-4 w-32 rounded-md" />
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  );
}

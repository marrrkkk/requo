import { Skeleton } from "@/components/ui/skeleton";

export default function AssistantLoading() {
  return (
    <div className="relative flex-1 -mx-3 -my-5 sm:-mx-6 sm:-my-7 xl:-mx-8 xl:-my-8">
      <div className="absolute inset-0 flex flex-col">
        {/* Empty center */}
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
          <Skeleton className="size-12 rounded-full" />
          <Skeleton className="h-4 w-52" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-28 rounded-full" />
            <Skeleton className="h-8 w-28 rounded-full" />
            <Skeleton className="h-8 w-28 rounded-full" />
          </div>
        </div>

        {/* Input skeleton */}
        <div className="mx-auto w-full max-w-2xl px-4 pb-4 pt-3">
          <Skeleton className="h-12 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

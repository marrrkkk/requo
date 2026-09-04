import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for the agent chat page.
 * Mirrors the shell layout of ChatInterface without any data.
 */
export default function AgentChatLoading() {
  return (
    <div className="flex h-svh flex-col bg-background">
      {/* Header skeleton */}
      <div className="flex shrink-0 items-center gap-3 border-b px-4 py-3 sm:px-6">
        <Skeleton className="size-9 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>

      {/* Body placeholder */}
      <div className="flex flex-1 items-center justify-center">
        <Skeleton className="size-12 rounded-full" />
      </div>

      {/* Input skeleton */}
      <div className="border-t px-4 py-3">
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}

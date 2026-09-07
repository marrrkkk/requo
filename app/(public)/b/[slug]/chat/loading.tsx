import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for the public chat page.
 *
 * Mirrors the first paint of `ChatInterface`: slim header, then the centred
 * greeting with the composer in the middle and recommendations below it.
 */
export default function AgentChatLoading() {
  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background">
      <div className="flex shrink-0 items-center gap-3 border-b px-4 py-3 sm:px-6">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="h-3.5 w-32" />
      </div>

      <div className="chat-stage min-h-0 flex-1" data-conversation="empty">
        <div className="chat-stage-transcript px-4 sm:px-6">
          <div className="chat-stage-transcript-inner mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-5 py-6">
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <div className="flex w-full flex-col">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton className="h-10 w-full rounded-md" key={index} />
              ))}
            </div>
          </div>
        </div>

        <div aria-hidden="true" />
      </div>
    </div>
  );
}

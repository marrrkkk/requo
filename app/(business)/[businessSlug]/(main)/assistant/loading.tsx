import { DashboardPage } from "@/components/shared/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";

/** Loading skeleton for the Assistant section — same shape as the loaded surface. */
export default function AssistantLoading() {
  return (
    <DashboardPage className="min-h-0 flex-1">
      <div className="flex min-h-0 flex-1 flex-col" data-assistant-pane="">
        <div className="flex items-center justify-between gap-2 px-3 pt-3 md:px-6">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <div className="chat-stage min-h-0 flex-1" data-conversation="empty">
          <div className="chat-stage-transcript px-3 md:px-6">
            <div className="chat-stage-transcript-inner mx-auto flex w-full max-w-3xl flex-1 flex-col gap-7 pt-6 pb-2">
              <div className="my-auto flex w-full flex-col items-center gap-5 py-6 text-center">
                <Skeleton className="h-7 w-64 rounded-lg sm:w-80" />
                <Skeleton className="h-24 w-full rounded-2xl" />
                <div className="flex w-full flex-col divide-y divide-border/60">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton className="my-2 h-5 w-2/3 rounded-md" key={index} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div aria-hidden="true" />
        </div>
      </div>
    </DashboardPage>
  );
}

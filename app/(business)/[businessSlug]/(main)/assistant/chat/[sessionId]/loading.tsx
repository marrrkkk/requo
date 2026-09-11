import { DashboardPage } from "@/components/shared/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function AssistantChatLoading() {
  return (
    <DashboardPage className="min-h-0 flex-1">
      <div className="flex min-h-0 flex-1 flex-col" data-assistant-pane="">
        <div className="flex items-center justify-between gap-2 px-3 pt-3 md:px-6">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <div className="chat-stage min-h-0 flex-1" data-conversation="active">
          <div className="chat-stage-transcript px-3 md:px-6">
            <div className="chat-stage-transcript-inner mx-auto flex w-full max-w-3xl flex-col gap-7 pt-6 pb-2">
              <Skeleton className="h-16 w-3/4 rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          </div>
          <div className="chat-composer-footer z-10 px-3 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-6">
            <div className="mx-auto w-full max-w-3xl">
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          </div>
          <div aria-hidden="true" />
        </div>
      </div>
    </DashboardPage>
  );
}

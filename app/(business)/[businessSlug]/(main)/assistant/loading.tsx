import { DashboardPage } from "@/components/shared/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for the Assistant section.
 * Mirrors the page structure: header plus conversation area.
 */
export default function AssistantLoading() {
  return (
    <DashboardPage>
      {/* Header skeleton */}
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-44 rounded-lg" />
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
      </div>

      {/* Conversation area skeleton */}
      <Skeleton className="h-96 w-full rounded-xl" />
    </DashboardPage>
  );
}

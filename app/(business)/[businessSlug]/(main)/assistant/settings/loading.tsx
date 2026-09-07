import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsFormBodySkeleton } from "@/components/shell/settings-body-skeletons";

export default function AssistantSettingsLoading() {
  return (
    <DashboardPage>
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>
        }
        description="Enable and configure how your public chat answers customers, qualifies their needs, and captures inquiries."
        eyebrow="Public chat"
        title="Settings"
      />
      <SettingsFormBodySkeleton />
    </DashboardPage>
  );
}
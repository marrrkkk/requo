import { PageHeader } from "@/components/shared/page-header";
import { SettingsFormBodySkeleton } from "@/components/shell/settings-body-skeletons";

export default function AssistantSettingsLoading() {
  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <PageHeader
        eyebrow="Public chat"
        title="Settings"
        description="Enable and configure how your public chat answers customers, qualifies their needs, and captures inquiries."
      />
      <SettingsFormBodySkeleton />
    </div>
  );
}

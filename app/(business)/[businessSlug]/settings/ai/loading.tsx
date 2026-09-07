import { PageHeader } from "@/components/shared/page-header";
import { SettingsFormBodySkeleton } from "@/components/shell/settings-body-skeletons";

export default function AiAssistantSettingsLoading() {
  return (
    <>
      <PageHeader
        description="Configure how the AI assistant drafts quotes for your business."
        eyebrow="Settings"
        title="Assistant"
      />
      <SettingsFormBodySkeleton />
    </>
  );
}
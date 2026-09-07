import { PageHeader } from "@/components/shared/page-header";
import { AiSettingsBodySkeleton } from "@/components/shell/settings-body-skeletons";

export default function KnowledgeBaseSettingsLoading() {
  return (
    <>
      <PageHeader
        description="Add facts, files, and context your AI assistant uses when drafting quotes."
        eyebrow="Settings"
        title="Knowledge base"
      />
      <AiSettingsBodySkeleton />
    </>
  );
}
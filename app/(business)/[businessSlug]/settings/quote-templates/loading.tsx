import { PageHeader } from "@/components/shared/page-header";
import { SettingsCollectionBodySkeleton } from "@/components/shell/settings-body-skeletons";

export default function BusinessQuoteTemplatesSettingsLoading() {
  return (
    <>
      <PageHeader
        description="Create and manage reusable quote templates to speed up quoting."
        eyebrow="Settings"
        title="Templates"
      />
      <SettingsCollectionBodySkeleton />
    </>
  );
}
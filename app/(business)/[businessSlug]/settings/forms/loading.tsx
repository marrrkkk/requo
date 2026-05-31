import { PageHeader } from "@/components/shared/page-header";
import { ManagerBodySkeleton } from "@/components/shell/settings-body-skeletons";

export default function BusinessFormsSettingsLoading() {
  return (
    <>
      <PageHeader
        title="Forms"
        description="Manage inquiry capture, public URLs, and starting intake defaults."
      />
      <ManagerBodySkeleton />
    </>
  );
}

import { PageHeader } from "@/components/shared/page-header";
import { BusinessMembersManagerFallback } from "@/features/business-members/components/business-members-manager";

export default function BusinessDashboardMembersLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Members"
      />
      <BusinessMembersManagerFallback />
    </div>
  );
}

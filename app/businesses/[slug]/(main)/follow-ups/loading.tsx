import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import {
  FollowUpListContentFallback,
  FollowUpListControlsFallback,
} from "@/features/follow-ups/components/follow-up-list-page-sections";

export default function FollowUpsLoading() {
  return (
    <DashboardPage>
      <PageHeader
        description="See who needs contact next, why, and when. Follow-ups are lightweight reminders tied to inquiries and quotes."
        eyebrow="Follow-ups"
        title="Follow-ups"
      />
      <FollowUpListControlsFallback />
      <FollowUpListContentFallback />
    </DashboardPage>
  );
}

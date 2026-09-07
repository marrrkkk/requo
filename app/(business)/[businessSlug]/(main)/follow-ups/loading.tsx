import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
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
        actions={<Skeleton className="h-9 w-full rounded-md sm:h-8 sm:w-40" />}
      />
      <FollowUpListControlsFallback />
      <FollowUpListContentFallback />
    </DashboardPage>
  );
}

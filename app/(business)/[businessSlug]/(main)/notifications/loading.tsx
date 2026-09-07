import { PageHeader } from "@/components/shared/page-header";
import { DashboardPage } from "@/components/shared/dashboard-layout";
import { DashboardListResultsSkeleton } from "@/components/shared/dashboard-list-results-skeleton";

export default function NotificationsLoading() {
  return (
    <DashboardPage>
      <PageHeader
        title="Notifications"
      />
      <DashboardListResultsSkeleton />
    </DashboardPage>
  );
}

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { AdminPageSkeleton } from "@/features/admin/components/admin-common";

export default function AdminSubscriptionsLoading() {
  return (
    <DashboardPage>
      <AdminPageSkeleton
        title="Subscriptions"
        description="Inspect workspace billing state. Provider billing remains the source of truth."
        columns={7}
        rows={6}
      />
    </DashboardPage>
  );
}

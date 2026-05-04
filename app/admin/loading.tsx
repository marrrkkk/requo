import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { AdminOverviewFallback } from "@/features/admin/components/admin-overview";

export default function AdminOverviewLoading() {
  return (
    <DashboardPage>
      <PageHeader title="Admin command center" />
      <AdminOverviewFallback />
    </DashboardPage>
  );
}

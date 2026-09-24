import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { ServicesPageSkeleton } from "@/components/shell/services-page-skeleton";

export default function BusinessServicesLoading() {
  return (
    <DashboardPage>
      <PageHeader title="Services" />
      <ServicesPageSkeleton />
    </DashboardPage>
  );
}

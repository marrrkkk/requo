import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <DashboardPage>
      <PageHeader eyebrow="Billing" title="Edit invoice" description="Loading invoice details." />
      <Skeleton className="h-[34rem] w-full" />
    </DashboardPage>
  );
}

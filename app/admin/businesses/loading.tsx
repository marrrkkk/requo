import { DashboardPage } from "@/components/shared/dashboard-layout";
import { AdminPageSkeleton } from "@/features/admin/components/admin-common";

export default function AdminBusinessesLoading() {
  return (
    <DashboardPage>
      <AdminPageSkeleton
        title="Businesses"
        description="Search businesses by business name, business ID, workspace, slug, or owner email."
        columns={8}
        rows={6}
      />
    </DashboardPage>
  );
}

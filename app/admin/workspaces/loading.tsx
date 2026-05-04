import { DashboardPage } from "@/components/shared/dashboard-layout";
import { AdminPageSkeleton } from "@/features/admin/components/admin-common";

export default function AdminWorkspacesLoading() {
  return (
    <DashboardPage>
      <AdminPageSkeleton
        title="Workspaces"
        description="Search workspaces by name, slug, workspace ID, or owner email."
        columns={8}
        rows={6}
      />
    </DashboardPage>
  );
}

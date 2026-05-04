import { DashboardPage } from "@/components/shared/dashboard-layout";
import { AdminPageSkeleton } from "@/features/admin/components/admin-common";

export default function AdminUsersLoading() {
  return (
    <DashboardPage>
      <AdminPageSkeleton
        title="Users"
        description="Find user accounts by email, name, or user ID and inspect their related workspace access."
        columns={6}
        rows={6}
      />
    </DashboardPage>
  );
}

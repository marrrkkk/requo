import { DashboardPage } from "@/components/shared/dashboard-layout";
import { AdminPageSkeleton } from "@/features/admin/components/admin-common";

export default function AdminDeletionRequestsLoading() {
  return (
    <DashboardPage>
      <AdminPageSkeleton
        title="Deletion requests"
        description="Inspect scheduled workspace deletion requests and handle safe cancellation or due completion."
        columns={6}
        rows={5}
      />
    </DashboardPage>
  );
}

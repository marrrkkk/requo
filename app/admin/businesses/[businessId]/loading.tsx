import {
  DashboardDetailLayout,
  DashboardPage,
} from "@/components/shared/dashboard-layout";
import {
  AdminDetailHeaderFallback,
  AdminDetailSectionFallback,
} from "@/features/admin/components/admin-detail-section-fallback";

/**
 * Staged loading state for the admin business detail route.
 *
 * Mirrors the page shell: header fallback plus one section fallback per
 * staged region, inside the same detail layout frames.
 */
export default function AdminBusinessDetailLoading() {
  return (
    <DashboardPage>
      <AdminDetailHeaderFallback />
      <DashboardDetailLayout className="xl:grid-cols-[minmax(0,1.1fr)_0.9fr]">
        <div className="flex min-w-0 flex-col gap-6">
          <AdminDetailSectionFallback />
          <AdminDetailSectionFallback />
          <AdminDetailSectionFallback rows={4} />
        </div>
        <div className="dashboard-side-stack">
          <AdminDetailSectionFallback rows={2} />
        </div>
      </DashboardDetailLayout>
    </DashboardPage>
  );
}

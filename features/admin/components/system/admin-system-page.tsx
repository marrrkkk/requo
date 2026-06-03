import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { AdminConfigMatrix } from "@/features/admin/components/system/admin-config-matrix";
import { AdminHealthCheckGrid } from "@/features/admin/components/system/admin-health-check-grid";
import { AdminHealthRefresh } from "@/features/admin/components/system/admin-health-refresh";
import { AdminSystemStatusBanner } from "@/features/admin/components/system/admin-system-status-banner";
import {
  getAdminHealthReport,
  getAdminSystemConfigMatrix,
} from "@/features/admin/queries";

export async function AdminSystemPage() {
  const [report, configRows] = await Promise.all([
    getAdminHealthReport(),
    getAdminSystemConfigMatrix(),
  ]);

  return (
    <DashboardPage>
      <PageHeader
        actions={<AdminHealthRefresh />}
        description="Live integration checks and environment configuration. Credentials are never displayed."
        eyebrow="Admin"
        title="System"
      />

      <div className="flex flex-col gap-8">
        <AdminSystemStatusBanner report={report} />

        <section className="flex flex-col gap-4">
          <div>
            <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
              Integration checks
            </h2>
            <p className="text-sm text-muted-foreground">
              Connectivity and configuration probes grouped by service area.
            </p>
          </div>
          <AdminHealthCheckGrid results={report.results} />
        </section>

        <AdminConfigMatrix rows={configRows} />
      </div>
    </DashboardPage>
  );
}

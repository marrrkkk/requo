import {
  DashboardPage,
  DashboardSection,
} from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import {
  AdminBasicTable,
  AdminKeyValueGrid,
  AdminStatusBadge,
  formatDateTime,
} from "@/features/admin/components/admin-common";
import { requireAdminPage } from "@/features/admin/page-guard";
import { getAdminSystemStatus } from "@/features/admin/queries";

export default async function AdminSystemPage() {
  await requireAdminPage();
  const system = await getAdminSystemStatus();

  return (
    <DashboardPage>
      <PageHeader
        description="Operational checks without exposing secrets or raw environment values."
        title="System"
      />

      <DashboardSection title="Application">
        <AdminKeyValueGrid
          items={[
            { label: "Environment", value: system.app.environment },
            { label: "Version", value: system.app.version },
            { label: "Build", value: system.app.build },
            {
              label: "Database",
              value: system.database.ok ? "Connected" : "Unavailable",
            },
            {
              label: "Database latency",
              value:
                system.database.latencyMs === null
                  ? null
                  : `${system.database.latencyMs}ms`,
            },
          ]}
        />
      </DashboardSection>

      <DashboardSection title="Provider configuration">
        <AdminBasicTable
          headers={["Provider", "Configured"]}
          rows={[
            ["Email fallback", system.providers.email ? "Yes" : "No"],
            ["Resend", system.providers.resend ? "Yes" : "No"],
            ["Mailtrap", system.providers.mailtrap ? "Yes" : "No"],
            ["Brevo", system.providers.brevo ? "Yes" : "No"],
            ["PayMongo", system.providers.billing.payMongo ? "Yes" : "No"],
            ["Paddle", system.providers.billing.paddle ? "Yes" : "No"],
            ["Groq", system.providers.ai.groq ? "Yes" : "No"],
            ["Gemini", system.providers.ai.gemini ? "Yes" : "No"],
            ["OpenRouter", system.providers.ai.openRouter ? "Yes" : "No"],
            ["Push", system.providers.push ? "Yes" : "No"],
            [
              "Supabase realtime",
              system.providers.supabaseRealtime ? "Yes" : "No",
            ],
          ]}
        />
      </DashboardSection>

      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardSection title="Recent failed payments">
          <AdminBasicTable
            headers={["When", "Workspace", "Provider", "Status"]}
            rows={system.recentFailedPayments.map((payment) => [
              formatDateTime(payment.createdAt),
              payment.workspaceId,
              payment.provider,
              <AdminStatusBadge key="status" status={payment.status} />,
            ])}
          />
        </DashboardSection>

        <DashboardSection title="Recent unprocessed webhooks">
          <AdminBasicTable
            headers={["When", "Workspace", "Provider", "Event"]}
            rows={system.recentUnprocessedBillingEvents.map((event) => [
              formatDateTime(event.createdAt),
              event.workspaceId ?? "Not attached",
              event.provider,
              event.eventType,
            ])}
          />
        </DashboardSection>
      </div>
    </DashboardPage>
  );
}

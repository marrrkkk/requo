import Link from "next/link";
import { Suspense } from "react";

import {
  DashboardPage,
  DashboardSection,
} from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AdminBasicTable,
  AdminMetricCard,
  AdminMetricGrid,
  formatDateTime,
  formatNumber,
} from "@/features/admin/components/admin-common";
import { requireAdminPage } from "@/features/admin/page-guard";
import { getAdminOverview } from "@/features/admin/queries";
import { planMeta, workspacePlans } from "@/lib/plans";

export default async function AdminOverviewPage() {
  await requireAdminPage();

  return (
    <DashboardPage>
      <PageHeader
        description="Inspect operational health, recent growth, billing state, and deletion work without exposing admin surfaces to normal users."
        eyebrow="Internal admin"
        title="Overview"
      />

      <Suspense fallback={<AdminOverviewFallback />}>
        <AdminOverviewContent />
      </Suspense>
    </DashboardPage>
  );
}

async function AdminOverviewContent() {
  const overview = await getAdminOverview();

  return (
    <>
      <AdminMetricGrid>
        <AdminMetricCard
          label="Users"
          value={formatNumber(overview.counts.totalUsers)}
        />
        <AdminMetricCard
          label="Workspaces"
          value={formatNumber(overview.counts.totalWorkspaces)}
        />
        <AdminMetricCard
          label="Businesses"
          value={formatNumber(overview.counts.totalBusinesses)}
        />
        <AdminMetricCard
          description={`${formatNumber(overview.counts.activeSubscriptions)} active, ${formatNumber(overview.counts.canceledSubscriptions)} canceled`}
          label="Subscriptions"
          value={formatNumber(
            overview.counts.activeSubscriptions +
              overview.counts.canceledSubscriptions,
          )}
        />
        <AdminMetricCard
          description="Created in the last 7 days"
          label="Recent inquiries"
          value={formatNumber(overview.counts.recentInquiries)}
        />
        <AdminMetricCard
          description="Created in the last 7 days"
          label="Recent quotes"
          value={formatNumber(overview.counts.recentQuotes)}
        />
        <AdminMetricCard
          label="Accepted quotes"
          value={formatNumber(overview.counts.acceptedQuotes)}
        />
        <AdminMetricCard
          description={`${formatNumber(overview.counts.failedPayments)} failed payments, ${formatNumber(overview.counts.unprocessedBillingEvents)} webhook items`}
          label="Ops issues"
          value={formatNumber(overview.counts.pendingDeletionRequests)}
        />
      </AdminMetricGrid>

      <div className="grid gap-6 xl:grid-cols-3">
        <DashboardSection
          description="Workspace plan cache counts. Billing provider remains the source of truth."
          title="Plan mix"
        >
          <AdminBasicTable
            headers={["Plan", "Workspaces"]}
            rows={workspacePlans.map((plan) => [
              planMeta[plan].label,
              formatNumber(overview.planCounts[plan]),
            ])}
          />
        </DashboardSection>

        <DashboardSection
          description="Newest user accounts."
          title="Recent signups"
        >
          <AdminBasicTable
            headers={["User", "Created"]}
            rows={overview.recentUsers.map((item) => [
              <Link
                className="underline-offset-4 hover:underline"
                href={`/admin/users/${item.id}`}
                key={item.id}
              >
                {item.email}
              </Link>,
              formatDateTime(item.createdAt),
            ])}
          />
        </DashboardSection>

        <DashboardSection
          description="Newest workspaces created."
          title="Recent workspaces"
        >
          <AdminBasicTable
            headers={["Workspace", "Created"]}
            rows={overview.recentWorkspaces.map((item) => [
              <Link
                className="underline-offset-4 hover:underline"
                href={`/admin/workspaces/${item.id}`}
                key={item.id}
              >
                {item.name}
              </Link>,
              formatDateTime(item.createdAt),
            ])}
          />
        </DashboardSection>
      </div>
    </>
  );
}

function AdminOverviewFallback() {
  return (
    <>
      <AdminMetricGrid>
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            className="rounded-lg border border-border/70 bg-card p-5 shadow-sm"
            key={index}
          >
            <Skeleton className="h-3 w-24 rounded-md" />
            <Skeleton className="mt-4 h-9 w-20 rounded-md" />
            <Skeleton className="mt-3 h-4 w-36 rounded-md" />
          </div>
        ))}
      </AdminMetricGrid>

      <div className="grid gap-6 xl:grid-cols-3">
        {["Plan mix", "Recent signups", "Recent workspaces"].map((title) => (
          <DashboardSection key={title} title={title}>
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  className="flex items-center justify-between gap-4"
                  key={index}
                >
                  <Skeleton className="h-4 w-36 rounded-md" />
                  <Skeleton className="h-4 w-20 rounded-md" />
                </div>
              ))}
            </div>
          </DashboardSection>
        ))}
      </div>
    </>
  );
}

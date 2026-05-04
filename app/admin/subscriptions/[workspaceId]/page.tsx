import Link from "next/link";
import { notFound } from "next/navigation";

import {
  DashboardPage,
  DashboardSection,
} from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  AdminBasicTable,
  AdminKeyValueGrid,
  AdminMetricCard,
  AdminMetricGrid,
  AdminStatusBadge,
  formatDateTime,
  formatLimit,
  formatNumber,
} from "@/features/admin/components/admin-common";
import { getAdminRequestMetadata } from "@/features/admin/auth";
import { logAdminAction } from "@/features/admin/audit";
import { requireAdminPage } from "@/features/admin/page-guard";
import { getAdminSubscriptionDetail } from "@/features/admin/queries";
import { db } from "@/lib/db/client";

type AdminSubscriptionDetailPageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function AdminSubscriptionDetailPage({
  params,
}: AdminSubscriptionDetailPageProps) {
  const admin = await requireAdminPage();
  const { workspaceId } = await params;
  const detail = await getAdminSubscriptionDetail(workspaceId);

  if (!detail) {
    notFound();
  }

  await logAdminAction(db, {
    admin,
    action: "ADMIN_VIEW_SUBSCRIPTION",
    targetType: "subscription",
    targetId: workspaceId,
    metadata: {
      workspaceName: detail.workspace.name,
      subscriptionStatus: detail.workspace.subscriptionStatus ?? "free",
      providerSubscriptionId: detail.workspace.providerSubscriptionId,
    },
    requestMetadata: await getAdminRequestMetadata(),
  });

  return (
    <DashboardPage>
      <PageHeader
        actions={
          <Button asChild variant="outline">
            <Link href={`/admin/workspaces/${workspaceId}`}>View workspace</Link>
          </Button>
        }
        description="Read-only billing support view. Subscription mutations stay with the billing provider and subscription service."
        title={detail.workspace.name}
      />

      <AdminMetricGrid>
        <AdminMetricCard label="Plan" value={detail.workspace.plan} />
        <AdminMetricCard
          label="Status"
          value={<AdminStatusBadge status={detail.workspace.subscriptionStatus} />}
        />
        <AdminMetricCard
          label="Businesses"
          value={formatNumber(detail.usage.businesses)}
        />
        <AdminMetricCard
          label="Members"
          value={formatNumber(detail.members.length)}
        />
      </AdminMetricGrid>

      <DashboardSection title="Billing">
        <AdminKeyValueGrid
          items={[
            {
              label: "Owner",
              value: (
                <Link
                  className="underline-offset-4 hover:underline"
                  href={`/admin/users/${detail.workspace.ownerUserId}`}
                >
                  {detail.workspace.ownerEmail}
                </Link>
              ),
            },
            {
              label: "Workspace",
              value: (
                <Link
                  className="underline-offset-4 hover:underline"
                  href={`/admin/workspaces/${workspaceId}`}
                >
                  {detail.workspace.name}
                </Link>
              ),
            },
            { label: "Plan cache", value: detail.workspace.plan },
            { label: "Subscription plan", value: detail.workspace.subscriptionPlan },
            {
              label: "Subscription status",
              value: detail.workspace.subscriptionStatus ?? "free",
            },
            { label: "Provider", value: detail.workspace.billingProvider },
            { label: "Currency", value: detail.workspace.billingCurrency },
            {
              label: "Customer ID",
              value: detail.workspace.providerCustomerId,
            },
            {
              label: "Subscription ID",
              value: detail.workspace.providerSubscriptionId,
            },
            {
              label: "Renewal/current period end",
              value: formatDateTime(detail.workspace.currentPeriodEnd),
            },
            { label: "Canceled", value: formatDateTime(detail.workspace.canceledAt) },
          ]}
        />
      </DashboardSection>

      <DashboardSection title="Plan limits">
        <AdminBasicTable
          headers={["Limit", "Value"]}
          rows={detail.limits.map((limit) => [
            limit.label,
            formatLimit(limit.limit),
          ])}
        />
      </DashboardSection>

      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardSection title="Usage counts">
          <AdminBasicTable
            headers={["Metric", "Count"]}
            rows={[
              ["Businesses", formatNumber(detail.usage.businesses)],
              ["Inquiries", formatNumber(detail.usage.inquiries)],
              ["Quotes", formatNumber(detail.usage.quotes)],
              ["Accepted quotes", formatNumber(detail.usage.acceptedQuotes)],
              ["Follow-ups", formatNumber(detail.usage.followUps)],
            ]}
          />
        </DashboardSection>

        <DashboardSection title="Recent payments">
          <AdminBasicTable
            headers={["When", "Provider", "Plan", "Status"]}
            rows={detail.payments.map((payment) => [
              formatDateTime(payment.createdAt),
              payment.provider,
              payment.plan,
              payment.status,
            ])}
          />
        </DashboardSection>
      </div>
    </DashboardPage>
  );
}

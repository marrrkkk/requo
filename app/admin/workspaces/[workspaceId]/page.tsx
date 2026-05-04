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
  formatMetadataPreview,
  formatNumber,
} from "@/features/admin/components/admin-common";
import { getAdminRequestMetadata } from "@/features/admin/auth";
import { logAdminAction } from "@/features/admin/audit";
import { requireAdminPage } from "@/features/admin/page-guard";
import { getAdminWorkspaceDetail } from "@/features/admin/queries";
import { db } from "@/lib/db/client";

type AdminWorkspaceDetailPageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function AdminWorkspaceDetailPage({
  params,
}: AdminWorkspaceDetailPageProps) {
  const admin = await requireAdminPage();
  const { workspaceId } = await params;
  const detail = await getAdminWorkspaceDetail(workspaceId);

  if (!detail) {
    notFound();
  }

  await logAdminAction(db, {
    admin,
    action: "ADMIN_VIEW_WORKSPACE",
    targetType: "workspace",
    targetId: workspaceId,
    metadata: {
      workspaceName: detail.workspace.name,
      workspaceSlug: detail.workspace.slug,
    },
    requestMetadata: await getAdminRequestMetadata(),
  });

  return (
    <DashboardPage>
      <PageHeader
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/admin/subscriptions/${workspaceId}`}>
                View billing
              </Link>
            </Button>
            {detail.workspace.scheduledDeletionAt ? (
              <Button asChild variant="outline">
                <Link href={`/admin/deletion-requests/${workspaceId}`}>
                  View deletion request
                </Link>
              </Button>
            ) : null}
          </>
        }
        description="Read-only workspace support view with members, businesses, billing state, usage, and audit context."
        title={detail.workspace.name}
      />

      <AdminMetricGrid>
        <AdminMetricCard
          label="Businesses"
          value={formatNumber(detail.usage.businesses)}
        />
        <AdminMetricCard
          label="Members"
          value={formatNumber(detail.members.length)}
        />
        <AdminMetricCard
          label="Inquiries"
          value={formatNumber(detail.usage.inquiries)}
        />
        <AdminMetricCard
          description={`${formatNumber(detail.usage.acceptedQuotes)} accepted`}
          label="Quotes"
          value={formatNumber(detail.usage.quotes)}
        />
      </AdminMetricGrid>

      <DashboardSection title="Workspace">
        <AdminKeyValueGrid
          items={[
            { label: "Workspace ID", value: detail.workspace.id },
            { label: "Slug", value: detail.workspace.slug },
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
            { label: "Plan cache", value: detail.workspace.plan },
            {
              label: "Status",
              value: <AdminStatusBadge status={detail.workspace.status} />,
            },
            { label: "Created", value: formatDateTime(detail.workspace.createdAt) },
            { label: "Updated", value: formatDateTime(detail.workspace.updatedAt) },
            {
              label: "Scheduled deletion",
              value: formatDateTime(detail.workspace.scheduledDeletionAt),
            },
          ]}
        />
      </DashboardSection>

      <DashboardSection title="Subscription">
        <AdminKeyValueGrid
          items={[
            {
              label: "Subscription status",
              value: detail.workspace.subscriptionStatus ?? "free",
            },
            { label: "Subscription plan", value: detail.workspace.subscriptionPlan },
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
              label: "Current period end",
              value: formatDateTime(detail.workspace.currentPeriodEnd),
            },
            { label: "Canceled", value: formatDateTime(detail.workspace.canceledAt) },
          ]}
        />
      </DashboardSection>

      <DashboardSection title="Members">
        <AdminBasicTable
          headers={["Member", "Role", "Joined"]}
          rows={detail.members.map((member) => [
            <Link
              className="underline-offset-4 hover:underline"
              href={`/admin/users/${member.userId}`}
              key={member.id}
            >
              {member.email}
            </Link>,
            member.role,
            formatDateTime(member.createdAt),
          ])}
        />
      </DashboardSection>

      <DashboardSection title="Businesses">
        <AdminBasicTable
          headers={["Business", "Created", "Status"]}
          rows={detail.businesses.map((business) => [
            <Link
              className="underline-offset-4 hover:underline"
              href={`/admin/businesses/${business.id}`}
              key={business.id}
            >
              {business.name}
            </Link>,
            formatDateTime(business.createdAt),
            <AdminStatusBadge key="status" status={business.status} />,
          ])}
        />
      </DashboardSection>

      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardSection title="Recent workspace audit">
          <AdminBasicTable
            headers={["When", "Action", "Entity", "Metadata"]}
            rows={detail.recentAuditLogs.map((log) => [
              formatDateTime(log.createdAt),
              log.action,
              `${log.entityType}${log.entityId ? `:${log.entityId}` : ""}`,
              formatMetadataPreview(log.metadata),
            ])}
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

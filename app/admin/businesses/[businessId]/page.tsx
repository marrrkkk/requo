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
import { getAdminBusinessDetail } from "@/features/admin/queries";
import { db } from "@/lib/db/client";

type AdminBusinessDetailPageProps = {
  params: Promise<{ businessId: string }>;
};

export default async function AdminBusinessDetailPage({
  params,
}: AdminBusinessDetailPageProps) {
  const admin = await requireAdminPage();
  const { businessId } = await params;
  const detail = await getAdminBusinessDetail(businessId);

  if (!detail) {
    notFound();
  }

  await logAdminAction(db, {
    admin,
    action: "ADMIN_VIEW_BUSINESS",
    targetType: "business",
    targetId: businessId,
    metadata: {
      businessName: detail.business.name,
      workspaceId: detail.business.workspaceId,
      workspaceName: detail.business.workspaceName,
    },
    requestMetadata: await getAdminRequestMetadata(),
  });

  return (
    <DashboardPage>
      <PageHeader
        actions={
          <Button asChild variant="outline">
            <Link href={`/admin/workspaces/${detail.business.workspaceId}`}>
              View workspace
            </Link>
          </Button>
        }
        description="Read-only business support view with workspace, members, workflow usage, and audit context."
        title={detail.business.name}
      />

      <AdminMetricGrid>
        <AdminMetricCard
          label="Inquiries"
          value={formatNumber(detail.usage.inquiries)}
        />
        <AdminMetricCard
          label="Quotes"
          value={formatNumber(detail.usage.quotes)}
        />
        <AdminMetricCard
          label="Follow-ups"
          value={formatNumber(detail.usage.followUps)}
        />
        <AdminMetricCard
          label="Accepted quotes"
          value={formatNumber(detail.quoteStatusCounts.accepted ?? 0)}
        />
      </AdminMetricGrid>

      <DashboardSection title="Business">
        <AdminKeyValueGrid
          items={[
            { label: "Business ID", value: detail.business.id },
            { label: "Slug", value: detail.business.slug },
            { label: "Type", value: detail.business.businessType },
            { label: "Country", value: detail.business.countryCode },
            { label: "Currency", value: detail.business.defaultCurrency },
            {
              label: "Public inquiry",
              value: detail.business.publicInquiryEnabled ? "Enabled" : "Off",
            },
            {
              label: "Status",
              value: <AdminStatusBadge status={detail.business.status} />,
            },
            { label: "Created", value: formatDateTime(detail.business.createdAt) },
          ]}
        />
      </DashboardSection>

      <DashboardSection title="Workspace and owner">
        <AdminKeyValueGrid
          items={[
            {
              label: "Workspace",
              value: (
                <Link
                  className="underline-offset-4 hover:underline"
                  href={`/admin/workspaces/${detail.business.workspaceId}`}
                >
                  {detail.business.workspaceName}
                </Link>
              ),
            },
            { label: "Workspace plan", value: detail.business.workspacePlan },
            {
              label: "Owner",
              value: (
                <Link
                  className="underline-offset-4 hover:underline"
                  href={`/admin/users/${detail.business.ownerUserId}`}
                >
                  {detail.business.ownerEmail}
                </Link>
              ),
            },
            { label: "Updated", value: formatDateTime(detail.business.updatedAt) },
          ]}
        />
      </DashboardSection>

      <DashboardSection title="Members with access">
        <AdminBasicTable
          headers={["Member", "Role", "Added"]}
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

      <DashboardSection title="Quote status counts">
        <AdminBasicTable
          headers={["Status", "Count"]}
          rows={Object.entries(detail.quoteStatusCounts).map(([status, count]) => [
            status,
            formatNumber(count),
          ])}
        />
      </DashboardSection>

      <DashboardSection title="Recent business audit">
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
    </DashboardPage>
  );
}

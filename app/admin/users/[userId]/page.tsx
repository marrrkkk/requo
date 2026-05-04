import Link from "next/link";
import { notFound } from "next/navigation";

import {
  DashboardPage,
  DashboardSection,
} from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
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
import { getAdminUserDetail } from "@/features/admin/queries";
import { db } from "@/lib/db/client";

type AdminUserDetailPageProps = {
  params: Promise<{ userId: string }>;
};

export default async function AdminUserDetailPage({
  params,
}: AdminUserDetailPageProps) {
  const admin = await requireAdminPage();
  const { userId } = await params;
  const detail = await getAdminUserDetail(userId);

  if (!detail) {
    notFound();
  }

  await logAdminAction(db, {
    admin,
    action: "ADMIN_VIEW_USER",
    targetType: "user",
    targetId: userId,
    metadata: {
      userEmail: detail.account.email,
    },
    requestMetadata: await getAdminRequestMetadata(),
  });

  const usage = detail.businesses.reduce(
    (totals, business) => ({
      followUps: totals.followUps + business.followUpCount,
      inquiries: totals.inquiries + business.inquiryCount,
      quotes: totals.quotes + business.quoteCount,
    }),
    { followUps: 0, inquiries: 0, quotes: 0 },
  );

  return (
    <DashboardPage>
      <PageHeader
        description="Read-only account support view with related workspace, business, session, and audit context."
        title={detail.account.email}
      />

      <AdminMetricGrid>
        <AdminMetricCard
          label="Workspaces"
          value={formatNumber(detail.workspaces.length)}
        />
        <AdminMetricCard
          label="Owned workspaces"
          value={formatNumber(detail.ownedWorkspaces.length)}
        />
        <AdminMetricCard
          label="Businesses"
          value={formatNumber(detail.businesses.length)}
        />
        <AdminMetricCard
          description={`${formatNumber(usage.inquiries)} inquiries, ${formatNumber(usage.quotes)} quotes`}
          label="Usage"
          value={formatNumber(usage.followUps)}
        />
      </AdminMetricGrid>

      <DashboardSection title="Account">
        <AdminKeyValueGrid
          items={[
            { label: "Name", value: detail.account.name },
            { label: "Email", value: detail.account.email },
            {
              label: "Email verified",
              value: detail.account.emailVerified ? "Yes" : "No",
            },
            { label: "Created", value: formatDateTime(detail.account.createdAt) },
            { label: "Updated", value: formatDateTime(detail.account.updatedAt) },
            {
              label: "Onboarding completed",
              value: formatDateTime(detail.account.onboardingCompletedAt),
            },
            { label: "Profile name", value: detail.account.fullName },
            { label: "Job title", value: detail.account.jobTitle },
          ]}
        />
      </DashboardSection>

      <DashboardSection title="Workspace memberships">
        <AdminBasicTable
          headers={["Workspace", "Role", "Plan", "Subscription", "Status"]}
          rows={detail.workspaces.map((workspace) => [
            <Link
              className="underline-offset-4 hover:underline"
              href={`/admin/workspaces/${workspace.workspaceId}`}
              key={workspace.workspaceId}
            >
              {workspace.workspaceName}
            </Link>,
            workspace.role,
            workspace.plan,
            workspace.subscriptionStatus ?? "free",
            <AdminStatusBadge key="status" status={workspace.status} />,
          ])}
        />
      </DashboardSection>

      <DashboardSection title="Owned workspaces">
        <AdminBasicTable
          headers={["Workspace", "Plan", "Created", "Status"]}
          rows={detail.ownedWorkspaces.map((workspace) => [
            <Link
              className="underline-offset-4 hover:underline"
              href={`/admin/workspaces/${workspace.id}`}
              key={workspace.id}
            >
              {workspace.name}
            </Link>,
            workspace.plan,
            formatDateTime(workspace.createdAt),
            <AdminStatusBadge key="status" status={workspace.status} />,
          ])}
        />
      </DashboardSection>

      <DashboardSection title="Accessible businesses">
        <AdminBasicTable
          headers={["Business", "Workspace", "Role", "Usage", "Status"]}
          rows={detail.businesses.map((business) => [
            <Link
              className="underline-offset-4 hover:underline"
              href={`/admin/businesses/${business.businessId}`}
              key={business.businessId}
            >
              {business.businessName}
            </Link>,
            <Link
              className="underline-offset-4 hover:underline"
              href={`/admin/workspaces/${business.workspaceId}`}
              key={business.workspaceId}
            >
              {business.workspaceName}
            </Link>,
            business.role,
            `${formatNumber(business.inquiryCount)} inquiries / ${formatNumber(business.quoteCount)} quotes`,
            <AdminStatusBadge key="status" status={business.status} />,
          ])}
        />
      </DashboardSection>

      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardSection title="Recent sessions">
          <AdminBasicTable
            headers={["Updated", "Expires", "IP"]}
            rows={detail.sessions.map((session) => [
              formatDateTime(session.updatedAt),
              formatDateTime(session.expiresAt),
              session.ipAddress ?? "Not available",
            ])}
          />
        </DashboardSection>

        <DashboardSection title="Recent admin views">
          <AdminBasicTable
            headers={["When", "Admin", "Action", "Metadata"]}
            rows={detail.recentAdminAuditLogs.map((log) => [
              formatDateTime(log.createdAt),
              log.adminEmail,
              log.action,
              formatMetadataPreview(log.metadata),
            ])}
          />
        </DashboardSection>
      </div>

      <DashboardSection title="Recent user activity">
        <AdminBasicTable
          headers={["When", "Workspace", "Action", "Metadata"]}
          rows={detail.recentWorkspaceAuditLogs.map((log) => [
            formatDateTime(log.createdAt),
            <Link
              className="underline-offset-4 hover:underline"
              href={`/admin/workspaces/${log.workspaceId}`}
              key={log.id}
            >
              {log.workspaceId}
            </Link>,
            log.action,
            formatMetadataPreview(log.metadata),
          ])}
        />
      </DashboardSection>
    </DashboardPage>
  );
}

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
  AdminStatusBadge,
  formatDateTime,
  formatMetadataPreview,
} from "@/features/admin/components/admin-common";
import { AdminDeletionRequestActions } from "@/features/admin/components/deletion-actions";
import { getAdminRequestMetadata } from "@/features/admin/auth";
import { logAdminAction } from "@/features/admin/audit";
import { requireAdminPage } from "@/features/admin/page-guard";
import { getAdminDeletionRequestDetail } from "@/features/admin/queries";
import { db } from "@/lib/db/client";

type AdminDeletionRequestDetailPageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function AdminDeletionRequestDetailPage({
  params,
}: AdminDeletionRequestDetailPageProps) {
  const admin = await requireAdminPage();
  const { workspaceId } = await params;
  const detail = await getAdminDeletionRequestDetail(workspaceId);

  if (!detail || !detail.workspace.scheduledDeletionAt) {
    notFound();
  }

  await logAdminAction(db, {
    admin,
    action: "ADMIN_VIEW_DELETION_REQUEST",
    targetType: "deletion_request",
    targetId: workspaceId,
    metadata: {
      workspaceName: detail.workspace.name,
      workspaceSlug: detail.workspace.slug,
      scheduledDeletionAt: detail.workspace.scheduledDeletionAt.toISOString(),
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
        description="Review the scheduled deletion, related workspace state, billing state, and safe admin actions."
        title={detail.workspace.name}
      />

      <DashboardSection title="Deletion request">
        <AdminKeyValueGrid
          items={[
            { label: "Target type", value: "workspace" },
            { label: "Target ID", value: detail.workspace.id },
            { label: "Workspace", value: detail.workspace.name },
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
              label: "Scheduled deletion",
              value: formatDateTime(detail.workspace.scheduledDeletionAt),
            },
            {
              label: "Workspace status",
              value: <AdminStatusBadge status={detail.workspace.status} />,
            },
            {
              label: "Subscription status",
              value: detail.workspace.subscriptionStatus ?? "free",
            },
            {
              label: "Current period end",
              value: formatDateTime(detail.workspace.currentPeriodEnd),
            },
          ]}
        />
      </DashboardSection>

      <DashboardSection
        description="These actions require a reason and write an internal admin audit log."
        title="Admin actions"
      >
        <AdminDeletionRequestActions
          isDue={detail.deletionIsDue}
          workspaceId={detail.workspace.id}
          workspaceName={detail.workspace.name}
        />
      </DashboardSection>

      <DashboardSection title="Workspace audit">
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

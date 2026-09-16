import Link from "next/link";

import {
  DashboardDetailFeed,
  DashboardDetailFeedItem,
  DashboardSection,
} from "@/components/shared/dashboard-layout";
import { Button } from "@/components/ui/button";
import { AdminConfigMatrix } from "@/features/admin/components/system/admin-config-matrix";
import { AdminHealthCheckGrid } from "@/features/admin/components/system/admin-health-check-grid";
import { AdminHealthRefresh } from "@/features/admin/components/system/admin-health-refresh";
import { AdminSystemStatusBanner } from "@/features/admin/components/system/admin-system-status-banner";
import {
  AdminUserStatusBadge,
  getAdminUserAccountStatus,
} from "@/features/admin/components/primitives/admin-status-badges";
import { getAdminActionLabel } from "@/features/admin/labels";
import {
  ADMIN_AUDIT_LOGS_PATH,
  ADMIN_USERS_PATH,
  getAdminUserDetailPath,
} from "@/features/admin/navigation";
import {
  getAdminHealthReport,
  getAdminSystemConfigMatrix,
  listAdminAccounts,
  listAdminAuditLogs,
} from "@/features/admin/queries";
import type {
  AdminAuditLogRow,
  AdminUserRow,
} from "@/features/admin/types";

function formatDateTime(value: Date | null): string {
  if (!value) {
    return "Never";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Never";
  }

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Admin system page composition.
 *
 * Card-based like the rest of the console (Overview, Usage): a status
 * banner, integration checks, configuration matrix, then admin access
 * beside recent activity. Header actions (refresh + audit log) live on
 * the route `PageHeader`.
 */
export async function AdminSystemPage() {
  const [report, configRows, accounts, recentAudit] = await Promise.all([
    getAdminHealthReport(),
    getAdminSystemConfigMatrix(),
    listAdminAccounts(),
    listAdminAuditLogs({ page: 1, pageSize: 5 }),
  ]);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <AdminSystemStatusBanner report={report} />

      <DashboardSection
        description="Connectivity and configuration probes grouped by service area."
        title="Integration checks"
        action={<AdminHealthRefresh />}
      >
        <AdminHealthCheckGrid results={report.results} />
      </DashboardSection>

      <DashboardSection
        description="Which integrations have credentials set. Secret values are never shown."
        title="Configuration"
      >
        <AdminConfigMatrix rows={configRows} />
      </DashboardSection>

      <div className="grid items-start gap-6 xl:grid-cols-3">
        <DashboardSection
          className="min-w-0 xl:col-span-2"
          description="Everyone who can open this console. Roles change on the user detail page."
          title={`Admin access (${accounts.length})`}
          footer={
            <Button asChild size="sm" variant="outline">
              <Link href={ADMIN_USERS_PATH} prefetch={true}>
                Manage users
              </Link>
            </Button>
          }
        >
          <AdminAccountsRoster accounts={accounts} />
        </DashboardSection>

        <DashboardSection
          className="min-w-0"
          description="The newest admin views and actions."
          title="Recent admin activity"
          action={
            <Button asChild size="sm" variant="outline">
              <Link href={ADMIN_AUDIT_LOGS_PATH} prefetch={true}>
                View audit log
              </Link>
            </Button>
          }
        >
          <AdminRecentAuditPreview items={recentAudit.items} />
        </DashboardSection>
      </div>
    </div>
  );
}

export function AdminAccountsRoster({
  accounts,
}: {
  accounts: AdminUserRow[];
}) {
  if (accounts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No admin accounts found.
      </p>
    );
  }

  return (
    <DashboardDetailFeed>
      {accounts.map((account) => (
        <DashboardDetailFeedItem
          action={
            <Button asChild size="sm" variant="outline">
              <Link
                href={getAdminUserDetailPath(account.id)}
                prefetch={true}
              >
                Open
              </Link>
            </Button>
          }
          key={account.id}
          meta={
            <>
              <span>{account.name || "No name"}</span>
              <span aria-hidden="true">·</span>
              <span>
                Last session {formatDateTime(account.lastSessionAt)}
              </span>
            </>
          }
          title={
            <span className="flex flex-wrap items-center gap-2">
              <span>{account.email}</span>
              <AdminUserStatusBadge
                status={getAdminUserAccountStatus(account)}
              />
            </span>
          }
          titleLines={2}
        />
      ))}
    </DashboardDetailFeed>
  );
}

export function AdminRecentAuditPreview({
  items,
}: {
  items: AdminAuditLogRow[];
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No admin activity yet.
      </p>
    );
  }

  return (
    <DashboardDetailFeed>
      {items.map((entry) => (
        <DashboardDetailFeedItem
          key={entry.id}
          meta={
            <>
              <span>{entry.adminEmail}</span>
              <span aria-hidden="true">·</span>
              <span>{formatDateTime(entry.createdAt)}</span>
            </>
          }
          title={getAdminActionLabel(entry.action)}
        />
      ))}
    </DashboardDetailFeed>
  );
}

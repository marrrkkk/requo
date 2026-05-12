import Link from "next/link";

import {
  DashboardDetailFeed,
  DashboardDetailFeedItem,
  DashboardSection,
} from "@/components/shared/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminAction } from "@/features/admin/constants";
import { getAdminBusinessDetailPath } from "@/features/admin/navigation";
import type { AdminUserDetail as AdminUserDetailPayload } from "@/features/admin/types";

const adminActionLabels: Record<AdminAction, string> = {
  "view.dashboard": "Viewed dashboard",
  "view.users": "Viewed users",
  "view.user": "Viewed user detail",
  "view.businesses": "Viewed businesses",
  "view.business": "Viewed business detail",
  "view.subscriptions": "Viewed subscriptions",
  "view.subscription": "Viewed subscription detail",
  "view.audit-logs": "Viewed audit logs",
  "user.force_verify_email": "Force-verified email",
  "user.revoke_all_sessions": "Revoked all sessions",
  "user.suspend": "Suspended user",
  "user.unsuspend": "Reinstated user",
  "user.delete": "Deleted user",
  "subscription.manual_plan_override": "Overrode subscription plan",
  "subscription.force_cancel": "Force-canceled subscription",
  "impersonation.start": "Started impersonation",
  "impersonation.stop": "Stopped impersonation",
  "confirmation.failed": "Password re-confirmation failed",
};

type AdminUserDetailProps = {
  user: AdminUserDetailPayload;
};

const detailDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDetailDate(value: Date | null): string {
  if (!value) {
    return "Never";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Never";
  }
  return detailDateFormatter.format(date);
}

function formatPlanLabel(plan: string): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

/**
 * User detail summary rendered on `/admin/users/[userId]` (task 12.2 /
 * Req 3.3).
 *
 * Server component. Receives the full `AdminUserDetail` payload from
 * `getAdminUserDetail` and surfaces:
 *
 * - Profile summary (email, name, email-verified badge, suspended badge)
 * - Current account subscription (plan, status, renews-at)
 * - Owned businesses (name, slug, plan)
 * - Active session count
 * - Recent admin audit log entries targeting this user
 *
 * Action buttons live in the separate `AdminUserActions` client
 * component so this file stays a pure read surface. No mutation
 * affordances here.
 */
export function AdminUserDetail({ user }: AdminUserDetailProps) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <DashboardSection
        description="Identity + authentication state at a glance."
        title="Profile"
      >
        <dl className="grid gap-5 sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="meta-label">Email</dt>
            <dd className="mt-1 truncate text-sm font-medium text-foreground">
              {user.email}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="meta-label">Name</dt>
            <dd className="mt-1 truncate text-sm text-foreground">
              {user.name || "—"}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="meta-label">Email verified</dt>
            <dd className="mt-1">
              {user.emailVerified ? (
                <Badge variant="secondary">Verified</Badge>
              ) : (
                <Badge variant="ghost">Unverified</Badge>
              )}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="meta-label">Status</dt>
            <dd className="mt-1 flex flex-wrap items-center gap-2">
              {user.banned ? (
                <Badge variant="destructive">Suspended</Badge>
              ) : (
                <Badge variant="ghost">Active</Badge>
              )}
              {user.banReason ? (
                <span className="text-xs text-muted-foreground">
                  {user.banReason}
                </span>
              ) : null}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="meta-label">Created</dt>
            <dd className="mt-1 text-sm text-muted-foreground">
              {formatDetailDate(user.createdAt)}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="meta-label">Last session</dt>
            <dd className="mt-1 text-sm text-muted-foreground">
              {formatDetailDate(user.lastSessionAt)}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="meta-label">Active sessions</dt>
            <dd className="mt-1 text-sm text-foreground">
              {user.activeSessionCount}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="meta-label">User id</dt>
            <dd className="mt-1 truncate font-mono text-xs text-muted-foreground">
              {user.id}
            </dd>
          </div>
        </dl>
      </DashboardSection>

      <DashboardSection
        description="Account subscription shared across every business this user owns."
        title="Subscription"
      >
        {user.subscription ? (
          <dl className="grid gap-5 sm:grid-cols-3">
            <div className="min-w-0">
              <dt className="meta-label">Plan</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">
                {formatPlanLabel(user.subscription.plan)}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="meta-label">Status</dt>
              <dd className="mt-1 text-sm text-foreground">
                {formatStatusLabel(user.subscription.status)}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="meta-label">Current period ends</dt>
              <dd className="mt-1 text-sm text-muted-foreground">
                {formatDetailDate(user.subscription.currentPeriodEnd)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            No account subscription. The user is on the free plan.
          </p>
        )}
      </DashboardSection>

      <DashboardSection
        description="Businesses where this user is the owner. Plan column mirrors the denormalized read cache."
        title="Owned businesses"
      >
        {user.ownedBusinesses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This user doesn&apos;t own any businesses yet.
          </p>
        ) : (
          <DashboardDetailFeed>
            {user.ownedBusinesses.map((business) => (
              <DashboardDetailFeedItem
                action={
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={getAdminBusinessDetailPath(business.id)}
                      prefetch={true}
                    >
                      Open
                    </Link>
                  </Button>
                }
                key={business.id}
                meta={
                  <>
                    <span>{business.slug}</span>
                    <span aria-hidden="true">·</span>
                    <Badge variant="ghost">
                      {formatPlanLabel(business.plan)}
                    </Badge>
                  </>
                }
                title={business.name}
              />
            ))}
          </DashboardDetailFeed>
        )}
      </DashboardSection>

      <DashboardSection
        description="Most recent admin activity targeting this user."
        title="Recent audit"
      >
        {user.recentAuditLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No admin activity yet.
          </p>
        ) : (
          <DashboardDetailFeed>
            {user.recentAuditLogs.map((entry) => (
              <DashboardDetailFeedItem
                key={entry.id}
                meta={
                  <>
                    <span>{entry.adminEmail}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatDetailDate(entry.createdAt)}</span>
                  </>
                }
                title={adminActionLabels[entry.action] ?? entry.action}
              />
            ))}
          </DashboardDetailFeed>
        )}
      </DashboardSection>
    </div>
  );
}

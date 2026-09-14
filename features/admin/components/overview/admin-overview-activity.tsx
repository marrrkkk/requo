import Link from "next/link";

import {
  DashboardDetailFeed,
  DashboardDetailFeedItem,
  DashboardSection,
} from "@/components/shared/dashboard-layout";
import { Button } from "@/components/ui/button";
import { ADMIN_AUDIT_LOGS_PATH } from "@/features/admin/navigation";
import type {
  AdminRecentActivityItem,
  AdminRecentActivityKind,
} from "@/features/admin/types";

/** Feed-source labels shown in each row's meta line. */
export const adminRecentActivityKindLabels: Record<
  AdminRecentActivityKind,
  string
> = {
  audit: "Admin action",
  inquiry: "Inquiry",
  quote: "Quote",
  email: "Email",
};

const activityDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatAdminActivityDate(value: Date): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return activityDateFormatter.format(date);
}

type AdminOverviewActivityProps = {
  items: AdminRecentActivityItem[];
};

/**
 * Recent-activity feed for the admin Overview.
 *
 * Rows carry pre-formatted titles from the query layer; each row links out
 * to its detail page. Rows without a resolvable target (dashboard-level
 * audit entries) link to the audit log instead — never a dead link.
 */
export function AdminOverviewActivity({ items }: AdminOverviewActivityProps) {
  return (
    <DashboardSection
      action={
        <Button asChild size="sm" variant="outline">
          <Link href={ADMIN_AUDIT_LOGS_PATH} prefetch={true}>
            View audit log
          </Link>
        </Button>
      }
      description="Latest admin actions and platform events."
      title="Recent activity"
    >
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No recent activity yet.</p>
      ) : (
        <DashboardDetailFeed>
          {items.map((item) => (
            <DashboardDetailFeedItem
              action={
                item.href ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={item.href} prefetch={true}>
                      Open
                    </Link>
                  </Button>
                ) : undefined
              }
              key={item.id}
              meta={
                <>
                  <span>{adminRecentActivityKindLabels[item.kind]}</span>
                  {item.subtitle ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{item.subtitle}</span>
                    </>
                  ) : null}
                  <span aria-hidden="true">·</span>
                  <span>{formatAdminActivityDate(item.occurredAt)}</span>
                </>
              }
              title={item.title}
            />
          ))}
        </DashboardDetailFeed>
      )}
    </DashboardSection>
  );
}

import Link from "next/link";

import {
  DashboardDetailFeed,
  DashboardDetailFeedItem,
  DashboardSection,
} from "@/components/shared/dashboard-layout";
import { Button } from "@/components/ui/button";
import { ADMIN_USAGE_PATH } from "@/features/admin/navigation";
import {
  getAdminUsageReport,
  getAdminUsageTopBusinesses,
} from "@/features/admin/queries";
import type {
  AdminUsageBusinessResource,
  AdminUsageReport,
} from "@/features/admin/types";
import { getAdminBusinessDetailPath } from "@/features/admin/navigation";
import { LazyAdminUsageChart } from "@/features/admin/components/operations/usage/admin-usage-chart-lazy";
import type { UsageChartPoint } from "@/features/admin/components/operations/usage/admin-usage-chart";
import { formatCompactCount } from "@/features/admin/components/ai/admin-ai-format";
import {
  formatAdminCostCents,
  formatAdminCount,
  formatAdminPercent,
} from "@/features/admin/components/overview/admin-overview-stats";

const DAY_OPTIONS = [7, 14, 30] as const;

const RESOURCE_OPTIONS: Array<{ value: AdminUsageBusinessResource; label: string }> = [
  { value: "inquiries", label: "Inquiries" },
  { value: "quotes", label: "Quotes sent" },
  { value: "emails", label: "Emails sent" },
  { value: "aiCalls", label: "AI calls" },
];

/** Platform total each top-business resource is a share of. */
const RESOURCE_TOTALS: Record<AdminUsageBusinessResource, (report: AdminUsageReport) => number> = {
  inquiries: (report) => report.totals.inquiries,
  quotes: (report) => report.totals.quotes,
  emails: (report) => report.totals.emails,
  aiCalls: (report) => report.totals.aiCalls,
};

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

export function toChartPoints(report: AdminUsageReport): UsageChartPoint[] {
  return report.series.map((day) => ({
    ...day,
    label: shortDateFormatter.format(new Date(`${day.date}T00:00:00Z`)),
  }));
}

type AdminUsageSectionsProps = {
  days: number;
  resource: AdminUsageBusinessResource;
};

/**
 * Usage report for `/admin/usage`: totals, per-day activity chart, and
 * the top-consuming businesses for one resource.
 *
 * Day range and resource ride the URL (`?days=` / `?resource=`) as plain
 * links — no client state. The chart loads lazily behind an error
 * boundary so a Recharts chunk failure degrades to a retry, not a page
 * crash.
 */
export async function AdminUsageSections({
  days,
  resource,
}: AdminUsageSectionsProps) {
  const [report, topBusinesses] = await Promise.all([
    getAdminUsageReport(days),
    getAdminUsageTopBusinesses(days, resource),
  ]);

  const resourceTotal = RESOURCE_TOTALS[resource](report);
  const resourceLabel =
    RESOURCE_OPTIONS.find((o) => o.value === resource)?.label.toLowerCase() ?? "events";

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <DashboardSection
        description={`Platform-wide totals for the last ${report.days} days, all businesses combined.`}
        title="Totals"
      >
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
          <UsageTotal label="Sign-ups" value={formatAdminCount(report.totals.signups)} />
          <UsageTotal label="Businesses created" value={formatAdminCount(report.totals.businesses)} />
          <UsageTotal label="Inquiries" value={formatAdminCount(report.totals.inquiries)} />
          <UsageTotal label="Quotes sent" value={formatAdminCount(report.totals.quotes)} />
          <UsageTotal
            label="Quote conversion"
            value={formatAdminPercent(report.totals.quotes, report.totals.inquiries) ?? "—"}
          />
          <UsageTotal label="Emails sent" value={formatAdminCount(report.totals.emails)} />
          <UsageTotal label="AI calls" value={formatAdminCount(report.totals.aiCalls)} />
          <UsageTotal label="AI tokens" value={formatCompactCount(report.aiTokens)} />
          <UsageTotal label="Est. AI cost" value={formatAdminCostCents(report.aiCostCents)} />
        </dl>
        {report.aiUnpricedCalls > 0 ? (
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Cost is a floor: {formatAdminCount(report.aiUnpricedCalls)}{" "}
            calls in range used models with no catalog price, so actual
            spend is higher.
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="meta-label">Range:</span>
          {DAY_OPTIONS.map((option) => (
            <Button
              asChild
              key={option}
              size="sm"
              variant={option === report.days ? "secondary" : "ghost"}
            >
              <Link
                href={`${ADMIN_USAGE_PATH}?days=${option}&resource=${resource}`}
                prefetch={true}
              >
                {option}d
              </Link>
            </Button>
          ))}
        </div>
      </DashboardSection>

      <DashboardSection
        description={`Daily activity from ${report.from} to ${report.to}.`}
        title="Activity"
      >
        <LazyAdminUsageChart points={toChartPoints(report)} />
      </DashboardSection>

      <DashboardSection
        description={`Highest-consuming businesses for the last ${report.days} days, sorted highest first.`}
        title="Top businesses"
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {RESOURCE_OPTIONS.map((option) => (
            <Button
              asChild
              key={option.value}
              size="sm"
              variant={option.value === resource ? "secondary" : "ghost"}
            >
              <Link
                href={`${ADMIN_USAGE_PATH}?days=${report.days}&resource=${option.value}`}
                prefetch={true}
              >
                {option.label}
              </Link>
            </Button>
          ))}
        </div>
        {topBusinesses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No usage recorded for this resource in the selected range.
          </p>
        ) : (
          <DashboardDetailFeed>
            {topBusinesses.map((row) => {
              const share = formatAdminPercent(row.count, resourceTotal);

              return (
                <DashboardDetailFeedItem
                  action={
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={getAdminBusinessDetailPath(row.businessId)}
                        prefetch={true}
                      >
                        Open
                      </Link>
                    </Button>
                  }
                  key={row.businessId}
                  meta={
                    <span>
                      {row.count.toLocaleString("en-US")} {resourceLabel}
                      {share ? (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span>{share} of total</span>
                        </>
                      ) : null}
                    </span>
                  }
                  title={row.businessName}
                />
              );
            })}
          </DashboardDetailFeed>
        )}
      </DashboardSection>
    </div>
  );
}

function UsageTotal({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="meta-label">{label}</dt>
      <dd className="mt-1 text-sm font-medium tabular-nums text-foreground">
        {value}
      </dd>
    </div>
  );
}

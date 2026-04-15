import Link from "next/link";
import {
  BarChart3,
  GitCompareArrows,
  Timer,
} from "lucide-react";
import { redirect } from "next/navigation";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { LockedFeatureCard } from "@/components/shared/paywall";
import { cn } from "@/lib/utils";
import { analyticsSections } from "@/features/analytics/config";
import { AnalyticsOverviewTab } from "@/features/analytics/components/analytics-overview-tab";
import { AnalyticsConversionTab } from "@/features/analytics/components/analytics-conversion-tab";
import { AnalyticsWorkflowTab } from "@/features/analytics/components/analytics-workflow-tab";
import {
  getBusinessAnalyticsData,
  getConversionAnalyticsData,
  getWorkflowAnalyticsData,
} from "@/features/analytics/queries";
import { hasFeatureAccess } from "@/lib/plans";
import { workspacesHubPath } from "@/features/workspaces/routes";
import { requireSession } from "@/lib/auth/session";
import {
  getBusinessContextForMembershipSlug,
  hasOperationalBusinessAccess,
} from "@/lib/db/business-access";

type AnalyticsPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const analyticsTabIds = [
  analyticsSections.overview.id,
  analyticsSections.conversion.id,
  analyticsSections.workflow.id,
] as const;

type AnalyticsTabId = (typeof analyticsTabIds)[number];

function getAnalyticsTab(
  value: string | string[] | undefined,
): AnalyticsTabId {
  const normalized = typeof value === "string" ? value : value?.[0];

  return analyticsTabIds.includes(normalized as AnalyticsTabId)
    ? (normalized as AnalyticsTabId)
    : analyticsSections.overview.id;
}

function getAnalyticsYear(value: string | string[] | undefined) {
  const normalized = typeof value === "string" ? value : value?.[0];
  const parsed = normalized ? Number.parseInt(normalized, 10) : NaN;

  return Number.isFinite(parsed) ? parsed : undefined;
}

function getAnalyticsTabHref(
  businessSlug: string,
  tab: AnalyticsTabId,
  year?: number,
) {
  const params = new URLSearchParams();

  params.set("tab", tab);

  if (typeof year === "number") {
    params.set("year", String(year));
  }

  return `/businesses/${businessSlug}/dashboard/analytics?${params.toString()}`;
}

export default async function AnalyticsPage({
  params,
  searchParams,
}: AnalyticsPageProps) {
  const [session, { slug }, resolvedSearchParams] = await Promise.all([
    requireSession(),
    params,
    searchParams,
  ]);
  const businessContext = await getBusinessContextForMembershipSlug(
    session.user.id,
    slug,
  );

  if (!businessContext) {
    redirect(workspacesHubPath);
  }

  if (!hasOperationalBusinessAccess(businessContext.role)) {
    redirect(`/businesses/${businessContext.business.slug}/dashboard`);
  }

  const activeTab = getAnalyticsTab(resolvedSearchParams.tab);
  const selectedYear = getAnalyticsYear(resolvedSearchParams.year);
  const businessId = businessContext.business.id;
  const plan = businessContext.business.workspacePlan;
  const currency = businessContext.business.defaultCurrency;
  const businessSlug = businessContext.business.slug;
  const canViewConversion = hasFeatureAccess(plan, "analyticsConversion");
  const canViewWorkflow = hasFeatureAccess(plan, "analyticsWorkflow");

  const [overviewData, conversionData, workflowData] = await Promise.all([
    activeTab === analyticsSections.overview.id
      ? getBusinessAnalyticsData(businessId, { activityYear: selectedYear })
      : Promise.resolve(null),
    activeTab === analyticsSections.conversion.id && canViewConversion
      ? getConversionAnalyticsData(businessId)
      : Promise.resolve(null),
    activeTab === analyticsSections.workflow.id && canViewWorkflow
      ? getWorkflowAnalyticsData(businessId)
      : Promise.resolve(null),
  ]);

  return (
    <DashboardPage>
      <PageHeader
        eyebrow="Analytics"
        title="Inquiry-to-quote performance"
        description="Track your inquiry pipeline, quote conversions, and workflow efficiency."
      />

      <div className="flex flex-col gap-6">
        <div className="inline-flex w-fit flex-wrap items-center gap-1 rounded-lg border border-border/80 bg-[var(--table-header-bg)] p-1">
          <AnalyticsTabLink
            href={getAnalyticsTabHref(businessSlug, analyticsSections.overview.id, selectedYear)}
            icon={BarChart3}
            isActive={activeTab === analyticsSections.overview.id}
            label={analyticsSections.overview.label}
          />
          <AnalyticsTabLink
            href={getAnalyticsTabHref(businessSlug, analyticsSections.conversion.id, selectedYear)}
            icon={GitCompareArrows}
            isActive={activeTab === analyticsSections.conversion.id}
            label={analyticsSections.conversion.label}
          />
          <AnalyticsTabLink
            href={getAnalyticsTabHref(businessSlug, analyticsSections.workflow.id, selectedYear)}
            icon={Timer}
            isActive={activeTab === analyticsSections.workflow.id}
            label={analyticsSections.workflow.label}
          />
        </div>

        {activeTab === analyticsSections.overview.id && overviewData ? (
          <AnalyticsOverviewTab data={overviewData} />
        ) : null}

        {activeTab === analyticsSections.conversion.id ? (
          canViewConversion && conversionData ? (
            <AnalyticsConversionTab data={conversionData} currency={currency} />
          ) : (
            <LockedFeatureCard
              feature="analyticsConversion"
              plan={plan}
              title="Conversion analytics"
              description="Upgrade to unlock inquiry-to-quote and quote-to-acceptance analytics."
            />
          )
        ) : null}

        {activeTab === analyticsSections.workflow.id ? (
          canViewWorkflow && workflowData ? (
            <AnalyticsWorkflowTab data={workflowData} />
          ) : (
            <LockedFeatureCard
              feature="analyticsWorkflow"
              plan={plan}
              title="Workflow analytics"
              description="Upgrade to unlock response-time and follow-up workflow analytics."
            />
          )
        ) : null}
      </div>
    </DashboardPage>
  );
}

function AnalyticsTabLink({
  href,
  icon: Icon,
  isActive,
  label,
}: {
  href: string;
  icon: typeof BarChart3;
  isActive: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-0 items-center justify-center gap-2 rounded-md border border-transparent px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all",
        isActive
          ? "bg-[var(--control-bg)] text-foreground shadow-[var(--control-shadow)]"
          : "text-foreground/65 hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground",
      )}
      prefetch={true}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}

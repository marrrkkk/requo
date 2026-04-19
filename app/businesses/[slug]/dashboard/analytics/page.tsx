import Link from "next/link";
import {
  BarChart3,
  GitCompareArrows,
  Timer,
} from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";
import { analyticsSections } from "@/features/analytics/config";
import {
  AnalyticsTabPanel,
  AnalyticsTabPanelFallback,
} from "@/features/analytics/components/analytics-tab-panel";
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

function getAnalyticsTabHref(
  businessSlug: string,
  tab: AnalyticsTabId,
) {
  const params = new URLSearchParams();

  params.set("tab", tab);

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
  const businessId = businessContext.business.id;
  const plan = businessContext.business.workspacePlan;
  const currency = businessContext.business.defaultCurrency;
  const businessSlug = businessContext.business.slug;

  return (
    <DashboardPage>
      <PageHeader
        eyebrow="Analytics"
        title="Performance analytics"
        description="Track how inquiry form traffic turns into quotes, customer decisions, and follow-through."
      />

      <div className="flex flex-col gap-6">
        <div className="inline-flex w-fit flex-wrap items-center gap-1 rounded-lg border border-border/80 bg-[var(--table-header-bg)] p-1">
          <AnalyticsTabLink
            href={getAnalyticsTabHref(businessSlug, analyticsSections.overview.id)}
            icon={BarChart3}
            isActive={activeTab === analyticsSections.overview.id}
            label={analyticsSections.overview.label}
          />
          <AnalyticsTabLink
            href={getAnalyticsTabHref(businessSlug, analyticsSections.conversion.id)}
            icon={GitCompareArrows}
            isActive={activeTab === analyticsSections.conversion.id}
            label={analyticsSections.conversion.label}
          />
          <AnalyticsTabLink
            href={getAnalyticsTabHref(businessSlug, analyticsSections.workflow.id)}
            icon={Timer}
            isActive={activeTab === analyticsSections.workflow.id}
            label={analyticsSections.workflow.label}
          />
        </div>

        <Suspense fallback={<AnalyticsTabPanelFallback activeTab={activeTab} />}>
          <AnalyticsTabPanel
            activeTab={activeTab}
            businessId={businessId}
            currency={currency}
            plan={plan}
            workspaceId={businessContext.business.workspaceId}
          />
        </Suspense>
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

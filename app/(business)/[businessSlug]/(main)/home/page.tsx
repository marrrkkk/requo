import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  NeedsAttentionTabs,
  type NeedsAttentionItemData,
  type NeedsAttentionIconName,
} from "@/features/businesses/components/needs-attention-tabs";
import { OwnerAssistantHomeWidget } from "@/features/owner-assistant/components/owner-assistant-home-widget";
import {
  getBusinessOverviewData,
  getBusinessDashboardSummaryData,
  getBusinessMoneySnapshot,
} from "@/features/businesses/queries";
import {
  getFreeAnalytics,
  getDashboardResponseTime,
  getDashboardKpiComparison,
} from "@/features/analytics/queries";
import {
  formatMoney,
  formatRelativeDelta,
  formatPointsDelta,
  formatSpeedDelta,
  type KpiDeltaLabel,
} from "@/features/analytics/utils";
import {
  getBusinessInquiryPath,
  getBusinessQuotePath,
  getBusinessInquiriesPath,
  getBusinessQuotesPath,
  getBusinessAnalyticsPath,
} from "@/features/businesses/routes";
import { HomeKpiCards, type HomeKpiStat } from "@/features/businesses/components/home-kpi-cards";
import { getFollowUpOverviewForBusiness } from "@/features/follow-ups/queries";
import { DashboardTour } from "@/features/onboarding/components/dashboard-tour";
import { getCachedDashboardTourCompleted } from "@/features/onboarding/queries";
import { ActivationLaunchpad } from "@/features/onboarding/components/activation-launchpad";
import { MilestoneCelebrator } from "@/features/onboarding/components/milestone-celebrator";
import type { MilestoneKey } from "@/features/onboarding/milestones";
import { getAppShellContext } from "@/lib/app-shell/context";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { formatQuoteDate } from "@/features/quotes/utils";

type DashboardOverviewPageProps = {
  params: Promise<{ businessSlug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export const metadata: Metadata = createNoIndexMetadata({
  title: "Home",
  description: "Your home base for this business.",
});

export const instant = true;

/**
 * Home page — returns the structural shell synchronously.
 *
 * All dynamic reads (params, getAppShellContext, data queries) are pushed into
 * <Suspense>-wrapped child server components so the static shell is prefetchable
 * and sibling navigations paint instantly.
 */
export default function DashboardOverviewPage({
  params,
  searchParams,
}: DashboardOverviewPageProps) {
  return (
    <div className="home-page-container home-entrance">
      {/* Owner Assistant — centred greeting, stats, and composer */}
      <section className="home-entrance-section w-full max-w-5xl mx-auto">
        <Suspense fallback={null}>
          <OwnerAssistantWidgetRegion params={params} />
        </Suspense>
      </section>

      {/* Activation launchpad (shows when welcome=1 or until activation complete) */}
      <section className="home-entrance-section w-full max-w-5xl mx-auto mt-4">
        <Suspense fallback={null}>
          <ActivationLaunchpadRegion params={params} searchParams={searchParams} />
        </Suspense>
      </section>

      {/* KPI row */}
      <section className="home-entrance-section w-full max-w-5xl mx-auto mt-5">
        <Suspense fallback={<KpiFallback />}>
          <KpiRegion params={params} />
        </Suspense>
      </section>

      {/* Priority queue */}
      <section className="home-entrance-section w-full max-w-5xl mx-auto mt-8 pb-24">
        <Suspense fallback={<NeedsAttentionFallback />}>
          <NeedsAttentionRegion params={params} />
        </Suspense>
      </section>


      {/* Dashboard tour */}
      <Suspense fallback={null}>
        <DashboardTourRegion params={params} />
      </Suspense>

      {/* Milestone celebrations */}
      <Suspense fallback={null}>
        <MilestoneRegion params={params} />
      </Suspense>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Suspense-wrapped async child server components
// ---------------------------------------------------------------------------

async function OwnerAssistantWidgetRegion({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const { user, businessContext } = await getAppShellContext(businessSlug);
  const businessId = businessContext.business.id;

  const [overview, followUpOverview] = await Promise.all([
    getBusinessOverviewData(businessId),
    getFollowUpOverviewForBusiness(businessId),
  ]);

  return (
    <OwnerAssistantHomeWidget
      businessSlug={businessSlug}
      counts={overview.counts}
      followUpCounts={followUpOverview.counts}
      userName={user.name}
    />
  );
}

async function ActivationLaunchpadRegion({
  params,
  searchParams,
}: {
  params: Promise<{ businessSlug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { businessSlug } = await params;
  const { businessContext } = await getAppShellContext(businessSlug);
  const resolvedSearchParams = await searchParams;
  const isWelcome = resolvedSearchParams.welcome === "1";

  // Only show launchpad if welcome=1 or activation is incomplete
  // The component itself will hide when activation is complete
  return (
    <ActivationLaunchpad
      businessName={businessContext.business.name}
      businessSlug={businessSlug}
      businessId={businessContext.business.id}
      publicInquiryEnabled={businessContext.business.publicInquiryEnabled}
    />
  );
}

async function KpiRegion({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const { businessContext } = await getAppShellContext(businessSlug);
  const businessId = businessContext.business.id;

  const [money, analytics, responseTime, comparison] = await Promise.all([
    getBusinessMoneySnapshot(businessId),
    getFreeAnalytics(businessId),
    getDashboardResponseTime(businessId),
    getDashboardKpiComparison(businessId),
  ]);

  const hasActivity =
    analytics.inquirySubmissions > 0 ||
    analytics.quotesSent > 0 ||
    analytics.quotesAccepted > 0;

  if (!hasActivity) {
    return null;
  }

  // Format response time for display
  const responseTimeDisplay = formatResponseTime(responseTime.avgTimeToQuoteHours);

  const priorAcceptanceRate =
    comparison.quotesSentPrior > 0
      ? comparison.quotesAcceptedPrior / comparison.quotesSentPrior
      : 0;

  const moneyDelta = formatRelativeDelta(
    money.wonInCents,
    comparison.wonInCentsPrior,
    // Zero-to-growth has no meaningful percentage — show the absolute move.
    (cents) => formatMoney(cents, money.currency),
  );
  const acceptanceDelta = formatPointsDelta(
    analytics.quoteAcceptanceRate,
    priorAcceptanceRate,
  );
  const speedDelta = formatSpeedDelta(
    responseTime.avgTimeToQuoteHours,
    comparison.avgTimeToQuoteHoursPrior,
  );

  // Pill color follows the metric's real movement: lime for genuine gains,
  // rose for declines, neutral otherwise. "Awaiting reply" is a stock, not a
  // trend, so it gets no pill — the open-quote count already reads in its
  // caption. "Time to quote" is inverted: a slower reading is the bad one.
  const deltaColorFromDirection = (
    delta: KpiDeltaLabel,
    inverted = false,
  ): HomeKpiStat["deltaColor"] => {
    if (delta.direction === "flat") return "neutral";
    const good = inverted ? delta.direction === "down" : delta.direction === "up";
    return good ? "lime" : "rose";
  };

  const deltas: Array<{
    delta: KpiDeltaLabel | null;
    deltaColor: HomeKpiStat["deltaColor"];
  }> = [
    { delta: moneyDelta, deltaColor: deltaColorFromDirection(moneyDelta) },
    { delta: null, deltaColor: "neutral" },
    {
      delta: acceptanceDelta,
      deltaColor: deltaColorFromDirection(acceptanceDelta),
    },
    {
      delta: speedDelta,
      deltaColor: deltaColorFromDirection(speedDelta, true),
    },
  ];

  const statDelta = (
    index: number,
  ): Pick<HomeKpiStat, "delta" | "deltaColor" | "deltaDirection"> => ({
    delta: deltas[index].delta?.label,
    deltaColor: deltas[index].deltaColor,
    deltaDirection: deltas[index].delta?.direction,
  });

  const stats: HomeKpiStat[] = [
    {
      icon: "won",
      label: "Revenue won",
      value: formatMoney(money.wonInCents, money.currency),
      ...statDelta(0),
      tone: "blue",
      caption: "vs previous 30 days",
      hint: "Total value of quotes your customers accepted in the last 30 days. The delta compares against the 30 days before that.",
    },
    {
      icon: "in-play",
      label: "Awaiting reply",
      value: formatMoney(money.inPlayInCents, money.currency),
      ...statDelta(1),
      tone: "orange",
      caption: `${money.inPlayCount} open quote${money.inPlayCount === 1 ? "" : "s"}`,
      hint: "Value of sent quotes that haven't expired and are still waiting on a customer reply.",
    },
    {
      icon: "acceptance",
      label: "Acceptance rate",
      value: `${Math.round(analytics.quoteAcceptanceRate * 100)}%`,
      ...statDelta(2),
      tone: "purple",
      caption: "vs previous 30 days",
      hint: "Share of sent quotes that customers accepted in the last 30 days. The delta compares against the 30 days before that.",
    },
    {
      icon: "response-time",
      label: "Time to quote",
      value: responseTimeDisplay.value,
      ...statDelta(3),
      tone: "emerald",
      caption: "vs previous 30 days",
      hint: "Average time from an inquiry arriving to your first quote going out. The delta compares against the 30 days before that.",
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Last 30 days
        </p>
        <Link
          href={getBusinessAnalyticsPath(businessSlug)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          prefetch={true}
        >
          Full analytics
          <ArrowRight className="size-3" />
        </Link>
      </div>
      <HomeKpiCards stats={stats} />
    </div>
  );
}

async function NeedsAttentionRegion({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const { businessContext } = await getAppShellContext(businessSlug);
  const businessId = businessContext.business.id;

  const [overview, followUpOverview] = await Promise.all([
    getBusinessOverviewData(businessId),
    getFollowUpOverviewForBusiness(businessId),
  ]);

  const items: NeedsAttentionItemData[] = [
    ...followUpOverview.overdue.map((followUp) => ({
      href: followUp.related.kind === "quote"
        ? getBusinessQuotePath(businessSlug, followUp.related.id)
        : getBusinessInquiryPath(businessSlug, followUp.related.id),
      key: `overdue-followup:${followUp.id}`,
      label: "Overdue follow-up",
      title: followUp.title,
      description: `${followUp.customerName} · ${followUp.reason}`,
      meta: `Due ${formatQuoteDate(followUp.dueAt)}`,
      actionLabel: "Follow up now",
      tone: "urgent" as const,
      iconName: "bell-ring" as NeedsAttentionIconName,
      category: "Follow-up" as const,
    })),
    ...followUpOverview.dueToday.map((followUp) => ({
      href: followUp.related.kind === "quote"
        ? getBusinessQuotePath(businessSlug, followUp.related.id)
        : getBusinessInquiryPath(businessSlug, followUp.related.id),
      key: `today-followup:${followUp.id}`,
      label: "Due today",
      title: followUp.title,
      description: `${followUp.customerName} · ${followUp.reason}`,
      meta: `Due ${formatQuoteDate(followUp.dueAt)}`,
      actionLabel: "Follow up",
      tone: "normal" as const,
      iconName: "bell-ring" as NeedsAttentionIconName,
      category: "Follow-up" as const,
    })),
    ...overview.expiringSoonQuotes.map((quote) => ({
      href: getBusinessQuotePath(businessSlug, quote.id),
      key: `expiring-quote:${quote.id}`,
      label: "Quote expiring",
      title: quote.title,
      description: quote.customerName,
      meta: `Expires ${formatQuoteDate(quote.validUntil)}`,
      actionLabel: "Follow up before expiry",
      tone: "urgent" as const,
      iconName: "file-text" as NeedsAttentionIconName,
      category: "Quote" as const,
    })),
    ...overview.awaitingResponseQuotes.map((quote) => ({
      href: getBusinessQuotePath(businessSlug, quote.id),
      key: `awaiting-response-quote:${quote.id}`,
      label: "Awaiting response",
      title: quote.title,
      description: quote.customerName,
      meta: `Sent ${formatQuoteDate(quote.sentAt ?? quote.updatedAt)}`,
      actionLabel: "Follow up",
      tone: "normal" as const,
      iconName: "file-text" as NeedsAttentionIconName,
      category: "Quote" as const,
    })),
    ...overview.recentAcceptedQuotes.map((quote) => ({
      href: getBusinessQuotePath(businessSlug, quote.id),
      key: `accepted-quote:${quote.id}`,
      label: "Won",
      title: quote.title,
      description: quote.customerName,
      meta: `Accepted ${formatQuoteDate(quote.acceptedAt ?? quote.updatedAt)}`,
      actionLabel: "View quote",
      tone: "positive" as const,
      iconName: "check-circle" as NeedsAttentionIconName,
      category: "Quote" as const,
    })),
    ...overview.overdueInquiries.map((inquiry) => ({
      href: getBusinessInquiryPath(businessSlug, inquiry.id),
      key: `overdue-inquiry:${inquiry.id}`,
      label: "Overdue inquiry",
      title: inquiry.customerName,
      description: inquiry.serviceCategory,
      meta: `Submitted ${formatQuoteDate(inquiry.submittedAt)}`,
      actionLabel: "Create quote",
      tone: "urgent" as const,
      iconName: "inbox" as NeedsAttentionIconName,
      category: "Inquiry" as const,
    })),
    ...overview.newInquiries.map((inquiry) => ({
      href: getBusinessInquiryPath(businessSlug, inquiry.id),
      key: `new-inquiry:${inquiry.id}`,
      label: "New inquiry",
      title: inquiry.customerName,
      description: inquiry.serviceCategory,
      meta: `Submitted ${formatQuoteDate(inquiry.submittedAt)}`,
      actionLabel: "Create quote",
      tone: "normal" as const,
      iconName: "inbox" as NeedsAttentionIconName,
      category: "Inquiry" as const,
    })),
    ...overview.draftQuotes.map((quote) => ({
      href: getBusinessQuotePath(businessSlug, quote.id),
      key: `draft-quote:${quote.id}`,
      label: "Draft quote",
      title: quote.title,
      description: quote.title || quote.customerName,
      meta: `Updated ${formatQuoteDate(quote.updatedAt)}`,
      actionLabel: "Finish & send",
      tone: "normal" as const,
      iconName: "file-text" as NeedsAttentionIconName,
      category: "Quote" as const,
    })),
  ];

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">
            Priority queue
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Follow up, finish drafts, and confirm wins.
          </p>
        </div>
        {items.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {items.length}
          </Badge>
        )}
      </div>

      {/* List or empty state */}
      {items.length > 0 ? (
        <NeedsAttentionTabs items={items} />
      ) : (
        <EmptyQueueState businessSlug={businessSlug} />
      )}
    </div>
  );
}

async function DashboardTourRegion({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const { businessContext } = await getAppShellContext(businessSlug);
  const dashboardTourCompleted = await getCachedDashboardTourCompleted(
    businessContext.membershipId,
    businessContext.business.id,
  );

  return (
    <DashboardTour
      businessId={businessContext.business.id}
      completed={dashboardTourCompleted}
    />
  );
}

async function MilestoneRegion({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const { businessContext } = await getAppShellContext(businessSlug);
  const businessId = businessContext.business.id;

  const { getChecklistProgressForBusiness } = await import(
    "@/features/onboarding/queries"
  );

  const [summary, progress] = await Promise.all([
    getBusinessDashboardSummaryData(businessId),
    getChecklistProgressForBusiness(businessId),
  ]);

  const achieved: MilestoneKey[] = [];

  if (summary.totalInquiries > 0) achieved.push("first-inquiry");
  if (summary.totalQuotes > 0) achieved.push("first-quote-sent");
  if (summary.wonCount > 0) achieved.push("first-quote-accepted");

  if (achieved.length === 0) return null;

  return <MilestoneCelebrator achieved={achieved} />;
}

// ---------------------------------------------------------------------------
// Pure helper functions
// ---------------------------------------------------------------------------

/**
 * Formats average response time (in hours) into a human-friendly display.
 */
function formatResponseTime(hours: number | null): {
  value: string;
  suffix: string;
  isGood: boolean;
} {
  if (hours === null) {
    return { value: "—", suffix: "no data yet", isGood: false };
  }

  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return { value: `${minutes}m`, suffix: "avg response", isGood: true };
  }

  if (hours < 24) {
    return { value: `${Math.round(hours)}h`, suffix: "avg response", isGood: hours <= 4 };
  }

  const days = Math.round(hours / 24 * 10) / 10;
  return { value: `${days}d`, suffix: "avg response", isGood: false };
}

/**
 * Build up to 3 contextual suggestion chips based on what's in the queue.
 */
// ---------------------------------------------------------------------------
// Static UI components (rendered synchronously in the shell)
// ---------------------------------------------------------------------------

function EmptyQueueState({ businessSlug }: { businessSlug: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/60 py-12">
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">
          You&apos;re all caught up
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          No urgent items. Here&apos;s what you can do next:
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Link
          href={getBusinessInquiriesPath(businessSlug)}
          className="rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent/50"
        >
          View inquiries
        </Link>
        <Link
          href={getBusinessQuotesPath(businessSlug)}
          className="rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent/50"
        >
          View quotes
        </Link>
        <Link
          href={getBusinessAnalyticsPath(businessSlug)}
          className="rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent/50"
        >
          Analytics
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton fallbacks
// ---------------------------------------------------------------------------

function KpiFallback() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-3 w-20 rounded-md" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div className="flex flex-col rounded-2xl border border-border/60 bg-card p-2" key={i}>
            <div className="flex items-start justify-between p-2">
              <Skeleton className="size-9 rounded-xl" />
              <Skeleton className="size-4 rounded-full" />
            </div>
            <div className="flex flex-col gap-1 px-2 pt-2.5 pb-3.5">
              <Skeleton className="h-3.5 w-20 rounded-md" />
              <Skeleton className="h-7 w-24 rounded-md" />
            </div>
            <div className="mt-auto flex items-center justify-between gap-2 rounded-xl bg-muted px-2.5 py-1.5">
              <Skeleton className="h-3 w-16 rounded-md" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NeedsAttentionFallback() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-5 w-32" />
      <div className="flex flex-col gap-1 pt-1">
        {Array.from({ length: 5 }).map((_, index) => (
          <div className="flex items-center gap-3.5 px-2 py-2.5" key={index}>
            <Skeleton className="size-9 shrink-0 rounded-lg" />
            <div className="flex flex-1 flex-col gap-1">
              <Skeleton className="h-4 w-36 rounded-md" />
              <Skeleton className="h-3 w-48 rounded-md" />
            </div>
            <Skeleton className="ml-auto h-3 w-20 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}



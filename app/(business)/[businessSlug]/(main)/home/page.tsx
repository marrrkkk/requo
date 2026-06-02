import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Inbox,
  Send,
  TrendingUp,
  Target,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardGreeting } from "@/features/businesses/components/dashboard-greeting";
import {
  NeedsAttentionTabs,
  type NeedsAttentionItemData,
  type NeedsAttentionIconName,
} from "@/features/businesses/components/needs-attention-tabs";
import {
  getBusinessOverviewData,
  getBusinessDashboardSummaryData,
} from "@/features/businesses/queries";
import { getFreeAnalytics } from "@/features/analytics/queries";
import {
  getBusinessInquiryPath,
  getBusinessQuotePath,
  getBusinessInquiriesPath,
  getBusinessQuotesPath,
  getBusinessAnalyticsPath,
} from "@/features/businesses/routes";
import { getFollowUpOverviewForBusiness } from "@/features/follow-ups/queries";
import {
  DashboardChatInput,
  type SuggestionChip,
} from "@/features/ai/chat-ui/dashboard-chat-input";
import { DashboardTour } from "@/features/onboarding/components/dashboard-tour";
import { getDashboardTourCompletedForMembership } from "@/features/onboarding/queries";
import { NextStepSection } from "@/features/onboarding/components/next-step-section";
import { MilestoneCelebrator } from "@/features/onboarding/components/milestone-celebrator";
import type { MilestoneKey } from "@/features/onboarding/milestones";
import { getAppShellContext } from "@/lib/app-shell/context";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { formatQuoteDate } from "@/features/quotes/utils";
import type { BusinessOverviewData } from "@/features/businesses/types";
import type { FollowUpOverviewData } from "@/features/follow-ups/types";
import type { FreeAnalyticsData } from "@/features/analytics/types";

type DashboardOverviewPageProps = {
  params: Promise<{ businessSlug: string }>;
};

export const metadata: Metadata = createNoIndexMetadata({
  title: "Home",
  description: "Your home base for this business.",
});

export const unstable_instant = {
  prefetch: "static",
  unstable_disableValidation: true,
};

export default function DashboardOverviewPage({
  params,
}: DashboardOverviewPageProps) {
  return <DashboardOverviewContent params={params} />;
}

async function DashboardOverviewContent({
  params,
}: DashboardOverviewPageProps) {
  const { businessSlug } = await params;
  const { user, businessContext } = await getAppShellContext(businessSlug);

  const businessId = businessContext.business.id;
  const dashboardTourCompleted = await getDashboardTourCompletedForMembership(
    businessContext.membershipId,
  );

  const overviewPromise = getBusinessOverviewData(businessId);
  const followUpOverviewPromise = getFollowUpOverviewForBusiness(businessId);
  const summaryPromise = getBusinessDashboardSummaryData(businessId);
  const analyticsPromise = getFreeAnalytics(businessId);

  return (
    <div className="home-page-container home-entrance">
      {/* Greeting */}
      <section className="home-entrance-section w-full max-w-5xl mx-auto">
        <Suspense fallback={<GreetingFallback userName={user.name} />}>
          <GreetingWithData
            userName={user.name}
            overviewPromise={overviewPromise}
            followUpOverviewPromise={followUpOverviewPromise}
            summaryPromise={summaryPromise}
          />
        </Suspense>
      </section>

      {/* Next step suggestion */}
      <section className="home-entrance-section w-full max-w-5xl mx-auto mt-4">
        <Suspense fallback={null}>
          <NextStepSection
            businessId={businessId}
            businessSlug={businessSlug}
            businessType={businessContext.business.businessType}
            publicInquiryEnabled={businessContext.business.publicInquiryEnabled}
          />
        </Suspense>
      </section>

      {/* 30-day velocity stats */}
      <section className="home-entrance-section w-full max-w-5xl mx-auto mt-5">
        <Suspense fallback={<VelocityStatsFallback />}>
          <VelocityStats
            businessSlug={businessSlug}
            analyticsPromise={analyticsPromise}
          />
        </Suspense>
      </section>

      {/* Priority queue */}
      <section className="home-entrance-section w-full max-w-5xl mx-auto mt-8 pb-24">
        <Suspense fallback={<NeedsAttentionFallback />}>
          <NeedsAttentionContent
            businessSlug={businessSlug}
            overviewPromise={overviewPromise}
            followUpOverviewPromise={followUpOverviewPromise}
          />
        </Suspense>
      </section>

      {/* AI chat input — fixed floating bottom center */}
      <div className="fixed bottom-5 left-0 right-0 z-40 pointer-events-none lg:left-[17.5rem]">
        <div className="pointer-events-auto">
          <Suspense
            fallback={
              <ChatInputFallback
                businessSlug={businessSlug}
                userId={user.id}
                businessId={businessId}
              />
            }
          >
            <ChatInputWithSuggestions
              businessSlug={businessSlug}
              userId={user.id}
              businessId={businessId}
              overviewPromise={overviewPromise}
              followUpOverviewPromise={followUpOverviewPromise}
            />
          </Suspense>
        </div>
      </div>

      <DashboardTour
        businessId={businessId}
        completed={dashboardTourCompleted}
      />

      <Suspense fallback={null}>
        <MilestoneSection
          businessId={businessId}
          summaryPromise={summaryPromise}
        />
      </Suspense>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Milestone celebrations
// ---------------------------------------------------------------------------

async function MilestoneSection({
  businessId,
  summaryPromise,
}: {
  businessId: string;
  summaryPromise: Promise<Awaited<ReturnType<typeof getBusinessDashboardSummaryData>>>;
}) {
  const { getChecklistProgressForBusiness } = await import(
    "@/features/onboarding/queries"
  );

  const [summary, progress] = await Promise.all([
    summaryPromise,
    getChecklistProgressForBusiness(businessId),
  ]);

  const achieved: MilestoneKey[] = [];

  if (summary.totalInquiries > 0) achieved.push("first-inquiry");
  if (summary.totalQuotes > 0) achieved.push("first-quote-sent");
  if (summary.wonCount > 0) achieved.push("first-quote-accepted");
  if (progress.hasJob) achieved.push("first-job");
  if (progress.hasInvoice) achieved.push("first-invoice");

  if (achieved.length === 0) return null;

  return <MilestoneCelebrator achieved={achieved} />;
}

// ---------------------------------------------------------------------------
// 30-day velocity stats
// ---------------------------------------------------------------------------

async function VelocityStats({
  businessSlug,
  analyticsPromise,
}: {
  businessSlug: string;
  analyticsPromise: Promise<FreeAnalyticsData>;
}) {
  const analytics = await analyticsPromise;

  const hasActivity =
    analytics.inquirySubmissions > 0 ||
    analytics.quotesSent > 0 ||
    analytics.quotesAccepted > 0;

  if (!hasActivity) {
    return null;
  }

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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Inquiries"
          value={analytics.inquirySubmissions}
          suffix="received"
          icon={<Inbox className="size-4" />}
        />
        <StatCard
          label="Quotes sent"
          value={analytics.quotesSent}
          suffix="total"
          icon={<Send className="size-4" />}
        />
        <StatCard
          label="Acceptance"
          value={`${Math.round(analytics.quoteAcceptanceRate * 100)}%`}
          suffix="win rate"
          highlight={analytics.quoteAcceptanceRate >= 0.5}
          icon={<TrendingUp className="size-4" />}
        />
        <StatCard
          label="Coverage"
          value={`${Math.round(analytics.inquiryToQuoteRate * 100)}%`}
          suffix="quoted"
          highlight={analytics.inquiryToQuoteRate >= 0.7}
          icon={<Target className="size-4" />}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
  highlight,
  icon,
}: {
  label: string;
  value: number | string;
  suffix: string;
  highlight?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className="group relative rounded-xl border border-border/60 bg-card px-4 py-4 transition-all duration-200 hover:border-border hover:shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className={`rounded-lg p-1.5 ${highlight ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
          {icon}
        </div>
      </div>
      <p
        className={`mt-2 text-2xl font-semibold tracking-tight ${highlight ? "text-primary" : "text-foreground"}`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[0.7rem] text-muted-foreground">{suffix}</p>
    </div>
  );
}

function VelocityStatsFallback() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-3 w-20 rounded-md" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div className="rounded-xl border border-border/60 bg-card px-4 py-4" key={i}>
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-16 rounded-md" />
              <Skeleton className="size-7 rounded-lg" />
            </div>
            <Skeleton className="mt-2 h-7 w-12 rounded-md" />
            <Skeleton className="mt-1 h-2.5 w-14 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI chat input with contextual suggestions
// ---------------------------------------------------------------------------

async function ChatInputWithSuggestions({
  businessSlug,
  userId,
  businessId,
  overviewPromise,
  followUpOverviewPromise,
}: {
  businessSlug: string;
  userId: string;
  businessId: string;
  overviewPromise: Promise<BusinessOverviewData>;
  followUpOverviewPromise: Promise<FollowUpOverviewData>;
}) {
  const [overview, followUpOverview] = await Promise.all([
    overviewPromise,
    followUpOverviewPromise,
  ]);

  const suggestions = buildContextualSuggestions(overview, followUpOverview);

  return (
    <DashboardChatInput
      businessSlug={businessSlug}
      userId={userId}
      businessId={businessId}
      suggestions={suggestions}
    />
  );
}

function ChatInputFallback({
  businessSlug,
  userId,
  businessId,
}: {
  businessSlug: string;
  userId: string;
  businessId: string;
}) {
  return (
    <DashboardChatInput
      businessSlug={businessSlug}
      userId={userId}
      businessId={businessId}
    />
  );
}

/**
 * Build up to 3 contextual suggestion chips based on what's in the queue.
 */
function buildContextualSuggestions(
  overview: BusinessOverviewData,
  followUpOverview: FollowUpOverviewData,
): SuggestionChip[] {
  const chips: SuggestionChip[] = [];

  if (followUpOverview.overdue.length > 0) {
    const first = followUpOverview.overdue[0];
    chips.push({
      label: `Follow up with ${first.customerName}`,
      prompt: `Help me follow up with ${first.customerName} about "${first.title}"`,
    });
  }

  if (overview.newInquiries.length > 0) {
    const first = overview.newInquiries[0];
    chips.push({
      label: `Draft quote for ${first.customerName}`,
      prompt: `Draft a quote for ${first.customerName}'s ${first.serviceCategory} inquiry`,
    });
  }

  if (overview.recentAcceptedQuotes.length > 0) {
    chips.push({
      label: "Summarize accepted quotes",
      prompt: "Summarize my recently accepted quotes and suggest next steps",
    });
  }

  if (chips.length === 0) {
    chips.push(
      { label: "Summarize this week", prompt: "Summarize my business activity this week" },
      { label: "Draft a quote", prompt: "Help me draft a new quote" },
    );
  }

  return chips.slice(0, 3);
}

// ---------------------------------------------------------------------------
// Needs attention
// ---------------------------------------------------------------------------

async function NeedsAttentionContent({
  businessSlug,
  overviewPromise,
  followUpOverviewPromise,
}: {
  businessSlug: string;
  overviewPromise: Promise<BusinessOverviewData>;
  followUpOverviewPromise: Promise<FollowUpOverviewData>;
}) {
  const [overview, followUpOverview] = await Promise.all([
    overviewPromise,
    followUpOverviewPromise,
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
    ...overview.recentAcceptedQuotes.map((quote) => ({
      href: getBusinessQuotePath(businessSlug, quote.id),
      key: `accepted-quote:${quote.id}`,
      label: "Accepted",
      title: quote.title,
      description: quote.customerName,
      meta: `Accepted ${formatQuoteDate(quote.acceptedAt ?? quote.updatedAt)}`,
      actionLabel: "Create job or invoice",
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
            Follow up, win work, then move accepted quotes into jobs or invoices.
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

// ---------------------------------------------------------------------------
// Empty state
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
// Greeting helpers
// ---------------------------------------------------------------------------

async function GreetingWithData({
  userName,
  overviewPromise,
  followUpOverviewPromise,
  summaryPromise,
}: {
  userName: string;
  overviewPromise: Promise<BusinessOverviewData>;
  followUpOverviewPromise: Promise<FollowUpOverviewData>;
  summaryPromise: Promise<Awaited<ReturnType<typeof getBusinessDashboardSummaryData>>>;
}) {
  const [overview, followUpOverview, summary] = await Promise.all([
    overviewPromise,
    followUpOverviewPromise,
    summaryPromise,
  ]);

  return (
    <DashboardGreeting
      userName={userName}
      counts={overview.counts}
      followUpCounts={followUpOverview.counts}
      summary={summary}
    />
  );
}

function GreetingFallback({ userName }: { userName: string }) {
  const firstName = userName.split(" ")[0] || userName;

  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-heading text-[1.5rem] font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
        Welcome back, {firstName}
      </h1>
      <p className="text-sm text-muted-foreground">Loading your overview...</p>
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

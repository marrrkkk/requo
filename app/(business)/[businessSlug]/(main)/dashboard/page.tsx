import type { Metadata } from "next";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardGreeting } from "@/features/businesses/components/dashboard-greeting";
import {
  NeedsAttentionTabs,
  type NeedsAttentionItemData,
  type NeedsAttentionIconName,
} from "@/features/businesses/components/needs-attention-tabs";
import { getBusinessOverviewData } from "@/features/businesses/queries";
import {
  getBusinessInquiryPath,
  getBusinessQuotePath,
} from "@/features/businesses/routes";
import { getFollowUpOverviewForBusiness } from "@/features/follow-ups/queries";
import { DashboardChatInput } from "@/features/ai/chat-ui/dashboard-chat-input";
import { DashboardTour } from "@/features/onboarding/components/dashboard-tour";
import { getAppShellContext } from "@/lib/app-shell/context";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { formatQuoteDate } from "@/features/quotes/utils";

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

  const overviewPromise = getBusinessOverviewData(businessId);
  const followUpOverviewPromise = getFollowUpOverviewForBusiness(businessId);

  return (
    <div className="home-page-container">
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">
        {/* Greeting + AI chat input */}
        <section className="shrink-0 pb-6">
          <Suspense fallback={<GreetingFallback userName={user.name} />}>
            <GreetingWithData
              userName={user.name}
              overviewPromise={overviewPromise}
              followUpOverviewPromise={followUpOverviewPromise}
            />
          </Suspense>

          <div className="mt-3">
            <DashboardChatInput
              businessSlug={businessSlug}
              userId={user.id}
              businessId={businessId}
            />
          </div>
        </section>

        {/* Needs attention — minimal header + scrollable list */}
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <Suspense fallback={<NeedsAttentionFallback />}>
            <NeedsAttentionContent
              businessSlug={businessSlug}
              overviewPromise={overviewPromise}
              followUpOverviewPromise={followUpOverviewPromise}
            />
          </Suspense>
        </section>
      </div>

      <DashboardTour businessId={businessId} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Needs attention — rendered directly without Card/DashboardSection
// ---------------------------------------------------------------------------

async function NeedsAttentionContent({
  businessSlug,
  overviewPromise,
  followUpOverviewPromise,
}: {
  businessSlug: string;
  overviewPromise: Promise<Awaited<ReturnType<typeof getBusinessOverviewData>>>;
  followUpOverviewPromise: Promise<
    Awaited<ReturnType<typeof getFollowUpOverviewForBusiness>>
  >;
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
    ...overview.recentAcceptedQuotes.map((quote) => ({
      href: getBusinessQuotePath(businessSlug, quote.id),
      key: `accepted-quote:${quote.id}`,
      label: "Accepted",
      title: quote.title,
      description: quote.customerName,
      meta: `Accepted ${formatQuoteDate(quote.acceptedAt ?? quote.updatedAt)}`,
      actionLabel: "Track next work step",
      tone: "positive" as const,
      iconName: "check-circle" as NeedsAttentionIconName,
      category: "Quote" as const,
    })),
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Minimal header */}
      <div className="flex shrink-0 items-center justify-between pb-3">
        <h2 className="text-sm font-semibold text-foreground">
          Needs attention
        </h2>
        {items.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {items.length} open
          </Badge>
        )}
      </div>

      {/* Scrollable list */}
      {items.length > 0 ? (
        <NeedsAttentionTabs items={items} />
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nothing urgent right now — you&apos;re all caught up.
        </p>
      )}
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
}: {
  userName: string;
  overviewPromise: Promise<Awaited<ReturnType<typeof getBusinessOverviewData>>>;
  followUpOverviewPromise: Promise<
    Awaited<ReturnType<typeof getFollowUpOverviewForBusiness>>
  >;
}) {
  const [overview, followUpOverview] = await Promise.all([
    overviewPromise,
    followUpOverviewPromise,
  ]);

  return (
    <DashboardGreeting
      userName={userName}
      counts={overview.counts}
      followUpCounts={followUpOverview.counts}
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
          <div className="flex items-center gap-3 px-1.5 py-2" key={index}>
            <Skeleton className="size-1.5 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-36 rounded-md" />
            <Skeleton className="ml-auto h-3 w-20 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ReceiptText,
} from "lucide-react";
import { Suspense } from "react";

import {
  DashboardActionsRow,
  DashboardPage,
} from "@/components/shared/dashboard-layout";
import { Button } from "@/components/ui/button";
import {
  DashboardNeedsAttentionFallback,
  DashboardNeedsAttentionSection,
  DashboardOverviewQueuesFallback,
  DashboardOverviewQueuesSection,
  DashboardOverviewStatsFallback,
  DashboardOverviewStatsSection,
} from "@/features/businesses/components/dashboard-overview-sections";
import {
  DashboardVelocitySection,
  DashboardVelocitySectionFallback,
} from "@/features/businesses/components/dashboard-velocity-section";
import { DashboardGreeting } from "@/features/businesses/components/dashboard-greeting";
import {
  getBusinessDashboardSummaryData,
  getBusinessOverviewData,
} from "@/features/businesses/queries";
import { getFreeAnalytics } from "@/features/analytics/queries";
import {
  FollowUpDashboardSection,
  FollowUpDashboardSectionFallback,
} from "@/features/follow-ups/components/follow-up-dashboard-section";
import { getFollowUpOverviewForBusiness } from "@/features/follow-ups/queries";
import {
  getBusinessInquiriesPath,
  getBusinessNewQuotePath,
} from "@/features/businesses/routes";
import { DashboardTour } from "@/features/onboarding/components/dashboard-tour";
import { getAppShellContext } from "@/lib/app-shell/context";
import { createNoIndexMetadata } from "@/lib/seo/site";

type DashboardOverviewPageProps = {
  params: Promise<{ businessSlug: string }>;
};

export const metadata: Metadata = createNoIndexMetadata({
  title: "Dashboard",
  description: "Operational overview for this business.",
});

export const unstable_instant = {
  prefetch: 'static',
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

  const summaryPromise = getBusinessDashboardSummaryData(businessId);
  const overviewPromise = getBusinessOverviewData(businessId);
  const followUpOverviewPromise = getFollowUpOverviewForBusiness(businessId);
  const analyticsPromise = getFreeAnalytics(businessId);

  return (
    <DashboardPage className="gap-5 xl:gap-6">
      {/* #4 Time-based greeting + #5 Compact business header */}
      <section className="section-panel overflow-hidden">
        <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <Suspense fallback={<GreetingFallback userName={user.name} />}>
                <GreetingWithData
                  userName={user.name}
                  overviewPromise={overviewPromise}
                  followUpOverviewPromise={followUpOverviewPromise}
                />
              </Suspense>

            </div>

            <DashboardActionsRow className="w-full [&>*]:w-full sm:[&>*]:w-auto lg:w-auto lg:justify-end">
              <Button asChild>
                <Link href={getBusinessInquiriesPath(businessSlug)} prefetch={true}>
                  Open inquiries
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href={getBusinessNewQuotePath(businessSlug)} prefetch={true}>
                  <ReceiptText data-icon="inline-start" />
                  Create quote
                </Link>
              </Button>
            </DashboardActionsRow>
          </div>

          {/* #2 Clickable stats */}
          <Suspense fallback={<DashboardOverviewStatsFallback />}>
            <DashboardOverviewStatsSection
              businessSlug={businessSlug}
              overviewPromise={overviewPromise}
            />
          </Suspense>
        </div>
      </section>

      {/* #1 Needs attention with category tabs */}
      <Suspense fallback={<DashboardNeedsAttentionFallback />}>
        <DashboardNeedsAttentionSection
          businessSlug={businessSlug}
          overviewPromise={overviewPromise}
          followUpOverviewPromise={followUpOverviewPromise}
        />
      </Suspense>

      {/* #7 Follow-ups promoted higher (before queue cards) */}
      <Suspense fallback={<FollowUpDashboardSectionFallback />}>
        <FollowUpDashboardSection
          businessSlug={businessSlug}
          overviewPromise={followUpOverviewPromise}
        />
      </Suspense>

      {/* #6 Velocity/conversion signals */}
      <Suspense fallback={<DashboardVelocitySectionFallback />}>
        <DashboardVelocitySection
          businessSlug={businessSlug}
          analyticsPromise={analyticsPromise}
        />
      </Suspense>

      {/* #3 Reduced queue cards */}
      <Suspense fallback={<DashboardOverviewQueuesFallback />}>
        <DashboardOverviewQueuesSection
          businessSlug={businessSlug}
          publicInquiryEnabled={businessContext.business.publicInquiryEnabled}
          summaryPromise={summaryPromise}
          overviewPromise={overviewPromise}
        />
      </Suspense>

      <DashboardTour businessId={businessId} />
    </DashboardPage>
  );
}

async function GreetingWithData({
  userName,
  overviewPromise,
  followUpOverviewPromise,
}: {
  userName: string;
  overviewPromise: Promise<Awaited<ReturnType<typeof getBusinessOverviewData>>>;
  followUpOverviewPromise: Promise<Awaited<ReturnType<typeof getFollowUpOverviewForBusiness>>>;
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

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DashboardOverviewChecklistFallback,
  DashboardOverviewChecklistSection,
  DashboardNeedsAttentionFallback,
  DashboardNeedsAttentionSection,
  DashboardOverviewQueuesFallback,
  DashboardOverviewQueuesSection,
  DashboardOverviewStatsFallback,
  DashboardOverviewStatsSection,
} from "@/features/businesses/components/dashboard-overview-sections";
import {
  getBusinessDashboardSummaryData,
  getBusinessOverviewData,
} from "@/features/businesses/queries";
import {
  FollowUpDashboardSection,
  FollowUpDashboardSectionFallback,
} from "@/features/follow-ups/components/follow-up-dashboard-section";
import { getFollowUpOverviewForBusiness } from "@/features/follow-ups/queries";
import {
  getBusinessInquiriesPath,
  getBusinessNewQuotePath,
} from "@/features/businesses/routes";
import { OnboardingWelcomeDialog } from "@/features/onboarding/components/onboarding-welcome-dialog";
import { getBusinessPublicInquiryUrl } from "@/features/settings/utils";
import { requireSession } from "@/lib/auth/session";
import { getBusinessContextForMembershipSlug } from "@/lib/db/business-access";
import { redirect } from "next/navigation";
import { workspacesHubPath } from "@/features/workspaces/routes";

type DashboardOverviewPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function DashboardOverviewPage({
  params,
}: DashboardOverviewPageProps) {
  const [session, { slug }] = await Promise.all([requireSession(), params]);
  const businessContext = await getBusinessContextForMembershipSlug(
    session.user.id,
    slug,
  );

  if (!businessContext) {
    redirect(workspacesHubPath);
  }

  const businessSlug = businessContext.business.slug;
  const summaryPromise = getBusinessDashboardSummaryData(
    businessContext.business.id,
  );
  const overviewPromise = getBusinessOverviewData(
    businessContext.business.id,
  );
  const followUpOverviewPromise = getFollowUpOverviewForBusiness(
    businessContext.business.id,
  );

  return (
    <DashboardPage className="gap-5 xl:gap-6">
      <Suspense fallback={<DashboardOverviewChecklistFallback />}>
        <DashboardOverviewChecklistSection
          businessName={businessContext.business.name}
          businessSlug={businessSlug}
          publicInquiryEnabled={businessContext.business.publicInquiryEnabled}
          summaryPromise={summaryPromise}
        />
      </Suspense>

      <Suspense fallback={<DashboardNeedsAttentionFallback />}>
        <DashboardNeedsAttentionSection
          businessSlug={businessSlug}
          overviewPromise={overviewPromise}
          followUpOverviewPromise={followUpOverviewPromise}
        />
      </Suspense>

      <section className="section-panel overflow-hidden">
        <div className="flex flex-col gap-6 px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">/{businessContext.business.slug}</Badge>
                <Badge variant="outline">
                  {businessContext.business.defaultCurrency}
                </Badge>
              </div>
              <h1 className="mt-3 font-heading text-[1.8rem] font-semibold tracking-tight text-foreground sm:text-[2.1rem]">
                {businessContext.business.name}
              </h1>
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

          <Suspense fallback={<DashboardOverviewStatsFallback />}>
            <DashboardOverviewStatsSection overviewPromise={overviewPromise} />
          </Suspense>
        </div>
      </section>

      <Suspense fallback={<DashboardOverviewQueuesFallback />}>
        <DashboardOverviewQueuesSection
          businessSlug={businessSlug}
          publicInquiryEnabled={businessContext.business.publicInquiryEnabled}
          summaryPromise={summaryPromise}
          overviewPromise={overviewPromise}
        />
      </Suspense>

      <Suspense fallback={<FollowUpDashboardSectionFallback />}>
        <FollowUpDashboardSection
          businessSlug={businessSlug}
          overviewPromise={followUpOverviewPromise}
        />
      </Suspense>

      <OnboardingWelcomeDialog
        businessName={businessContext.business.name}
        businessSlug={businessSlug}
        publicInquiryUrl={getBusinessPublicInquiryUrl(businessSlug)}
      />
    </DashboardPage>
  );
}

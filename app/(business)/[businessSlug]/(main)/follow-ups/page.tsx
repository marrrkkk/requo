import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { getAppShellContext } from "@/lib/app-shell/context";
import { getFollowUpOverviewForBusiness } from "@/features/follow-ups/queries";
import { FollowUpBoard } from "@/features/follow-ups/components/follow-up-board";
import { getRecentRecordsForFollowUpCreate } from "@/features/follow-ups/queries";
import { CreateFollowUpButton } from "@/features/follow-ups/components/create-follow-up-button";
import { LockedAction } from "@/features/paywall";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { FirstVisitTip } from "@/features/onboarding/components/first-visit-tip";
import { featureTips } from "@/features/onboarding/feature-tips";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Follow-ups",
  description: "See who needs contact next and when.",
});

export const unstable_instant = {
  prefetch: "static",
  unstable_disableValidation: true,
};

export default async function FollowUpsPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;

  return (
    <Suspense fallback={<FollowUpsPageSkeleton />}>
      <FirstVisitTip {...featureTips.followUps} className="mb-4" />
      <StreamedFollowUpBoard businessSlug={businessSlug} />
    </Suspense>
  );
}

async function StreamedFollowUpBoard({ businessSlug }: { businessSlug: string }) {
  const { businessContext } = await getAppShellContext(businessSlug);
  const [overview, recentRecords] = await Promise.all([
    getFollowUpOverviewForBusiness(businessContext.business.id),
    getRecentRecordsForFollowUpCreate(businessContext.business.id),
  ]);

  return (
    <FollowUpBoard
      overdue={overview.overdue}
      dueToday={overview.dueToday}
      upcoming={overview.upcoming}
      businessSlug={businessSlug}
      createButton={
        <LockedAction feature="followUps" plan={businessContext.business.plan}>
          <CreateFollowUpButton businessSlug={businessSlug} records={recentRecords} />
        </LockedAction>
      }
    />
  );
}

function FollowUpsPageSkeleton() {
  return (
    <DashboardPage>
      <PageHeader
        title="Follow-ups"
        description="See who needs contact next and when."
      />

      <div className="relative max-w-sm">
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex min-h-48 flex-col gap-3 rounded-xl bg-muted/50 p-4"
          >
            <div className="flex items-center gap-2">
              <Skeleton className="size-4 rounded-full" />
              <Skeleton className="h-4 w-20 rounded-md" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </DashboardPage>
  );
}

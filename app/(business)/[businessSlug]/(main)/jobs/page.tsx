import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { getAppShellContext } from "@/lib/app-shell/context";
import { getJobsBoardForBusiness } from "@/features/jobs/queries";
import { JobsBoard } from "@/features/jobs/components/jobs-board";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { FirstVisitTip } from "@/features/onboarding/components/first-visit-tip";
import { featureTips } from "@/features/onboarding/feature-tips";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Jobs",
  description: "Track accepted work from start to finish.",
});

export const unstable_instant = {
  prefetch: "static",
  unstable_disableValidation: true,
};

export default async function JobsPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;

  return (
    <Suspense fallback={<JobsPageSkeleton />}>
      <FirstVisitTip {...featureTips.jobs} className="mb-4" />
      <StreamedJobsBoard businessSlug={businessSlug} />
    </Suspense>
  );
}

async function StreamedJobsBoard({ businessSlug }: { businessSlug: string }) {
  const { businessContext } = await getAppShellContext(businessSlug);
  const board = await getJobsBoardForBusiness(businessContext.business.id);

  return <JobsBoard board={board} businessSlug={businessSlug} />;
}

function JobsPageSkeleton() {
  return (
    <DashboardPage>
      <PageHeader
        title="Jobs"
        description="Track accepted work from start to finish."
      />

      {/* Search bar placeholder */}
      <div className="relative max-w-sm">
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>

      {/* Board columns skeleton */}
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
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </DashboardPage>
  );
}

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
  samples: [
    {
      params: { businessSlug: "demo" },
      headers: [
        ["rsc", "1"],
        ["next-action", null],
      ],
    },
  ],
};

/**
 * Jobs page — returns the structural shell synchronously.
 *
 * All dynamic reads (params, getAppShellContext, board query) are pushed into
 * a Suspense-wrapped child server component so the static shell is prefetchable
 * and sibling navigations paint instantly.
 */
export default function JobsPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  return (
    <DashboardPage>
      <PageHeader
        title="Jobs"
        description="Track accepted work from start to finish."
      />

      <FirstVisitTip {...featureTips.jobs} className="mb-4" />

      <Suspense fallback={<JobsBoardSkeleton />}>
        <JobsBoardRegion params={params} />
      </Suspense>
    </DashboardPage>
  );
}

// ---------------------------------------------------------------------------
// Suspense-wrapped async child server component
// ---------------------------------------------------------------------------

async function JobsBoardRegion({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const { businessContext } = await getAppShellContext(businessSlug);
  const board = await getJobsBoardForBusiness(businessContext.business.id);

  return <JobsBoard board={board} businessSlug={businessSlug} />;
}

// ---------------------------------------------------------------------------
// Skeleton fallback
// ---------------------------------------------------------------------------

function JobsBoardSkeleton() {
  return (
    <>
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
    </>
  );
}

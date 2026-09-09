import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, History } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { getAppShellContext } from "@/lib/app-shell/context";
import {
  getFollowUpOverviewForBusiness,
  getFollowUpListCountForBusiness,
  getFollowUpListPageForBusiness,
  getFollowUpSummaryCountsForBusiness,
  getActiveAutoFollowUpSequencesForBusiness,
  getRecentRecordsForFollowUpCreate,
  getBusinessMembersForReassign,
} from "@/features/follow-ups/queries";
import { FollowUpBoard } from "@/features/follow-ups/components/follow-up-board";
import {
  FollowUpListContentSection,
  FollowUpListControlsSection,
  FollowUpListContentFallback,
  FollowUpListControlsFallback,
} from "@/features/follow-ups/components/follow-up-list-page-sections";
import { CreateFollowUpButton } from "@/features/follow-ups/components/create-follow-up-button";
import { LockedAction } from "@/features/paywall";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { FirstVisitTip } from "@/features/onboarding/components/first-visit-tip";
import { featureTips } from "@/features/onboarding/feature-tips";
import { getBusinessFollowUpsPath } from "@/features/businesses/routes";
import type {
  FollowUpListFilters,
  FollowUpStatusFilterValue,
  FollowUpDueFilterValue,
  FollowUpSortValue,
} from "@/features/follow-ups/types";
import {
  followUpStatusFilterValues,
  followUpDueFilterValues,
  followUpSortValues,
} from "@/features/follow-ups/types";

type FollowUpsPageProps = {
  params: Promise<{ businessSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createNoIndexMetadata({
  title: "Follow-ups",
  description: "Follow up before these quotes go cold.",
});

export const instant = true;

/**
 * Follow-ups page — returns the structural shell synchronously.
 *
 * All dynamic reads (params, searchParams, getAppShellContext, queries) are
 * pushed into a Suspense-wrapped child server component so the static shell
 * is prefetchable and sibling navigations paint instantly.
 *
 * The view mode (board vs list) depends on searchParams, so the branching
 * lives inside the Suspense child.
 */
export default function FollowUpsPage({
  params,
  searchParams,
}: FollowUpsPageProps) {
  return (
    <DashboardPage>
      <PageHeader title="Follow-ups" />

      <FirstVisitTip {...featureTips.followUps} />

      <Suspense fallback={<FollowUpsPageSkeleton />}>
        <FollowUpsContentRegion params={params} searchParams={searchParams} />
      </Suspense>
    </DashboardPage>
  );
}

// ---------------------------------------------------------------------------
// Suspense-wrapped async child server component
// ---------------------------------------------------------------------------

async function FollowUpsContentRegion({
  params,
  searchParams,
}: FollowUpsPageProps) {
  const [{ businessSlug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);

  // If a status filter is present (e.g. from the History tab),
  // show the filterable list view instead of the board.
  const hasStatusFilter =
    resolvedSearchParams.status &&
    resolvedSearchParams.status !== "pending";

  if (hasStatusFilter) {
    return (
      <StreamedFollowUpList
        businessSlug={businessSlug}
        searchParams={resolvedSearchParams}
      />
    );
  }

  return <StreamedFollowUpBoard businessSlug={businessSlug} />;
}

async function StreamedFollowUpBoard({ businessSlug }: { businessSlug: string }) {
  const { businessContext } = await getAppShellContext(businessSlug);
  const [overview, recentRecords] = await Promise.all([
    getFollowUpOverviewForBusiness(businessContext.business.id),
    getRecentRecordsForFollowUpCreate(businessContext.business.id),
  ]);
  const [summaryCounts, autoSequences] = await Promise.all([
    getFollowUpSummaryCountsForBusiness(businessContext.business.id, overview),
    getActiveAutoFollowUpSequencesForBusiness(businessContext.business.id),
  ]);

  const historyHref = `${getBusinessFollowUpsPath(businessSlug)}?status=all`;
  const historyLabel =
    summaryCounts.history > 0 ? `History (${summaryCounts.history})` : "History";

  return (
    <div className="flex flex-col gap-4">
      <FollowUpBoard
        overdue={overview.overdue}
        dueToday={overview.dueToday}
        upcoming={overview.upcoming}
        businessSlug={businessSlug}
        autoSequences={autoSequences}
        createButton={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={historyHref} prefetch={true}>
                <History data-icon="inline-start" />
                {historyLabel}
              </Link>
            </Button>
            <LockedAction feature="followUps" plan={businessContext.business.plan}>
              <CreateFollowUpButton businessSlug={businessSlug} records={recentRecords} />
            </LockedAction>
          </div>
        }
      />
    </div>
  );
}

const PAGE_SIZE = 25;

function parseFilters(
  searchParams: Record<string, string | string[] | undefined>,
): FollowUpListFilters {
  const rawStatus = typeof searchParams.status === "string" ? searchParams.status : "all";
  const rawDue = typeof searchParams.due === "string" ? searchParams.due : "all";
  const rawSort = typeof searchParams.sort === "string" ? searchParams.sort : "due_asc";
  const rawQ = typeof searchParams.q === "string" ? searchParams.q : "";
  const rawPage = typeof searchParams.page === "string" ? Number(searchParams.page) : 1;

  const status: FollowUpStatusFilterValue = (followUpStatusFilterValues as readonly string[]).includes(rawStatus)
    ? (rawStatus as FollowUpStatusFilterValue)
    : "all";
  const due: FollowUpDueFilterValue = (followUpDueFilterValues as readonly string[]).includes(rawDue)
    ? (rawDue as FollowUpDueFilterValue)
    : "all";
  const sort: FollowUpSortValue = (followUpSortValues as readonly string[]).includes(rawSort)
    ? (rawSort as FollowUpSortValue)
    : "due_asc";

  return { status, due, sort, q: rawQ, page: Math.max(1, rawPage) };
}

async function StreamedFollowUpList({
  businessSlug,
  searchParams,
}: {
  businessSlug: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { businessContext } = await getAppShellContext(businessSlug);
  const businessId = businessContext.business.id;
  const filters = parseFilters(searchParams);
  const page = filters.page;

  const hasFilters = filters.q !== "" || filters.due !== "all" || filters.status !== "all";
  const clearFiltersPath = getBusinessFollowUpsPath(businessSlug);

  const [totalItems, members] = await Promise.all([
    getFollowUpListCountForBusiness({ businessId, filters }),
    getBusinessMembersForReassign(businessId),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const followUpsPromise = getFollowUpListPageForBusiness({
    businessId,
    filters,
    page,
    pageSize: PAGE_SIZE,
  });
  const totalItemsPromise = Promise.resolve(totalItems);

  return (
    <>
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={getBusinessFollowUpsPath(businessSlug)} prefetch={true}>
            <ArrowLeft data-icon="inline-start" />
            Back to To do
          </Link>
        </Button>
      </div>
      <Suspense fallback={<FollowUpListControlsFallback />}>
        <FollowUpListControlsSection filters={filters} totalItemsPromise={totalItemsPromise} />
      </Suspense>

      <Suspense fallback={<FollowUpListContentFallback />}>
        <FollowUpListContentSection
          businessName={businessContext.business.name}
          businessSlug={businessSlug}
          clearFiltersPath={clearFiltersPath}
          filters={filters}
          followUpsPromise={followUpsPromise}
          hasFilters={hasFilters}
          members={members}
          searchParams={searchParams}
          totalItemsPromise={totalItemsPromise}
          totalPages={totalPages}
          currentPage={page}
        />
      </Suspense>
    </>
  );
}

// ---------------------------------------------------------------------------
// Skeleton fallback
// ---------------------------------------------------------------------------

function FollowUpsPageSkeleton() {
  return (
    <>
      {/* Search bar placeholder */}
      <div className="relative max-w-sm">
        <Skeleton className="h-9 w-full rounded-md sm:h-8" />
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
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

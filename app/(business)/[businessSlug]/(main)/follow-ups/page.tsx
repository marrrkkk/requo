import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { getAppShellContext } from "@/lib/app-shell/context";
import {
  getFollowUpOverviewForBusiness,
  getFollowUpListCountForBusiness,
  getFollowUpListPageForBusiness,
  getRecentRecordsForFollowUpCreate,
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
import { getBusinessMembersForReassign } from "@/features/follow-ups/queries";
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
  description: "See who needs contact next and when.",
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
      <PageHeader
        title="Follow-ups"
        description="See who needs contact next and when."
      />

      <FirstVisitTip {...featureTips.followUps} className="mb-4" />

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

  // If a status filter is present (e.g. from "View completed & skipped"),
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

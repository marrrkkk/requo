import type { Metadata } from "next";
import { Suspense } from "react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import {
  FollowUpListContentFallback,
  FollowUpListContentSection,
  FollowUpListControlsFallback,
  FollowUpListControlsSection,
} from "@/features/follow-ups/components/follow-up-list-page-sections";
import {
  getFollowUpListCountForBusiness,
  getFollowUpListPageForBusiness,
  getBusinessMembersForReassign,
  getRecentRecordsForFollowUpCreate,
} from "@/features/follow-ups/queries";
import { followUpListFiltersSchema } from "@/features/follow-ups/schemas";
import type { FollowUpListFilters } from "@/features/follow-ups/types";
import { getBusinessFollowUpsPath } from "@/features/businesses/routes";
import { LockedAction } from "@/features/paywall";
import { CreateFollowUpButton } from "@/features/follow-ups/components/create-follow-up-button";
import { getAppShellContext } from "@/lib/app-shell/context";
import { createNoIndexMetadata } from "@/lib/seo/site";

type FollowUpsPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const ITEMS_PER_PAGE = 10;

export const metadata: Metadata = createNoIndexMetadata({
  title: "Follow-ups",
  description: "List, filter, and resolve follow-up tasks for this business.",
});

export const unstable_instant = {
  prefetch: 'static',
  unstable_disableValidation: true,
};

export default async function FollowUpsPage({
  params,
  searchParams,
}: FollowUpsPageProps) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const { businessContext } = await getAppShellContext(slug);

  const parsedFilters = followUpListFiltersSchema.safeParse(resolvedSearchParams);
  const filters = parsedFilters.success
    ? parsedFilters.data
    : {
        q: undefined,
        status: "pending" as const,
        due: "all" as const,
        sort: "due_asc" as const,
        page: 1,
      };
  const baseFilters = {
    q: filters.q,
    status: filters.status,
    due: filters.due,
    sort: filters.sort,
  };
  const totalItemsPromise = getFollowUpListCountForBusiness({
    businessId: businessContext.business.id,
    filters: baseFilters,
  });
  const pageDataPromise = totalItemsPromise.then(async (totalItems) => {
    const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
    const currentPage = Math.min(Math.max(1, filters.page), totalPages);
    const followUps = await getFollowUpListPageForBusiness({
      businessId: businessContext.business.id,
      filters: baseFilters,
      page: currentPage,
      pageSize: ITEMS_PER_PAGE,
    });

    return {
      currentPage,
      followUps,
      totalPages,
    };
  });
  const businessSlug = businessContext.business.slug;
  const hasFilters = Boolean(
    baseFilters.q ||
      baseFilters.status !== "pending" ||
      baseFilters.due !== "all" ||
      baseFilters.sort !== "due_asc",
  );
  const clearFiltersPath = getBusinessFollowUpsPath(businessSlug);
  const recentRecords = await getRecentRecordsForFollowUpCreate(
    businessContext.business.id,
  );
  const members = await getBusinessMembersForReassign(
    businessContext.business.id,
  );

  return (
    <DashboardPage>
      <PageHeader
        description="See who needs contact next, why, and when. Follow-ups are lightweight reminders tied to inquiries and quotes."
        eyebrow="Follow-ups"
        title="Follow-ups"
        actions={
          <LockedAction feature="followUps" plan={businessContext.business.plan}>
            <CreateFollowUpButton businessSlug={businessSlug} records={recentRecords} />
          </LockedAction>
        }
      />

      <Suspense fallback={<FollowUpListControlsFallback />}>
        <FollowUpListControlsSection
          filters={filters}
          totalItemsPromise={totalItemsPromise}
        />
      </Suspense>

      <Suspense fallback={<FollowUpListContentFallback />}>
        <FollowUpListContent
          businessName={businessContext.business.name}
          businessSlug={businessSlug}
          clearFiltersPath={clearFiltersPath}
          filters={filters}
          hasFilters={hasFilters}
          members={members}
          pageDataPromise={pageDataPromise}
          searchParams={resolvedSearchParams}
          totalItemsPromise={totalItemsPromise}
        />
      </Suspense>
    </DashboardPage>
  );
}

async function FollowUpListContent({
  businessName,
  businessSlug,
  clearFiltersPath,
  filters,
  hasFilters,
  members,
  pageDataPromise,
  searchParams,
  totalItemsPromise,
}: {
  businessName: string;
  businessSlug: string;
  clearFiltersPath: string;
  filters: FollowUpListFilters;
  hasFilters: boolean;
  members: { userId: string; name: string; email: string }[];
  pageDataPromise: Promise<{
    currentPage: number;
    followUps: Awaited<ReturnType<typeof getFollowUpListPageForBusiness>>;
    totalPages: number;
  }>;
  searchParams: Record<string, string | string[] | undefined>;
  totalItemsPromise: Promise<number>;
}) {
  const pageData = await pageDataPromise;

  return (
    <FollowUpListContentSection
      businessName={businessName}
      businessSlug={businessSlug}
      clearFiltersPath={clearFiltersPath}
      currentPage={pageData.currentPage}
      filters={filters}
      followUpsPromise={Promise.resolve(pageData.followUps)}
      hasFilters={hasFilters}
      members={members}
      searchParams={searchParams}
      totalItemsPromise={totalItemsPromise}
      totalPages={pageData.totalPages}
    />
  );
}

import { redirect } from "next/navigation";
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
} from "@/features/follow-ups/queries";
import { followUpListFiltersSchema } from "@/features/follow-ups/schemas";
import type { FollowUpListFilters } from "@/features/follow-ups/types";
import { getBusinessFollowUpsPath } from "@/features/businesses/routes";
import { workspacesHubPath } from "@/features/workspaces/routes";
import { requireSession } from "@/lib/auth/session";
import { getBusinessContextForMembershipSlug } from "@/lib/db/business-access";

type FollowUpsPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const ITEMS_PER_PAGE = 10;

export default async function FollowUpsPage({
  params,
  searchParams,
}: FollowUpsPageProps) {
  const [session, { slug }, resolvedSearchParams] = await Promise.all([
    requireSession(),
    params,
    searchParams,
  ]);
  const businessContext = await getBusinessContextForMembershipSlug(
    session.user.id,
    slug,
  );

  if (!businessContext) {
    redirect(workspacesHubPath);
  }

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

  return (
    <DashboardPage>
      <PageHeader
        description="See who needs contact next, why, and when. Follow-ups are lightweight reminders tied to inquiries and quotes."
        eyebrow="Follow-ups"
        title="Follow-ups"
      />

      <Suspense fallback={<FollowUpListControlsFallback />}>
        <FollowUpListControlsSection
          filters={filters}
          totalItemsPromise={totalItemsPromise}
        />
      </Suspense>

      <Suspense fallback={<FollowUpListContentFallback />}>
        <FollowUpListContent
          businessSlug={businessSlug}
          clearFiltersPath={clearFiltersPath}
          filters={filters}
          hasFilters={hasFilters}
          pageDataPromise={pageDataPromise}
          searchParams={resolvedSearchParams}
          totalItemsPromise={totalItemsPromise}
        />
      </Suspense>
    </DashboardPage>
  );
}

async function FollowUpListContent({
  businessSlug,
  clearFiltersPath,
  filters,
  hasFilters,
  pageDataPromise,
  searchParams,
  totalItemsPromise,
}: {
  businessSlug: string;
  clearFiltersPath: string;
  filters: FollowUpListFilters;
  hasFilters: boolean;
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
      businessSlug={businessSlug}
      clearFiltersPath={clearFiltersPath}
      currentPage={pageData.currentPage}
      filters={filters}
      followUpsPromise={Promise.resolve(pageData.followUps)}
      hasFilters={hasFilters}
      searchParams={searchParams}
      totalItemsPromise={totalItemsPromise}
      totalPages={pageData.totalPages}
    />
  );
}

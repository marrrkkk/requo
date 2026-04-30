import { redirect } from "next/navigation";
import { Suspense } from "react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import {
  InquiryListContentFallback,
  InquiryListContentSection,
  InquiryListControlsFallback,
  InquiryListControlsSection,
} from "@/features/inquiries/components/inquiry-list-page-sections";
import { inquiryListFiltersSchema } from "@/features/inquiries/schemas";
import {
  getBusinessInquiryFormOptionsForBusiness,
  getInquiryListCountForBusiness,
  getInquiryListPageForBusiness,
} from "@/features/inquiries/queries";
import {
  getBusinessInquiriesPath,
} from "@/features/businesses/routes";
import { workspacesHubPath } from "@/features/workspaces/routes";
import { requireSession } from "@/lib/auth/session";
import { getBusinessContextForMembershipSlug } from "@/lib/db/business-access";

type InquiriesPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const ITEMS_PER_PAGE = 10;
const FULL_PAGE_CACHE_MAX_PAGES = 5;
const FORWARD_PAGE_CACHE_WINDOW = 1;
const BACKWARD_PAGE_CACHE_WINDOW = 0;

function getCachedPageWindow(currentPage: number, totalPages: number) {
  if (totalPages <= FULL_PAGE_CACHE_MAX_PAGES) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([currentPage]);

  for (let offset = 1; offset <= BACKWARD_PAGE_CACHE_WINDOW; offset += 1) {
    const page = currentPage - offset;

    if (page >= 1) {
      pages.add(page);
    }
  }

  for (let offset = 1; offset <= FORWARD_PAGE_CACHE_WINDOW; offset += 1) {
    const page = currentPage + offset;

    if (page <= totalPages) {
      pages.add(page);
    }
  }

  return Array.from(pages).sort((left, right) => left - right);
}

export default async function InquiriesPage({
  params,
  searchParams,
}: InquiriesPageProps) {
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

  const parsedFilters = inquiryListFiltersSchema.safeParse(resolvedSearchParams);
  const filters = parsedFilters.success
    ? parsedFilters.data
    : {
        q: undefined,
        view: "active" as const,
        status: "all" as const,
        form: "all",
        sort: "newest" as const,
        page: 1,
      };
  const baseFilters = {
    q: filters.q,
    view: filters.view,
    status: filters.status,
    form: filters.form,
    sort: filters.sort,
  };
  const inquiryCountPromise = getInquiryListCountForBusiness({
    businessId: businessContext.business.id,
    filters: baseFilters,
  });
  const inquiryPageDataPromise = inquiryCountPromise.then(async (totalItems) => {
    const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
    const currentPage = Math.min(Math.max(1, filters.page), totalPages);
    const cachedPageNumbers = totalItems
      ? getCachedPageWindow(currentPage, totalPages)
      : [];
    const cachedPageEntries = await Promise.all(
      cachedPageNumbers.map(async (page) => [
        page,
        await getInquiryListPageForBusiness({
          businessId: businessContext.business.id,
          filters: baseFilters,
          page,
          pageSize: ITEMS_PER_PAGE,
        }),
      ] as const),
    );
    const cachedPages = Object.fromEntries(cachedPageEntries);

    return {
      cachedPages,
      currentPage,
      filterKey: JSON.stringify(baseFilters),
      totalItems,
      totalPages,
    };
  });

  const inquiryFormOptionsPromise = getBusinessInquiryFormOptionsForBusiness(
    businessContext.business.id,
  );
  const businessSlug = businessContext.business.slug;
  const hasNonViewFilters = Boolean(
    baseFilters.q ||
      baseFilters.status !== "all" ||
      baseFilters.form !== "all" ||
      baseFilters.sort !== "newest",
  );
  const clearFiltersPath = (() => {
    const params = new URLSearchParams();

    if (filters.view !== "active") {
      params.set("view", filters.view);
    }

    return params.size
      ? `${getBusinessInquiriesPath(businessSlug)}?${params.toString()}`
      : getBusinessInquiriesPath(businessSlug);
  })();

  return (
    <DashboardPage>
      <PageHeader
        eyebrow="Inquiries"
        title="Customer inquiries"
      />

      <Suspense fallback={<InquiryListControlsFallback />}>
        <InquiryListControlsSection
          businessSlug={businessSlug}
          filters={filters}
          formOptionsPromise={inquiryFormOptionsPromise}
          searchParams={resolvedSearchParams}
          totalItemsPromise={inquiryCountPromise}
        />
      </Suspense>

      <Suspense fallback={<InquiryListContentFallback />}>
        <InquiryListContentSection
          businessSlug={businessSlug}
          clearFiltersPath={clearFiltersPath}
          filters={filters}
          hasNonViewFilters={hasNonViewFilters}
          pageDataPromise={inquiryPageDataPromise}
          searchParams={resolvedSearchParams}
          totalItemsPromise={inquiryCountPromise}
        />
      </Suspense>
    </DashboardPage>
  );
}

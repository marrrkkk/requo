import type { Metadata } from "next";
import { Suspense } from "react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import {
  QuoteListContentFallback,
  QuoteListContentSection,
  QuoteListControlsFallback,
  QuoteListControlsSection,
} from "@/features/quotes/components/quote-list-page-sections";
import {
  getQuoteListCountForBusiness,
  getQuoteListPageForBusiness,
} from "@/features/quotes/queries";
import { restoreArchivedQuoteAction } from "@/features/quotes/actions";
import { quoteListFiltersSchema } from "@/features/quotes/schemas";
import {
  getBusinessQuotesPath,
} from "@/features/businesses/routes";
import { getAppShellContext } from "@/lib/app-shell/context";
import { hasFeatureAccess } from "@/lib/plans";
import { createNoIndexMetadata } from "@/lib/seo/site";

type QuotesPageProps = {
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

export const metadata: Metadata = createNoIndexMetadata({
  title: "Quotes",
  description: "List, filter, and manage quotes for this business.",
});

export const unstable_instant = {
  prefetch: 'static',
  unstable_disableValidation: true,
};

export default async function QuotesPage({
  params,
  searchParams,
}: QuotesPageProps) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const { businessContext } = await getAppShellContext(slug);

  const parsedFilters = quoteListFiltersSchema.safeParse(resolvedSearchParams);
  const filters = parsedFilters.success
    ? parsedFilters.data
    : {
        q: undefined,
        view: "active" as const,
        status: "all" as const,
        sort: "newest" as const,
        page: 1,
      };
  const baseFilters = {
    q: filters.q,
    view: filters.view,
    status: filters.status,
    sort: filters.sort,
  };
  const quoteCountPromise = getQuoteListCountForBusiness({
    businessId: businessContext.business.id,
    filters: baseFilters,
  });
  const quotePageDataPromise = quoteCountPromise.then(async (totalItems) => {
    const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
    const currentPage = Math.min(Math.max(1, filters.page), totalPages);
    const cachedPageNumbers = totalItems
      ? getCachedPageWindow(currentPage, totalPages)
      : [];
    const cachedPageEntries = await Promise.all(
      cachedPageNumbers.map(async (page) => [
        page,
        await getQuoteListPageForBusiness({
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
  const businessSlug = businessContext.business.slug;
  const archivedItemsPromise = getQuoteListPageForBusiness({
    businessId: businessContext.business.id,
    filters: { view: "archived", status: "all", sort: "newest" },
    page: 1,
    pageSize: 50,
  });
  const canExport = hasFeatureAccess(
    businessContext.business.plan,
    "exports",
  );
  const hasNonViewFilters = Boolean(
    baseFilters.q || baseFilters.status !== "all" || baseFilters.sort !== "newest",
  );
  const clearFiltersPath = (() => {
    const params = new URLSearchParams();

    if (filters.view !== "active") {
      params.set("view", filters.view);
    }

    return params.size
      ? `${getBusinessQuotesPath(businessSlug)}?${params.toString()}`
      : getBusinessQuotesPath(businessSlug);
  })();

  return (
    <DashboardPage>
      <PageHeader
        eyebrow="Quotes"
        title="Quotes"
      />

      <Suspense fallback={<QuoteListControlsFallback />}>
        <QuoteListControlsSection
          businessSlug={businessSlug}
          canExport={canExport}
          filters={filters}
          searchParams={resolvedSearchParams}
          totalItemsPromise={quoteCountPromise}
          archivedItemsPromise={archivedItemsPromise}
          restoreAction={restoreArchivedQuoteAction}
        />
      </Suspense>

      <Suspense fallback={<QuoteListContentFallback />}>
        <QuoteListContentSection
          businessSlug={businessSlug}
          clearFiltersPath={clearFiltersPath}
          filters={filters}
          hasNonViewFilters={hasNonViewFilters}
          pageDataPromise={quotePageDataPromise}
          searchParams={resolvedSearchParams}
          totalItemsPromise={quoteCountPromise}
        />
      </Suspense>
    </DashboardPage>
  );
}

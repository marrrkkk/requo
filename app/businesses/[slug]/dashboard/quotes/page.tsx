import Link from "next/link";
import { ReceiptText } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { DashboardListResultsSkeleton } from "@/components/shared/dashboard-list-results-skeleton";
import {
  DashboardEmptyState,
  DashboardPage,
} from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { QuoteListFilters } from "@/features/quotes/components/quote-list-filters";
import { QuoteExportCsvDropdown } from "@/features/quotes/components/quote-export-csv-dropdown";
import { QuoteListResults } from "@/features/quotes/components/quote-list-results";
import {
  getQuoteListCountForBusiness,
  getQuoteListPageForBusiness,
} from "@/features/quotes/queries";
import { quoteListFiltersSchema } from "@/features/quotes/schemas";
import {
  getBusinessNewQuotePath,
  getBusinessQuotesPath,
} from "@/features/businesses/routes";
import { workspacesHubPath } from "@/features/workspaces/routes";
import { requireSession } from "@/lib/auth/session";
import { getBusinessContextForMembershipSlug } from "@/lib/db/business-access";

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

export default async function QuotesPage({
  params,
  searchParams,
}: QuotesPageProps) {
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

  const parsedFilters = quoteListFiltersSchema.safeParse(resolvedSearchParams);
  const filters = parsedFilters.success
    ? parsedFilters.data
    : {
        q: undefined,
        status: "all" as const,
        sort: "newest" as const,
        page: 1,
      };
  const baseFilters = {
    q: filters.q,
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
  const totalItems = await quoteCountPromise;
  const businessSlug = businessContext.business.slug;
  const hasFilters = Boolean(
    baseFilters.q || baseFilters.status !== "all" || baseFilters.sort !== "newest",
  );

  return (
    <DashboardPage>
      <PageHeader
        eyebrow="Quotes"
        title="Quotes"
        actions={
          <div className="dashboard-actions">
            <QuoteExportCsvDropdown
              businessSlug={businessSlug}
              filters={filters}
              resultCount={totalItems}
            />
            <Button asChild>
              <Link href={getBusinessNewQuotePath(businessSlug)} prefetch={true}>
                <ReceiptText data-icon="inline-start" />
                Create quote
              </Link>
            </Button>
          </div>
        }
      />

      <QuoteListFilters filters={filters} resultCount={totalItems} />

      {totalItems ? (
        <Suspense fallback={<DashboardListResultsSkeleton variant="quotes" />}>
          <QuoteListResults
            businessSlug={businessSlug}
            pageData={quotePageDataPromise}
            searchParams={resolvedSearchParams}
          />
        </Suspense>
      ) : (
        <DashboardEmptyState
          action={
            hasFilters ? (
              <Button asChild variant="outline">
                <Link href={getBusinessQuotesPath(businessSlug)} prefetch={true}>Clear filters</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href={getBusinessNewQuotePath(businessSlug)} prefetch={true}>
                  <ReceiptText data-icon="inline-start" />
                  Create first quote
                </Link>
              </Button>
            )
          }
          description={
            hasFilters
              ? "Try another search or status."
              : "Create a quote manually or send one from an inquiry."
          }
          icon={ReceiptText}
          title={
            hasFilters
              ? "No quotes match these filters."
              : "Your quote list is still empty."
          }
          variant="list"
        />
      )}
    </DashboardPage>
  );
}

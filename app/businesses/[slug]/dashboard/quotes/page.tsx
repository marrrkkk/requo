import Link from "next/link";
import { ArrowRight, ReceiptText } from "lucide-react";
import { Suspense } from "react";

import { DashboardListResultsSkeleton } from "@/components/shared/dashboard-list-results-skeleton";
import {
  DashboardEmptyState,
  DashboardPage,
} from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { QuoteListFilters } from "@/features/quotes/components/quote-list-filters";
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
import { requireCurrentBusinessContext } from "@/lib/db/business-access";

type QuotesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const ITEMS_PER_PAGE = 10;

export default async function QuotesPage({ searchParams }: QuotesPageProps) {
  const [{ businessContext }, resolvedSearchParams] = await Promise.all([
    requireCurrentBusinessContext(),
    searchParams,
  ]);
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
    const quotes = totalItems
      ? await getQuoteListPageForBusiness({
          businessId: businessContext.business.id,
          filters: baseFilters,
          page: currentPage,
          pageSize: ITEMS_PER_PAGE,
        })
      : [];

    return {
      currentPage,
      quotes,
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
          <Button asChild>
            <Link href={getBusinessNewQuotePath(businessSlug)} prefetch={true}>
              Create quote
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        }
      />

      <QuoteListFilters filters={filters} resultCount={totalItems} />

      {totalItems ? (
        <Suspense fallback={<DashboardListResultsSkeleton variant="quotes" />}>
          <QuoteListResults
            businessSlug={businessSlug}
            currency={businessContext.business.defaultCurrency}
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
                  Create first quote
                </Link>
              </Button>
            )
          }
          description={
            hasFilters ? "Try another search or status." : "No quotes yet."
          }
          icon={ReceiptText}
          title={
            hasFilters
              ? "No quotes match these filters."
              : "Your quote business is still empty."
          }
          variant="list"
        />
      )}
    </DashboardPage>
  );
}

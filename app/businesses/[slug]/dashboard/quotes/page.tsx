import Link from "next/link";
import { ArrowRight, ReceiptText } from "lucide-react";

import {
  DashboardEmptyState,
  DashboardPage,
} from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { QuoteListCards } from "@/features/quotes/components/quote-list-cards";
import { QuoteListFilters } from "@/features/quotes/components/quote-list-filters";
import { QuoteListTable } from "@/features/quotes/components/quote-list-table";
import { getQuoteListForBusiness } from "@/features/quotes/queries";
import { quoteListFiltersSchema } from "@/features/quotes/schemas";
import {
  getBusinessNewQuotePath,
  getBusinessQuotesPath,
} from "@/features/businesses/routes";
import { requireCurrentBusinessContext } from "@/lib/db/business-access";

type QuotesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

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
      };
  const quoteList = await getQuoteListForBusiness({
    businessId: businessContext.business.id,
    filters,
  });
  const businessSlug = businessContext.business.slug;
  const hasFilters = Boolean(
    filters.q || filters.status !== "all" || filters.sort !== "newest",
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

      <QuoteListFilters filters={filters} resultCount={quoteList.length} />

      {quoteList.length ? (
        <>
          <QuoteListTable
            quotes={quoteList}
            currency={businessContext.business.defaultCurrency}
            businessSlug={businessSlug}
          />
          <QuoteListCards
            quotes={quoteList}
            currency={businessContext.business.defaultCurrency}
            businessSlug={businessSlug}
          />
        </>
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

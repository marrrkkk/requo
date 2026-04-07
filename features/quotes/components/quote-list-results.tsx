import { DataListPagination } from "@/components/shared/data-list-pagination";
import { QuoteListCards } from "@/features/quotes/components/quote-list-cards";
import { QuoteListTable } from "@/features/quotes/components/quote-list-table";
import { getBusinessQuotesPath } from "@/features/businesses/routes";
import type { DashboardQuoteListItem } from "@/features/quotes/types";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type QuoteListResultsData = {
  currentPage: number;
  quotes: DashboardQuoteListItem[];
  totalItems: number;
  totalPages: number;
};

type QuoteListResultsProps = {
  businessSlug: string;
  currency: string;
  pageData: Promise<QuoteListResultsData>;
  searchParams: SearchParamsRecord;
};

export async function QuoteListResults({
  businessSlug,
  currency,
  pageData,
  searchParams,
}: QuoteListResultsProps) {
  const { currentPage, quotes, totalItems, totalPages } = await pageData;

  return (
    <>
      <QuoteListTable
        quotes={quotes}
        currency={currency}
        businessSlug={businessSlug}
      />
      <QuoteListCards
        quotes={quotes}
        currency={currency}
        businessSlug={businessSlug}
      />
      <DataListPagination
        currentPage={currentPage}
        pathname={getBusinessQuotesPath(businessSlug)}
        searchParams={searchParams}
        totalItems={totalItems}
        totalPages={totalPages}
      />
    </>
  );
}

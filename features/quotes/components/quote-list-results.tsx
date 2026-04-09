import { QuoteListResultsClient } from "@/features/quotes/components/quote-list-results-client";
import type { DashboardQuoteListItem } from "@/features/quotes/types";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type QuoteListResultsData = {
  cachedPages?: Record<number, DashboardQuoteListItem[]> | null;
  currentPage: number;
  filterKey: string;
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
  const { cachedPages, currentPage, filterKey, totalItems, totalPages } =
    await pageData;

  return (
    <QuoteListResultsClient
      key={filterKey}
      businessSlug={businessSlug}
      cachedPages={cachedPages ?? {}}
      currency={currency}
      currentPage={currentPage}
      searchParams={searchParams}
      totalItems={totalItems}
      totalPages={totalPages}
    />
  );
}

import { InvoiceListResultsClient } from "@/features/invoices/components/invoice-list-results-client";
import type { DashboardInvoiceListItem } from "@/features/invoices/types";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type InvoiceListResultsData = {
  cachedPages?: Record<number, DashboardInvoiceListItem[]> | null;
  currentPage: number;
  filterKey: string;
  totalItems: number;
  totalPages: number;
};

type InvoiceListResultsProps = {
  businessSlug: string;
  pageData: Promise<InvoiceListResultsData>;
  searchParams: SearchParamsRecord;
};

export async function InvoiceListResults({
  businessSlug,
  pageData,
  searchParams,
}: InvoiceListResultsProps) {
  const { cachedPages, currentPage, filterKey, totalItems, totalPages } =
    await pageData;

  return (
    <InvoiceListResultsClient
      key={filterKey}
      businessSlug={businessSlug}
      cachedPages={cachedPages ?? {}}
      currentPage={currentPage}
      searchParams={searchParams}
      totalItems={totalItems}
      totalPages={totalPages}
    />
  );
}

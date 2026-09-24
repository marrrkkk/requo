import { PaymentListResultsClient } from "@/features/invoices/components/payment-list-results-client";
import type { PaymentListItem } from "@/features/invoices/types";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type PaymentListResultsData = {
  cachedPages?: Record<number, PaymentListItem[]> | null;
  currentPage: number;
  filterKey: string;
  totalItems: number;
  totalPages: number;
};

type PaymentListResultsProps = {
  businessSlug: string;
  pageData: Promise<PaymentListResultsData>;
  searchParams: SearchParamsRecord;
};

export async function PaymentListResults({
  businessSlug,
  pageData,
  searchParams,
}: PaymentListResultsProps) {
  const { cachedPages, currentPage, filterKey, totalItems, totalPages } =
    await pageData;

  return (
    <PaymentListResultsClient
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

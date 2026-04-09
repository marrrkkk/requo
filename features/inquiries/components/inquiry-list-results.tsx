import { InquiryListResultsClient } from "@/features/inquiries/components/inquiry-list-results-client";
import type { DashboardInquiryListItem } from "@/features/inquiries/types";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type InquiryListResultsData = {
  cachedPages?: Record<number, DashboardInquiryListItem[]> | null;
  currentPage: number;
  filterKey: string;
  totalItems: number;
  totalPages: number;
};

type InquiryListResultsProps = {
  businessSlug: string;
  pageData: Promise<InquiryListResultsData>;
  searchParams: SearchParamsRecord;
};

export async function InquiryListResults({
  businessSlug,
  pageData,
  searchParams,
}: InquiryListResultsProps) {
  const { cachedPages, currentPage, filterKey, totalItems, totalPages } =
    await pageData;

  return (
    <InquiryListResultsClient
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

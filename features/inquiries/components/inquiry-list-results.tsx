import { DataListPagination } from "@/components/shared/data-list-pagination";
import { InquiryListCards } from "@/features/inquiries/components/inquiry-list-cards";
import { InquiryListTable } from "@/features/inquiries/components/inquiry-list-table";
import { getBusinessInquiriesPath } from "@/features/businesses/routes";
import type { DashboardInquiryListItem } from "@/features/inquiries/types";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type InquiryListResultsData = {
  inquiries: DashboardInquiryListItem[];
  currentPage: number;
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
  const { inquiries, currentPage, totalItems, totalPages } = await pageData;

  return (
    <>
      <InquiryListTable inquiries={inquiries} businessSlug={businessSlug} />
      <InquiryListCards inquiries={inquiries} businessSlug={businessSlug} />
      <DataListPagination
        currentPage={currentPage}
        pathname={getBusinessInquiriesPath(businessSlug)}
        searchParams={searchParams}
        totalItems={totalItems}
        totalPages={totalPages}
      />
    </>
  );
}

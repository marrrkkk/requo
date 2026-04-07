import Link from "next/link";
import { Inbox } from "lucide-react";

import {
  DashboardEmptyState,
  DashboardPage,
} from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { InquiryListCards } from "@/features/inquiries/components/inquiry-list-cards";
import { InquiryListFilters as InquiryListToolbar } from "@/features/inquiries/components/inquiry-list-filters";
import { InquiryListTable } from "@/features/inquiries/components/inquiry-list-table";
import { inquiryListFiltersSchema } from "@/features/inquiries/schemas";
import {
  getInquiryListForBusiness,
  getBusinessInquiryFormOptionsForBusiness,
} from "@/features/inquiries/queries";
import { getBusinessPublicInquiryUrl } from "@/features/settings/utils";
import { getBusinessInquiriesPath } from "@/features/businesses/routes";
import { requireCurrentBusinessContext } from "@/lib/db/business-access";

type InquiriesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InquiriesPage({
  searchParams,
}: InquiriesPageProps) {
  const [{ businessContext }, resolvedSearchParams] = await Promise.all([
    requireCurrentBusinessContext(),
    searchParams,
  ]);
  const parsedFilters = inquiryListFiltersSchema.safeParse(resolvedSearchParams);
  const filters = parsedFilters.success
    ? parsedFilters.data
    : {
        q: undefined,
        status: "all" as const,
        form: "all",
        sort: "newest" as const,
      };

  const [inquiryList, inquiryFormOptions] = await Promise.all([
    getInquiryListForBusiness({
      businessId: businessContext.business.id,
      filters,
    }),
    getBusinessInquiryFormOptionsForBusiness(businessContext.business.id),
  ]);
  const businessSlug = businessContext.business.slug;
  const hasFilters = Boolean(
    filters.q ||
      filters.status !== "all" ||
      filters.form !== "all" ||
      filters.sort !== "newest",
  );
  const publicInquiryUrl = getBusinessPublicInquiryUrl(businessSlug);

  return (
    <DashboardPage>
      <PageHeader
        eyebrow="Requests"
        title="Customer requests"
      />

      <InquiryListToolbar
        key={`${filters.status}:${filters.form}:${filters.q ?? ""}:${filters.sort}`}
        filters={filters}
        formOptions={[
          {
            value: "all",
            label: "All forms",
          },
          ...inquiryFormOptions.map((form) => ({
            value: form.slug,
            label: form.isDefault ? `${form.name} (Default)` : form.name,
          })),
        ]}
        resultCount={inquiryList.length}
      />

      {inquiryList.length ? (
        <>
          <InquiryListTable inquiries={inquiryList} businessSlug={businessSlug} />
          <InquiryListCards inquiries={inquiryList} businessSlug={businessSlug} />
        </>
      ) : (
        <DashboardEmptyState
          action={
            hasFilters ? (
              <Button asChild variant="outline">
                <Link href={getBusinessInquiriesPath(businessSlug)} prefetch={true}>Clear filters</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link
                  href={publicInquiryUrl}
                  prefetch={false}
                >
                  Preview public inquiry page
                </Link>
              </Button>
            )
          }
          description={
            hasFilters
              ? "Try another search or status."
              : "Requests show up here."
          }
          icon={Inbox}
          title={
            hasFilters
              ? "No requests match these filters."
              : "Your request inbox is still empty."
          }
          variant="list"
        />
      )}
    </DashboardPage>
  );
}

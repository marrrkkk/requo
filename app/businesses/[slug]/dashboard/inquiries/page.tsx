import Link from "next/link";
import { Inbox } from "lucide-react";
import { Suspense } from "react";

import { DashboardListResultsSkeleton } from "@/components/shared/dashboard-list-results-skeleton";
import {
  DashboardEmptyState,
  DashboardPage,
} from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { InquiryListFilters as InquiryListToolbar } from "@/features/inquiries/components/inquiry-list-filters";
import { InquiryListResults } from "@/features/inquiries/components/inquiry-list-results";
import { inquiryListFiltersSchema } from "@/features/inquiries/schemas";
import {
  getBusinessInquiryFormOptionsForBusiness,
  getInquiryListCountForBusiness,
  getInquiryListPageForBusiness,
} from "@/features/inquiries/queries";
import { getBusinessPublicInquiryUrl } from "@/features/settings/utils";
import { getBusinessInquiriesPath } from "@/features/businesses/routes";
import { requireCurrentBusinessContext } from "@/lib/db/business-access";

type InquiriesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const ITEMS_PER_PAGE = 10;

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
        page: 1,
      };
  const baseFilters = {
    q: filters.q,
    status: filters.status,
    form: filters.form,
    sort: filters.sort,
  };
  const inquiryCountPromise = getInquiryListCountForBusiness({
    businessId: businessContext.business.id,
    filters: baseFilters,
  });
  const inquiryPageDataPromise = inquiryCountPromise.then(async (totalItems) => {
    const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
    const currentPage = Math.min(Math.max(1, filters.page), totalPages);
    const inquiries = totalItems
      ? await getInquiryListPageForBusiness({
          businessId: businessContext.business.id,
          filters: baseFilters,
          page: currentPage,
          pageSize: ITEMS_PER_PAGE,
        })
      : [];

    return {
      currentPage,
      inquiries,
      totalItems,
      totalPages,
    };
  });

  const [totalItems, inquiryFormOptions] = await Promise.all([
    inquiryCountPromise,
    getBusinessInquiryFormOptionsForBusiness(businessContext.business.id),
  ]);
  const businessSlug = businessContext.business.slug;
  const hasFilters = Boolean(
    baseFilters.q ||
      baseFilters.status !== "all" ||
      baseFilters.form !== "all" ||
      baseFilters.sort !== "newest",
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
        resultCount={totalItems}
      />

      {totalItems ? (
        <Suspense fallback={<DashboardListResultsSkeleton variant="inquiries" />}>
          <InquiryListResults
            businessSlug={businessSlug}
            pageData={inquiryPageDataPromise}
            searchParams={resolvedSearchParams}
          />
        </Suspense>
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

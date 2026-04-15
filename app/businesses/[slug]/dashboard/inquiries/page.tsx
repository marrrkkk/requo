import Link from "next/link";
import { Inbox } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { DashboardListResultsSkeleton } from "@/components/shared/dashboard-list-results-skeleton";
import {
  DashboardEmptyState,
  DashboardPage,
} from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { InquiryListFilters as InquiryListToolbar } from "@/features/inquiries/components/inquiry-list-filters";
import { InquiryExportCsvDropdown } from "@/features/inquiries/components/inquiry-export-csv-dropdown";
import { InquiryListResults } from "@/features/inquiries/components/inquiry-list-results";
import { inquiryListFiltersSchema } from "@/features/inquiries/schemas";
import {
  getBusinessInquiryFormOptionsForBusiness,
  getInquiryListCountForBusiness,
  getInquiryListPageForBusiness,
} from "@/features/inquiries/queries";
import { getBusinessPublicInquiryUrl } from "@/features/settings/utils";
import {
  getBusinessInquiriesPath,
} from "@/features/businesses/routes";
import { workspacesHubPath } from "@/features/workspaces/routes";
import { requireSession } from "@/lib/auth/session";
import { getBusinessContextForMembershipSlug } from "@/lib/db/business-access";

type InquiriesPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const ITEMS_PER_PAGE = 10;
const FULL_PAGE_CACHE_MAX_PAGES = 5;
const FORWARD_PAGE_CACHE_WINDOW = 1;
const BACKWARD_PAGE_CACHE_WINDOW = 0;

function getCachedPageWindow(currentPage: number, totalPages: number) {
  if (totalPages <= FULL_PAGE_CACHE_MAX_PAGES) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([currentPage]);

  for (let offset = 1; offset <= BACKWARD_PAGE_CACHE_WINDOW; offset += 1) {
    const page = currentPage - offset;

    if (page >= 1) {
      pages.add(page);
    }
  }

  for (let offset = 1; offset <= FORWARD_PAGE_CACHE_WINDOW; offset += 1) {
    const page = currentPage + offset;

    if (page <= totalPages) {
      pages.add(page);
    }
  }

  return Array.from(pages).sort((left, right) => left - right);
}

export default async function InquiriesPage({
  params,
  searchParams,
}: InquiriesPageProps) {
  const [session, { slug }, resolvedSearchParams] = await Promise.all([
    requireSession(),
    params,
    searchParams,
  ]);
  const businessContext = await getBusinessContextForMembershipSlug(
    session.user.id,
    slug,
  );

  if (!businessContext) {
    redirect(workspacesHubPath);
  }

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
    const cachedPageNumbers = totalItems
      ? getCachedPageWindow(currentPage, totalPages)
      : [];
    const cachedPageEntries = await Promise.all(
      cachedPageNumbers.map(async (page) => [
        page,
        await getInquiryListPageForBusiness({
          businessId: businessContext.business.id,
          filters: baseFilters,
          page,
          pageSize: ITEMS_PER_PAGE,
        }),
      ] as const),
    );
    const cachedPages = Object.fromEntries(cachedPageEntries);

    return {
      cachedPages,
      currentPage,
      filterKey: JSON.stringify(baseFilters),
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
        title="Customer inquiries"
        actions={
          <InquiryExportCsvDropdown
            businessSlug={businessSlug}
            filters={filters}
            formOptions={[
              {
                value: "all",
                label: "All forms",
              },
              ...inquiryFormOptions.map((form) => ({
                value: form.slug,
                label: form.archivedAt ? `${form.name} (Archived)` : form.name,
              })),
            ]}
            resultCount={totalItems}
          />
        }
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
            label: form.archivedAt ? `${form.name} (Archived)` : form.name,
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
                  Preview inquiry page
                </Link>
              </Button>
            )
          }
          description={
            hasFilters
              ? "Try another search or status."
              : "New inquiries show up here."
          }
          icon={Inbox}
          title={
            hasFilters
              ? "No requests match these filters."
              : "Your inquiry inbox is still empty."
          }
          variant="list"
        />
      )}
    </DashboardPage>
  );
}

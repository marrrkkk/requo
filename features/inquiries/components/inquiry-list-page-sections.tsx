import Link from "next/link";
import { Inbox, Plus } from "lucide-react";

import { DashboardListResultsSkeleton } from "@/components/shared/dashboard-list-results-skeleton";
import {
  DashboardEmptyState,
} from "@/components/shared/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArchivedInquiriesSheet } from "@/features/inquiries/components/archived-inquiries-sheet";
import { InquiryExportCsvDropdown } from "@/features/inquiries/components/inquiry-export-csv-dropdown";
import { InquiryListFilters as InquiryListToolbar } from "@/features/inquiries/components/inquiry-list-filters";
import { InquiryListResults } from "@/features/inquiries/components/inquiry-list-results";
import type {
  DashboardInquiryListItem,
  InquiryListFilters,
} from "@/features/inquiries/types";
import type { InquiryRecordActionState } from "@/features/inquiries/types";
import {
  getBusinessInquiriesPath,
  getBusinessNewInquiryPath,
} from "@/features/businesses/routes";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type InquiryListResultsData = {
  cachedPages?: Record<number, DashboardInquiryListItem[]> | null;
  currentPage: number;
  filterKey: string;
  totalItems: number;
  totalPages: number;
};

type InquiryFormOption = {
  slug: string;
  name: string;
  archivedAt: Date | null;
};

type InquiryListControlsSectionProps = {
  businessSlug: string;
  canExport: boolean;
  filters: InquiryListFilters;
  searchParams: SearchParamsRecord;
  totalItemsPromise: Promise<number>;
  formOptionsPromise: Promise<InquiryFormOption[]>;
  archivedItemsPromise: Promise<DashboardInquiryListItem[]>;
  unarchiveAction: (
    inquiryId: string,
    state: InquiryRecordActionState,
    formData: FormData,
  ) => Promise<InquiryRecordActionState>;
};

export async function InquiryListControlsSection({
  businessSlug,
  canExport,
  filters,
  searchParams: _searchParams,
  totalItemsPromise,
  formOptionsPromise,
  archivedItemsPromise,
  unarchiveAction,
}: InquiryListControlsSectionProps) {
  const [totalItems, inquiryFormOptions, archivedItems] = await Promise.all([
    totalItemsPromise,
    formOptionsPromise,
    archivedItemsPromise,
  ]);
  const formOptions = [
    {
      value: "all",
      label: "All forms",
    },
    ...inquiryFormOptions.map((form) => ({
      value: form.slug,
      label: form.archivedAt ? `${form.name} (Archived)` : form.name,
    })),
  ];

  return (
    <>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div />

        <div className="dashboard-actions w-full [&>*]:w-full sm:[&>*]:w-auto xl:w-auto xl:justify-end">
          <InquiryExportCsvDropdown
            businessSlug={businessSlug}
            canExport={canExport}
            filters={filters}
            formOptions={formOptions}
            resultCount={totalItems}
          />
          <ArchivedInquiriesSheet
            businessSlug={businessSlug}
            items={archivedItems}
            unarchiveAction={unarchiveAction}
          />
          <Button asChild>
            <Link href={getBusinessNewInquiryPath(businessSlug)} prefetch={true}>
              <Plus data-icon="inline-start" />
              Quick-add inquiry
            </Link>
          </Button>
        </div>
      </div>

      <InquiryListToolbar
        key={`${filters.view}:${filters.status}:${filters.form}:${filters.q ?? ""}:${filters.sort}`}
        filters={filters}
        formOptions={formOptions}
        resultCount={totalItems}
      />
    </>
  );
}

type InquiryListContentSectionProps = {
  businessSlug: string;
  filters: InquiryListFilters;
  searchParams: SearchParamsRecord;
  totalItemsPromise: Promise<number>;
  pageDataPromise: Promise<InquiryListResultsData>;
  clearFiltersPath: string;
  hasNonViewFilters: boolean;
};

export async function InquiryListContentSection({
  businessSlug,
  filters,
  searchParams,
  totalItemsPromise,
  pageDataPromise,
  clearFiltersPath,
  hasNonViewFilters,
}: InquiryListContentSectionProps) {
  const totalItems = await totalItemsPromise;

  if (totalItems) {
    return (
      <InquiryListResults
        businessSlug={businessSlug}
        pageData={pageDataPromise}
        searchParams={searchParams}
      />
    );
  }

  return (
    <DashboardEmptyState
      action={
        hasNonViewFilters ? (
          <Button asChild variant="outline">
            <Link href={clearFiltersPath} prefetch={true}>
              Clear filters
            </Link>
          </Button>
        ) : filters.view !== "active" ? (
          <Button asChild variant="outline">
            <Link href={getBusinessInquiriesPath(businessSlug)} prefetch={true}>
              View active inquiries
            </Link>
          </Button>
        ) : (
          <Button asChild>
            <Link href={getBusinessNewInquiryPath(businessSlug)} prefetch={true}>
              <Plus data-icon="inline-start" />
              Quick-add first inquiry
            </Link>
          </Button>
        )
      }
      description={
        hasNonViewFilters
          ? "Try another search or status."
          : filters.view === "archived"
            ? "Archived inquiries stay here until you restore them."
            : "Quick-add an inquiry manually or wait for new inquiries to arrive."
      }
      icon={Inbox}
      title={
        hasNonViewFilters
          ? "No inquiries match these filters."
          : filters.view === "archived"
            ? "No archived inquiries"
            : "Your inquiry inbox is still empty."
      }
      variant="list"
    />
  );
}

export function InquiryListControlsFallback() {
  return (
    <>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <Skeleton className="h-10 w-48 rounded-xl" />

        <div className="dashboard-actions w-full [&>*]:w-full sm:[&>*]:w-auto xl:w-auto xl:justify-end">
          <Skeleton className="h-10 w-full rounded-xl sm:w-36" />
          <Skeleton className="h-10 w-full rounded-xl sm:w-40" />
        </div>
      </div>

      <div className="toolbar-panel">
        <div className="flex flex-col gap-4">
          <div className="data-list-toolbar-summary">
            <Skeleton className="h-4 w-full max-w-sm rounded-md" />
            <Skeleton className="h-7 w-28 rounded-full" />
          </div>

          <div className="data-list-toolbar-grid items-end">
            <div className="flex flex-col gap-2.5">
              <Skeleton className="h-3 w-28 rounded-md" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>

            <div className="flex flex-col gap-2.5 sm:max-w-[14rem] xl:w-[12rem] xl:max-w-[14rem] xl:shrink-0">
              <Skeleton className="h-3 w-24 rounded-md" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>

            <div className="hidden flex-col gap-2.5 sm:flex sm:max-w-[14rem] xl:w-[12rem] xl:max-w-[14rem] xl:shrink-0">
              <Skeleton className="h-3 w-16 rounded-md" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>

            <div className="data-list-toolbar-actions">
              <Skeleton className="h-10 w-full rounded-xl sm:hidden" />
              <Skeleton className="hidden h-10 w-20 rounded-xl sm:block" />
              <Skeleton className="hidden size-5 rounded-full sm:block" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function InquiryListContentFallback() {
  return <DashboardListResultsSkeleton variant="inquiries" />;
}

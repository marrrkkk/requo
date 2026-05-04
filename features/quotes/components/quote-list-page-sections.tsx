import Link from "next/link";
import { ReceiptText } from "lucide-react";

import { DashboardListResultsSkeleton } from "@/components/shared/dashboard-list-results-skeleton";
import {
  DashboardEmptyState,
} from "@/components/shared/dashboard-layout";
import { ListViewSwitcher } from "@/components/shared/list-view-switcher";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { QuoteExportCsvDropdown } from "@/features/quotes/components/quote-export-csv-dropdown";
import { QuoteListFilters } from "@/features/quotes/components/quote-list-filters";
import { QuoteListResults } from "@/features/quotes/components/quote-list-results";
import type {
  DashboardQuoteListItem,
  QuoteListFilters as QuoteListFiltersValue,
} from "@/features/quotes/types";
import {
  getBusinessNewQuotePath,
  getBusinessQuotesPath,
} from "@/features/businesses/routes";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type QuoteListResultsData = {
  cachedPages?: Record<number, DashboardQuoteListItem[]> | null;
  currentPage: number;
  filterKey: string;
  totalItems: number;
  totalPages: number;
};

type QuoteListControlsSectionProps = {
  businessSlug: string;
  canExport: boolean;
  filters: QuoteListFiltersValue;
  searchParams: SearchParamsRecord;
  totalItemsPromise: Promise<number>;
};

export async function QuoteListControlsSection({
  businessSlug,
  canExport,
  filters,
  searchParams,
  totalItemsPromise,
}: QuoteListControlsSectionProps) {
  const totalItems = await totalItemsPromise;

  return (
    <>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <ListViewSwitcher
          currentValue={filters.view}
          defaultValue="active"
          options={[
            { label: "Active", value: "active" },
            { label: "Archived", value: "archived" },
          ]}
          pathname={getBusinessQuotesPath(businessSlug)}
          searchParams={searchParams}
        />

        <div className="dashboard-actions w-full [&>*]:w-full sm:[&>*]:w-auto xl:w-auto xl:justify-end">
          <QuoteExportCsvDropdown
            businessSlug={businessSlug}
            canExport={canExport}
            filters={filters}
            resultCount={totalItems}
          />
          <Button asChild>
            <Link href={getBusinessNewQuotePath(businessSlug)} prefetch={true}>
              <ReceiptText data-icon="inline-start" />
              Create quote
            </Link>
          </Button>
        </div>
      </div>

      <QuoteListFilters
        key={`${filters.view}:${filters.status}:${filters.q ?? ""}:${filters.sort}`}
        filters={filters}
        resultCount={totalItems}
      />
    </>
  );
}

type QuoteListContentSectionProps = {
  businessSlug: string;
  filters: QuoteListFiltersValue;
  searchParams: SearchParamsRecord;
  totalItemsPromise: Promise<number>;
  pageDataPromise: Promise<QuoteListResultsData>;
  clearFiltersPath: string;
  hasNonViewFilters: boolean;
};

export async function QuoteListContentSection({
  businessSlug,
  filters,
  searchParams,
  totalItemsPromise,
  pageDataPromise,
  clearFiltersPath,
  hasNonViewFilters,
}: QuoteListContentSectionProps) {
  const totalItems = await totalItemsPromise;

  if (totalItems) {
    return (
      <QuoteListResults
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
            <Link href={getBusinessQuotesPath(businessSlug)} prefetch={true}>
              View active quotes
            </Link>
          </Button>
        ) : (
          <Button asChild>
            <Link href={getBusinessNewQuotePath(businessSlug)} prefetch={true}>
              <ReceiptText data-icon="inline-start" />
              Create first quote
            </Link>
          </Button>
        )
      }
      description={
        hasNonViewFilters
          ? "Try another search or status."
          : filters.view === "archived"
            ? "Archived quotes stay here until you restore them."
            : "Create a quote manually or send one from an inquiry."
      }
      icon={ReceiptText}
      title={
        hasNonViewFilters
          ? "No quotes match these filters."
          : filters.view === "archived"
            ? "No archived quotes"
            : "Your quote list is still empty."
      }
      variant="list"
    />
  );
}

export function QuoteListControlsFallback() {
  return (
    <>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <Skeleton className="h-10 w-40 rounded-xl" />

        <div className="dashboard-actions w-full [&>*]:w-full sm:[&>*]:w-auto xl:w-auto xl:justify-end">
          <Skeleton className="h-10 w-full rounded-xl sm:w-28" />
          <Skeleton className="h-10 w-full rounded-xl sm:w-36" />
        </div>
      </div>

      <div className="toolbar-panel">
        <div className="flex flex-col gap-4">
          <div className="data-list-toolbar-summary">
            <Skeleton className="h-4 w-full max-w-xs rounded-md" />
            <Skeleton className="h-7 w-28 rounded-full" />
          </div>

          <div className="data-list-toolbar-grid items-end">
            <div className="flex flex-col gap-2.5">
              <Skeleton className="h-3 w-24 rounded-md" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>

            <div className="flex flex-col gap-2.5 sm:max-w-[14rem] xl:w-[12rem] xl:max-w-[14rem] xl:shrink-0">
              <Skeleton className="h-3 w-24 rounded-md" />
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

export function QuoteListContentFallback() {
  return <DashboardListResultsSkeleton variant="quotes" />;
}

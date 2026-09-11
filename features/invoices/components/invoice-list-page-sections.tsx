import Link from "next/link";
import { ReceiptText } from "lucide-react";

import { DashboardListResultsSkeleton } from "@/components/shared/dashboard-list-results-skeleton";
import {
  DashboardEmptyState,
} from "@/components/shared/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { InvoiceExportCsvDropdown } from "@/features/invoices/components/invoice-export-csv-dropdown";
import { InvoiceListFilters } from "@/features/invoices/components/invoice-list-filters";
import { InvoiceListResults } from "@/features/invoices/components/invoice-list-results";
import type {
  InvoiceListFilters as InvoiceListFiltersValue,
  InvoiceListItem,
} from "@/features/invoices/types";
import {
  getBusinessNewInvoicePath,
} from "@/features/businesses/routes";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type InvoiceListResultsData = {
  cachedPages?: Record<number, InvoiceListItem[]> | null;
  currentPage: number;
  filterKey: string;
  totalItems: number;
  totalPages: number;
};

type InvoiceListControlsSectionProps = {
  businessSlug: string;
  canExport: boolean;
  filters: InvoiceListFiltersValue;
  searchParams: SearchParamsRecord;
  totalItemsPromise: Promise<number>;
};

export async function InvoiceListHeaderActions({
  businessSlug,
  canExport,
  filters,
  totalItemsPromise,
}: InvoiceListControlsSectionProps) {
  const totalItems = await totalItemsPromise;

  return (
    <>
      <InvoiceExportCsvDropdown
        businessSlug={businessSlug}
        canExport={canExport}
        filters={filters}
        resultCount={totalItems}
      />
      <Button asChild className="h-11 sm:h-8">
        <Link href={getBusinessNewInvoicePath(businessSlug)} prefetch={true}>
          <ReceiptText data-icon="inline-start" />
          New invoice
        </Link>
      </Button>
    </>
  );
}

export async function InvoiceListControlsSection({
  businessSlug: _businessSlug,
  canExport: _canExport,
  filters,
  searchParams: _searchParams,
  totalItemsPromise,
}: InvoiceListControlsSectionProps) {
  const totalItems = await totalItemsPromise;

  return (
    <InvoiceListFilters
      key={`${filters.status}:${filters.q ?? ""}:${filters.sort}`}
      filters={filters}
      resultCount={totalItems}
    />
  );
}

type InvoiceListContentSectionProps = {
  businessSlug: string;
  filters: InvoiceListFiltersValue;
  searchParams: SearchParamsRecord;
  totalItemsPromise: Promise<number>;
  pageDataPromise: Promise<InvoiceListResultsData>;
  clearFiltersPath: string;
  hasNonViewFilters: boolean;
};

export async function InvoiceListContentSection({
  businessSlug,
  searchParams,
  totalItemsPromise,
  pageDataPromise,
  clearFiltersPath,
  hasNonViewFilters,
}: InvoiceListContentSectionProps) {
  const totalItems = await totalItemsPromise;

  if (totalItems) {
    return (
      <InvoiceListResults
        businessSlug={businessSlug}
        pageData={pageDataPromise}
        searchParams={searchParams}
      />
    );
  }

  return (
    <div className="p-4">
    <DashboardEmptyState
      action={
        hasNonViewFilters ? (
          <Button asChild variant="outline">
            <Link href={clearFiltersPath} prefetch={true}>
              Clear filters
            </Link>
          </Button>
        ) : (
          <Button asChild>
            <Link href={getBusinessNewInvoicePath(businessSlug)} prefetch={true}>
              <ReceiptText data-icon="inline-start" />
              Create first invoice
            </Link>
          </Button>
        )
      }
      description={
        hasNonViewFilters
          ? "Try another search or status."
          : "Create an invoice from an accepted quote to start tracking payments."
      }
      icon={ReceiptText}
      title={
        hasNonViewFilters
          ? "No invoices match these filters."
          : "Your invoice list is still empty."
      }
      variant="list"
    />
    </div>
  );
}

export function InvoiceListHeaderActionsFallback() {
  return (
    <>
      <Skeleton className="h-9 w-full rounded-md sm:h-8 sm:w-32" />
      <Skeleton className="h-11 w-full rounded-md sm:h-8 sm:w-36" />
    </>
  );
}

export function InvoiceListControlsFallback() {
  return (
    <div className="data-list-toolbar-strip" aria-hidden="true">
      <div className="data-list-toolbar-grid">
        <Skeleton className="h-9 min-w-0 flex-1 rounded-md sm:h-8" />
        <Skeleton className="hidden h-9 min-w-0 flex-1 rounded-md sm:block sm:h-8" />
        <Skeleton className="hidden h-9 w-32 rounded-md sm:block sm:h-8" />
        <Skeleton className="h-9 w-20 shrink-0 rounded-md sm:h-8" />
      </div>
      <Skeleton className="h-4 w-24 rounded-md" />
    </div>
  );
}

export function InvoiceListContentFallback() {
  return <DashboardListResultsSkeleton variant="quotes" />;
}

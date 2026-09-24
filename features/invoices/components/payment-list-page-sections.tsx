import Link from "next/link";
import { CreditCard, ReceiptText } from "lucide-react";

import { DashboardListResultsSkeleton } from "@/components/shared/dashboard-list-results-skeleton";
import {
  DashboardEmptyState,
} from "@/components/shared/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PaymentListFilters } from "@/features/invoices/components/payment-list-filters";
import { PaymentListResults } from "@/features/invoices/components/payment-list-results";
import type {
  PaymentListFilters as PaymentListFiltersValue,
  PaymentListItem,
} from "@/features/invoices/types";
import {
  getBusinessInvoicesPath,
} from "@/features/businesses/routes";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type PaymentListResultsData = {
  cachedPages?: Record<number, PaymentListItem[]> | null;
  currentPage: number;
  filterKey: string;
  totalItems: number;
  totalPages: number;
};

type PaymentListControlsSectionProps = {
  businessSlug: string;
  filters: PaymentListFiltersValue;
  searchParams: SearchParamsRecord;
  totalItemsPromise: Promise<number>;
};

export async function PaymentListControlsSection({
  businessSlug: _businessSlug,
  filters,
  searchParams: _searchParams,
  totalItemsPromise,
}: PaymentListControlsSectionProps) {
  const totalItems = await totalItemsPromise;

  return (
    <PaymentListFilters
      key={`${filters.status}:${filters.method}:${filters.q ?? ""}:${filters.from ?? ""}:${filters.to ?? ""}`}
      filters={filters}
      resultCount={totalItems}
    />
  );
}

type PaymentListContentSectionProps = {
  businessSlug: string;
  filters: PaymentListFiltersValue;
  searchParams: SearchParamsRecord;
  totalItemsPromise: Promise<number>;
  pageDataPromise: Promise<PaymentListResultsData>;
  clearFiltersPath: string;
  hasNonViewFilters: boolean;
};

export async function PaymentListContentSection({
  businessSlug,
  searchParams,
  totalItemsPromise,
  pageDataPromise,
  clearFiltersPath,
  hasNonViewFilters,
}: PaymentListContentSectionProps) {
  const totalItems = await totalItemsPromise;

  if (totalItems) {
    return (
      <PaymentListResults
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
          <Button asChild variant="outline">
            <Link href={getBusinessInvoicesPath(businessSlug)} prefetch={true}>
              <ReceiptText data-icon="inline-start" />
              View invoices
            </Link>
          </Button>
        )
      }
      description={
        hasNonViewFilters
          ? "Try another search or filter."
          : "Payments you record against invoices will appear here."
      }
      icon={CreditCard}
      title={
        hasNonViewFilters
          ? "No payments match these filters."
          : "No payments recorded yet."
      }
      variant="list"
    />
    </div>
  );
}

export function PaymentListControlsFallback() {
  return (
    <div className="data-list-toolbar-strip" aria-hidden="true">
      <div className="data-list-toolbar-grid">
        <Skeleton className="h-9 min-w-0 flex-1 rounded-md sm:h-8" />
        <Skeleton className="hidden h-9 min-w-0 flex-1 rounded-md sm:block sm:h-8" />
        <Skeleton className="hidden h-9 w-32 rounded-md sm:block sm:h-8" />
        <Skeleton className="h-9 w-20 shrink-0 rounded-md sm:h-8" />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Skeleton className="h-9 w-full rounded-md sm:h-8 sm:w-44" />
        <Skeleton className="h-9 w-full rounded-md sm:h-8 sm:w-44" />
      </div>
      <Skeleton className="h-4 w-24 rounded-md" />
    </div>
  );
}

export function PaymentListContentFallback() {
  return <DashboardListResultsSkeleton variant="quotes" />;
}

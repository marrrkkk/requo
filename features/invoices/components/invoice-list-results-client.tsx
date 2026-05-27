"use client";

import { useMemo, useState } from "react";

import { DashboardEmptyState } from "@/components/shared/dashboard-layout";
import { DataListPagination } from "@/components/shared/data-list-pagination";
import { InvoiceListCards } from "@/features/invoices/components/invoice-list-cards";
import { InvoiceListTable } from "@/features/invoices/components/invoice-list-table";
import { getBusinessInvoicesPath } from "@/features/businesses/routes";
import type { DashboardInvoiceListItem } from "@/features/invoices/types";

type SearchParamsRecord = Record<string, string | string[] | undefined>;
const EMPTY_PAGE_CACHE: Record<number, DashboardInvoiceListItem[]> = {};

function normalizePageCache(
  cachedPages: Record<number, DashboardInvoiceListItem[]> | null | undefined,
) {
  return cachedPages && typeof cachedPages === "object"
    ? cachedPages
    : EMPTY_PAGE_CACHE;
}

type InvoiceListResultsClientProps = {
  businessSlug: string;
  cachedPages?: Record<number, DashboardInvoiceListItem[]> | null;
  currentPage: number;
  searchParams: SearchParamsRecord;
  totalItems: number;
  totalPages: number;
};

export function InvoiceListResultsClient({
  businessSlug,
  cachedPages,
  currentPage,
  searchParams,
  totalItems,
  totalPages,
}: InvoiceListResultsClientProps) {
  const effectiveCachedPages = useMemo(
    () => normalizePageCache(cachedPages),
    [cachedPages],
  );
  const [visiblePage, setVisiblePage] = useState(currentPage);
  const displayPage = effectiveCachedPages[visiblePage]
    ? visiblePage
    : currentPage;

  const invoices = useMemo(
    () => effectiveCachedPages[displayPage] ?? [],
    [displayPage, effectiveCachedPages],
  );
  const cachedPageNumbers = useMemo(
    () =>
      Object.keys(effectiveCachedPages)
        .map((page) => Number(page))
        .filter((page) => Number.isInteger(page)),
    [effectiveCachedPages],
  );

  if (totalItems === 0) {
    return (
      <DashboardEmptyState
        title="No invoices yet"
        description="Invoices are generated from completed jobs or accepted quotes."
      />
    );
  }

  return (
    <>
      <InvoiceListCards invoices={invoices} businessSlug={businessSlug} />
      <InvoiceListTable invoices={invoices} businessSlug={businessSlug} />
      <DataListPagination
        cachedPages={cachedPageNumbers}
        currentPage={displayPage}
        onCachedPageNavigate={setVisiblePage}
        pathname={getBusinessInvoicesPath(businessSlug)}
        searchParams={searchParams}
        totalItems={totalItems}
        totalPages={totalPages}
      />
    </>
  );
}

"use client";

import { useMemo, useState } from "react";

import { DataListPagination } from "@/components/shared/data-list-pagination";
import { InvoiceListCards } from "@/features/invoices/components/invoice-list-cards";
import { InvoiceListTable } from "@/features/invoices/components/invoice-list-table";
import { getBusinessInvoicesPath } from "@/features/businesses/routes";
import type { InvoiceListItem } from "@/features/invoices/types";
import { useAnimatedList } from "@/hooks/use-animated-list";
import { useBulkSelection } from "@/hooks/use-bulk-selection";

type SearchParamsRecord = Record<string, string | string[] | undefined>;
const EMPTY_PAGE_CACHE: Record<number, InvoiceListItem[]> = {};

function normalizePageCache(
  cachedPages: Record<number, InvoiceListItem[]> | null | undefined,
) {
  return cachedPages && typeof cachedPages === "object"
    ? cachedPages
    : EMPTY_PAGE_CACHE;
}

type InvoiceListResultsClientProps = {
  businessSlug: string;
  cachedPages?: Record<number, InvoiceListItem[]> | null;
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

  const invoicesFromCache = useMemo(
    () => effectiveCachedPages[displayPage] ?? [],
    [displayPage, effectiveCachedPages],
  );

  const { items: invoices, getMotionState } = useAnimatedList(invoicesFromCache);
  const cachedPageNumbers = useMemo(
    () =>
      Object.keys(effectiveCachedPages)
        .map((page) => Number(page))
        .filter((page) => Number.isInteger(page)),
    [effectiveCachedPages],
  );

  const {
    isSelected,
    toggle,
    selectAll,
    deselectAll,
    isAtLimit,
    allSelected,
  } = useBulkSelection(invoices);

  const allOnPageSelected = invoices.length > 0 && allSelected(invoices.map((invoice) => invoice.id));

  const handleSelectAllOnPage = () => {
    if (allOnPageSelected) {
      deselectAll();
    } else {
      selectAll(invoices.map((invoice) => invoice.id));
    }
  };

  return (
    <>
      <InvoiceListCards
        invoices={invoices}
        businessSlug={businessSlug}
        isSelected={isSelected}
        isAtLimit={isAtLimit}
        onToggle={toggle}
        getMotionState={getMotionState}
      />
      <InvoiceListTable
        invoices={invoices}
        businessSlug={businessSlug}
        isSelected={isSelected}
        isAtLimit={isAtLimit}
        onToggle={toggle}
        allOnPageSelected={allOnPageSelected}
        onSelectAllOnPage={handleSelectAllOnPage}
        getMotionState={getMotionState}
      />
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

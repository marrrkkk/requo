"use client";

import { useMemo, useState } from "react";

import { DataListPagination } from "@/components/shared/data-list-pagination";
import { QuoteBulkActions } from "@/features/quotes/components/quote-bulk-actions";
import { QuoteListCards } from "@/features/quotes/components/quote-list-cards";
import { QuoteListTable } from "@/features/quotes/components/quote-list-table";
import { getBusinessQuotesPath } from "@/features/businesses/routes";
import type { DashboardQuoteListItem } from "@/features/quotes/types";
import { useBulkSelection } from "@/hooks/use-bulk-selection";

type SearchParamsRecord = Record<string, string | string[] | undefined>;
const EMPTY_PAGE_CACHE: Record<number, DashboardQuoteListItem[]> = {};

function normalizePageCache(
  cachedPages: Record<number, DashboardQuoteListItem[]> | null | undefined,
) {
  return cachedPages && typeof cachedPages === "object"
    ? cachedPages
    : EMPTY_PAGE_CACHE;
}

type QuoteListResultsClientProps = {
  businessSlug: string;
  cachedPages?: Record<number, DashboardQuoteListItem[]> | null;
  currentPage: number;
  searchParams: SearchParamsRecord;
  totalItems: number;
  totalPages: number;
};

export function QuoteListResultsClient({
  businessSlug,
  cachedPages,
  currentPage,
  searchParams,
  totalItems,
  totalPages,
}: QuoteListResultsClientProps) {
  const effectiveCachedPages = useMemo(
    () => normalizePageCache(cachedPages),
    [cachedPages],
  );
  const [visiblePage, setVisiblePage] = useState(currentPage);
  const displayPage = effectiveCachedPages[visiblePage]
    ? visiblePage
    : currentPage;

  const quotes = useMemo(
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

  const {
    selectedCount,
    isSelected,
    toggle,
    selectAll,
    deselectAll,
    isAtLimit,
    serializedIds,
  } = useBulkSelection(quotes);

  const allOnPageSelected =
    quotes.length > 0 && quotes.every((q) => isSelected(q.id));

  const handleSelectAllOnPage = () => {
    if (allOnPageSelected) {
      deselectAll();
    } else {
      selectAll(quotes.map((q) => q.id));
    }
  };

  return (
    <>
      <QuoteBulkActions
        selectedCount={selectedCount}
        serializedIds={serializedIds}
        onComplete={deselectAll}
      />
      <QuoteListCards
        quotes={quotes}
        businessSlug={businessSlug}
        isSelected={isSelected}
        isAtLimit={isAtLimit}
        onToggle={toggle}
      />
      <QuoteListTable
        quotes={quotes}
        businessSlug={businessSlug}
        isSelected={isSelected}
        isAtLimit={isAtLimit}
        onToggle={toggle}
        allOnPageSelected={allOnPageSelected}
        onSelectAllOnPage={handleSelectAllOnPage}
      />
      <DataListPagination
        cachedPages={cachedPageNumbers}
        currentPage={displayPage}
        onCachedPageNavigate={setVisiblePage}
        pathname={getBusinessQuotesPath(businessSlug)}
        searchParams={searchParams}
        totalItems={totalItems}
        totalPages={totalPages}
      />
    </>
  );
}

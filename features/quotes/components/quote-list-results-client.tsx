"use client";

import { useMemo, useState } from "react";

import { DataListPagination } from "@/components/shared/data-list-pagination";
import { QuoteListCards } from "@/features/quotes/components/quote-list-cards";
import { QuoteListTable } from "@/features/quotes/components/quote-list-table";
import { getBusinessQuotesPath } from "@/features/businesses/routes";
import type { DashboardQuoteListItem } from "@/features/quotes/types";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();
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

  return (
    <>
      {isMobile ? (
        <QuoteListCards
          quotes={quotes}
          businessSlug={businessSlug}
        />
      ) : (
        <QuoteListTable
          quotes={quotes}
          businessSlug={businessSlug}
        />
      )}
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

"use client";

import { useMemo, useState } from "react";

import { DataListPagination } from "@/components/shared/data-list-pagination";
import { InquiryListCards } from "@/features/inquiries/components/inquiry-list-cards";
import { InquiryListTable } from "@/features/inquiries/components/inquiry-list-table";
import { getBusinessInquiriesPath } from "@/features/businesses/routes";
import type { DashboardInquiryListItem } from "@/features/inquiries/types";
import { useIsMobile } from "@/hooks/use-mobile";

type SearchParamsRecord = Record<string, string | string[] | undefined>;
const EMPTY_PAGE_CACHE: Record<number, DashboardInquiryListItem[]> = {};

function normalizePageCache(
  cachedPages: Record<number, DashboardInquiryListItem[]> | null | undefined,
) {
  return cachedPages && typeof cachedPages === "object"
    ? cachedPages
    : EMPTY_PAGE_CACHE;
}

type InquiryListResultsClientProps = {
  businessSlug: string;
  cachedPages?: Record<number, DashboardInquiryListItem[]> | null;
  currentPage: number;
  searchParams: SearchParamsRecord;
  totalItems: number;
  totalPages: number;
};

export function InquiryListResultsClient({
  businessSlug,
  cachedPages,
  currentPage,
  searchParams,
  totalItems,
  totalPages,
}: InquiryListResultsClientProps) {
  const isMobile = useIsMobile();
  const effectiveCachedPages = useMemo(
    () => normalizePageCache(cachedPages),
    [cachedPages],
  );
  const [visiblePage, setVisiblePage] = useState(currentPage);
  const displayPage = effectiveCachedPages[visiblePage]
    ? visiblePage
    : currentPage;

  const inquiries = useMemo(
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
        <InquiryListCards inquiries={inquiries} businessSlug={businessSlug} />
      ) : (
        <InquiryListTable inquiries={inquiries} businessSlug={businessSlug} />
      )}
      <DataListPagination
        cachedPages={cachedPageNumbers}
        currentPage={displayPage}
        onCachedPageNavigate={setVisiblePage}
        pathname={getBusinessInquiriesPath(businessSlug)}
        searchParams={searchParams}
        totalItems={totalItems}
        totalPages={totalPages}
      />
    </>
  );
}

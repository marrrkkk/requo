"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { DataListPagination } from "@/components/shared/data-list-pagination";
import { InquiryBulkActions } from "@/features/inquiries/components/inquiry-bulk-actions";
import { InquiryListCards } from "@/features/inquiries/components/inquiry-list-cards";
import { InquiryListTable } from "@/features/inquiries/components/inquiry-list-table";
import { getBusinessInquiriesPath } from "@/features/businesses/routes";
import type { DashboardInquiryListItem } from "@/features/inquiries/types";
import { useBulkSelection } from "@/hooks/use-bulk-selection";

type SearchParamsRecord = Record<string, string | string[] | undefined>;
const EMPTY_PAGE_CACHE: Record<number, DashboardInquiryListItem[]> = {};
const MAX_BULK_SELECTION = 50;

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

  const {
    selectedCount,
    isSelected,
    toggle,
    selectAll,
    deselectAll,
    isAtLimit,
    serializedIds,
  } = useBulkSelection(inquiries);

  const allOnPageSelected =
    inquiries.length > 0 && inquiries.every((i) => isSelected(i.id));

  const handleSelectAllOnPage = () => {
    if (allOnPageSelected) {
      deselectAll();
    } else {
      selectAll(inquiries.map((i) => i.id));
    }
  };

  const handleSelectAllMatchingFilters = () => {
    // Collect all IDs from all cached pages (representing items matching current filters)
    const allMatchingIds = Object.values(effectiveCachedPages).flatMap(
      (pageItems) => pageItems.map((item) => item.id),
    );

    if (allMatchingIds.length > MAX_BULK_SELECTION) {
      selectAll(allMatchingIds.slice(0, MAX_BULK_SELECTION));
      toast.info(
        `Selection capped at ${MAX_BULK_SELECTION} items. ${allMatchingIds.length - MAX_BULK_SELECTION} items could not be selected.`,
      );
    } else {
      selectAll(allMatchingIds);
    }
  };

  return (
    <>
      <InquiryBulkActions
        selectedCount={selectedCount}
        serializedIds={serializedIds}
        onComplete={deselectAll}
      />
      {inquiries.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button
            className="underline-offset-2 hover:underline"
            onClick={handleSelectAllOnPage}
            type="button"
          >
            {allOnPageSelected ? "Deselect all on page" : "Select all on page"}
          </button>
          {totalItems > inquiries.length && (
            <>
              <span className="text-border">·</span>
              <button
                className="underline-offset-2 hover:underline"
                disabled={isAtLimit}
                onClick={handleSelectAllMatchingFilters}
                type="button"
              >
                Select all matching filters{totalItems > MAX_BULK_SELECTION ? ` (max ${MAX_BULK_SELECTION})` : ""}
              </button>
            </>
          )}
        </div>
      )}
      <InquiryListCards
        inquiries={inquiries}
        businessSlug={businessSlug}
        isSelected={isSelected}
        isAtLimit={isAtLimit}
        onToggle={toggle}
      />
      <InquiryListTable
        inquiries={inquiries}
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
        pathname={getBusinessInquiriesPath(businessSlug)}
        searchParams={searchParams}
        totalItems={totalItems}
        totalPages={totalPages}
      />
    </>
  );
}

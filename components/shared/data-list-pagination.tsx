"use client";

import Link from "next/link";
import { useProgressRouter } from "@/hooks/use-progress-router";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type MouseEvent,
} from "react";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import { Spinner } from "@/components/ui/spinner";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type DataListPaginationProps = {
  cachedPages?: number[];
  currentPage: number;
  onCachedPageNavigate?: (page: number) => void;
  pageSize?: number;
  pathname: string;
  searchParams: SearchParamsRecord;
  totalItems: number;
  totalPages: number;
};

function buildPageHref(
  pathname: string,
  searchParams: SearchParamsRecord,
  page: number,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "page" || value == null) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        params.append(key, entry);
      }

      continue;
    }

    params.set(key, value);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  return params.size ? `${pathname}?${params.toString()}` : pathname;
}

function getVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, currentPage - 1, currentPage, currentPage + 1, totalPages];
}

export function DataListPagination({
  cachedPages = [],
  currentPage,
  onCachedPageNavigate,
  pageSize = 10,
  pathname,
  searchParams,
  totalItems,
  totalPages,
}: DataListPaginationProps) {
  const router = useProgressRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingPage, setPendingPage] = useState<number | null>(null);

  const visiblePages = useMemo(
    () => getVisiblePages(currentPage, totalPages),
    [currentPage, totalPages],
  );
  const pageItems: Array<number | "ellipsis"> = useMemo(
    () =>
      visiblePages.flatMap((page, index) => {
        const previousPage = visiblePages[index - 1];

        return [
          ...(previousPage && page - previousPage > 1
            ? (["ellipsis"] as const)
            : []),
          page,
        ];
      }),
    [visiblePages],
  );

  const getPageHref = useCallback(
    (page: number) => buildPageHref(pathname, searchParams, page),
    [pathname, searchParams],
  );

  useEffect(() => {
    const pagesToPrefetch = [currentPage - 1, currentPage + 1, currentPage + 2];

    for (const page of pagesToPrefetch) {
      if (page < 1 || page > totalPages || page === currentPage) {
        continue;
      }

      router.prefetch(getPageHref(page));
    }
  }, [currentPage, getPageHref, router, totalPages]);

  const navigateToPage = useCallback(
    (page: number) => {
      if (page < 1 || page > totalPages || page === currentPage) {
        return;
      }

      const isCachedPage = cachedPages.includes(page);

      if (isCachedPage) {
        onCachedPageNavigate?.(page);
      }

      setPendingPage(page);

      startTransition(() => {
        router.push(getPageHref(page), { scroll: false });
      });
    },
    [cachedPages, currentPage, getPageHref, onCachedPageNavigate, router, totalPages],
  );

  const handlePageClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, page: number) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      event.preventDefault();
      navigateToPage(page);
    },
    [navigateToPage],
  );

  if (totalPages <= 1) {
    return null;
  }

  const firstItemIndex = (currentPage - 1) * pageSize + 1;
  const lastItemIndex = Math.min(currentPage * pageSize, totalItems);
  const activePendingPage = isPending ? pendingPage : null;
  const showLoadingState =
    isPending &&
    (!activePendingPage || !cachedPages.includes(activePendingPage));

  return (
    <div className="flex flex-col gap-3 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span>
          Showing {firstItemIndex}-{lastItemIndex} of {totalItems}
        </span>
        {showLoadingState ? (
          <span className="inline-flex items-center gap-1.5">
            <Spinner className="size-3.5" />
            Loading page...
          </span>
        ) : null}
      </div>
      <Pagination className="mx-0 w-auto justify-start sm:justify-end">
        <PaginationContent className="flex-wrap gap-1">
          <PaginationItem>
            <PaginationLink
              asChild
              aria-disabled={currentPage === 1}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
              href={getPageHref(currentPage - 1)}
              size="default"
              tabIndex={currentPage === 1 ? -1 : undefined}
            >
              <Link
                href={getPageHref(currentPage - 1)}
                onClick={(event) => handlePageClick(event, currentPage - 1)}
                onMouseEnter={() => router.prefetch(getPageHref(currentPage - 1))}
                scroll={false}
              >
                <ChevronLeftIcon data-icon="inline-start" />
                <span className="hidden sm:inline">Previous</span>
              </Link>
            </PaginationLink>
          </PaginationItem>

          {pageItems.map((item, index) =>
            item === "ellipsis" ? (
              <PaginationItem className="hidden sm:list-item" key={`ellipsis-${index}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem className="hidden sm:list-item" key={item}>
                <PaginationLink
                  asChild
                  href={getPageHref(item)}
                  isActive={item === currentPage}
                >
                  <Link
                    href={getPageHref(item)}
                    onClick={(event) => handlePageClick(event, item)}
                    onMouseEnter={() => router.prefetch(getPageHref(item))}
                    scroll={false}
                  >
                    {item}
                  </Link>
                </PaginationLink>
              </PaginationItem>
            ),
          )}

          <PaginationItem>
            <PaginationLink
              asChild
              aria-disabled={currentPage === totalPages}
              className={
                currentPage === totalPages ? "pointer-events-none opacity-50" : undefined
              }
              href={getPageHref(currentPage + 1)}
              size="default"
              tabIndex={currentPage === totalPages ? -1 : undefined}
            >
              <Link
                href={getPageHref(currentPage + 1)}
                onClick={(event) => handlePageClick(event, currentPage + 1)}
                onMouseEnter={() => router.prefetch(getPageHref(currentPage + 1))}
                scroll={false}
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRightIcon data-icon="inline-end" />
              </Link>
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

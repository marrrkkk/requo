"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { DataListToolbar } from "@/components/shared/data-list-toolbar";
import { useProgressRouter } from "@/hooks/use-progress-router";
import type {
  QuoteListFilters,
  QuoteStatusFilterValue,
} from "@/features/quotes/types";
import { getQuoteStatusLabel } from "@/features/quotes/utils";

type QuoteListFiltersProps = {
  filters: QuoteListFilters;
  resultCount: number;
};

const statusOptions: QuoteStatusFilterValue[] = [
  "all",
  "draft",
  "sent",
  "accepted",
  "rejected",
  "expired",
];

export function QuoteListFilters({
  filters,
  resultCount,
}: QuoteListFiltersProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useProgressRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(filters.q ?? "");
  const [status, setStatus] = useState<QuoteStatusFilterValue>(filters.status);
  const [sort, setSort] = useState(filters.sort);

  const hasMountedRef = useRef(false);
  const lastAppliedHrefRef = useRef<string>("");

  const navigate = useCallback((
    nextQuery: string,
    nextStatus: QuoteStatusFilterValue,
    nextSort: "newest" | "oldest",
  ) => {
    const params = new URLSearchParams();
    const trimmedQuery = nextQuery.trim();

    if (trimmedQuery) {
      params.set("q", trimmedQuery);
    }

    if (nextStatus !== "all") {
      params.set("status", nextStatus);
    }

    if (nextSort !== "newest") {
      params.set("sort", nextSort);
    }

    const href = params.size ? `${pathname}?${params.toString()}` : pathname;
    const currentHref = searchParams.size
      ? `${pathname}?${searchParams.toString()}`
      : pathname;

    if (href === currentHref || href === lastAppliedHrefRef.current) {
      return;
    }
    lastAppliedHrefRef.current = href;

    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    const timer = setTimeout(() => {
      navigate(query, status, sort);
    }, 400);
    return () => clearTimeout(timer);
  }, [navigate, query, sort, status]);

  return (
    <DataListToolbar
      description="Search by quote number, title, or customer."
      resultLabel={`${resultCount} ${resultCount === 1 ? "quote" : "quotes"}`}
      searchId="quote-search"
      searchLabel="Search quotes"
      searchPlaceholder="Search quote number, title, or customer"
      searchValue={query}
      onSearchChange={setQuery}
      filterId="quote-status-filter"
      filterLabel="Filter by status"
      filterValue={status}
      onFilterChange={(value) => {
        const nextStatus = value as QuoteStatusFilterValue;
        setStatus(nextStatus);
        navigate(query, nextStatus, sort);
      }}
      filterOptions={statusOptions.map((option) => ({
        value: option,
        label: option === "all" ? "All statuses" : getQuoteStatusLabel(option),
      }))}
      sortId="quote-sort"
      sortLabel="Sort by"
      sortValue={sort}
      onSortChange={(value) => {
        const nextSort = value as "newest" | "oldest";
        setSort(nextSort);
        navigate(query, status, nextSort);
      }}
      sortOptions={[
        { label: "Newest first", value: "newest" },
        { label: "Oldest first", value: "oldest" },
      ]}
      isPending={isPending}
      onClear={() => {
        setQuery("");
        setStatus("all");
        setSort("newest");
        navigate("", "all", "newest");
      }}
      canClear={Boolean(query.trim() || status !== "all" || sort !== "newest")}
    />
  );
}

"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { DataListToolbar } from "@/components/shared/data-list-toolbar";
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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(filters.q ?? "");
  const [status, setStatus] = useState<QuoteStatusFilterValue>(filters.status);

  function navigate(nextQuery: string, nextStatus: QuoteStatusFilterValue) {
    const params = new URLSearchParams();
    const trimmedQuery = nextQuery.trim();

    if (trimmedQuery) {
      params.set("q", trimmedQuery);
    }

    if (nextStatus !== "all") {
      params.set("status", nextStatus);
    }

    const href = params.size ? `${pathname}?${params.toString()}` : pathname;

    startTransition(() => {
      router.replace(href);
    });
  }

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
      onFilterChange={(value) => setStatus(value as QuoteStatusFilterValue)}
      filterOptions={statusOptions.map((option) => ({
        value: option,
        label: option === "all" ? "All statuses" : getQuoteStatusLabel(option),
      }))}
      isPending={isPending}
      onSubmit={() => navigate(query, status)}
      onClear={() => {
        setQuery("");
        setStatus("all");
        navigate("", "all");
      }}
      canClear={Boolean(query.trim() || status !== "all")}
    />
  );
}

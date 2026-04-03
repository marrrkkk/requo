"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { DataListToolbar } from "@/components/shared/data-list-toolbar";
import type {
  InquiryListFilters,
  InquiryStatusFilterValue,
} from "@/features/inquiries/types";
import { getInquiryStatusLabel } from "@/features/inquiries/utils";

type InquiryListFiltersProps = {
  filters: InquiryListFilters;
  resultCount: number;
};

const statusOptions: InquiryStatusFilterValue[] = [
  "all",
  "new",
  "quoted",
  "waiting",
  "won",
  "lost",
  "archived",
];

export function InquiryListFilters({
  filters,
  resultCount,
}: InquiryListFiltersProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(filters.q ?? "");
  const [status, setStatus] = useState<InquiryStatusFilterValue>(filters.status);

  function navigate(nextQuery: string, nextStatus: InquiryStatusFilterValue) {
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
      description="Search by customer, email, or service category."
      resultLabel={`${resultCount} ${resultCount === 1 ? "inquiry" : "inquiries"}`}
      searchId="inquiry-search"
      searchLabel="Search inquiries"
      searchPlaceholder="Search customer, email, category, or subject"
      searchValue={query}
      onSearchChange={setQuery}
      filterId="inquiry-status-filter"
      filterLabel="Filter by status"
      filterValue={status}
      onFilterChange={(value) => setStatus(value as InquiryStatusFilterValue)}
      filterOptions={statusOptions.map((option) => ({
        value: option,
        label:
          option === "all" ? "All statuses" : getInquiryStatusLabel(option),
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

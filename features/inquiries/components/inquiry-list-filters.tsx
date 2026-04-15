"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { DataListToolbar } from "@/components/shared/data-list-toolbar";
import { useProgressRouter } from "@/hooks/use-progress-router";
import type {
  InquiryListFilters,
  InquiryStatusFilterValue,
} from "@/features/inquiries/types";
import { inquiryStatusFilterValues } from "@/features/inquiries/types";
import { getInquiryStatusLabel } from "@/features/inquiries/utils";

type InquiryListFiltersProps = {
  filters: InquiryListFilters;
  formOptions: Array<{
    label: string;
    value: string;
  }>;
  resultCount: number;
};

const statusOptions: InquiryStatusFilterValue[] = [...inquiryStatusFilterValues];

export function InquiryListFilters({
  filters,
  formOptions,
  resultCount,
}: InquiryListFiltersProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useProgressRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(filters.q ?? "");
  const [status, setStatus] = useState<InquiryStatusFilterValue>(filters.status);
  const [form, setForm] = useState(filters.form);
  const [sort, setSort] = useState(filters.sort);

  const hasMountedRef = useRef(false);
  const lastAppliedHrefRef = useRef<string>("");

  const navigate = useCallback((
    nextQuery: string,
    nextStatus: InquiryStatusFilterValue,
    nextForm: string,
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

    if (nextForm !== "all") {
      params.set("form", nextForm);
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
      navigate(query, status, form, sort);
    }, 400);
    return () => clearTimeout(timer);
  }, [form, navigate, query, sort, status]);

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
      onFilterChange={(value) => {
        const nextStatus = value as InquiryStatusFilterValue;
        setStatus(nextStatus);
        navigate(query, nextStatus, form, sort);
      }}
      filterOptions={statusOptions.map((option) => ({
        value: option,
        label:
          option === "all" ? "All statuses" : getInquiryStatusLabel(option),
      }))}
      secondaryFilterId="inquiry-form-filter"
      secondaryFilterLabel="Form"
      secondaryFilterValue={form}
      onSecondaryFilterChange={(value) => {
        setForm(value);
        navigate(query, status, value, sort);
      }}
      secondaryFilterOptions={formOptions}
      sortId="inquiry-sort"
      sortLabel="Sort by"
      sortValue={sort}
      onSortChange={(value) => {
        const nextSort = value as "newest" | "oldest";
        setSort(nextSort);
        navigate(query, status, form, nextSort);
      }}
      sortOptions={[
        { label: "Newest first", value: "newest" },
        { label: "Oldest first", value: "oldest" },
      ]}
      isPending={isPending}
      onClear={() => {
        setQuery("");
        setStatus("all");
        setForm("all");
        setSort("newest");
        navigate("", "all", "all", "newest");
      }}
      canClear={Boolean(
        query.trim() || status !== "all" || form !== "all" || sort !== "newest",
      )}
    />
  );
}

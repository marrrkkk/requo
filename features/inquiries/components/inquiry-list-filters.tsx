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
  const [escalatedOnly, setEscalatedOnly] = useState(filters.escalated ?? false);
  const view = filters.view;

  const hasMountedRef = useRef(false);
  const lastAppliedHrefRef = useRef<string>("");

  const navigate = useCallback((
    nextQuery: string,
    nextStatus: InquiryStatusFilterValue,
    nextForm: string,
    nextSort: "newest" | "oldest",
    nextView: InquiryListFilters["view"],
    nextEscalated: boolean,
  ) => {
    const params = new URLSearchParams();
    const trimmedQuery = nextQuery.trim();

    if (nextView !== "active") {
      params.set("view", nextView);
    }

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

    if (nextEscalated) {
      params.set("escalated", "1");
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
      navigate(query, status, form, sort, view, escalatedOnly);
    }, 400);
    return () => clearTimeout(timer);
  }, [form, navigate, query, sort, status, view, escalatedOnly]);

  return (
    <div className="flex flex-col gap-2">
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
        navigate(query, nextStatus, form, sort, view, escalatedOnly);
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
        navigate(query, status, value, sort, view, escalatedOnly);
      }}
      secondaryFilterOptions={formOptions}
      sortId="inquiry-sort"
      sortLabel="Sort by"
      sortValue={sort}
      onSortChange={(value) => {
        const nextSort = value as "newest" | "oldest";
        setSort(nextSort);
        navigate(query, status, form, nextSort, view, escalatedOnly);
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
        setEscalatedOnly(false);
        navigate("", "all", "all", "newest", view, false);
      }}
      canClear={Boolean(
        query.trim() || status !== "all" || form !== "all" || sort !== "newest" || escalatedOnly,
      )}
    />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            const next = !escalatedOnly;
            setEscalatedOnly(next);
            navigate(query, status, form, sort, view, next);
          }}
          aria-pressed={escalatedOnly}
          className={
            escalatedOnly
              ? "inline-flex items-center gap-1.5 rounded-full border border-primary/50 bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors"
              : "inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          }
        >
          Needs human
        </button>
        {escalatedOnly ? (
          <span className="text-xs text-muted-foreground">
            Showing inquiries escalated from public chat
          </span>
        ) : null}
      </div>
    </div>
  );
}

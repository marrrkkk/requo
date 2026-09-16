"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { DataListToolbar } from "@/components/shared/data-list-toolbar";
import { useProgressRouter } from "@/hooks/use-progress-router";
import type { AdminInvoicesListFilters } from "@/features/admin/schemas";
import { getInvoiceStatusLabel } from "@/features/invoices/utils";
import { invoiceStatuses } from "@/features/invoices/types";

/**
 * URL-driven toolbar for `/admin/invoices`.
 *
 * Mirrors the search + filter pattern from the other product lists:
 * local state is debounced into `router.replace` so `q` + `status` are
 * surfaced as shareable query params. Page resets to the first page on
 * any filter change so the server query is never asked for a page that
 * falls outside the new result set.
 */
type AdminInvoicesFiltersProps = {
  filters: AdminInvoicesListFilters;
  resultCount: number;
};

type StatusFilterValue = NonNullable<AdminInvoicesListFilters["status"]> | "all";

const ALL_STATUS: StatusFilterValue = "all";

const statusFilterOptions: Array<{ label: string; value: StatusFilterValue }> = [
  { label: "All statuses", value: ALL_STATUS },
  ...invoiceStatuses.map((status) => ({
    label: getInvoiceStatusLabel(status),
    value: status satisfies StatusFilterValue,
  })),
];

function toStatusFilterValue(
  status: AdminInvoicesListFilters["status"],
): StatusFilterValue {
  return status ?? ALL_STATUS;
}

export function AdminInvoicesFilters({
  filters,
  resultCount,
}: AdminInvoicesFiltersProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useProgressRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(filters.search ?? "");
  const [status, setStatus] = useState<StatusFilterValue>(
    toStatusFilterValue(filters.status),
  );

  const hasMountedRef = useRef(false);
  const lastAppliedHrefRef = useRef<string>("");

  const navigate = useCallback(
    (nextQuery: string, nextStatus: StatusFilterValue) => {
      const params = new URLSearchParams();
      const trimmedQuery = nextQuery.trim();

      if (trimmedQuery) {
        params.set("q", trimmedQuery);
      }

      if (nextStatus !== ALL_STATUS) {
        params.set("status", nextStatus);
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
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    const timer = setTimeout(() => {
      navigate(query, status);
    }, 400);

    return () => clearTimeout(timer);
  }, [navigate, query, status]);

  return (
    <DataListToolbar
      canClear={Boolean(query.trim() || status !== ALL_STATUS)}
      description="Search by invoice number, title, customer, or email. Filter by payment status."
      filterId="admin-invoices-status-filter"
      filterLabel="Status"
      filterOptions={statusFilterOptions}
      filterValue={status}
      isPending={isPending}
      onClear={() => {
        setQuery("");
        setStatus(ALL_STATUS);
        navigate("", ALL_STATUS);
      }}
      onFilterChange={(value) => {
        const nextStatus = value as StatusFilterValue;
        setStatus(nextStatus);
        navigate(query, nextStatus);
      }}
      onSearchChange={setQuery}
      resultLabel={`${resultCount} ${resultCount === 1 ? "invoice" : "invoices"}`}
      searchId="admin-invoices-search"
      searchLabel="Search invoices"
      searchPlaceholder="Search by number, title, or customer"
      searchValue={query}
    />
  );
}

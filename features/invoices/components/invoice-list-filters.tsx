"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { DataListToolbar } from "@/components/shared/data-list-toolbar";
import { useProgressRouter } from "@/hooks/use-progress-router";
import { invoiceStatuses, type InvoiceStatus } from "@/features/invoices/types";
import { getInvoiceStatusLabel } from "@/features/invoices/utils";

type InvoiceStatusFilterValue = "all" | InvoiceStatus;

type InvoiceListFiltersProps = {
  filters: { q: string; status: InvoiceStatusFilterValue };
  resultCount: number;
};

const statusOptions: InvoiceStatusFilterValue[] = ["all", ...invoiceStatuses];

export function InvoiceListFilters({ filters, resultCount }: InvoiceListFiltersProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useProgressRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(filters.q ?? "");
  const [status, setStatus] = useState<InvoiceStatusFilterValue>(filters.status);

  const hasMountedRef = useRef(false);
  const lastAppliedHrefRef = useRef<string>("");

  const navigate = useCallback(
    (nextQuery: string, nextStatus: InvoiceStatusFilterValue) => {
      const params = new URLSearchParams();
      const trimmedQuery = nextQuery.trim();

      if (trimmedQuery) {
        params.set("q", trimmedQuery);
      }

      if (nextStatus !== "all") {
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
      description="Search by invoice number or customer."
      resultLabel={`${resultCount} ${resultCount === 1 ? "invoice" : "invoices"}`}
      searchId="invoice-search"
      searchLabel="Search invoices"
      searchPlaceholder="Search invoices or customers"
      searchValue={query}
      onSearchChange={setQuery}
      filterId="invoice-status-filter"
      filterLabel="Filter by status"
      filterValue={status}
      onFilterChange={(value) => {
        const nextStatus = value as InvoiceStatusFilterValue;
        setStatus(nextStatus);
        navigate(query, nextStatus);
      }}
      filterOptions={statusOptions.map((option) => ({
        value: option,
        label: option === "all" ? "All statuses" : getInvoiceStatusLabel(option),
      }))}
      isPending={isPending}
      onClear={() => {
        setQuery("");
        setStatus("all");
        navigate("", "all");
      }}
      canClear={Boolean(query.trim() || status !== "all")}
    />
  );
}

"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { DataListToolbar } from "@/components/shared/data-list-toolbar";
import { useProgressRouter } from "@/hooks/use-progress-router";
import { paymentMethods, paymentStatusFilterValues, type PaymentListFilters, type PaymentMethod, type PaymentStatusFilterValue } from "@/features/invoices/types";

type PaymentListFiltersProps = {
  filters: PaymentListFilters;
  resultCount: number;
};

const statusOptions: PaymentStatusFilterValue[] = [...paymentStatusFilterValues];
const methodOptions: Array<"all" | PaymentMethod> = ["all", ...paymentMethods];

const methodLabels: Record<PaymentMethod, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  gcash: "GCash",
  maya: "Maya",
  check: "Check",
  other: "Other",
};

export function PaymentListFilters({ filters, resultCount }: PaymentListFiltersProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useProgressRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(filters.q ?? "");
  const [status, setStatus] = useState<PaymentStatusFilterValue>(filters.status);
  const [method, setMethod] = useState<"all" | PaymentMethod>(filters.method);

  const hasMountedRef = useRef(false);
  const lastAppliedHrefRef = useRef<string>("");

  const navigate = useCallback((nextQuery: string, nextStatus: PaymentStatusFilterValue, nextMethod: "all" | PaymentMethod) => {
    const params = new URLSearchParams(searchParams.toString());
    const trimmedQuery = nextQuery.trim();
    if (trimmedQuery) params.set("q", trimmedQuery);
    else params.delete("q");
    if (nextStatus !== "all") params.set("status", nextStatus);
    else params.delete("status");
    if (nextMethod !== "all") params.set("method", nextMethod);
    else params.delete("method");
    params.delete("page");
    const href = params.size ? `${pathname}?${params.toString()}` : pathname;
    const currentHref = searchParams.size ? `${pathname}?${searchParams.toString()}` : pathname;
    if (href === currentHref || href === lastAppliedHrefRef.current) return;
    lastAppliedHrefRef.current = href;
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }, [pathname, router, searchParams]);

  const setDate = useCallback((key: "from" | "to", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    const href = params.size ? `${pathname}?${params.toString()}` : pathname;
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
      navigate(query, status, method);
    }, 400);
    return () => clearTimeout(timer);
  }, [navigate, query, status, method]);

  return (
    <div className="flex flex-col gap-3">
      <DataListToolbar
      description="Search by payment, invoice, customer, or reference."
      resultLabel={`${resultCount} ${resultCount === 1 ? "payment" : "payments"}`}
      searchId="payment-search"
      searchLabel="Search payments"
      searchPlaceholder="Search payment, invoice, customer, or reference"
      searchValue={query}
      onSearchChange={setQuery}
      filterId="payment-status-filter"
      filterLabel="Filter by status"
      filterValue={status}
      onFilterChange={(value) => {
        const nextStatus = value as PaymentStatusFilterValue;
        setStatus(nextStatus);
        navigate(query, nextStatus, method);
      }}
      filterOptions={statusOptions.map((option) => ({
        value: option,
        label: option === "all" ? "All statuses" : option === "recorded" ? "Recorded" : "Voided",
      }))}
      secondaryFilterId="payment-method-filter"
      secondaryFilterLabel="Filter by method"
      secondaryFilterValue={method}
      onSecondaryFilterChange={(value) => {
        const nextMethod = value as "all" | PaymentMethod;
        setMethod(nextMethod);
        navigate(query, status, nextMethod);
      }}
      secondaryFilterOptions={methodOptions.map((option) => ({
        value: option,
        label: option === "all" ? "All methods" : methodLabels[option],
      }))}
      isPending={isPending}
      onClear={() => {
        setQuery("");
        setStatus("all");
        setMethod("all");
        lastAppliedHrefRef.current = pathname;
        startTransition(() => {
          router.replace(pathname, { scroll: false });
        });
      }}
      canClear={Boolean(query.trim() || status !== "all" || method !== "all" || filters.from || filters.to)}
      />
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="payment-from">From</label>
          <input
            className="h-9 rounded-md border bg-background px-3 text-sm shadow-xs"
            id="payment-from"
            type="date"
            key={`from-${filters.from ?? "none"}`}
            defaultValue={filters.from ?? ""}
            onChange={(event) => setDate("from", event.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="payment-to">To</label>
          <input
            className="h-9 rounded-md border bg-background px-3 text-sm shadow-xs"
            id="payment-to"
            type="date"
            key={`to-${filters.to ?? "none"}`}
            defaultValue={filters.to ?? ""}
            onChange={(event) => setDate("to", event.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

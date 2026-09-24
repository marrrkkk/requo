"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { DataListToolbar } from "@/components/shared/data-list-toolbar";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { useProgressRouter } from "@/hooks/use-progress-router";
import { paymentMethods, paymentStatusFilterValues, type PaymentListFilters, type PaymentMethod, type PaymentStatusFilterValue } from "@/features/invoices/types";
import { getPaymentMethodLabel, getPaymentStatusLabel } from "@/features/invoices/utils";

type PaymentListFiltersProps = {
  filters: PaymentListFilters;
  resultCount: number;
};

const statusOptions: PaymentStatusFilterValue[] = [...paymentStatusFilterValues];
const methodOptions: Array<"all" | PaymentMethod> = ["all", ...paymentMethods];

export function PaymentListFilters({ filters, resultCount }: PaymentListFiltersProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useProgressRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(filters.q ?? "");
  const [status, setStatus] = useState<PaymentStatusFilterValue>(filters.status);
  const [method, setMethod] = useState<"all" | PaymentMethod>(filters.method);
  const [from, setFrom] = useState(filters.from ?? "");
  const [to, setTo] = useState(filters.to ?? "");

  const hasMountedRef = useRef(false);
  const lastAppliedHrefRef = useRef<string>("");

  const navigate = useCallback((nextQuery: string, nextStatus: PaymentStatusFilterValue, nextMethod: "all" | PaymentMethod, nextFrom: string, nextTo: string) => {
    const params = new URLSearchParams();
    const trimmedQuery = nextQuery.trim();
    if (trimmedQuery) params.set("q", trimmedQuery);
    if (nextStatus !== "all") params.set("status", nextStatus);
    if (nextMethod !== "all") params.set("method", nextMethod);
    if (nextFrom) params.set("from", nextFrom);
    if (nextTo) params.set("to", nextTo);
    const href = params.size ? `${pathname}?${params.toString()}` : pathname;
    const currentHref = searchParams.size ? `${pathname}?${searchParams.toString()}` : pathname;
    if (href === currentHref || href === lastAppliedHrefRef.current) return;
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
      navigate(query, status, method, from, to);
    }, 400);
    return () => clearTimeout(timer);
  }, [navigate, query, status, method, from, to]);

  return (
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
        navigate(query, nextStatus, method, from, to);
      }}
      filterOptions={statusOptions.map((option) => ({
        value: option,
        label: option === "all" ? "All statuses" : getPaymentStatusLabel(option),
      }))}
      secondaryFilterId="payment-method-filter"
      secondaryFilterLabel="Filter by method"
      secondaryFilterValue={method}
      onSecondaryFilterChange={(value) => {
        const nextMethod = value as "all" | PaymentMethod;
        setMethod(nextMethod);
        navigate(query, status, nextMethod, from, to);
      }}
      secondaryFilterOptions={methodOptions.map((option) => ({
        value: option,
        label: option === "all" ? "All methods" : getPaymentMethodLabel(option),
      }))}
      isPending={isPending}
      onClear={() => {
        setQuery("");
        setStatus("all");
        setMethod("all");
        setFrom("");
        setTo("");
        navigate("", "all", "all", "", "");
      }}
      canClear={Boolean(query.trim() || status !== "all" || method !== "all" || from || to)}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-2">
        <Field className="min-w-0 flex-1 sm:max-w-44">
          <FieldLabel className="sr-only" htmlFor="payment-from">From</FieldLabel>
          <FieldContent>
            <DatePicker
              id="payment-from"
              value={from}
              onChange={(nextFrom) => {
                setFrom(nextFrom);
                navigate(query, status, method, nextFrom, to);
              }}
              placeholder="From"
            />
          </FieldContent>
        </Field>
        <Field className="min-w-0 flex-1 sm:max-w-44">
          <FieldLabel className="sr-only" htmlFor="payment-to">To</FieldLabel>
          <FieldContent>
            <DatePicker
              id="payment-to"
              value={to}
              onChange={(nextTo) => {
                setTo(nextTo);
                navigate(query, status, method, from, nextTo);
              }}
              placeholder="To"
            />
          </FieldContent>
        </Field>
      </div>
    </DataListToolbar>
  );
}

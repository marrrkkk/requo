"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { DataListToolbar } from "@/components/shared/data-list-toolbar";
import { useProgressRouter } from "@/hooks/use-progress-router";
import type { AdminSubscriptionsListFilters } from "@/features/admin/schemas";
import type { BillingProvider, SubscriptionStatus } from "@/lib/billing/types";
import {
  billingProviders,
  subscriptionStatuses,
} from "@/lib/db/schema/subscriptions";

const STATUS_ALL = "all";
const PROVIDER_ALL = "all";

const statusLabels: Record<SubscriptionStatus, string> = {
  free: "Free",
  pending: "Pending",
  active: "Active",
  past_due: "Past due",
  canceled: "Canceled",
  expired: "Expired",
  incomplete: "Incomplete",
};

const providerLabels: Record<BillingProvider, string> = {
  polar: "Polar",
};

type AdminSubscriptionsFiltersProps = {
  filters: AdminSubscriptionsListFilters;
  resultCount: number;
};

export function AdminSubscriptionsFilters({
  filters,
  resultCount,
}: AdminSubscriptionsFiltersProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useProgressRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(filters.search ?? "");
  const [status, setStatus] = useState(filters.status ?? STATUS_ALL);
  const [provider, setProvider] = useState(filters.provider ?? PROVIDER_ALL);
  const hasMountedRef = useRef(false);
  const lastAppliedHrefRef = useRef("");

  const navigate = useCallback(
    (nextQuery: string, nextStatus: string, nextProvider: string) => {
      const params = new URLSearchParams();
      const trimmed = nextQuery.trim();

      if (trimmed) {
        params.set("q", trimmed);
      }

      if (nextStatus !== STATUS_ALL) {
        params.set("status", nextStatus);
      }

      if (nextProvider !== PROVIDER_ALL) {
        params.set("provider", nextProvider);
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
    setQuery(filters.search ?? "");
    setStatus(filters.status ?? STATUS_ALL);
    setProvider(filters.provider ?? PROVIDER_ALL);
  }, [filters.search, filters.status, filters.provider]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    const timer = setTimeout(() => {
      navigate(query, status, provider);
    }, 400);

    return () => clearTimeout(timer);
  }, [navigate, provider, query, status]);

  return (
    <DataListToolbar
      canClear={Boolean(
        query.trim() || status !== STATUS_ALL || provider !== PROVIDER_ALL,
      )}
      description="Filter by owner email, status, or billing provider."
      filterId="admin-subscriptions-status"
      filterLabel="Status"
      filterOptions={[
        { label: "All statuses", value: STATUS_ALL },
        ...subscriptionStatuses.map((value) => ({
          label: statusLabels[value],
          value,
        })),
      ]}
      filterValue={status}
      isPending={isPending}
      onClear={() => {
        setQuery("");
        setStatus(STATUS_ALL);
        setProvider(PROVIDER_ALL);
        navigate("", STATUS_ALL, PROVIDER_ALL);
      }}
      onFilterChange={(value) => {
        setStatus(value);
        navigate(query, value, provider);
      }}
      onSearchChange={setQuery}
      onSecondaryFilterChange={(value) => {
        setProvider(value);
        navigate(query, status, value);
      }}
      resultLabel={`${resultCount} ${resultCount === 1 ? "subscription" : "subscriptions"}`}
      searchId="admin-subscriptions-search"
      searchLabel="Owner email"
      searchPlaceholder="Search by owner email"
      searchValue={query}
      secondaryFilterId="admin-subscriptions-provider"
      secondaryFilterLabel="Provider"
      secondaryFilterOptions={[
        { label: "All providers", value: PROVIDER_ALL },
        ...billingProviders.map((value) => ({
          label: providerLabels[value] ?? value,
          value,
        })),
      ]}
      secondaryFilterValue={provider}
    />
  );
}

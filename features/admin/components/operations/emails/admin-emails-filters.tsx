"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { DataListToolbar } from "@/components/shared/data-list-toolbar";
import { useProgressRouter } from "@/hooks/use-progress-router";
import type { AdminEmailsListFilters } from "@/features/admin/schemas";
import {
  emailProviders,
  emailTypes,
  emailOutboxStatuses,
} from "@/lib/db/schema/email";

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

type StatusFilterValue = NonNullable<AdminEmailsListFilters["status"]> | "all";
type TypeFilterValue = NonNullable<AdminEmailsListFilters["emailType"]> | "all";
type ProviderFilterValue =
  | NonNullable<AdminEmailsListFilters["provider"]>
  | "all";

const ALL = "all";

const statusOptions: Array<{ label: string; value: StatusFilterValue }> = [
  { label: "All statuses", value: ALL },
  ...emailOutboxStatuses.map((status) => ({
    label: capitalize(status),
    value: status as StatusFilterValue,
  })),
];

const typeOptions: Array<{ label: string; value: TypeFilterValue }> = [
  { label: "All types", value: ALL },
  ...emailTypes.map((type) => ({
    label: capitalize(type),
    value: type as TypeFilterValue,
  })),
];

const providerOptions: Array<{ label: string; value: ProviderFilterValue }> = [
  { label: "All providers", value: ALL },
  ...emailProviders.map((provider) => ({
    label: capitalize(provider),
    value: provider as ProviderFilterValue,
  })),
];

type AdminEmailsFiltersProps = {
  filters: AdminEmailsListFilters;
  resultCount: number;
};

export function AdminEmailsFilters({
  filters,
  resultCount,
}: AdminEmailsFiltersProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useProgressRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(filters.search ?? "");
  const [status, setStatus] = useState<StatusFilterValue>(
    filters.status ?? ALL,
  );
  const [emailType, setEmailType] = useState<TypeFilterValue>(
    filters.emailType ?? ALL,
  );
  const [provider, setProvider] = useState<ProviderFilterValue>(
    filters.provider ?? ALL,
  );
  const hasMountedRef = useRef(false);
  const lastAppliedHrefRef = useRef<string>("");

  const navigate = useCallback(
    (
      nextQuery: string,
      nextStatus: StatusFilterValue,
      nextType: TypeFilterValue,
      nextProvider: ProviderFilterValue,
    ) => {
      const params = new URLSearchParams();
      const trimmed = nextQuery.trim();

      for (const [key, value] of searchParams.entries()) {
        if (
          key === "q" ||
          key === "page" ||
          key === "status" ||
          key === "emailType" ||
          key === "provider"
        ) {
          continue;
        }
        params.append(key, value);
      }

      if (trimmed) {
        params.set("q", trimmed);
      }

      if (nextStatus !== ALL) {
        params.set("status", nextStatus);
      }

      if (nextType !== ALL) {
        params.set("emailType", nextType);
      }

      if (nextProvider !== ALL) {
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

  // Sync filter state when the URL (or filters prop) changes without an effect.
  const [prevFilters, setPrevFilters] = useState(filters);
  if (
    filters.search !== prevFilters.search ||
    filters.status !== prevFilters.status ||
    filters.emailType !== prevFilters.emailType ||
    filters.provider !== prevFilters.provider
  ) {
    setPrevFilters(filters);
    setQuery(filters.search ?? "");
    setStatus(filters.status ?? ALL);
    setEmailType(filters.emailType ?? ALL);
    setProvider(filters.provider ?? ALL);
  }

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    const timer = setTimeout(() => {
      navigate(query, status, emailType, provider);
    }, 400);

    return () => clearTimeout(timer);
  }, [navigate, query, status, emailType, provider]);

  function clear() {
    setQuery("");
    setStatus(ALL);
    setEmailType(ALL);
    setProvider(ALL);
    navigate("", ALL, ALL, ALL);
  }

  return (
    <DataListToolbar
      canClear={Boolean(
        query.trim() || status !== ALL || emailType !== ALL || provider !== ALL,
      )}
      description="Search by subject, recipient, or idempotency key. Filter by delivery status, type, and provider."
      filterId="admin-emails-status-filter"
      filterLabel="Status"
      filterOptions={statusOptions}
      filterValue={status}
      isPending={isPending}
      onClear={clear}
      onFilterChange={(value) => {
        const next = value as StatusFilterValue;
        setStatus(next);
        navigate(query, next, emailType, provider);
      }}
      onSearchChange={setQuery}
      onSecondaryFilterChange={(value) => {
        const next = value as TypeFilterValue;
        setEmailType(next);
        navigate(query, status, next, provider);
      }}
      onTertiaryFilterChange={(value) => {
        const next = value as ProviderFilterValue;
        setProvider(next);
        navigate(query, status, emailType, next);
      }}
      resultLabel={`${resultCount} ${resultCount === 1 ? "email" : "emails"}`}
      searchId="admin-emails-search"
      searchLabel="Search emails"
      searchPlaceholder="Subject, recipient, or key"
      searchValue={query}
      secondaryFilterId="admin-emails-type-filter"
      secondaryFilterLabel="Type"
      secondaryFilterOptions={typeOptions}
      secondaryFilterValue={emailType}
      tertiaryFilterId="admin-emails-provider-filter"
      tertiaryFilterLabel="Provider"
      tertiaryFilterOptions={providerOptions}
      tertiaryFilterValue={provider}
    />
  );
}

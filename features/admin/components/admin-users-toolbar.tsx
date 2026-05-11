"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { DataListToolbar } from "@/components/shared/data-list-toolbar";
import { useProgressRouter } from "@/hooks/use-progress-router";

type AdminUsersToolbarProps = {
  initialSearch: string;
  resultCount: number;
};

/**
 * Search + clear toolbar for the admin users list (task 12.2).
 *
 * Keeps the controlled search input in sync with the `q` URL query
 * parameter so the list stays linkable and bookmarkable. Debounces
 * the navigation by 400ms, matching the existing follow-up filters
 * behavior in `features/follow-ups/components/follow-up-list-filters.tsx`.
 *
 * The shared `DataListToolbar` widget requires at least one filter
 * combobox; the admin users list has no secondary filter yet, so we
 * render a static "Sort by" combobox pinned to "Created (newest)"
 * which matches the server's default ordering (Req 3.4). Leaving it
 * disabled here (single option) keeps the toolbar shape consistent
 * with other lists without adding an illusory control the user can
 * touch.
 */
export function AdminUsersToolbar({
  initialSearch,
  resultCount,
}: AdminUsersToolbarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useProgressRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(initialSearch);
  const hasMountedRef = useRef(false);
  const lastAppliedHrefRef = useRef<string>("");

  const navigate = useCallback(
    (nextQuery: string) => {
      const params = new URLSearchParams();
      const trimmed = nextQuery.trim();

      // Preserve any params we don't manage here (e.g. pageSize).
      for (const [key, value] of searchParams.entries()) {
        if (key === "q" || key === "page") {
          continue;
        }
        params.append(key, value);
      }

      if (trimmed) {
        params.set("q", trimmed);
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

  // Keep local state in sync if the URL changes via back/forward.
  useEffect(() => {
    setQuery(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    const timer = setTimeout(() => {
      navigate(query);
    }, 400);

    return () => clearTimeout(timer);
  }, [navigate, query]);

  return (
    <DataListToolbar
      canClear={query.trim().length > 0}
      description="Search by email or name. Results are case-insensitive substring matches."
      filterId="admin-users-sort"
      filterLabel="Sort by"
      filterOptions={[{ value: "created_desc", label: "Created (newest)" }]}
      filterValue="created_desc"
      isPending={isPending}
      onClear={() => {
        setQuery("");
        navigate("");
      }}
      onFilterChange={() => {
        // Single-option sort — intentional no-op so the toolbar shape
        // stays consistent with other lists without advertising a
        // control the user can meaningfully toggle.
      }}
      onSearchChange={setQuery}
      resultLabel={`${resultCount} ${resultCount === 1 ? "user" : "users"}`}
      searchId="admin-users-search"
      searchLabel="Search users"
      searchPlaceholder="Search by email or name"
      searchValue={query}
    />
  );
}

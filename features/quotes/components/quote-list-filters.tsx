"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  QuoteListFilters,
  QuoteStatusFilterValue,
} from "@/features/quotes/types";
import { getQuoteStatusLabel } from "@/features/quotes/utils";

type QuoteListFiltersProps = {
  filters: QuoteListFilters;
  resultCount: number;
};

const statusOptions: QuoteStatusFilterValue[] = [
  "all",
  "draft",
  "sent",
  "accepted",
  "rejected",
  "expired",
];

export function QuoteListFilters({
  filters,
  resultCount,
}: QuoteListFiltersProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(filters.q ?? "");
  const [status, setStatus] = useState<QuoteStatusFilterValue>(filters.status);

  function navigate(nextQuery: string, nextStatus: QuoteStatusFilterValue) {
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
    <div className="rounded-[1.7rem] border bg-background/75 p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <span className="eyebrow">Quote filters</span>
            <p className="text-sm leading-6 text-muted-foreground">
              Search by quote number, title, or customer and keep the list
              focused by status.
            </p>
          </div>
          <p className="text-sm font-medium text-foreground">
            {resultCount} {resultCount === 1 ? "quote" : "quotes"}
          </p>
        </div>

        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            navigate(query, status);
          }}
        >
          <FieldGroup className="lg:flex-row lg:items-end">
            <Field className="lg:flex-1">
              <FieldLabel className="sr-only" htmlFor="quote-search">
                Search quotes
              </FieldLabel>
              <FieldContent>
                <Input
                  id="quote-search"
                  value={query}
                  onChange={(event) => setQuery(event.currentTarget.value)}
                  placeholder="Search quote number, title, or customer"
                  disabled={isPending}
                />
              </FieldContent>
            </Field>

            <Field className="lg:w-[13rem]">
              <FieldLabel className="sr-only" htmlFor="quote-status-filter">
                Filter by status
              </FieldLabel>
              <FieldContent>
                <Select
                  value={status}
                  onValueChange={(value) =>
                    setStatus(value as QuoteStatusFilterValue)
                  }
                >
                  <SelectTrigger id="quote-status-filter" className="w-full">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {statusOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option === "all"
                            ? "All statuses"
                            : getQuoteStatusLabel(option)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button disabled={isPending} type="submit">
                <Search data-icon="inline-start" />
                {isPending ? "Applying..." : "Apply"}
              </Button>
              <Button
                disabled={isPending || (!query.trim() && status === "all")}
                onClick={() => {
                  setQuery("");
                  setStatus("all");
                  navigate("", "all");
                }}
                type="button"
                variant="outline"
              >
                <X data-icon="inline-start" />
                Clear
              </Button>
            </div>
          </FieldGroup>
        </form>
      </div>
    </div>
  );
}

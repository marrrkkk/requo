"use client";

import { Download } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getBusinessQuotesExportPath } from "@/features/businesses/routes";
import type { QuoteListFilters, QuoteStatusFilterValue } from "@/features/quotes/types";
import { getQuoteStatusLabel } from "@/features/quotes/utils";

const statusOptions: QuoteStatusFilterValue[] = [
  "all",
  "draft",
  "sent",
  "accepted",
  "rejected",
  "expired",
];

type QuoteExportCsvPopoverProps = {
  businessSlug: string;
  filters: QuoteListFilters;
  resultCount: number;
};

export function QuoteExportCsvPopover({
  businessSlug,
  filters,
  resultCount,
}: QuoteExportCsvPopoverProps) {
  const [query, setQuery] = useState(filters.q ?? "");
  const [status, setStatus] = useState<QuoteStatusFilterValue>(filters.status);
  const [sort, setSort] = useState<"newest" | "oldest">(filters.sort);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    const trimmedQuery = query.trim();

    if (trimmedQuery) {
      params.set("q", trimmedQuery);
    }
    if (status !== "all") {
      params.set("status", status);
    }
    if (sort !== "newest") {
      params.set("sort", sort);
    }
    if (from) {
      params.set("from", from);
    }
    if (to) {
      params.set("to", to);
    }

    return `${getBusinessQuotesExportPath(businessSlug)}${
      params.size ? `?${params.toString()}` : ""
    }`;
  }, [businessSlug, from, query, sort, status, to]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button disabled={resultCount === 0} variant="outline">
          <Download data-icon="inline-start" />
          Export CSV
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96">
        <PopoverHeader>
          <PopoverTitle>Export quotes CSV</PopoverTitle>
          <PopoverDescription>
            Choose filters and date range for this export.
          </PopoverDescription>
        </PopoverHeader>

        <div className="grid gap-3">
          <Field>
            <FieldLabel htmlFor="quote-export-q">Search</FieldLabel>
            <FieldContent>
              <Input
                id="quote-export-q"
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                placeholder="Quote number, title, customer"
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="quote-export-status">Status</FieldLabel>
            <FieldContent>
              <Combobox
                id="quote-export-status"
                value={status}
                onValueChange={(value) => setStatus(value as QuoteStatusFilterValue)}
                options={statusOptions.map((option) => ({
                  value: option,
                  label: option === "all" ? "All statuses" : getQuoteStatusLabel(option),
                }))}
                placeholder="Filter by status"
                searchPlaceholder="Search status"
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="quote-export-sort">Sort</FieldLabel>
            <FieldContent>
              <Combobox
                id="quote-export-sort"
                value={sort}
                onValueChange={(value) => setSort(value as "newest" | "oldest")}
                options={[
                  { label: "Newest first", value: "newest" },
                  { label: "Oldest first", value: "oldest" },
                ]}
                placeholder="Sort by"
                searchPlaceholder="Search sort"
              />
            </FieldContent>
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="quote-export-from">From</FieldLabel>
              <FieldContent>
                <Input
                  id="quote-export-from"
                  type="date"
                  value={from}
                  onChange={(event) => setFrom(event.currentTarget.value)}
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="quote-export-to">To</FieldLabel>
              <FieldContent>
                <Input
                  id="quote-export-to"
                  type="date"
                  value={to}
                  onChange={(event) => setTo(event.currentTarget.value)}
                />
              </FieldContent>
            </Field>
          </div>
        </div>

        <div className="flex justify-end">
          <Button asChild disabled={resultCount === 0}>
            <a href={exportHref}>Download CSV</a>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

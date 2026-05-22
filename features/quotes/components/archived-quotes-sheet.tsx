"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Archive, Inbox, RotateCcw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { QuoteStatusBadge } from "@/features/quotes/components/quote-status-badge";
import { ServerActionButton } from "@/components/shared/server-action-button";
import { formatQuoteMoney } from "@/features/quotes/utils";
import type {
  DashboardQuoteListItem,
  QuoteStatus,
} from "@/features/quotes/types";

type QuoteRecordActionState = { error?: string; success?: string };

const statusFilterOptions: { label: string; value: QuoteStatus | "all" }[] = [
  { label: "All statuses", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Sent", value: "sent" },
  { label: "Accepted", value: "accepted" },
  { label: "Rejected", value: "rejected" },
  { label: "Expired", value: "expired" },
  { label: "Voided", value: "voided" },
];

type ArchivedQuotesSheetProps = {
  businessSlug: string;
  items: DashboardQuoteListItem[];
  restoreAction: (
    quoteId: string,
    state: QuoteRecordActionState,
    formData: FormData,
  ) => Promise<QuoteRecordActionState>;
};

export function ArchivedQuotesSheet({
  businessSlug,
  items,
  restoreAction,
}: ArchivedQuotesSheetProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | "all">("all");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!q) return true;
      return (
        item.customerName.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.quoteNumber.toLowerCase().includes(q)
      );
    });
  }, [items, query, statusFilter]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="outline">
          <Archive data-icon="inline-start" />
          Archived
          {items.length > 0 ? (
            <span className="ml-1 tabular-nums text-muted-foreground">
              ({items.length})
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Archived quotes</SheetTitle>
          <SheetDescription>
            {items.length === 0
              ? "No archived quotes yet."
              : `${items.length} archived ${items.length === 1 ? "quote" : "quotes"}`}
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-3 overflow-y-auto">
          {items.length > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  onChange={(event) => setQuery(event.currentTarget.value)}
                  placeholder="Search by name, title, or number..."
                  type="search"
                  value={query}
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {statusFilterOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                      statusFilter === option.value
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                    onClick={() => setStatusFilter(option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
              <Inbox className="size-8 opacity-40" />
              <p className="text-sm">Archived quotes will appear here.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center text-muted-foreground">
              <p className="text-sm">No matches found.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">
                {filtered.length} {filtered.length === 1 ? "result" : "results"}
              </p>
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border border-border/70 px-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      className="block truncate text-sm font-medium text-foreground hover:underline"
                      href={`/businesses/${businessSlug}/quotes/${item.id}`}
                    >
                      {item.quoteNumber} · {item.customerName}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.title} · {formatQuoteMoney(item.totalInCents, item.currency)}
                    </p>
                  </div>
                  <QuoteStatusBadge status={item.status} />
                  <ServerActionButton
                    action={restoreAction.bind(null, item.id)}
                    icon={RotateCcw}
                    label="Restore"
                    pendingLabel="..."
                    variant="ghost"
                  />
                </div>
              ))}
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

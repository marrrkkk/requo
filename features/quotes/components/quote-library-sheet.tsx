"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { Search } from "lucide-react";
import { usePathname } from "next/navigation";

import { DashboardMetaPill } from "@/components/shared/dashboard-layout";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  DashboardQuoteLibraryEntry,
  QuoteEditorLineItemValue,
  QuoteLibraryEntryKind,
} from "@/features/quotes/types";
import {
  getBusinessDashboardSlugFromPathname,
  getBusinessSettingsPath,
} from "@/features/businesses/routes";
import { workspacesHubPath } from "@/features/workspaces/routes";
import {
  formatQuoteMoney,
  getQuoteLibraryEntryKindLabel,
  isQuoteEditorLineItemBlank,
} from "@/features/quotes/utils";

type QuoteLibrarySheetProps = {
  currency: string;
  entries: DashboardQuoteLibraryEntry[];
  items: QuoteEditorLineItemValue[];
  onInsert: (entry: DashboardQuoteLibraryEntry) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type QuoteLibraryTabValue = "all" | QuoteLibraryEntryKind;

export function QuoteLibrarySheet({
  currency,
  entries,
  items,
  onInsert,
  open,
  onOpenChange,
}: QuoteLibrarySheetProps) {
  const pathname = usePathname();
  const [tab, setTab] = useState<QuoteLibraryTabValue>("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const normalizedSearch = deferredSearch.trim().toLowerCase();
  const businessSlug = getBusinessDashboardSlugFromPathname(pathname);
  const shouldReplacePlaceholder =
    items.length === 1 && isQuoteEditorLineItemBlank(items[0]);
  const baseItemCount = shouldReplacePlaceholder ? 0 : items.length;
  const filteredEntries = entries.filter((entry) => {
    if (tab !== "all" && entry.kind !== tab) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const haystack = [
      entry.name,
      entry.currency,
      entry.description ?? "",
      ...entry.items.map((item) => item.description),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedSearch);
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[92vw] sm:max-w-xl" side="right">
        <SheetHeader>
          <SheetTitle>Insert saved pricing</SheetTitle>
          <SheetDescription>
            Choose a saved pricing block or service package to copy into this draft quote.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="min-h-0 flex-1 gap-0 px-0 py-0 sm:px-0 sm:py-0">
          <div className="flex flex-col gap-4 border-b border-border/70 px-5 py-5 sm:px-6 sm:py-6">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search saved pricing"
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
              />
            </div>

            <Tabs
              value={tab}
              onValueChange={(value) => setTab(value as QuoteLibraryTabValue)}
            >
              <TabsList className="w-full justify-start">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="block">Blocks</TabsTrigger>
                <TabsTrigger value="package">Packages</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex flex-1 flex-col overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
            {entries.length === 0 ? (
              <Empty className="border-border/70 bg-background/80">
                <EmptyHeader>
                  <EmptyTitle>No saved pricing yet</EmptyTitle>
                  <EmptyDescription>
                    Save pricing blocks or service packages in Business settings first.
                  </EmptyDescription>
                </EmptyHeader>
                <Button asChild variant="outline">
                  <Link
                    href={
                      businessSlug
                        ? getBusinessSettingsPath(businessSlug, "pricing")
                        : workspacesHubPath
                    }
                  >
                    Open pricing
                  </Link>
                </Button>
              </Empty>
            ) : filteredEntries.length === 0 ? (
              <Empty className="border-border/70 bg-background/80">
                <EmptyHeader>
                  <EmptyTitle>No matching entries</EmptyTitle>
                  <EmptyDescription>
                    Try a different search or switch back to another tab.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="flex flex-col gap-4">
                {filteredEntries.map((entry) => {
                  const nextItemCount = baseItemCount + entry.items.length;
                  const wouldExceedLimit = nextItemCount > 50;
                  const hasCurrencyMismatch = entry.currency !== currency;

                  return (
                    <div
                      className="soft-panel flex flex-col gap-4 p-4 shadow-none"
                      data-testid="quote-library-sheet-entry"
                      key={entry.id}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">
                              {entry.name}
                            </p>
                            <DashboardMetaPill>
                              {getQuoteLibraryEntryKindLabel(entry.kind)}
                            </DashboardMetaPill>
                            <DashboardMetaPill>
                              {entry.itemCount} {entry.itemCount === 1 ? "item" : "items"}
                            </DashboardMetaPill>
                            <DashboardMetaPill>{entry.currency}</DashboardMetaPill>
                          </div>
                          {entry.description ? (
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                              {entry.description}
                            </p>
                          ) : null}
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-foreground">
                          {formatQuoteMoney(entry.totalInCents, entry.currency)}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        {entry.items.slice(0, 3).map((item) => (
                          <div
                            className="flex items-center justify-between gap-4 rounded-lg border border-border/70 bg-background/85 px-3 py-2.5"
                            key={item.id}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                {item.description}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Qty {item.quantity} x{" "}
                                {formatQuoteMoney(
                                  item.unitPriceInCents,
                                  entry.currency,
                                )}
                              </p>
                            </div>
                            <p className="text-sm font-medium text-foreground">
                              {formatQuoteMoney(
                                item.quantity * item.unitPriceInCents,
                                entry.currency,
                              )}
                            </p>
                          </div>
                        ))}
                        {entry.items.length > 3 ? (
                          <p className="text-xs text-muted-foreground">
                            +{entry.items.length - 3} more saved items
                          </p>
                        ) : null}
                      </div>

                      {wouldExceedLimit ? (
                        <p className="text-sm text-destructive">
                          This insert would create {nextItemCount} quote line items. Quotes can include up to 50.
                        </p>
                      ) : null}

                      {hasCurrencyMismatch ? (
                        <p className="text-sm text-destructive">
                          This entry is saved in {entry.currency}. Requo does not
                          auto-convert saved pricing before inserting it into a {currency}
                          quote.
                        </p>
                      ) : null}

                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={wouldExceedLimit || hasCurrencyMismatch}
                          onClick={() => onInsert(entry)}
                        >
                          Insert into quote
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

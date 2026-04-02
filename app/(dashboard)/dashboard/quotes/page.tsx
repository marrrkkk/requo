import Link from "next/link";
import { ArrowRight, ReceiptText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { QuoteListCards } from "@/features/quotes/components/quote-list-cards";
import { QuoteListFilters } from "@/features/quotes/components/quote-list-filters";
import { QuoteListTable } from "@/features/quotes/components/quote-list-table";
import { getQuoteListForWorkspace } from "@/features/quotes/queries";
import { quoteListFiltersSchema } from "@/features/quotes/schemas";
import { requireCurrentWorkspaceContext } from "@/lib/db/workspace-access";

type QuotesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function QuotesPage({ searchParams }: QuotesPageProps) {
  const { workspaceContext } = await requireCurrentWorkspaceContext();
  const parsedFilters = quoteListFiltersSchema.safeParse(await searchParams);
  const filters = parsedFilters.success
    ? parsedFilters.data
    : {
        q: undefined,
        status: "all" as const,
      };
  const quoteList = await getQuoteListForWorkspace({
    workspaceId: workspaceContext.workspace.id,
    filters,
  });
  const hasFilters = Boolean(filters.q || filters.status !== "all");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl flex flex-col gap-2">
          <span className="eyebrow">Quotes</span>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Build, send, and track customer-ready quotes from one workspace.
          </h1>
          <p className="text-sm leading-7 text-muted-foreground sm:text-base">
            Keep draft editing, sent-state tracking, and inquiry handoffs inside
            the authenticated dashboard shell.
          </p>
        </div>

        <Button asChild>
          <Link href="/dashboard/quotes/new" prefetch={false}>
            Create quote
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </div>

      <QuoteListFilters filters={filters} resultCount={quoteList.length} />

      {quoteList.length ? (
        <>
          <QuoteListTable
            quotes={quoteList}
            currency={workspaceContext.workspace.defaultCurrency}
          />
          <QuoteListCards
            quotes={quoteList}
            currency={workspaceContext.workspace.defaultCurrency}
          />
        </>
      ) : (
        <div className="rounded-[1.7rem] border bg-background/75 p-4 shadow-sm">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ReceiptText />
              </EmptyMedia>
              <EmptyTitle>
                {hasFilters
                  ? "No quotes match these filters."
                  : "Your quote workspace is still empty."}
              </EmptyTitle>
              <EmptyDescription>
                {hasFilters
                  ? "Try a different status or clear the search term to widen the quote list."
                  : "Create a draft manually or start from an inquiry to keep customer context attached."}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              {hasFilters ? (
                <Button asChild variant="outline">
                  <Link href="/dashboard/quotes">Clear filters</Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/dashboard/quotes/new" prefetch={false}>
                    Create first quote
                  </Link>
                </Button>
              )}
            </EmptyContent>
          </Empty>
        </div>
      )}
    </div>
  );
}

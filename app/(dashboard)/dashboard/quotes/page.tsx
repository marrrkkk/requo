import Link from "next/link";
import { ArrowRight, ReceiptText } from "lucide-react";

import {
  DashboardEmptyState,
  DashboardPage,
} from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
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
    <DashboardPage>
      <PageHeader
        eyebrow="Quotes"
        title="Quote workspace"
        description="Draft, send, and track quotes."
        actions={
          <Button asChild>
            <Link href="/dashboard/quotes/new" prefetch={false}>
              Create quote
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        }
      />

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
        <DashboardEmptyState
          action={
            hasFilters ? (
              <Button asChild variant="outline">
                <Link href="/dashboard/quotes">Clear filters</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/dashboard/quotes/new" prefetch={false}>
                  Create first quote
                </Link>
              </Button>
            )
          }
          description={
            hasFilters
              ? "Try a different search or status."
              : "Create a quote from scratch or start from an inquiry."
          }
          icon={ReceiptText}
          title={
            hasFilters
              ? "No quotes match these filters."
              : "Your quote workspace is still empty."
          }
        />
      )}
    </DashboardPage>
  );
}

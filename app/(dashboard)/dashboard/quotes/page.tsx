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
import {
  getWorkspaceNewQuotePath,
  getWorkspaceQuotesPath,
} from "@/features/workspaces/routes";
import { requireCurrentWorkspaceContext } from "@/lib/db/workspace-access";

type QuotesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function QuotesPage({ searchParams }: QuotesPageProps) {
  const [{ workspaceContext }, resolvedSearchParams] = await Promise.all([
    requireCurrentWorkspaceContext(),
    searchParams,
  ]);
  const parsedFilters = quoteListFiltersSchema.safeParse(resolvedSearchParams);
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
  const workspaceSlug = workspaceContext.workspace.slug;
  const hasFilters = Boolean(filters.q || filters.status !== "all");

  return (
    <DashboardPage>
      <PageHeader
        eyebrow="Quotes"
        title="Quotes"
        actions={
          <Button asChild>
            <Link href={getWorkspaceNewQuotePath(workspaceSlug)} prefetch={true}>
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
            workspaceSlug={workspaceSlug}
          />
          <QuoteListCards
            quotes={quoteList}
            currency={workspaceContext.workspace.defaultCurrency}
            workspaceSlug={workspaceSlug}
          />
        </>
      ) : (
        <DashboardEmptyState
          action={
            hasFilters ? (
              <Button asChild variant="outline">
                <Link href={getWorkspaceQuotesPath(workspaceSlug)} prefetch={true}>Clear filters</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href={getWorkspaceNewQuotePath(workspaceSlug)} prefetch={true}>
                  Create first quote
                </Link>
              </Button>
            )
          }
          description={
            hasFilters ? "Try another search or status." : "No quotes yet."
          }
          icon={ReceiptText}
          title={
            hasFilters
              ? "No quotes match these filters."
              : "Your quote workspace is still empty."
          }
          variant="list"
        />
      )}
    </DashboardPage>
  );
}

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import {
  QuoteListContentFallback,
  QuoteListControlsFallback,
  QuoteListHeaderActionsFallback,
} from "@/features/quotes/components/quote-list-page-sections";

/**
 * Structural loading state for the quotes list.
 *
 * Mirrors `quotes/page.tsx` exactly: the same named fallbacks the page's
 * Suspense boundaries use, and the same `max-lg` class that hides the header
 * actions on mobile — without it the skeleton action buttons painted on mobile
 * and then disappeared once the page resolved.
 *
 * The content slot previously rendered `DashboardListResultsSkeleton` directly.
 * That is the same output today, but it bypassed `QuoteListContentFallback` and
 * would drift the moment that wrapper changed.
 */
export default function BusinessDashboardQuotesLoading() {
  return (
    <DashboardPage>
      <PageHeader
        title="Quotes"
        className="[&_.dashboard-actions]:max-lg:hidden"
        actions={<QuoteListHeaderActionsFallback />}
      />
      <div className="dashboard-table-shell" data-list-card>
        <QuoteListControlsFallback />
        <QuoteListContentFallback />
      </div>
    </DashboardPage>
  );
}

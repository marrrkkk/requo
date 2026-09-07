import { DashboardPage } from "@/components/shared/dashboard-layout";
import { DashboardListResultsSkeleton } from "@/components/shared/dashboard-list-results-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import {
  QuoteListControlsFallback,
  QuoteListHeaderActionsFallback,
} from "@/features/quotes/components/quote-list-page-sections";

export default function BusinessDashboardQuotesLoading() {
  return (
    <DashboardPage>
      <PageHeader
        title="Quotes"
        actions={<QuoteListHeaderActionsFallback />}
      />
      <div className="dashboard-table-shell" data-list-card>
        <QuoteListControlsFallback />
        <DashboardListResultsSkeleton variant="quotes" />
      </div>
    </DashboardPage>
  );
}

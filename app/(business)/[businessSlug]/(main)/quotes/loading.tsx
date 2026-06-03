import { DashboardPage } from "@/components/shared/dashboard-layout";
import { DashboardListResultsSkeleton } from "@/components/shared/dashboard-list-results-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import {
  QuoteListControlsFallback,
} from "@/features/quotes/components/quote-list-page-sections";

export default function BusinessDashboardQuotesLoading() {
  return (
    <DashboardPage>
      <PageHeader
        title="Quotes"
        description="List, filter, and manage quotes for this business."
      />
      <QuoteListControlsFallback />
      <DashboardListResultsSkeleton variant="quotes" />
    </DashboardPage>
  );
}

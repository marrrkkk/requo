import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import {
  PaymentListContentFallback,
  PaymentListControlsFallback,
} from "@/features/invoices/components/payment-list-page-sections";

/**
 * Structural loading state for the payments list.
 *
 * Mirrors `payments/page.tsx`: the same named fallbacks the page's Suspense
 * boundaries use, so the shell and the resolved page agree.
 */
export default function Loading() {
  return (
    <DashboardPage>
      <PageHeader title="Payments" />
      <div className="dashboard-table-shell" data-list-card>
        <PaymentListControlsFallback />
        <PaymentListContentFallback />
      </div>
    </DashboardPage>
  );
}

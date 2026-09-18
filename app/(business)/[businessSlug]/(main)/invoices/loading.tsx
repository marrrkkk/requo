import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import {
  InvoiceListContentFallback,
  InvoiceListControlsFallback,
  InvoiceListHeaderActionsFallback,
} from "@/features/invoices/components/invoice-list-page-sections";

/**
 * Structural loading state for the invoices list.
 *
 * Mirrors `invoices/page.tsx`: the same named fallbacks the page's Suspense
 * boundaries use, and the same `max-lg` class that hides the header actions on
 * mobile.
 *
 * This was previously a stub — a title, one action skeleton, and a single
 * `h-64` block — so the toolbar strip, the results structure, and the mobile
 * card list all appeared only once the page resolved, producing a large layout
 * shift on every navigation to Invoices.
 */
export default function Loading() {
  return (
    <DashboardPage>
      <PageHeader
        title="Invoices"
        className="[&_.dashboard-actions]:max-lg:hidden"
        actions={<InvoiceListHeaderActionsFallback />}
      />
      <div className="dashboard-table-shell" data-list-card>
        <InvoiceListControlsFallback />
        <InvoiceListContentFallback />
      </div>
    </DashboardPage>
  );
}

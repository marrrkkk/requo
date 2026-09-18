import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import {
  InquiryListContentFallback,
  InquiryListControlsFallback,
  InquiryListHeaderActionsFallback,
} from "@/features/inquiries/components/inquiry-list-page-sections";

/**
 * Structural loading state for the inquiries list.
 *
 * Mirrors `inquiries/page.tsx` exactly: the same named fallbacks the page's
 * Suspense boundaries use, and the same `max-lg` class that hides the header
 * actions on mobile — without it the skeleton action buttons painted on mobile
 * and then disappeared once the page resolved.
 *
 * The content slot previously rendered `DashboardListResultsSkeleton` directly.
 * That is the same output today, but it bypassed `InquiryListContentFallback`
 * and would drift the moment that wrapper changed.
 */
export default function BusinessDashboardInquiriesLoading() {
  return (
    <DashboardPage>
      <PageHeader
        title="Inquiries"
        className="[&_.dashboard-actions]:max-lg:hidden"
        actions={<InquiryListHeaderActionsFallback />}
      />
      <div className="dashboard-table-shell" data-list-card>
        <InquiryListControlsFallback />
        <InquiryListContentFallback />
      </div>
    </DashboardPage>
  );
}

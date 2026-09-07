import { DashboardPage } from "@/components/shared/dashboard-layout";
import { DashboardListResultsSkeleton } from "@/components/shared/dashboard-list-results-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import {
  InquiryListControlsFallback,
  InquiryListHeaderActionsFallback,
} from "@/features/inquiries/components/inquiry-list-page-sections";

export default function BusinessDashboardInquiriesLoading() {
  return (
    <DashboardPage>
      <PageHeader
        title="Inquiries"
        actions={<InquiryListHeaderActionsFallback />}
      />
      <div className="dashboard-table-shell" data-list-card>
        <InquiryListControlsFallback />
        <DashboardListResultsSkeleton variant="inquiries" />
      </div>
    </DashboardPage>
  );
}

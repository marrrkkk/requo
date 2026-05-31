import { DashboardPage } from "@/components/shared/dashboard-layout";
import { DashboardListResultsSkeleton } from "@/components/shared/dashboard-list-results-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import {
  InquiryListControlsFallback,
} from "@/features/inquiries/components/inquiry-list-page-sections";

export default function BusinessDashboardInquiriesLoading() {
  return (
    <DashboardPage>
      <PageHeader
        eyebrow="Inquiries"
        title="Customer inquiries"
      />
      <InquiryListControlsFallback />
      <DashboardListResultsSkeleton variant="inquiries" />
    </DashboardPage>
  );
}

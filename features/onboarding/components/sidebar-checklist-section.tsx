import { getBusinessDashboardSummaryData } from "@/features/businesses/queries";
import { getActivationChecklist } from "@/features/onboarding/activation-checklist";
import {
  SidebarChecklist,
} from "@/features/onboarding/components/sidebar-checklist";

type SidebarChecklistSectionProps = {
  businessId: string;
  businessSlug: string;
  publicInquiryEnabled: boolean;
};

export async function SidebarChecklistSection({
  businessId,
  businessSlug,
  publicInquiryEnabled,
}: SidebarChecklistSectionProps) {
  const summary = await getBusinessDashboardSummaryData(businessId);

  // Same steps as the home-page launchpad — single source of truth.
  const items = getActivationChecklist({
    businessSlug,
    publicInquiryEnabled,
    totalInquiries: summary.totalInquiries,
    totalQuotes: summary.totalQuotes,
  });

  return (
    <SidebarChecklist items={items} />
  );
}

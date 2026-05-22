import {
  getBusinessInquiriesPath,
  getBusinessInquiryFormsPath,
  getBusinessNewQuotePath,
  getBusinessSettingsPath,
} from "@/features/businesses/routes";
import { getBusinessDashboardSummaryData } from "@/features/businesses/queries";
import {
  SidebarChecklist,
  type ChecklistItem,
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

  const items: ChecklistItem[] = [
    {
      id: "business",
      title: "Set up your business",
      complete: true,
      href: getBusinessSettingsPath(businessSlug),
    },
    {
      id: "form",
      title: "Publish inquiry form",
      complete: publicInquiryEnabled,
      href: getBusinessInquiryFormsPath(businessSlug),
    },
    {
      id: "inquiry",
      title: "Receive first inquiry",
      complete: summary.totalInquiries > 0,
      href: getBusinessInquiriesPath(businessSlug),
    },
    {
      id: "quote",
      title: "Send first quote",
      complete: summary.totalQuotes > 0,
      href: getBusinessNewQuotePath(businessSlug),
    },
  ];

  return (
    <SidebarChecklist items={items} />
  );
}

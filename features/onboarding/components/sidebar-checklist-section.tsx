import {
  getBusinessInquiriesPath,
  getBusinessInquiryFormsPath,
  getBusinessJobsPath,
  getBusinessInvoicesPath,
  getBusinessNewQuotePath,
  getBusinessQuotesPath,
  getBusinessSettingsPath,
} from "@/features/businesses/routes";
import { getBusinessDashboardSummaryData } from "@/features/businesses/queries";
import { getChecklistProgressForBusiness } from "@/features/onboarding/queries";
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
  const [summary, progress] = await Promise.all([
    getBusinessDashboardSummaryData(businessId),
    getChecklistProgressForBusiness(businessId),
  ]);

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
      id: "qualify",
      title: "Qualify an inquiry",
      complete: progress.hasQualifiedInquiry,
      href: getBusinessInquiriesPath(businessSlug),
    },
    {
      id: "quote",
      title: "Send first quote",
      complete: summary.totalQuotes > 0,
      href: getBusinessNewQuotePath(businessSlug),
    },
    {
      id: "accepted",
      title: "Get a quote accepted",
      complete: summary.wonCount > 0,
      href: getBusinessQuotesPath(businessSlug),
    },
    {
      id: "job",
      title: "Create first job",
      complete: progress.hasJob,
      href: getBusinessJobsPath(businessSlug),
    },
    {
      id: "invoice",
      title: "Send first invoice",
      complete: progress.hasInvoice,
      href: getBusinessInvoicesPath(businessSlug),
    },
  ];

  return (
    <SidebarChecklist items={items} />
  );
}

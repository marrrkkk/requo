import {
  getBusinessNewQuotePath,
  getBusinessServicesPath,
} from "@/features/businesses/routes";

export type ActivationChecklistItem = {
  id: string;
  title: string;
  detail: string;
  complete: boolean;
  href: string;
  actionLabel: string;
  external?: boolean;
  disabled?: boolean;
};

type ActivationChecklistInput = {
  businessSlug: string;
  publicInquiryEnabled: boolean;
  totalInquiries: number;
  totalQuotes: number;
};

/**
 * Single source of truth for the "Getting started" activation checklist.
 * Shared by the home-page launchpad and the sidebar popover so both
 * surfaces always show the same steps in the same order.
 */
export function getActivationChecklist({
  businessSlug,
  publicInquiryEnabled,
  totalInquiries,
  totalQuotes,
}: ActivationChecklistInput): ActivationChecklistItem[] {
  const hasInquiry = totalInquiries > 0;
  const hasQuote = totalQuotes > 0;

  return [
    {
      id: "review-service",
      title: "Review your service",
      detail: "Check the default fields and customize if needed.",
      complete: true, // Service always exists after onboarding
      href: getBusinessServicesPath(businessSlug),
      actionLabel: "Review service",
    },
    {
      id: "publish-link",
      title: publicInquiryEnabled
        ? "Copy your public link"
        : "Publish your service",
      detail: publicInquiryEnabled
        ? "Share it on your website or send directly to customers."
        : "Make your service live so customers can submit inquiries.",
      complete: publicInquiryEnabled,
      href: getBusinessServicesPath(businessSlug),
      actionLabel: publicInquiryEnabled ? "Copy link" : "Publish service",
    },
    {
      id: "test-inquiry",
      title: hasInquiry ? "First inquiry received" : "Send a test inquiry",
      detail: hasInquiry
        ? `${totalInquiries} ${totalInquiries === 1 ? "inquiry" : "inquiries"} in your inbox.`
        : "Submit a test inquiry through your public service.",
      complete: hasInquiry,
      href: publicInquiryEnabled
        ? `/inquire/${businessSlug}`
        : getBusinessServicesPath(businessSlug),
      actionLabel: "Send test inquiry",
      external: publicInquiryEnabled && !hasInquiry,
    },
    {
      id: "first-quote",
      title: hasQuote ? "First quote created" : "Turn it into a quote",
      detail: hasQuote
        ? `${totalQuotes} ${totalQuotes === 1 ? "quote" : "quotes"} sent or in progress.`
        : hasInquiry
          ? "Create your first quote from an inquiry."
          : "You'll create a quote after receiving an inquiry.",
      complete: hasQuote,
      href: getBusinessNewQuotePath(businessSlug),
      actionLabel: "Create quote",
      disabled: !hasInquiry,
    },
  ];
}

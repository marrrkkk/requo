import {
  getBusinessInquiriesPath,
  getBusinessInquiryFormsPath,
  getBusinessJobsPath,
  getBusinessInvoicesPath,
  getBusinessNewQuotePath,
  getBusinessQuotesPath,
} from "@/features/businesses/routes";
import { getBusinessDashboardSummaryData } from "@/features/businesses/queries";
import { getChecklistProgressForBusiness } from "@/features/onboarding/queries";
import { getPersonalizationHints } from "@/features/onboarding/personalization";
import {
  NextStepBanner,
  type NextStepSuggestion,
} from "@/features/onboarding/components/next-step-banner";

type NextStepSectionProps = {
  businessId: string;
  businessSlug: string;
  businessType: string;
  publicInquiryEnabled: boolean;
};

export async function NextStepSection({
  businessId,
  businessSlug,
  businessType,
  publicInquiryEnabled,
}: NextStepSectionProps) {
  const [summary, progress] = await Promise.all([
    getBusinessDashboardSummaryData(businessId),
    getChecklistProgressForBusiness(businessId),
  ]);

  const hints = getPersonalizationHints(businessType);

  const suggestion = resolveNextStep({
    publicInquiryEnabled,
    totalInquiries: summary.totalInquiries,
    totalQuotes: summary.totalQuotes,
    wonCount: summary.wonCount,
    hasQualifiedInquiry: progress.hasQualifiedInquiry,
    hasJob: progress.hasJob,
    hasInvoice: progress.hasInvoice,
    businessSlug,
    inquirySourceTip: hints.inquirySourceTip,
  });

  return <NextStepBanner suggestion={suggestion} />;
}

function resolveNextStep({
  publicInquiryEnabled,
  totalInquiries,
  totalQuotes,
  wonCount,
  hasQualifiedInquiry,
  hasJob,
  hasInvoice,
  businessSlug,
  inquirySourceTip,
}: {
  publicInquiryEnabled: boolean;
  totalInquiries: number;
  totalQuotes: number;
  wonCount: number;
  hasQualifiedInquiry: boolean;
  hasJob: boolean;
  hasInvoice: boolean;
  businessSlug: string;
  inquirySourceTip: string;
}): NextStepSuggestion | null {
  if (!publicInquiryEnabled) {
    return {
      id: "publish-form",
      title: "Your inquiry form is ready to go live",
      description:
        "Publish it so potential customers can reach you directly from your website.",
      href: getBusinessInquiryFormsPath(businessSlug),
      ctaLabel: "Publish form",
    };
  }

  if (totalInquiries === 0) {
    return {
      id: "first-inquiry",
      title: "Share your inquiry link",
      description: inquirySourceTip,
      href: getBusinessInquiryFormsPath(businessSlug),
      ctaLabel: "Get your link",
    };
  }

  if (!hasQualifiedInquiry) {
    return {
      id: "qualify-inquiry",
      title: "Qualify your first inquiry",
      description:
        "Review incoming inquiries and mark the best leads as qualified to move them forward.",
      href: getBusinessInquiriesPath(businessSlug),
      ctaLabel: "Review inquiries",
    };
  }

  if (totalQuotes === 0) {
    return {
      id: "first-quote",
      title: "Send your first quote",
      description:
        "Turn a qualified inquiry into a professional quote your customer can accept online.",
      href: getBusinessNewQuotePath(businessSlug),
      ctaLabel: "Create quote",
    };
  }

  if (wonCount === 0) {
    return {
      id: "win-quote",
      title: "Follow up on sent quotes",
      description:
        "Check which quotes have been viewed and follow up to close the deal.",
      href: getBusinessQuotesPath(businessSlug),
      ctaLabel: "View quotes",
    };
  }

  if (!hasJob) {
    return {
      id: "first-job",
      title: "Create a job from your accepted quote",
      description:
        "Track delivery from start to finish by turning accepted quotes into jobs.",
      href: getBusinessJobsPath(businessSlug),
      ctaLabel: "Create job",
    };
  }

  if (!hasInvoice) {
    return {
      id: "first-invoice",
      title: "Invoice your completed work",
      description:
        "Generate and send an invoice to get paid for work you've delivered.",
      href: getBusinessInvoicesPath(businessSlug),
      ctaLabel: "Create invoice",
    };
  }

  // All steps complete — no banner needed
  return null;
}

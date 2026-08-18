import {
  getRecommendedStarterWorkflow,
  type StarterWorkflowKey,
} from "@/features/businesses/starter-workflows";
import {
  resolveCurrencyForCountry,
} from "@/features/businesses/locale";
import type { BusinessType } from "@/features/inquiries/business-types";
import { createInquiryFormPreset } from "@/features/inquiries/inquiry-forms";
import { createPublicInquiryPreviewBusiness } from "@/features/inquiries/preview-business";
import type { PublicInquiryBusiness } from "@/features/inquiries/types";

export const onboardingSessionStorageKey = "requo-onboarding-draft-v7";

/**
 * Clears the onboarding draft from sessionStorage.
 * Should be called when a user logs out to prevent data leaking to the next user.
 */
export function clearOnboardingDraft() {
  try {
    window.sessionStorage.removeItem(onboardingSessionStorageKey);
  } catch (error) {
    console.error("Failed to clear onboarding draft.", error);
  }
}

export type OnboardingDraft = {
  firstName: string;
  lastName: string;
  jobTitle: string;
  businessName: string;
  businessSlug: string;
  businessType: BusinessType | "";
  starterWorkflow: StarterWorkflowKey | "";
  countryCode: string;
  defaultCurrency: string;
  /** Matches `customerContactChannelValues` in onboarding/schemas when set. */
  customerContactChannel: string;
  companySize: string;
  referralSource: string;
};

export function createEmptyOnboardingDraft(): OnboardingDraft {
  return {
    firstName: "",
    lastName: "",
    jobTitle: "",
    businessName: "",
    businessSlug: "",
    businessType: "",
    starterWorkflow: "",
    countryCode: "",
    defaultCurrency: "",
    customerContactChannel: "",
    companySize: "",
    referralSource: "",
  };
}

export function getRecommendedStarterWorkflowForBusinessType(
  businessType: BusinessType | "",
): StarterWorkflowKey {
  return businessType
    ? getRecommendedStarterWorkflow(businessType)
    : "project_quote";
}

export function resolveOnboardingCurrencyChange({
  currentCurrency,
  previousCountryCode,
  nextCountryCode,
}: {
  currentCurrency: string;
  previousCountryCode: string;
  nextCountryCode: string;
}) {
  const previousCurrency = previousCountryCode
    ? resolveCurrencyForCountry(previousCountryCode)
    : null;
  const nextCurrency = nextCountryCode
    ? resolveCurrencyForCountry(nextCountryCode)
    : null;

  if (!nextCurrency) {
    return currentCurrency;
  }

  if (!currentCurrency || currentCurrency === previousCurrency) {
    return nextCurrency;
  }

  return currentCurrency;
}

export function createOnboardingPreviewBusiness(
  draft: OnboardingDraft,
): PublicInquiryBusiness {
  const selectedWorkflow =
    draft.starterWorkflow ||
    getRecommendedStarterWorkflowForBusinessType(draft.businessType);
  const businessName = draft.businessName.trim() || "Your business";
  const businessType = draft.businessType || "general_project_services";
  
  const preset = createInquiryFormPreset({
    businessType,
    businessName,
  });

  return createPublicInquiryPreviewBusiness({
    id: "preview-business",
    name: businessName,
    slug: "preview-business",
    plan: "free",
    businessType,
    form: {
      id: "preview-form",
      name: preset.name,
      slug: preset.slug,
      businessType,
    },
    inquiryFormConfig: preset.inquiryFormConfig,
    inquiryPageConfig: preset.inquiryPageConfig,
  });
}

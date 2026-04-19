import {
  getStarterTemplateBusinessType,
  type StarterTemplateBusinessType,
} from "@/features/businesses/starter-templates";
import {
  resolveCurrencyForCountry,
} from "@/features/businesses/locale";
import type { BusinessType } from "@/features/inquiries/business-types";
import { createInquiryFormPreset } from "@/features/inquiries/inquiry-forms";
import { createPublicInquiryPreviewBusiness } from "@/features/inquiries/preview-business";
import type { PublicInquiryBusiness } from "@/features/inquiries/types";

export const onboardingSessionStorageKey = "requo-onboarding-draft-v2";

export type OnboardingDraft = {
  workspaceName: string;
  businessName: string;
  businessType: BusinessType | "";
  starterTemplateBusinessType: StarterTemplateBusinessType | "";
  countryCode: string;
  defaultCurrency: string;
};

export function createEmptyOnboardingDraft(): OnboardingDraft {
  return {
    workspaceName: "",
    businessName: "",
    businessType: "",
    starterTemplateBusinessType: "",
    countryCode: "",
    defaultCurrency: "",
  };
}

export function getRecommendedStarterTemplateForBusinessType(
  businessType: BusinessType | "",
): StarterTemplateBusinessType {
  return businessType
    ? getStarterTemplateBusinessType(businessType)
    : "general_project_services";
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
  const selectedTemplate =
    draft.starterTemplateBusinessType ||
    getRecommendedStarterTemplateForBusinessType(draft.businessType);
  const businessName = draft.businessName.trim() || "Your business";
  const preset = createInquiryFormPreset({
    businessType: selectedTemplate,
    businessName,
  });

  return createPublicInquiryPreviewBusiness({
    id: "preview-business",
    name: businessName,
    slug: "preview-business",
    plan: "free",
    businessType: draft.businessType || selectedTemplate,
    form: {
      id: "preview-form",
      name: preset.name,
      slug: preset.slug,
      businessType: selectedTemplate,
    },
    inquiryFormConfig: preset.inquiryFormConfig,
    inquiryPageConfig: preset.inquiryPageConfig,
  });
}

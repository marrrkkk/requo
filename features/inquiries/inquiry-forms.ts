import { getStarterTemplateBusinessType } from "@/features/businesses/starter-templates";
import type { BusinessType } from "@/features/inquiries/business-types";
import { createInquiryFormConfigDefaults } from "@/features/inquiries/form-config";
import { createInquiryPageConfigDefaults } from "@/features/inquiries/page-config";
import type { BusinessPlan as plan } from "@/lib/plans/plans";
import { slugifyPublicName } from "@/lib/slugs";

function slugify(value: string) {
  return slugifyPublicName(value, {
    fallback: "inquiry",
  });
}

export function normalizeInquiryFormSlug(value: string) {
  return slugify(value);
}

export function getDefaultInquiryFormName(
  businessType: BusinessType,
) {
  switch (getStarterTemplateBusinessType(businessType)) {
    case "consulting_professional_services":
      return "Discovery inquiry";
    case "contractor_home_improvement":
    case "creative_marketing_services":
    case "general_project_services":
    default:
      return "Project inquiry";
  }
}

type CreateInquiryFormPresetInput = {
  businessType: BusinessType;
  businessName: string;
  businessShortDescription?: string | null;
  legacyInquiryHeadline?: string | null;
  templateName?: string;
  plan?: plan;
};

export function createInquiryFormPreset({
  businessType,
  businessName,
  businessShortDescription,
  legacyInquiryHeadline,
  plan,
}: CreateInquiryFormPresetInput) {
  const name = getDefaultInquiryFormName(businessType);

  return {
    name,
    slug: normalizeInquiryFormSlug(name),
    businessType,
    publicInquiryEnabled: true,
    inquiryFormConfig: createInquiryFormConfigDefaults({
      businessType,
    }),
    inquiryPageConfig: createInquiryPageConfigDefaults({
      businessName,
      businessShortDescription,
      legacyInquiryHeadline,
      businessType,
      plan,
    }),
  };
}

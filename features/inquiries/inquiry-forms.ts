import type { BusinessType } from "@/features/inquiries/business-types";
import { createInquiryFormConfigDefaults } from "@/features/inquiries/form-config";
import { createInquiryPageConfigDefaults } from "@/features/inquiries/page-config";
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
  switch (businessType) {
    case "print_signage":
      return "Project request";
    case "contractor_home_improvement":
      return "Project request";
    case "fabrication_custom_build":
      return "Quote request";
    case "repair_services":
      return "Repair request";
    case "cleaning_services":
      return "Cleaning request";
    case "event_services_rentals":
      return "Event request";
    case "landscaping_outdoor_services":
      return "Outdoor request";
    case "creative_marketing_services":
      return "Project brief";
    case "web_it_services":
      return "Project request";
    case "photo_video_production":
      return "Production request";
    case "consulting_professional_services":
      return "Discovery request";
    case "general_project_services":
    default:
      return "Project request";
  }
}

type CreateInquiryFormPresetInput = {
  businessType: BusinessType;
  businessName: string;
  businessShortDescription?: string | null;
  legacyInquiryHeadline?: string | null;
  templateName?: string;
};

export function createInquiryFormPreset({
  businessType,
  businessName,
  businessShortDescription,
  legacyInquiryHeadline,
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
    }),
  };
}

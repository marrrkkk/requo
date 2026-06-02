import type { BusinessType } from "@/features/inquiries/business-types";

/**
 * Personalized onboarding hints based on business type.
 * Used to customize tour descriptions and next-step suggestions.
 */

type PersonalizationHints = {
  /** Personalized greeting suffix for the tour. */
  tourGreeting: string;
  /** Which checklist item to emphasize first. */
  primaryAction: "publish-form" | "manual-inquiry" | "create-quote";
  /** Contextual tip for the inquiry source. */
  inquirySourceTip: string;
};

const defaultHints: PersonalizationHints = {
  tourGreeting: "Let's get your workflow running.",
  primaryAction: "publish-form",
  inquirySourceTip:
    "Share your inquiry form link on your website, social profiles, or email signature.",
};

const hintsByBusinessType: Partial<Record<BusinessType, PersonalizationHints>> = {
  contractor_home_improvement: {
    tourGreeting: "Let's help you win more renovation projects.",
    primaryAction: "publish-form",
    inquirySourceTip:
      "Add your inquiry link to your Google Business profile and local listings.",
  },
  landscaping_outdoor_services: {
    tourGreeting: "Let's help you book more landscaping jobs.",
    primaryAction: "publish-form",
    inquirySourceTip:
      "Share your form link on your website and in local community groups.",
  },
  cleaning_services: {
    tourGreeting: "Let's help you fill your cleaning schedule.",
    primaryAction: "publish-form",
    inquirySourceTip:
      "Add your inquiry link to your Google Business profile and Nextdoor.",
  },
  consulting_professional_services: {
    tourGreeting: "Let's streamline your consulting pipeline.",
    primaryAction: "publish-form",
    inquirySourceTip:
      "Add your inquiry form to your LinkedIn profile and website.",
  },
  creative_marketing_services: {
    tourGreeting: "Let's help you land more creative projects.",
    primaryAction: "publish-form",
    inquirySourceTip:
      "Share your form on your portfolio site and social channels.",
  },
  photo_video_production: {
    tourGreeting: "Let's help you book more shoots.",
    primaryAction: "publish-form",
    inquirySourceTip:
      "Add your inquiry link to your portfolio, Instagram bio, and wedding directories.",
  },
  event_services_rentals: {
    tourGreeting: "Let's help you book more events.",
    primaryAction: "publish-form",
    inquirySourceTip:
      "Share your form on wedding directories, social media, and your website.",
  },
  web_it_services: {
    tourGreeting: "Let's help you close more dev projects.",
    primaryAction: "publish-form",
    inquirySourceTip:
      "Add your inquiry form to your portfolio site and freelance profiles.",
  },
  general_project_services: {
    tourGreeting: "Let's get your workflow running.",
    primaryAction: "publish-form",
    inquirySourceTip:
      "Share your inquiry form link on your website and in client communications.",
  },
  print_signage: {
    tourGreeting: "Let's help you land more print and signage orders.",
    primaryAction: "publish-form",
    inquirySourceTip:
      "Add your inquiry link to your website and Google Business profile.",
  },
  fabrication_custom_build: {
    tourGreeting: "Let's help you win more custom build projects.",
    primaryAction: "publish-form",
    inquirySourceTip:
      "Share your form on your website and in maker/trade communities.",
  },
  repair_services: {
    tourGreeting: "Let's help you fill your repair schedule.",
    primaryAction: "publish-form",
    inquirySourceTip:
      "Add your inquiry link to your Google Business profile and local directories.",
  },
  moving_relocation: {
    tourGreeting: "Let's help you book more moves.",
    primaryAction: "publish-form",
    inquirySourceTip:
      "Add your inquiry link to your Google Business profile and moving directories.",
  },
  auto_services: {
    tourGreeting: "Let's help you fill your service bays.",
    primaryAction: "publish-form",
    inquirySourceTip:
      "Add your inquiry link to your Google Business profile and auto directories.",
  },
  pet_services: {
    tourGreeting: "Let's help you book more pet clients.",
    primaryAction: "publish-form",
    inquirySourceTip:
      "Add your inquiry link to your website, Google Business profile, and pet community groups.",
  },
};

export function getPersonalizationHints(
  businessType: BusinessType | string,
): PersonalizationHints {
  return (
    hintsByBusinessType[businessType as BusinessType] ?? defaultHints
  );
}

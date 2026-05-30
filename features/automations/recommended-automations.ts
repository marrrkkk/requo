import type { BusinessType } from "@/features/inquiries/business-types";
import type { AutomationTemplate } from "./automation-templates";
import { automationTemplates } from "./automation-templates";

// ---------------------------------------------------------------------------
// Recommended automations per business type
//
// Returns 2-3 high-value automations that most owners in a given business type
// would benefit from enabling immediately. These are surfaced in the empty state
// and as a "Recommended for you" section in the template gallery.
// ---------------------------------------------------------------------------

/**
 * Template IDs that are universally recommended regardless of business type.
 * These cover the core inquiry → quote → follow-up workflow.
 */
const universalRecommendations = [
  "notify-new-inquiry",
  "follow-up-quote-sent",
  "notify-quote-accepted",
] as const;

/**
 * Business-type-specific recommendations that replace or supplement the
 * universal set when a more relevant automation exists.
 */
const businessTypeRecommendations: Partial<Record<BusinessType, string[]>> = {
  contractor_home_improvement: [
    "notify-new-inquiry",
    "follow-up-quote-sent",
    "job-on-acceptance",
  ],
  print_signage: [
    "notify-new-inquiry",
    "follow-up-quote-sent",
    "notify-quote-accepted",
  ],
  fabrication_custom_build: [
    "notify-new-inquiry",
    "follow-up-quote-sent",
    "job-on-acceptance",
  ],
  creative_marketing_services: [
    "notify-new-inquiry",
    "follow-up-quote-viewed",
    "notify-quote-accepted",
  ],
  web_it_services: [
    "notify-new-inquiry",
    "draft-quote-when-qualified",
    "follow-up-quote-sent",
  ],
  photo_video_production: [
    "notify-new-inquiry",
    "follow-up-quote-sent",
    "notify-quote-accepted",
  ],
  event_services_rentals: [
    "notify-new-inquiry",
    "follow-up-quote-sent",
    "expire-quotes-30d",
  ],
  landscaping_outdoor_services: [
    "notify-new-inquiry",
    "follow-up-quote-sent",
    "job-on-acceptance",
  ],
  repair_services: [
    "notify-new-inquiry",
    "follow-up-quote-sent",
    "notify-quote-accepted",
  ],
  consulting_professional_services: [
    "notify-new-inquiry",
    "draft-quote-when-qualified",
    "follow-up-quote-viewed",
  ],
  cleaning_services: [
    "notify-new-inquiry",
    "follow-up-quote-sent",
    "notify-quote-accepted",
  ],
  general_project_services: [
    "notify-new-inquiry",
    "follow-up-quote-sent",
    "notify-quote-accepted",
  ],
};

/**
 * Returns 2-3 recommended automation templates for a business type.
 * Used in the empty state and template gallery to guide owners toward
 * high-value automations they should enable first.
 */
export function getRecommendedAutomations(
  businessType?: string | null,
): AutomationTemplate[] {
  const recommendedIds =
    (businessType &&
      businessTypeRecommendations[businessType as BusinessType]) ||
    [...universalRecommendations];

  const templateMap = new Map(
    automationTemplates.map((t) => [t.id, t]),
  );

  return recommendedIds
    .map((id) => templateMap.get(id))
    .filter((t): t is AutomationTemplate => t != null);
}

/**
 * Returns a short value-prop sentence for why automations matter,
 * tailored to the business type.
 */
export function getAutomationValueProp(businessType?: string | null): string {
  switch (businessType) {
    case "contractor_home_improvement":
    case "fabrication_custom_build":
    case "landscaping_outdoor_services":
      return "Never miss a lead — get notified on new inquiries, follow up on sent quotes, and auto-create jobs when quotes are accepted.";
    case "consulting_professional_services":
      return "Stay responsive — get notified on new inquiries, draft quotes faster with AI, and follow up when prospects view your quote.";
    case "creative_marketing_services":
    case "web_it_services":
      return "Close more deals — get notified on new inquiries, follow up when quotes are viewed, and never lose track of accepted work.";
    default:
      return "Save time on repeat tasks — get notified on new inquiries, follow up on sent quotes, and know the moment a quote is accepted.";
  }
}

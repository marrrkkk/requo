import type { BusinessType } from "@/features/inquiries/business-types";

export const starterTemplateBusinessTypes = [
  "creative_marketing_services",
  "consulting_professional_services",
  "contractor_home_improvement",
  "general_project_services",
] as const satisfies readonly BusinessType[];

export type StarterTemplateBusinessType =
  (typeof starterTemplateBusinessTypes)[number];

export const starterTemplateSelectionDescription =
  "Start with one guided starter template. Everything stays editable later.";
export const starterTemplateDefaultsSummary =
  "This sets the starting inquiry, quote, and follow-up defaults.";
const starterTemplateStatusSummary =
  "Uses the built-in lead stages: New, Waiting, Quoted, Won, and Lost.";
const defaultStarterQuoteValidityDays = 14;

type StarterTemplateDefinition = {
  businessType: StarterTemplateBusinessType;
  label: string;
  description: string;
  helperText?: string;
  recommendedFields: readonly string[];
  statusSummary: string;
  defaultQuoteNotes: string;
  defaultQuoteValidityDays: number;
  matchesBusinessTypes: readonly BusinessType[];
};

export const starterTemplateDefinitions: Record<
  StarterTemplateBusinessType,
  StarterTemplateDefinition
> = {
  creative_marketing_services: {
    businessType: "creative_marketing_services",
    label: "Agency / Studio",
    description:
      "Best for agencies, studios, and creative service teams handling scoped projects and custom quotes.",
    helperText:
      "Starts with project brief fields and quote notes for scoped creative work.",
    recommendedFields: [
      "Project or service needed",
      "Deliverables",
      "Target date",
      "Brief or reference files",
    ],
    statusSummary: starterTemplateStatusSummary,
    defaultQuoteNotes: "",
    defaultQuoteValidityDays: defaultStarterQuoteValidityDays,
    matchesBusinessTypes: [
      "creative_marketing_services",
      "web_it_services",
      "photo_video_production",
    ],
  },
  consulting_professional_services: {
    businessType: "consulting_professional_services",
    label: "Consultant / Professional Services",
    description:
      "Best for consultants, advisors, and professional service businesses that need to qualify before pricing.",
    helperText:
      "Starts with discovery-focused fields and quote notes for advisory engagements.",
    recommendedFields: [
      "Service needed",
      "Goal",
      "Preferred format",
      "Desired start date",
    ],
    statusSummary: starterTemplateStatusSummary,
    defaultQuoteNotes: "",
    defaultQuoteValidityDays: defaultStarterQuoteValidityDays,
    matchesBusinessTypes: ["consulting_professional_services"],
  },
  contractor_home_improvement: {
    businessType: "contractor_home_improvement",
    label: "Contractor / Home Service",
    description:
      "Best for contractors and service businesses that need site details, timing, and photos before pricing.",
    helperText:
      "Starts with project and site fields and quote notes for on-site work.",
    recommendedFields: [
      "Project or service needed",
      "Service location",
      "Preferred visit or start date",
      "Photos or plans",
    ],
    statusSummary: starterTemplateStatusSummary,
    defaultQuoteNotes: "",
    defaultQuoteValidityDays: defaultStarterQuoteValidityDays,
    matchesBusinessTypes: [
      "contractor_home_improvement",
      "fabrication_custom_build",
      "repair_services",
      "cleaning_services",
      "landscaping_outdoor_services",
    ],
  },
  general_project_services: {
    businessType: "general_project_services",
    label: "General Service Business",
    description:
      "Best for owner-led service businesses with mixed inquiry types that still need a clear lead-to-quote workflow.",
    recommendedFields: [
      "Service needed",
      "Service location",
      "Preferred timing",
      "Reference files",
    ],
    statusSummary: starterTemplateStatusSummary,
    defaultQuoteNotes: "",
    defaultQuoteValidityDays: defaultStarterQuoteValidityDays,
    matchesBusinessTypes: [
      "general_project_services",
      "print_signage",
      "event_services_rentals",
    ],
  },
};

const starterTemplateOptionSource = starterTemplateBusinessTypes.map(
  (businessType) => starterTemplateDefinitions[businessType],
);

export const starterTemplateLabels = starterTemplateOptionSource.map(
  (template) => template.label,
);

export const starterTemplateOptions = starterTemplateOptionSource.map(
  (template) => ({
    value: template.businessType,
    label: template.label,
    description: template.description,
    searchText: [
      template.label,
      template.description,
      template.helperText,
      ...template.recommendedFields,
    ].join(" "),
  }),
);

export function getStarterTemplateDefinition(
  businessType: BusinessType,
): StarterTemplateDefinition {
  return starterTemplateDefinitions[getStarterTemplateBusinessType(businessType)];
}

export function getStarterTemplateBusinessType(
  businessType: BusinessType,
): StarterTemplateBusinessType {
  return (
    starterTemplateBusinessTypes.find((templateBusinessType) =>
      starterTemplateDefinitions[templateBusinessType].matchesBusinessTypes.includes(
        businessType,
      ),
    ) ?? "general_project_services"
  );
}

import type { BusinessType } from "@/features/inquiries/business-types";

export const starterTemplateBusinessTypes = [
  "creative_marketing_services",
  "consulting_professional_services",
  "contractor_home_improvement",
  "event_services_rentals",
  "cleaning_services",
  "general_project_services",
] as const satisfies readonly BusinessType[];

export type StarterTemplateBusinessType =
  (typeof starterTemplateBusinessTypes)[number];

export const starterTemplateSelectionDescription =
  "Start with one guided business type. Everything stays editable later.";
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
      "Captures project briefs and deliverables so you can scope and price creative work faster.",
    helperText:
      "Starts with project brief fields and quote notes for scoped creative work.",
    recommendedFields: [
      "Project or service needed",
      "Deliverables",
      "Target date",
      "Where this will be used",
      "Budget",
      "Project brief",
      "Brief or reference files",
    ],
    statusSummary: starterTemplateStatusSummary,
    defaultQuoteNotes: "",
    defaultQuoteValidityDays: defaultStarterQuoteValidityDays,
    matchesBusinessTypes: [
      "creative_marketing_services",
      "web_it_services",
    ],
  },
  consulting_professional_services: {
    businessType: "consulting_professional_services",
    label: "Consultant / Professional Services",
    description:
      "Qualifies leads with discovery questions so you can scope the right engagement before pricing.",
    helperText:
      "Starts with discovery-focused fields and quote notes for advisory engagements.",
    recommendedFields: [
      "Service needed",
      "Goal",
      "Preferred format",
      "Participant count",
      "Desired start date",
      "Budget",
      "Background",
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
      "Collects site details, photos, and timing so you can estimate on-site work accurately.",
    helperText:
      "Starts with project and site fields and quote notes for on-site work.",
    recommendedFields: [
      "Project or service needed",
      "Service location",
      "Location type",
      "Preferred visit or start date",
      "Access notes",
      "Target completion",
      "Project details",
      "Photos or plans",
    ],
    statusSummary: starterTemplateStatusSummary,
    defaultQuoteNotes: "",
    defaultQuoteValidityDays: defaultStarterQuoteValidityDays,
    matchesBusinessTypes: [
      "contractor_home_improvement",
      "fabrication_custom_build",
      "repair_services",
      "moving_relocation",
      "auto_services",
    ],
  },
  event_services_rentals: {
    businessType: "event_services_rentals",
    label: "Event / Production",
    description:
      "Captures event dates, venues, and requirements so you can quote coverage or services quickly.",
    helperText:
      "Starts with event-focused fields for shoots, productions, and event services.",
    recommendedFields: [
      "Service needed",
      "Event or shoot date",
      "Venue or location",
      "Duration",
      "Guest or attendee count",
      "Event details",
      "Reference files",
    ],
    statusSummary: starterTemplateStatusSummary,
    defaultQuoteNotes: "",
    defaultQuoteValidityDays: defaultStarterQuoteValidityDays,
    matchesBusinessTypes: [
      "event_services_rentals",
      "photo_video_production",
    ],
  },
  cleaning_services: {
    businessType: "cleaning_services",
    label: "Recurring Service",
    description:
      "Captures property details and frequency so you can price recurring or scheduled work.",
    helperText:
      "Starts with schedule and property fields for cleaning, maintenance, and recurring services.",
    recommendedFields: [
      "Service needed",
      "Service location",
      "Property size",
      "Frequency",
      "Preferred start date",
      "Access notes",
      "Additional details",
    ],
    statusSummary: starterTemplateStatusSummary,
    defaultQuoteNotes: "",
    defaultQuoteValidityDays: defaultStarterQuoteValidityDays,
    matchesBusinessTypes: [
      "cleaning_services",
      "landscaping_outdoor_services",
      "pet_services",
    ],
  },
  general_project_services: {
    businessType: "general_project_services",
    label: "General Service Business",
    description:
      "Flexible starting point for mixed inquiry types with a clear lead-to-quote workflow.",
    recommendedFields: [
      "Service needed",
      "Service location",
      "Preferred timing",
      "Budget range",
      "Inquiry details",
      "Reference files",
    ],
    statusSummary: starterTemplateStatusSummary,
    defaultQuoteNotes: "",
    defaultQuoteValidityDays: defaultStarterQuoteValidityDays,
    matchesBusinessTypes: [
      "general_project_services",
      "print_signage",
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

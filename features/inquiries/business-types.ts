export const businessTypes = [
  "contractor_home_improvement",
  "print_signage",
  "fabrication_custom_build",
  "creative_marketing_services",
  "web_it_services",
  "photo_video_production",
  "event_services_rentals",
  "landscaping_outdoor_services",
  "repair_services",
  "consulting_professional_services",
  "cleaning_services",
  "moving_relocation",
  "auto_services",
  "pet_services",
  "general_project_services",
] as const;

export type BusinessType = (typeof businessTypes)[number];

export const legacyBusinessTypes = [
  "general_services",
  "home_services",
  "landscaping_outdoor",
  "creative_studio_agency",
  "it_web_services",
  "photo_video_events",
  "coaching_consulting",
] as const;

export type LegacyBusinessType = (typeof legacyBusinessTypes)[number];

export const legacyBusinessTypeMap: Record<LegacyBusinessType, BusinessType> = {
  general_services: "general_project_services",
  home_services: "contractor_home_improvement",
  landscaping_outdoor: "landscaping_outdoor_services",
  creative_studio_agency: "creative_marketing_services",
  it_web_services: "web_it_services",
  photo_video_events: "photo_video_production",
  coaching_consulting: "consulting_professional_services",
};

const businessTypeSet = new Set<string>(businessTypes);
const legacyBusinessTypeSet = new Set<string>(legacyBusinessTypes);

export function isBusinessType(value: unknown): value is BusinessType {
  return typeof value === "string" && businessTypeSet.has(value);
}

export function isLegacyBusinessType(value: unknown): value is LegacyBusinessType {
  return typeof value === "string" && legacyBusinessTypeSet.has(value);
}

export function normalizeBusinessType(
  value: unknown,
  fallback: BusinessType = "general_project_services",
): BusinessType {
  if (isBusinessType(value)) {
    return value;
  }

  if (isLegacyBusinessType(value)) {
    return legacyBusinessTypeMap[value];
  }

  return fallback;
}

export const businessTypeMeta: Record<
  BusinessType,
  {
    label: string;
    description: string;
  }
> = {
  contractor_home_improvement: {
    label: "Contractor / home improvement",
    description: "Starting template for remodeling, installs, upgrades, and on-site project work.",
  },
  print_signage: {
    label: "Print / signage",
    description: "Starting template for printing, signage, installs, and branded production work.",
  },
  fabrication_custom_build: {
    label: "Fabrication / custom build",
    description: "Starting template for custom fabrication, millwork, metalwork, and made-to-order builds.",
  },
  creative_marketing_services: {
    label: "Creative / marketing services",
    description: "Starting template for brand, design, marketing, and content production projects.",
  },
  web_it_services: {
    label: "Web / IT services",
    description: "Starting template for web builds, technical support, systems setup, and automation work.",
  },
  photo_video_production: {
    label: "Photo / video production",
    description: "Starting template for photo shoots, video production, editing, and coverage work.",
  },
  event_services_rentals: {
    label: "Event services / rentals",
    description: "Starting template for event staffing, rentals, setup, and production coordination.",
  },
  landscaping_outdoor_services: {
    label: "Landscaping / outdoor services",
    description: "Starting template for outdoor upgrades, site work, and recurring grounds service.",
  },
  repair_services: {
    label: "Repair services",
    description: "Starting template for device, equipment, and technical repair inquiries.",
  },
  consulting_professional_services: {
    label: "Consulting / advisory services",
    description: "Starting template for consulting, advisory, audits, and professional service engagements.",
  },
  cleaning_services: {
    label: "Cleaning services",
    description: "Starting template for residential or commercial cleaning inquiries and schedules.",
  },
  moving_relocation: {
    label: "Moving / relocation",
    description: "Starting template for residential or commercial moves, packing, and logistics.",
  },
  auto_services: {
    label: "Auto services",
    description: "Starting template for detailing, repair, maintenance, and vehicle service inquiries.",
  },
  pet_services: {
    label: "Pet services",
    description: "Starting template for grooming, boarding, walking, and pet care inquiries.",
  },
  general_project_services: {
    label: "General project services",
    description: "Flexible starting template for owner-led service businesses with mixed inquiry types.",
  },
};

export const businessTypeOptions = businessTypes.map((value) => ({
  description: businessTypeMeta[value].description,
  label: businessTypeMeta[value].label,
  searchText: `${businessTypeMeta[value].label} ${businessTypeMeta[value].description}`,
  value,
}));

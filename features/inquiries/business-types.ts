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
    description: "Remodeling, installs, upgrades, and on-site project work.",
  },
  print_signage: {
    label: "Print / signage",
    description: "Printing, signage, installs, and branded production work.",
  },
  fabrication_custom_build: {
    label: "Fabrication / custom build",
    description: "Custom fabrication, millwork, metalwork, and made-to-order builds.",
  },
  creative_marketing_services: {
    label: "Creative / marketing services",
    description: "Brand, design, marketing, and content production projects.",
  },
  web_it_services: {
    label: "Web / IT services",
    description: "Web builds, technical support, systems setup, and automation work.",
  },
  photo_video_production: {
    label: "Photo / video production",
    description: "Photo shoots, video production, editing, and coverage work.",
  },
  event_services_rentals: {
    label: "Event services / rentals",
    description: "Event staffing, rentals, setup, and production coordination.",
  },
  landscaping_outdoor_services: {
    label: "Landscaping / outdoor services",
    description: "Outdoor upgrades, site work, and recurring grounds service.",
  },
  repair_services: {
    label: "Repair services",
    description: "Device, equipment, and technical repair requests.",
  },
  consulting_professional_services: {
    label: "Consulting / advisory services",
    description: "Consulting, advisory, audits, and professional service engagements.",
  },
  cleaning_services: {
    label: "Cleaning services",
    description: "Residential or commercial cleaning requests and schedules.",
  },
  general_project_services: {
    label: "General project services",
    description: "A flexible setup for custom service businesses with mixed requests.",
  },
};

export const businessTypeOptions = businessTypes.map((value) => ({
  description: businessTypeMeta[value].description,
  label: businessTypeMeta[value].label,
  searchText: `${businessTypeMeta[value].label} ${businessTypeMeta[value].description}`,
  value,
}));

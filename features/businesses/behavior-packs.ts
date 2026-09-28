import {
  type BusinessType,
  normalizeBusinessType,
} from "@/features/inquiries/business-types";

/**
 * Behavior packs (verticalization program, F-01 foundations).
 *
 * A behavior pack is product configuration that selects pack-aware behavior
 * for a business. It is deliberately separate from the two concepts it is
 * most often confused with:
 *
 * - `BusinessType` (`features/inquiries/business-types.ts`) is the stored
 *   taxonomy (15 values, valid indefinitely). Never renamed or remapped here.
 * - `StarterTemplateBusinessType` (`starter-templates.ts`) is a creation-time
 *   seed for fields and defaults. Pack membership intentionally differs from
 *   starter-template membership (strategy §B2c) — do not collapse them.
 * - `StarterWorkflowKey` (`starter-workflows.ts`) is an onboarding
 *   field-pattern seed. Also separate.
 *
 * Six packs govern behavior. Secondary types stay configuration-only
 * (intake presets, templates, follow-up recipes via the existing starter
 * system) and resolve to `null` — unpacked, legacy behavior preserved.
 * See strategy Part A §3 and Part B §§B7/B11.
 */

/** Code version of the pack definitions below. Stamped on assignment rows. */
export const BEHAVIOR_PACK_VERSION = 1;

export const behaviorPackKeys = [
  "contractors_home_services",
  "creative_marketing",
  "professional_it",
  "photo_video",
  "events_rentals",
  "fabrication_signage",
] as const;

export type BehaviorPackKey = (typeof behaviorPackKeys)[number];

export type BehaviorPackAssignmentSource =
  | "onboarding"
  | "seed"
  | "switch"
  | "reset";

export type BehaviorPackDefinition = {
  key: BehaviorPackKey;
  label: string;
  memberTypes: readonly BusinessType[];
  /**
   * Marketing solution page slug. Photo and events share the current
   * combined `photo-video-events` page until the post-ship marketing slice
   * (MKT-01) splits them into six pages aligned to the six packs — the old
   * combined URL must redirect, never 404 (strategy §0.5).
   */
  solutionSlug: string;
};

export const behaviorPackDefinitions: Record<
  BehaviorPackKey,
  BehaviorPackDefinition
> = {
  contractors_home_services: {
    key: "contractors_home_services",
    label: "Contractors & Home Services",
    memberTypes: ["contractor_home_improvement", "repair_services"],
    solutionSlug: "contractors-home-services",
  },
  creative_marketing: {
    key: "creative_marketing",
    label: "Creative & Marketing",
    memberTypes: ["creative_marketing_services"],
    solutionSlug: "creative-marketing",
  },
  professional_it: {
    key: "professional_it",
    label: "Professional & IT Services",
    memberTypes: [
      "web_it_services",
      "consulting_professional_services",
    ],
    solutionSlug: "professional-it-services",
  },
  photo_video: {
    key: "photo_video",
    label: "Photo & Video",
    memberTypes: ["photo_video_production"],
    solutionSlug: "photo-video-events",
  },
  events_rentals: {
    key: "events_rentals",
    label: "Events & Rentals",
    memberTypes: ["event_services_rentals"],
    solutionSlug: "photo-video-events",
  },
  fabrication_signage: {
    key: "fabrication_signage",
    label: "Print, Signage & Fabrication",
    memberTypes: ["print_signage", "fabrication_custom_build"],
    solutionSlug: "custom-fabrication-signage",
  },
};

export const behaviorPacks: readonly BehaviorPackDefinition[] =
  behaviorPackKeys.map((key) => behaviorPackDefinitions[key]);

/**
 * Stored types that are configuration-only: no behavior-pack governance, no
 * new domain objects. `general_project_services` doubles as the fallback for
 * unknown/legacy values (via `normalizeBusinessType`).
 */
export const secondaryBusinessTypes: readonly BusinessType[] = [
  "cleaning_services",
  "landscaping_outdoor_services",
  "moving_relocation",
  "auto_services",
  "pet_services",
  "general_project_services",
];

const secondaryBusinessTypeSet = new Set<BusinessType>(secondaryBusinessTypes);

export function isBehaviorPackKey(value: unknown): value is BehaviorPackKey {
  return (
    typeof value === "string" &&
    (behaviorPackKeys as readonly string[]).includes(value)
  );
}

export function isSecondaryBusinessType(
  value: BusinessType,
): value is (typeof secondaryBusinessTypes)[number] {
  return secondaryBusinessTypeSet.has(value);
}

/**
 * Single choke point for stored-type → pack resolution (strategy §B18).
 * Legacy values normalize non-destructively; unknown values fall back to the
 * general type, which is secondary — so unknown input resolves to `null`
 * (fail closed to legacy behavior), never to an arbitrary pack.
 *
 * Returns `null` for secondary/unpacked types: those businesses keep legacy
 * behavior and receive intake presets and templates through the existing
 * starter system only.
 */
export function getBehaviorPack(value: unknown): BehaviorPackKey | null {
  const businessType: BusinessType = normalizeBusinessType(value);

  if (isSecondaryBusinessType(businessType)) {
    return null;
  }

  for (const key of behaviorPackKeys) {
    if (
      (behaviorPackDefinitions[key].memberTypes as readonly BusinessType[]).includes(
        businessType,
      )
    ) {
      return key;
    }
  }

  return null;
}

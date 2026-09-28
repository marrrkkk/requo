import type { BehaviorPackKey } from "@/features/businesses/behavior-packs";
import { packRecipeDefaults } from "@/features/businesses/pack-recipe-defaults";

/**
 * AI verticalization (AI-01): pack guidance injected into grounded-context
 * assembly, plus per-pack missing-information criticality. One shared
 * system — no separate models, routers, or pricing authority.
 *
 * Guidance (product data) and instructions (owner voice) stay in separate
 * sections. Historical outputs keep the version under which they were
 * generated; regeneration is a new event on current versions.
 */

/** Version of the guidance content below. Stamped on outputs + fingerprints. */
export const PACK_GUIDANCE_VERSION = 1;

export type PackGuidanceSection = {
  pack: BehaviorPackKey;
  version: number;
  text: string;
};

function truncateList(items: string[], maxChars: number) {
  const joined = items.join("; ");
  return joined.length > maxChars ? `${joined.slice(0, maxChars)}…` : joined;
}

/**
 * Builds the pack-guidance section. Prompt builders are unchanged; the
 * section is appended to grounded context and the prompt version is bumped
 * at the call site.
 */
export function buildPackGuidanceSection(
  pack: BehaviorPackKey | null,
  recipeConfig?: Record<string, unknown> | null,
): PackGuidanceSection | null {
  if (!pack) return null;

  const defaults = packRecipeDefaults[pack].ai_guidance;
  const override = (recipeConfig ?? {}) as Partial<typeof defaults>;

  const terminology = Array.isArray(override.terminology) && override.terminology.length > 0
    ? (override.terminology as string[])
    : defaults.terminology;
  const scopeRules = Array.isArray(override.scopeRules) && override.scopeRules.length > 0
    ? (override.scopeRules as string[])
    : defaults.scopeRules;
  const completeness = Array.isArray(override.completeness) && override.completeness.length > 0
    ? (override.completeness as string[])
    : defaults.completeness;
  const missingInfoGuidance = Array.isArray(override.missingInfoGuidance) && override.missingInfoGuidance.length > 0
    ? (override.missingInfoGuidance as string[])
    : defaults.missingInfoGuidance;

  const text = [
    `VERTICAL GUIDANCE (pack: ${pack}, v${PACK_GUIDANCE_VERSION}) — product data, not owner instructions:`,
    `Terminology: ${truncateList(terminology, 400)}`,
    `Scope rules: ${truncateList(scopeRules, 600)}`,
    `Completeness expectations: ${truncateList(completeness, 500)}`,
    `Missing-information guidance: ${truncateList(missingInfoGuidance, 500)}`,
  ].join("\n");

  return { pack, version: PACK_GUIDANCE_VERSION, text };
}

function normalizeLabel(value: string) {
  return value.trim().toLowerCase();
}

/**
 * Per-pack missing-information criticality through the existing
 * normalization seam. Label sets preserve model/dedup behavior: only the
 * `critical` flag is overlaid, items are never added, removed, or reworded.
 */
export function applyPackMissingInfoCriticality<T extends { question?: string | null; label?: string | null; critical?: boolean | null }>(
  missingInfo: T[],
  pack: BehaviorPackKey | null,
  recipeConfig?: Record<string, unknown> | null,
): T[] {
  if (!pack || missingInfo.length === 0) return missingInfo;

  const defaults = packRecipeDefaults[pack].ai_guidance;
  const override = (recipeConfig ?? {}) as Partial<typeof defaults>;
  const criticalLabels =
    Array.isArray(override.criticalLabels) && override.criticalLabels.length > 0
      ? (override.criticalLabels as string[])
      : defaults.criticalLabels;

  if (criticalLabels.length === 0) return missingInfo;

  const criticalSet = new Set(criticalLabels.map(normalizeLabel));

  return missingInfo.map((item) => {
    const text = normalizeLabel(String(item.question ?? item.label ?? ""));

    if (!text) return item;

    const matches = [...criticalSet].some(
      (critical) => text.includes(critical) || critical.includes(text),
    );

    if (matches && item.critical !== true) {
      return { ...item, critical: true };
    }

    return item;
  });
}

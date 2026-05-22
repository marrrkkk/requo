import "server-only";

import { getModelsForProvider as getConfiguredModelsForProvider } from "@/lib/ai/model-options";
import { isAiConfigured as checkAiConfigured } from "@/lib/ai/registry";
import type { AiProviderName, AiQualityTier } from "@/lib/ai/model-options";

// ---------------------------------------------------------------------------
// AI Configuration — Model lists and quality-tier configuration
//
// Provider management is handled by the registry (registry.ts).
// This file provides model list access for the fallback router.
// ---------------------------------------------------------------------------

/** Returns true if at least one AI provider is configured. */
export function isAiConfigured(): boolean {
  return checkAiConfigured();
}

/**
 * Returns the ordered model list for a provider and quality tier.
 */
export function getModelsForProvider(
  provider: AiProviderName,
  tier: AiQualityTier = "balanced",
): string[] {
  return getConfiguredModelsForProvider(provider, tier);
}

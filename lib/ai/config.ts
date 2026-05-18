import "server-only";

import { groqProvider } from "@/lib/ai/groq-provider";
import { cerebrasProvider } from "@/lib/ai/cerebras-provider";
import { geminiProvider } from "@/lib/ai/gemini-provider";
import { openrouterProvider } from "@/lib/ai/openrouter-provider";
import { getModelsForProvider as getConfiguredModelsForProvider } from "@/lib/ai/model-options";
import type { AiProvider } from "@/lib/ai/types";
import type { AiProviderName, AiQualityTier } from "@/lib/ai/model-options";

// ---------------------------------------------------------------------------
// Provider ordering, model lists, and quality-tier configuration
//
// The fallback chain is: Groq → Cerebras → Gemini.
// Within each provider the router tries the best model first, then falls
// back to smaller/faster models before moving to the next provider.
//
// Adding a new provider:
//   1. Implement AiProvider in a new file.
//   2. Add it to ALL_PROVIDERS.
//   3. Add model lists to PROVIDER_MODELS.
//   4. Done.
// ---------------------------------------------------------------------------

// ── Provider ordering ─────────────────────────────────────────────────────

/** All providers in fallback order. */
const ALL_PROVIDERS: AiProvider[] = [
  groqProvider,
  cerebrasProvider,
  geminiProvider,
  openrouterProvider,
];

/** Returns the ordered list of configured providers. */
export function getConfiguredProviders(): AiProvider[] {
  return ALL_PROVIDERS.filter((p) => p.isConfigured());
}

/** Returns true if at least one AI provider is configured. */
export function isAiConfigured(): boolean {
  return ALL_PROVIDERS.some((p) => p.isConfigured());
}

// ── Model lists per provider × quality tier ───────────────────────────────

/**
 * Returns the ordered model list for a provider and quality tier.
 * Falls back to "balanced" if the tier is missing (shouldn't happen
 * with the current config, but keeps things safe).
 */
export function getModelsForProvider(
  provider: AiProviderName,
  tier: AiQualityTier = "balanced",
): string[] {
  return getConfiguredModelsForProvider(provider, tier);
}

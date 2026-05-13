import "server-only";

import { groqProvider } from "@/lib/ai/groq-provider";
import { cerebrasProvider } from "@/lib/ai/cerebras-provider";
import { geminiProvider } from "@/lib/ai/gemini-provider";
import type { AiProvider, AiProviderName, AiQualityTier } from "@/lib/ai/types";

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
 * Model lists for each provider, keyed by quality tier.
 * The router tries models in array order within a provider before
 * falling back to the next provider. Best model first, then smaller fallbacks.
 */
const PROVIDER_MODELS: Record<AiProviderName, Record<AiQualityTier, string[]>> = {
  groq: {
    balanced: [
      "qwen/qwen3-32b",
      "meta-llama/llama-4-scout-17b-16e-instruct",
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
    ],
    cheap: [
      "llama-3.1-8b-instant",
      "meta-llama/llama-4-scout-17b-16e-instruct",
    ],
    best: [
      "qwen/qwen3-32b",
      "llama-3.3-70b-versatile",
      "meta-llama/llama-4-scout-17b-16e-instruct",
    ],
    coding: [
      "qwen/qwen3-32b",
      "llama-3.3-70b-versatile",
    ],
  },

  cerebras: {
    balanced: [
      "qwen-3-235b-a22b-instruct-2507",
      "gpt-oss-120b",
      "llama3.1-8b",
    ],
    cheap: [
      "llama3.1-8b",
      "gpt-oss-120b",
    ],
    best: [
      "qwen-3-235b-a22b-instruct-2507",
      "gpt-oss-120b",
    ],
    coding: [
      "qwen-3-235b-a22b-instruct-2507",
      "gpt-oss-120b",
    ],
  },

  gemini: {
    balanced: [
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
    ],
    cheap: [
      "gemini-2.5-flash-lite",
      "gemini-2.5-flash",
    ],
    best: [
      "gemini-2.5-pro",
      "gemini-2.5-flash",
    ],
    coding: [
      "gemini-2.5-pro",
      "gemini-2.5-flash",
    ],
  },
};

/**
 * Returns the ordered model list for a provider and quality tier.
 * Falls back to "balanced" if the tier is missing (shouldn't happen
 * with the current config, but keeps things safe).
 */
export function getModelsForProvider(
  provider: AiProviderName,
  tier: AiQualityTier = "balanced",
): string[] {
  return PROVIDER_MODELS[provider][tier] ?? PROVIDER_MODELS[provider].balanced;
}

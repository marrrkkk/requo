import "server-only";

import { groqProvider } from "@/lib/ai/groq-provider";
import { geminiProvider } from "@/lib/ai/gemini-provider";
import { openrouterProvider } from "@/lib/ai/openrouter-provider";
import type { AiProvider } from "@/lib/ai/types";

// ---------------------------------------------------------------------------
// Provider ordering and configuration
//
// The fallback chain is: Groq → Gemini → OpenRouter.
// Only configured providers (those with valid API keys) are included.
// ---------------------------------------------------------------------------

/** All providers in fallback order. */
const ALL_PROVIDERS: AiProvider[] = [
  groqProvider,
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

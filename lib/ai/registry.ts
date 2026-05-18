import "server-only";

import { createGroq } from "@ai-sdk/groq";
import { createCerebras } from "@ai-sdk/cerebras";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createMistral } from "@ai-sdk/mistral";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createProviderRegistry, customProvider } from "ai";

import { env, isGroqConfigured, isCerebrasConfigured, isGeminiConfigured, isOpenRouterConfigured, isMistralConfigured, isCloudflareAiConfigured } from "@/lib/env";

// ---------------------------------------------------------------------------
// AI Provider Registry — Vercel AI SDK
//
// Central provider management following the official Vercel AI SDK pattern.
// All providers are registered here and accessed via string IDs:
//   registry.languageModel("groq:model-name")
//
// Fallback order: Groq → Cerebras → Gemini → OpenRouter
// The router.ts file handles provider/model fallback using this registry.
// ---------------------------------------------------------------------------

// ── Provider instances (only created if configured) ───────────────────────

const groq = isGroqConfigured
  ? createGroq({ apiKey: env.GROQ_API_KEY })
  : null;

const cerebras = isCerebrasConfigured
  ? createCerebras({ apiKey: env.CEREBRAS_API_KEY })
  : null;

const google = isGeminiConfigured
  ? createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY })
  : null;

const openrouter = isOpenRouterConfigured
  ? createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY })
  : null;

const mistral = isMistralConfigured
  ? createMistral({ apiKey: env.MISTRAL_API_KEY })
  : null;

const cloudflare = isCloudflareAiConfigured
  ? createOpenAICompatible({
      name: "cloudflare",
      baseURL: `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/v1`,
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      },
    })
  : null;

// ── Registry setup ────────────────────────────────────────────────────────

/**
 * Build the registry with only configured providers.
 * Access models via: registry.languageModel("groq:llama-3.3-70b-versatile")
 */
function buildRegistry() {
  const providers: Record<string, ReturnType<typeof customProvider> | ReturnType<typeof createGroq> | ReturnType<typeof createCerebras> | ReturnType<typeof createGoogleGenerativeAI> | ReturnType<typeof createOpenRouter> | ReturnType<typeof createMistral> | ReturnType<typeof createOpenAICompatible>> = {};

  if (groq) providers.groq = groq;
  if (cerebras) providers.cerebras = cerebras;
  if (google) providers.google = google;
  if (openrouter) providers.openrouter = openrouter;
  if (mistral) providers.mistral = mistral;
  if (cloudflare) providers.cloudflare = cloudflare;

  return createProviderRegistry(providers);
}

export const registry = buildRegistry();

// ── Provider availability checks ──────────────────────────────────────────

export { groq, cerebras, google, openrouter, mistral, cloudflare };

/** Returns true if at least one AI provider is configured. */
export function isAiConfigured(): boolean {
  return isGroqConfigured || isCerebrasConfigured || isGeminiConfigured || isOpenRouterConfigured || isMistralConfigured || isCloudflareAiConfigured;
}

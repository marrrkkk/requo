export const aiProviderNames = [
  "groq",
  "cerebras",
  "gemini",
  "mistral",
  "cloudflare",
  "openrouter",
] as const;

export type AiProviderName = (typeof aiProviderNames)[number];

export const aiQualityTiers = [
  "balanced",
  "cheap",
  "best",
  "coding",
] as const;

export type AiQualityTier = (typeof aiQualityTiers)[number];

export const autoAiModelOptionValue = "auto";

/**
 * Public model metadata only. API keys and provider configuration stay server-side.
 *
 * All listed models support tool calling / function calling.
 *
 * FALLBACK STRATEGY:
 * The router (lib/ai/router.ts) tries providers in order: Groq → Cerebras → Gemini → OpenRouter.
 * Within each provider, models are tried first-to-last per quality tier.
 *
 * The PRIMARY model is selected by the task-aware router in api-route-handlers.ts:
 * - Tool-calling → Gemini Flash (most reliable tool args, 1M TPM free)
 * - Simple lookups → Groq GPT-OSS-20B (fast, cheap, conserves budget)
 * - Complex text → Groq GPT-OSS-120B (quality + speed)
 *
 * When the primary model 429s, the router.ts fallback chain kicks in and tries
 * the next model in the list, then the next provider. This means effective
 * throughput = sum of all provider rate limits (~1.5M+ TPM total).
 *
 * Provider rate limits (free tier):
 * - Groq: 250-300K TPM, 1K RPM
 * - Cerebras: ~200K TPM
 * - Gemini: ~1M TPM (free tier)
 * - OpenRouter: per-model limits, all $0
 */
export const aiProviderModels: Record<
  AiProviderName,
  Record<AiQualityTier, string[]>
> = {
  // Groq: Fastest inference. Primary for non-tool text.
  // Ordered by quality (best first) for fallback accuracy.
  groq: {
    balanced: [
      "openai/gpt-oss-120b",       // Best quality, 500 tps
      "qwen/qwen3-32b",            // Strong reasoning, 400 tps
      "llama-3.3-70b-versatile",   // Reliable workhorse, 280 tps
      "meta-llama/llama-4-scout-17b-16e-instruct", // Good multimodal, 750 tps
      "openai/gpt-oss-20b",        // Fast fallback, 1000 tps
      "llama-3.1-8b-instant",      // Last resort, very fast
    ],
    cheap: [
      "openai/gpt-oss-20b",        // Best cheap option (quality/speed)
      "llama-3.1-8b-instant",      // Cheapest fallback
      "meta-llama/llama-4-scout-17b-16e-instruct",
    ],
    best: [
      "openai/gpt-oss-120b",
      "qwen/qwen3-32b",
      "llama-3.3-70b-versatile",
    ],
    coding: [
      "qwen/qwen3-32b",
      "openai/gpt-oss-120b",
      "llama-3.3-70b-versatile",
    ],
  },
  // Cerebras: Ultra-fast, separate rate pool. Overflow from Groq lands here.
  cerebras: {
    balanced: [
      "zai-glm-4.7",                       // Best quality (355B), 1000 tps
      "gpt-oss-120b",                       // Reliable, 3000 tps
      "qwen-3-235b-a22b-instruct-2507",     // Strong reasoning
      "llama3.1-8b",                        // Fast fallback
    ],
    cheap: [
      "llama3.1-8b",
      "gpt-oss-120b",
    ],
    best: [
      "zai-glm-4.7",
      "qwen-3-235b-a22b-instruct-2507",
      "gpt-oss-120b",
    ],
    coding: [
      "zai-glm-4.7",
      "qwen-3-235b-a22b-instruct-2507",
      "gpt-oss-120b",
    ],
  },
  // Gemini: Primary for tool-calling. Highest rate limits (1M TPM free).
  // Excellent function calling reliability.
  gemini: {
    balanced: [
      "gemini-2.5-flash",           // Best balance of speed + tool accuracy
      "gemini-2.5-flash-lite",      // Cheaper fallback
    ],
    cheap: [
      "gemini-2.5-flash-lite",
      "gemini-2.5-flash",
    ],
    best: [
      "gemini-2.5-pro",             // Highest quality, slower
      "gemini-2.5-flash",
    ],
    coding: [
      "gemini-2.5-pro",
      "gemini-2.5-flash",
    ],
  },
  // Mistral: 1B tokens/month free tier, 500K TPM. Excellent tool calling.
  mistral: {
    balanced: [
      "mistral-small-latest",       // Best free-tier model, tool calling
      "mistral-medium-latest",      // Higher quality
    ],
    cheap: [
      "mistral-small-latest",
    ],
    best: [
      "mistral-medium-latest",
      "mistral-small-latest",
    ],
    coding: [
      "codestral-latest",
      "mistral-small-latest",
    ],
  },
  // Cloudflare Workers AI: 10K neurons/day free, OpenAI-compatible REST API.
  // Model IDs use the @cf/ prefix format.
  cloudflare: {
    balanced: [
      "@cf/openai/gpt-oss-120b",
      "@cf/moonshotai/kimi-k2.5",
      "@cf/zai-org/glm-4.7-flash",
      "@cf/qwen/qwen3-30b-a3b-fp8",
      "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    ],
    cheap: [
      "@cf/qwen/qwen3-30b-a3b-fp8",
      "@cf/openai/gpt-oss-20b",
      "@cf/meta/llama-3.1-8b-instruct",
    ],
    best: [
      "@cf/openai/gpt-oss-120b",
      "@cf/moonshotai/kimi-k2.5",
      "@cf/nvidia/nemotron-3-120b-a12b",
    ],
    coding: [
      "@cf/openai/gpt-oss-120b",
      "@cf/moonshotai/kimi-k2.5",
      "@cf/qwen/qwen3-30b-a3b-fp8",
    ],
  },
  // OpenRouter: Free models, last resort overflow. Each model has separate limits.
  // Ordered by tool-calling reliability and general quality.
  openrouter: {
    balanced: [
      "openrouter/owl-alpha",                       // Purpose-built for agentic/tool use
      "nvidia/nemotron-3-super-120b-a12b:free",     // 120B, 1M context, strong reasoning
      "openai/gpt-oss-120b:free",                   // Same model as Groq, different pool
      "deepseek/deepseek-v4-flash:free",            // 284B MoE, 1M context
      "z-ai/glm-4.5-air:free",                     // Tool use + reasoning
      "google/gemma-4-31b-it:free",                 // Function calling, 256K context
    ],
    cheap: [
      "openai/gpt-oss-20b:free",
      "nvidia/nemotron-3-nano-30b-a3b:free",
      "google/gemma-4-31b-it:free",
      "z-ai/glm-4.5-air:free",
    ],
    best: [
      "openrouter/owl-alpha",
      "nvidia/nemotron-3-super-120b-a12b:free",
      "openai/gpt-oss-120b:free",
      "deepseek/deepseek-v4-flash:free",
    ],
    coding: [
      "poolside/laguna-m.1:free",                   // Purpose-built coding agent
      "minimax/minimax-m2.5:free",                  // SWE-bench 80%+
      "openai/gpt-oss-120b:free",
      "nvidia/nemotron-3-super-120b-a12b:free",
    ],
  },
};

export type AiModelSelection = {
  provider: AiProviderName;
  model: string;
};

export type AiModelOption = AiModelSelection & {
  label: string;
  value: string;
};

export function getModelsForProvider(
  provider: AiProviderName,
  tier: AiQualityTier = "balanced",
): string[] {
  return aiProviderModels[provider][tier] ?? aiProviderModels[provider].balanced;
}

export function createAiModelOptionValue(selection: AiModelSelection) {
  return `${selection.provider}|${selection.model}`;
}

export function parseAiModelOptionValue(
  value: string | null | undefined,
): AiModelSelection | null {
  if (!value || value === autoAiModelOptionValue) {
    return null;
  }

  const dividerIndex = value.indexOf("|");

  if (dividerIndex <= 0) {
    return null;
  }

  const provider = value.slice(0, dividerIndex);
  const model = value.slice(dividerIndex + 1);

  if (!isAiProviderName(provider) || !isKnownAiProviderModel(provider, model)) {
    return null;
  }

  return { provider, model };
}

export function getAllAiModelOptions(): AiModelOption[] {
  return aiProviderNames.flatMap((provider) => {
    const seen = new Set<string>();

    return aiQualityTiers.flatMap((tier) =>
      getModelsForProvider(provider, tier)
        .filter((model) => {
          if (seen.has(model)) {
            return false;
          }

          seen.add(model);
          return true;
        })
        .map((model) => ({
          provider,
          model,
          label: `${formatAiProviderName(provider)} / ${model}`,
          value: createAiModelOptionValue({ provider, model }),
        })),
    );
  });
}

export function formatAiProviderName(provider: AiProviderName) {
  switch (provider) {
    case "groq":
      return "Groq";
    case "cerebras":
      return "Cerebras";
    case "gemini":
      return "Gemini";
    case "mistral":
      return "Mistral";
    case "cloudflare":
      return "Cloudflare";
    case "openrouter":
      return "OpenRouter";
  }
}

function isAiProviderName(value: string): value is AiProviderName {
  return (aiProviderNames as readonly string[]).includes(value);
}

function isKnownAiProviderModel(provider: AiProviderName, model: string) {
  return aiQualityTiers.some((tier) =>
    getModelsForProvider(provider, tier).includes(model),
  );
}

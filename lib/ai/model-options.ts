export const aiProviderNames = [
  "groq",
  "cerebras",
  "gemini",
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
 */
export const aiProviderModels: Record<
  AiProviderName,
  Record<AiQualityTier, string[]>
> = {
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
  openrouter: {
    balanced: [
      "meta-llama/llama-3.3-70b-instruct",
      "mistralai/mistral-small-3.1-24b-instruct",
    ],
    cheap: [
      "mistralai/mistral-small-3.1-24b-instruct",
      "meta-llama/llama-3.3-70b-instruct",
    ],
    best: [
      "meta-llama/llama-3.3-70b-instruct",
      "mistralai/mistral-small-3.1-24b-instruct",
    ],
    coding: [
      "meta-llama/llama-3.3-70b-instruct",
      "mistralai/mistral-small-3.1-24b-instruct",
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

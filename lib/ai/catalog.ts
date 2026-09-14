import "server-only";

/**
 * Unified model catalog — the single source of truth for model identifiers,
 * free-tier allowances, capabilities, and pricing.
 *
 * Replaces three disagreeing lists:
 * - `lib/ai/model-options.ts` (docs/selection UI)
 * - `lib/ai/capacity-selector.ts` MODEL_CAPACITIES (routing)
 * - `lib/ai/token-logger.ts` TOKEN_COST_TABLE (pricing)
 *
 * Keyed by the provider prefix the runtime registry uses
 * (`groq`, `cerebras`, `google`, `mistral`, `cloudflare`, `nvidia`,
 * `openrouter`). In particular Gemini entries use `google:` — the cost table
 * previously keyed them under `gemini:`, so every Gemini-served turn was
 * logged as unpriced.
 *
 * Limits were researched from provider documentation and live `models`
 * endpoint probes. Dead identifiers are removed, not commented out.
 * Every allowance stays overridable from the environment (see below) so a
 * provider changing its free tier is a config change, not a release.
 */

export type ModelEntry = {
  modelId: `${string}:${string}`;
  quality: number; // 1-10
  contextWindow: number;
  maxOutputTokens: number;
  toolCapable: boolean;
  structuredOutput: boolean;
  limits: {
    rpm: number;
    rpd: number; // 0 = not published / not modelled
    tpm: number;
    tpd: number; // 0 = not published / not modelled
    /** Cloudflare only: neurons per 1M tokens, billed against a daily pool. */
    neuronsPerMillion?: { input: number; output: number };
  };
  /** Which limits are per-organisation rather than per-model. */
  sharedWithProvider: Array<"rpm" | "rpd" | "tpm" | "tpd">;
  /** When the day counter resets, so exhaustion cooldowns are accurate. */
  dayResets: "rolling" | "utc-midnight" | "pacific-midnight";
  costCentsPerMillion: { input: number; output: number };
  /** Held back for last: too small an allowance to carry normal traffic. */
  reserve?: boolean;
};

function envNumber(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

function providerOf(modelId: string): string {
  return modelId.split(":")[0] ?? "";
}

/**
 * Environment overrides. Extends the existing `AI_TPM_<PROVIDER>` convention
 * with per-minute request, per-day request and per-day token equivalents,
 * plus dedicated overrides for OpenRouter's daily request cap and
 * Cloudflare's daily neuron pool.
 *
 * - AI_RPM_<PROVIDER>, AI_RPD_<PROVIDER>, AI_TPM_<PROVIDER>, AI_TPD_<PROVIDER>
 * - AI_RPD_OPENROUTER (alias: OPENROUTER_DAILY_REQUESTS) — last-resort overflow
 * - AI_NEURONS_CLOUDFLARE_DAILY (alias: CLOUDFLARE_DAILY_NEURONS)
 */
export function getProviderOverride(
  provider: string,
  dimension: "rpm" | "rpd" | "tpm" | "tpd",
  fallback: number,
): number {
  const upper = provider.toUpperCase();
  const primary = envNumber(`AI_${dimension.toUpperCase()}_${upper}`, fallback);
  if (primary !== fallback) return primary;
  // Dedicated aliases.
  if (provider === "openrouter" && dimension === "rpd") {
    const alias = envNumber("OPENROUTER_DAILY_REQUESTS", fallback);
    if (alias !== fallback) return alias;
  }
  return fallback;
}

export function getNeuronPoolOverride(fallback: number): number {
  const primary = envNumber("AI_NEURONS_CLOUDFLARE_DAILY", fallback);
  if (primary !== fallback) return primary;
  return envNumber("CLOUDFLARE_DAILY_NEURONS", fallback);
}

/** Cloudflare's free neuron budget: 10,000 neurons/day, resets 00:00 UTC. */
export const CLOUDFLARE_DAILY_NEURON_POOL = 10_000;

// ---------------------------------------------------------------------------
// Base catalog (before env overrides)
// ---------------------------------------------------------------------------

const BASE_CATALOG: ModelEntry[] = [
  // ─── Groq: 30 RPM · 1K RPD · 8K TPM · 200K TPD, per-organisation ───
  // All Llama identifiers dropped — now Enterprise-only.
  {
    modelId: "groq:openai/gpt-oss-120b",
    quality: 9,
    contextWindow: 131_072,
    maxOutputTokens: 8_192,
    toolCapable: true,
    structuredOutput: true,
    limits: { rpm: 30, rpd: 1_000, tpm: 8_000, tpd: 200_000 },
    sharedWithProvider: ["rpm", "rpd", "tpm", "tpd"],
    dayResets: "utc-midnight",
    costCentsPerMillion: { input: 15, output: 60 },
  },
  {
    modelId: "groq:openai/gpt-oss-20b",
    quality: 7,
    contextWindow: 131_072,
    maxOutputTokens: 8_192,
    toolCapable: true,
    structuredOutput: true,
    limits: { rpm: 30, rpd: 1_000, tpm: 8_000, tpd: 200_000 },
    sharedWithProvider: ["rpm", "rpd", "tpm", "tpd"],
    dayResets: "utc-midnight",
    costCentsPerMillion: { input: 7.5, output: 30 },
  },

  // ─── Cerebras: 5 RPM · 30K uncached TPM · 1M TPD ───
  {
    modelId: "cerebras:gpt-oss-120b",
    quality: 8,
    contextWindow: 32_768,
    maxOutputTokens: 8_192,
    toolCapable: true,
    structuredOutput: true,
    limits: { rpm: 5, rpd: 0, tpm: 30_000, tpd: 1_000_000 },
    sharedWithProvider: [],
    dayResets: "utc-midnight",
    costCentsPerMillion: { input: 6, output: 6 },
  },
  {
    modelId: "cerebras:qwen-3.8-27b",
    quality: 7,
    contextWindow: 32_768,
    maxOutputTokens: 8_192,
    toolCapable: true,
    structuredOutput: true,
    limits: { rpm: 5, rpd: 0, tpm: 30_000, tpd: 1_000_000 },
    sharedWithProvider: [],
    dayResets: "utc-midnight",
    costCentsPerMillion: { input: 6, output: 6 },
  },

  // ─── Gemini: unpublished; conservative estimates, per-project, Pacific reset ───
  // 2.5 Flash-Lite is retired for this project: the API answers every request
  // with "no longer available to new users" while the `models` listing still
  // returns the identifier, so the drift check cannot see the breakage.
  // 3.5 Flash-Lite is the replacement the API itself names. Capabilities
  // (context, output cap, tool calling, structured output) were probed live;
  // RPD is AI Studio's September 2026 free-tier figure. RPM keeps the family's
  // conservative 15 because Google no longer publishes per-model burst limits.
  // It is a thinking model, and unlike 2.5 it cannot be told to stop thinking:
  // `thinkingBudget: 0` is rejected with "Request contains an invalid
  // argument", so callers pass `thinkingBudget: 1` instead (see the assistant
  // and agent orchestrators). Reasoning arrives on a separate channel, so the
  // router's `text`/`textStream` path is unaffected.
  {
    modelId: "google:gemini-3.5-flash-lite",
    quality: 8,
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    toolCapable: true,
    structuredOutput: true,
    limits: { rpm: 15, rpd: 500, tpm: 250_000, tpd: 0 },
    sharedWithProvider: [],
    dayResets: "pacific-midnight",
    costCentsPerMillion: { input: 30, output: 250 },
  },
  {
    modelId: "google:gemini-2.5-flash",
    quality: 9,
    contextWindow: 1_048_576,
    maxOutputTokens: 8_192,
    toolCapable: true,
    structuredOutput: true,
    limits: { rpm: 10, rpd: 250, tpm: 250_000, tpd: 0 },
    sharedWithProvider: [],
    dayResets: "pacific-midnight",
    costCentsPerMillion: { input: 30, output: 250 },
  },
  {
    modelId: "google:gemini-2.5-pro",
    quality: 10,
    contextWindow: 1_048_576,
    maxOutputTokens: 8_192,
    toolCapable: true,
    structuredOutput: true,
    limits: { rpm: 5, rpd: 100, tpm: 250_000, tpd: 0 },
    sharedWithProvider: [],
    dayResets: "pacific-midnight",
    // Standard rate for prompts up to 200K tokens. Beyond that Google charges
    // 250 input / 1000 output cents, which a single pair cannot express — the
    // long-prompt case is under-costed here rather than the common one.
    costCentsPerMillion: { input: 125, output: 1_000 },
    reserve: true,
  },

  // ─── Mistral: unpublished free mode; deliberately conservative 30 RPM ───
  {
    modelId: "mistral:mistral-medium-latest",
    quality: 9,
    contextWindow: 131_072,
    maxOutputTokens: 8_192,
    toolCapable: true,
    structuredOutput: true,
    limits: { rpm: 30, rpd: 0, tpm: 500_000, tpd: 0 },
    sharedWithProvider: [],
    dayResets: "utc-midnight",
    costCentsPerMillion: { input: 0, output: 0 },
  },
  {
    modelId: "mistral:mistral-small-latest",
    quality: 8,
    contextWindow: 131_072,
    maxOutputTokens: 8_192,
    toolCapable: true,
    structuredOutput: true,
    limits: { rpm: 30, rpd: 0, tpm: 500_000, tpd: 0 },
    sharedWithProvider: [],
    dayResets: "utc-midnight",
    costCentsPerMillion: { input: 0, output: 0 },
  },

  // ─── Cloudflare: 10,000 neurons/day (00:00 UTC) · ~300 RPM ───
  {
    modelId: "cloudflare:@cf/openai/gpt-oss-120b",
    quality: 8,
    contextWindow: 32_768,
    maxOutputTokens: 4_096,
    toolCapable: false,
    structuredOutput: false,
    limits: {
      rpm: 300,
      rpd: 0,
      tpm: 10_000,
      tpd: 0,
      neuronsPerMillion: { input: 12, output: 12 },
    },
    sharedWithProvider: [],
    dayResets: "utc-midnight",
    costCentsPerMillion: { input: 0, output: 0 },
  },
  {
    modelId: "cloudflare:@cf/openai/gpt-oss-20b",
    quality: 7,
    contextWindow: 32_768,
    maxOutputTokens: 4_096,
    toolCapable: false,
    structuredOutput: false,
    limits: {
      rpm: 300,
      rpd: 0,
      tpm: 10_000,
      tpd: 0,
      neuronsPerMillion: { input: 6, output: 6 },
    },
    sharedWithProvider: [],
    dayResets: "utc-midnight",
    costCentsPerMillion: { input: 0, output: 0 },
  },
  {
    modelId: "cloudflare:@cf/zai-org/glm-4.7-flash",
    quality: 6,
    contextWindow: 32_768,
    maxOutputTokens: 4_096,
    toolCapable: false,
    structuredOutput: false,
    limits: {
      rpm: 300,
      rpd: 0,
      tpm: 10_000,
      tpd: 0,
      neuronsPerMillion: { input: 8, output: 8 },
    },
    sharedWithProvider: [],
    dayResets: "utc-midnight",
    costCentsPerMillion: { input: 0, output: 0 },
  },
  {
    modelId: "cloudflare:@cf/qwen/qwen3-30b-a3b-fp8",
    quality: 5,
    contextWindow: 32_768,
    maxOutputTokens: 4_096,
    toolCapable: false,
    structuredOutput: false,
    limits: {
      rpm: 300,
      rpd: 0,
      tpm: 10_000,
      tpd: 0,
      neuronsPerMillion: { input: 5, output: 5 },
    },
    sharedWithProvider: [],
    dayResets: "utc-midnight",
    costCentsPerMillion: { input: 0, output: 0 },
  },

  // ─── NVIDIA NIM: 40 RPM hard cap, credit-based; configured at 20 RPM ───
  // The two Llama 3.1 Nemotron entries are gone: /v1/models still lists them,
  // but /v1/chat/completions answers 404, so they could never serve a request.
  // The entry kept here is NVIDIA's gpt-oss-20b host. The callable Nemotron
  // 3.x generation is reached through OpenRouter, not through this provider,
  // so no Nemotron identifier belongs in the `nvidia:` block.
  {
    modelId: "nvidia:openai/gpt-oss-20b",
    quality: 7,
    contextWindow: 131_072,
    maxOutputTokens: 4_096,
    toolCapable: false,
    structuredOutput: false,
    limits: { rpm: 20, rpd: 0, tpm: 20_000, tpd: 0 },
    sharedWithProvider: [],
    dayResets: "utc-midnight",
    costCentsPerMillion: { input: 0, output: 0 },
  },

  // ─── OpenRouter: 20 RPM · 50 RPD (no credits); last-resort overflow ───
  {
    modelId: "openrouter:nvidia/nemotron-3-ultra-550b-a55b:free",
    quality: 8,
    contextWindow: 1_000_000,
    maxOutputTokens: 65_536,
    toolCapable: true,
    structuredOutput: false,
    limits: { rpm: 20, rpd: 50, tpm: 20_000, tpd: 0 },
    sharedWithProvider: [],
    dayResets: "utc-midnight",
    costCentsPerMillion: { input: 0, output: 0 },
  },
  {
    modelId: "openrouter:nvidia/nemotron-3-super-120b-a12b:free",
    quality: 8,
    contextWindow: 1_048_576,
    maxOutputTokens: 8_192,
    toolCapable: true,
    structuredOutput: true,
    limits: { rpm: 20, rpd: 50, tpm: 20_000, tpd: 0 },
    sharedWithProvider: [],
    dayResets: "utc-midnight",
    costCentsPerMillion: { input: 0, output: 0 },
  },
  {
    modelId: "openrouter:nvidia/nemotron-3.5-lightning:free",
    quality: 7,
    contextWindow: 1_000_000,
    maxOutputTokens: 65_536,
    toolCapable: true,
    structuredOutput: false,
    limits: { rpm: 20, rpd: 50, tpm: 20_000, tpd: 0 },
    sharedWithProvider: [],
    dayResets: "utc-midnight",
    costCentsPerMillion: { input: 0, output: 0 },
  },
  {
    modelId: "openrouter:google/gemma-4-31b-it:free",
    quality: 7,
    contextWindow: 262_144,
    maxOutputTokens: 32_768,
    toolCapable: true,
    structuredOutput: true,
    limits: { rpm: 20, rpd: 50, tpm: 20_000, tpd: 0 },
    sharedWithProvider: [],
    dayResets: "utc-midnight",
    costCentsPerMillion: { input: 0, output: 0 },
  },
];

/** Catalog with environment overrides applied. */
export function getModelCatalog(): ModelEntry[] {
  return BASE_CATALOG.map((entry) => {
    const provider = providerOf(entry.modelId);
    return {
      ...entry,
      limits: {
        rpm: getProviderOverride(provider, "rpm", entry.limits.rpm),
        rpd: getProviderOverride(provider, "rpd", entry.limits.rpd),
        tpm: getProviderOverride(provider, "tpm", entry.limits.tpm),
        tpd: getProviderOverride(provider, "tpd", entry.limits.tpd),
        ...(entry.limits.neuronsPerMillion
          ? { neuronsPerMillion: entry.limits.neuronsPerMillion }
          : {}),
      },
    };
  });
}

/** Raw base catalog (no env overrides). Useful for invariant tests. */
export function getBaseCatalog(): ModelEntry[] {
  return [...BASE_CATALOG];
}

export function getCatalogEntry(
  modelId: string,
): ModelEntry | undefined {
  return getModelCatalog().find((e) => e.modelId === modelId);
}

/** Cost table derived from the catalog (single source of truth). */
export function getDerivedCostTable(): Record<
  string,
  { inputPerMillion: number; outputPerMillion: number }
> {
  const table: Record<
    string,
    { inputPerMillion: number; outputPerMillion: number }
  > = {};
  for (const entry of getModelCatalog()) {
    table[entry.modelId] = {
      inputPerMillion: entry.costCentsPerMillion.input,
      outputPerMillion: entry.costCentsPerMillion.output,
    };
  }
  return table;
}

/** Model identifiers used by the importer (multimodal extraction). */
export const EXTRACTION_MODEL_IDS = [
  "google:gemini-2.5-flash",
  "google:gemini-3.5-flash-lite",
] as const;

/** Registry prefixes the runtime knows. */
export const KNOWN_CATALOG_PROVIDERS = [
  "groq",
  "cerebras",
  "google",
  "mistral",
  "cloudflare",
  "nvidia",
  "openrouter",
] as const;

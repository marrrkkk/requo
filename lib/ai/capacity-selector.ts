import "server-only";

// ---------------------------------------------------------------------------
// Capacity-Aware Model Selector
//
// Tracks in-memory request counts per model and selects the best available
// model that still has headroom. This distributes load across providers to:
// - Keep quality consistently high for all users (not just early birds)
// - Avoid hammering one model to exhaustion while others sit idle
// - Reduce rate limit errors by staying under 80% of known limits
//
// How it works:
// 1. Each model has known rate limits (RPM = requests per minute, RPD = per day)
// 2. On each request, counters are incremented for the selected model
// 3. The selector picks the highest-quality model under 80% capacity
// 4. Counters auto-expire on window boundaries (1-minute and daily)
// 5. If ALL models are at capacity, falls back to the least-loaded one
//
// This is NOT a circuit breaker — it's a proactive load spreader.
// The fallback loop in api-route-handlers.ts still handles actual 429s.
// ---------------------------------------------------------------------------

export type ModelCapacity = {
  /** Registry model ID (e.g., "groq:openai/gpt-oss-120b") */
  modelId: `${string}:${string}`;
  /** Requests per minute limit */
  rpm: number;
  /** Requests per day limit (0 = unlimited) */
  rpd: number;
  /** Quality score 1-10 (10 = best). Used to rank models for selection. */
  quality: number;
  /** Whether this model supports tool calling reliably */
  toolCapable: boolean;
};

type UsageWindow = {
  count: number;
  windowStart: number; // Unix ms
};

// ---------------------------------------------------------------------------
// Model capacity registry — known limits per model
// ---------------------------------------------------------------------------

const MODEL_CAPACITIES: ModelCapacity[] = [
  // Groq models — highest throughput
  // NOTE: Groq streaming + Zod v4 has a known SDK bug (vercel/ai#6687) where
  // tool call arguments parse as {}. However, all our tools have optional params
  // and return full/unfiltered data when args are empty — the model still gets
  // correct information and answers accurately. Keeping toolCapable: true for
  // maximum throughput. When the SDK fixes this, args will filter correctly too.
  { modelId: "groq:openai/gpt-oss-120b", rpm: 1000, rpd: 0, quality: 9, toolCapable: true },
  { modelId: "groq:qwen/qwen3-32b", rpm: 1000, rpd: 0, quality: 8, toolCapable: true },
  { modelId: "groq:llama-3.3-70b-versatile", rpm: 1000, rpd: 0, quality: 8, toolCapable: true },
  { modelId: "groq:meta-llama/llama-4-scout-17b-16e-instruct", rpm: 1000, rpd: 0, quality: 7, toolCapable: true },
  { modelId: "groq:openai/gpt-oss-20b", rpm: 1000, rpd: 0, quality: 7, toolCapable: true },
  { modelId: "groq:llama-3.1-8b-instant", rpm: 1000, rpd: 0, quality: 5, toolCapable: true },

  // Cerebras — ultra-fast, separate pool
  { modelId: "cerebras:zai-glm-4.7", rpm: 200, rpd: 0, quality: 9, toolCapable: true },
  { modelId: "cerebras:gpt-oss-120b", rpm: 200, rpd: 0, quality: 8, toolCapable: true },
  { modelId: "cerebras:qwen-3-235b-a22b-instruct-2507", rpm: 200, rpd: 0, quality: 8, toolCapable: true },
  { modelId: "cerebras:llama3.1-8b", rpm: 200, rpd: 0, quality: 5, toolCapable: false },

  // Gemini — excellent tool calling but very low free-tier RPD
  // NOTE: gemini-2.5-pro has 0 RPD on free tier — removed from auto-selection.
  // Only gemini-2.5-flash and flash-lite are available on the free tier.
  { modelId: "google:gemini-2.5-flash", rpm: 5, rpd: 20, quality: 9, toolCapable: true },
  { modelId: "google:gemini-2.5-flash-lite", rpm: 10, rpd: 20, quality: 7, toolCapable: true },

  // Mistral — massive free tier: 500K TPM, 1B tokens/month
  { modelId: "mistral:mistral-small-latest", rpm: 60, rpd: 0, quality: 8, toolCapable: true },
  { modelId: "mistral:mistral-medium-latest", rpm: 60, rpd: 0, quality: 9, toolCapable: true },
  { modelId: "mistral:codestral-latest", rpm: 30, rpd: 2000, quality: 8, toolCapable: true },

  // Cloudflare Workers AI — 10K neurons/day free, separate rate pool
  { modelId: "cloudflare:@cf/openai/gpt-oss-120b", rpm: 40, rpd: 0, quality: 8, toolCapable: true },
  { modelId: "cloudflare:@cf/moonshotai/kimi-k2.5", rpm: 40, rpd: 0, quality: 8, toolCapable: false },
  { modelId: "cloudflare:@cf/zai-org/glm-4.7-flash", rpm: 40, rpd: 0, quality: 7, toolCapable: false },
  { modelId: "cloudflare:@cf/qwen/qwen3-30b-a3b-fp8", rpm: 40, rpd: 0, quality: 7, toolCapable: true },
  { modelId: "cloudflare:@cf/meta/llama-3.3-70b-instruct-fp8-fast", rpm: 40, rpd: 0, quality: 7, toolCapable: false },

  // NVIDIA NIM — free credits (1000 on signup), OpenAI-compatible
  // Text generation works great. Tool calling via streamText produces empty
  // textStream in the chat handler (tool call fires but final text doesn't
  // stream back). Marked toolCapable: false so auto-router uses them for
  // text-only requests. They still add value as fast text fallbacks.
  { modelId: "nvidia:nvidia/llama-3.3-nemotron-super-49b-v1", rpm: 60, rpd: 0, quality: 8, toolCapable: false },
  { modelId: "nvidia:meta/llama-3.3-70b-instruct", rpm: 60, rpd: 0, quality: 8, toolCapable: false },
  { modelId: "nvidia:meta/llama-3.1-8b-instruct", rpm: 60, rpd: 0, quality: 6, toolCapable: false },

  // OpenRouter free — unlimited but slower, quality varies
  { modelId: "openrouter:openrouter/owl-alpha", rpm: 60, rpd: 0, quality: 8, toolCapable: true },
  { modelId: "openrouter:nvidia/nemotron-3-super-120b-a12b:free", rpm: 60, rpd: 0, quality: 8, toolCapable: true },
  { modelId: "openrouter:openai/gpt-oss-120b:free", rpm: 60, rpd: 0, quality: 8, toolCapable: true },
  { modelId: "openrouter:deepseek/deepseek-v4-flash:free", rpm: 60, rpd: 0, quality: 7, toolCapable: true },
  { modelId: "openrouter:z-ai/glm-4.5-air:free", rpm: 60, rpd: 0, quality: 7, toolCapable: true },
  { modelId: "openrouter:google/gemma-4-31b-it:free", rpm: 60, rpd: 0, quality: 6, toolCapable: true },
  { modelId: "openrouter:openai/gpt-oss-20b:free", rpm: 60, rpd: 0, quality: 6, toolCapable: true },
  { modelId: "openrouter:nvidia/nemotron-3-nano-30b-a3b:free", rpm: 60, rpd: 0, quality: 5, toolCapable: true },
  { modelId: "openrouter:poolside/laguna-m.1:free", rpm: 60, rpd: 0, quality: 7, toolCapable: true },
  { modelId: "openrouter:minimax/minimax-m2.5:free", rpm: 60, rpd: 0, quality: 7, toolCapable: true },
];

// ---------------------------------------------------------------------------
// In-memory usage tracking
// ---------------------------------------------------------------------------

const minuteUsage = new Map<string, UsageWindow>();
const dayUsage = new Map<string, UsageWindow>();

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
const CAPACITY_THRESHOLD = 0.80; // Pick models under 80% of their limit

function getMinuteCount(modelId: string): number {
  const entry = minuteUsage.get(modelId);
  if (!entry) return 0;
  if (Date.now() - entry.windowStart >= MINUTE_MS) {
    minuteUsage.delete(modelId);
    return 0;
  }
  return entry.count;
}

function getDayCount(modelId: string): number {
  const entry = dayUsage.get(modelId);
  if (!entry) return 0;
  if (Date.now() - entry.windowStart >= DAY_MS) {
    dayUsage.delete(modelId);
    return 0;
  }
  return entry.count;
}

/**
 * Record that a request was made to a model.
 * Call this AFTER successfully starting a stream/generation.
 */
export function recordModelUsage(modelId: string): void {
  const now = Date.now();

  // Minute window
  const minuteEntry = minuteUsage.get(modelId);
  if (!minuteEntry || now - minuteEntry.windowStart >= MINUTE_MS) {
    minuteUsage.set(modelId, { count: 1, windowStart: now });
  } else {
    minuteEntry.count++;
  }

  // Day window
  const dayEntry = dayUsage.get(modelId);
  if (!dayEntry || now - dayEntry.windowStart >= DAY_MS) {
    dayUsage.set(modelId, { count: 1, windowStart: now });
  } else {
    dayEntry.count++;
  }
}

/**
 * Mark a model as temporarily exhausted (hit a 429).
 * Adds a large count spike so the selector avoids it for the current window.
 */
export function markModelExhausted(modelId: string): void {
  const now = Date.now();

  // Set minute count to max so it's avoided for the next minute
  const minuteEntry = minuteUsage.get(modelId);
  if (minuteEntry && now - minuteEntry.windowStart < MINUTE_MS) {
    minuteEntry.count = 99999;
  } else {
    minuteUsage.set(modelId, { count: 99999, windowStart: now });
  }
}

// ---------------------------------------------------------------------------
// Selection logic
// ---------------------------------------------------------------------------

type SelectionCriteria = {
  /** Whether tool calling is required */
  needsTools: boolean;
  /** Minimum quality score (1-10). Default: 1 */
  minQuality?: number;
  /** Prefer these providers first (e.g., ["groq"] for speed) */
  preferProviders?: string[];
};

/**
 * Calculates how "loaded" a model is as a 0-1 ratio.
 * Takes the max of minute-load and day-load.
 */
function getLoadRatio(cap: ModelCapacity): number {
  const minuteCount = getMinuteCount(cap.modelId);
  const dayCount = getDayCount(cap.modelId);

  const minuteLoad = cap.rpm > 0 ? minuteCount / cap.rpm : 0;
  const dayLoad = cap.rpd > 0 ? dayCount / cap.rpd : 0;

  return Math.max(minuteLoad, dayLoad);
}

/**
 * Selects the best available model based on quality and remaining capacity.
 *
 * Algorithm:
 * 1. Filter models by criteria (tools needed, min quality, configured providers)
 * 2. Split into "available" (under 80% capacity) and "stressed" (over 80%)
 * 3. From available models, pick the highest quality
 * 4. If no available models, pick the least-loaded one (last resort)
 *
 * Returns an ordered list of model IDs to try (best first, then fallbacks).
 */
export function selectModels(criteria: SelectionCriteria): `${string}:${string}`[] {
  const { needsTools, minQuality = 1, preferProviders } = criteria;

  // Filter eligible models
  let eligible = MODEL_CAPACITIES.filter((cap) => {
    if (needsTools && !cap.toolCapable) return false;
    if (cap.quality < minQuality) return false;
    return true;
  });

  // If preferProviders specified, sort those to the front
  if (preferProviders?.length) {
    eligible = [
      ...eligible.filter((cap) => preferProviders.some((p) => cap.modelId.startsWith(p + ":"))),
      ...eligible.filter((cap) => !preferProviders.some((p) => cap.modelId.startsWith(p + ":"))),
    ];
  }

  // Calculate load for each model
  const scored = eligible.map((cap) => ({
    ...cap,
    loadRatio: getLoadRatio(cap),
  }));

  // Split into available (under threshold) and stressed
  const available = scored.filter((m) => m.loadRatio < CAPACITY_THRESHOLD);
  const stressed = scored.filter((m) => m.loadRatio >= CAPACITY_THRESHOLD);

  // Sort available by quality (desc), then load (asc) for tiebreaking
  available.sort((a, b) => {
    if (b.quality !== a.quality) return b.quality - a.quality;
    return a.loadRatio - b.loadRatio;
  });

  // Sort stressed by load ratio (asc) — least-loaded first as last resort
  stressed.sort((a, b) => a.loadRatio - b.loadRatio);

  // Return ordered list: best available first, then stressed as fallback
  return [...available, ...stressed].map((m) => m.modelId);
}

// ---------------------------------------------------------------------------
// High-level selection helpers for the chat route
// ---------------------------------------------------------------------------

/**
 * Select models for a tool-calling (dashboard) request.
 * Prefers Groq (highest RPM, fastest) → Cerebras → Mistral → OpenRouter → Gemini.
 * All these providers support tool calling with streaming via stopWhen.
 */
export function selectToolCallingModels(): `${string}:${string}`[] {
  return selectModels({
    needsTools: true,
    minQuality: 6,
    preferProviders: ["groq", "cerebras", "mistral", "cloudflare", "openrouter", "google"],
  });
}

/**
 * Select models for a simple text lookup (no tools).
 * Prefers fast/cheap models with quality ≥ 5.
 */
export function selectSimpleTextModels(): `${string}:${string}`[] {
  return selectModels({
    needsTools: false,
    minQuality: 5,
    preferProviders: ["groq", "cerebras"],
  });
}

/**
 * Select models for complex text generation (no tools, quality matters).
 * Prefers high-quality models.
 */
export function selectComplexTextModels(): `${string}:${string}`[] {
  return selectModels({
    needsTools: false,
    minQuality: 7,
    preferProviders: ["groq", "cerebras"],
  });
}

// ---------------------------------------------------------------------------
// Dev/debug utilities
// ---------------------------------------------------------------------------

/**
 * Returns current capacity status for all models. Used in dev debug info.
 */
export function getCapacitySnapshot(): Array<{
  modelId: string;
  quality: number;
  rpm: number;
  rpd: number;
  minuteUsage: number;
  dayUsage: number;
  loadRatio: number;
  available: boolean;
}> {
  return MODEL_CAPACITIES.map((cap) => {
    const loadRatio = getLoadRatio(cap);
    return {
      modelId: cap.modelId,
      quality: cap.quality,
      rpm: cap.rpm,
      rpd: cap.rpd,
      minuteUsage: getMinuteCount(cap.modelId),
      dayUsage: getDayCount(cap.modelId),
      loadRatio,
      available: loadRatio < CAPACITY_THRESHOLD,
    };
  });
}

/** Get all registered model IDs for the dev model selector. */
export function getAllRegisteredModelIds(): `${string}:${string}`[] {
  return MODEL_CAPACITIES.map((cap) => cap.modelId);
}

/**
 * Resets all usage counters. Used for testing.
 * @internal
 */
export function _resetUsageCounters(): void {
  minuteUsage.clear();
  dayUsage.clear();
}

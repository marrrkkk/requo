import "server-only";

import { db } from "@/lib/db/client";
import { aiTokenLogs } from "@/lib/db/schema";

// ---------------------------------------------------------------------------
// Token Logger — records every AI invocation for cost monitoring and debugging
//
// Dual logging:
// 1. Database insert into ai_token_logs for queryable admin views (90-day retention)
// 2. Structured JSON console.info line for server log aggregation
// ---------------------------------------------------------------------------

/** Per-model cost rates in cents per million tokens. */
export const TOKEN_COST_TABLE: Record<
  string,
  { inputPerMillion: number; outputPerMillion: number }
> = {
  // Groq models
  "groq:llama-3.1-8b-instant": { inputPerMillion: 50, outputPerMillion: 80 },
  "groq:llama-3.3-70b-versatile": { inputPerMillion: 590, outputPerMillion: 790 },
  "groq:openai/gpt-oss-120b": { inputPerMillion: 150, outputPerMillion: 600 },
  "groq:openai/gpt-oss-20b": { inputPerMillion: 75, outputPerMillion: 300 },
  "groq:qwen/qwen3-32b": { inputPerMillion: 290, outputPerMillion: 590 },
  "groq:meta-llama/llama-4-scout-17b-16e-instruct": { inputPerMillion: 110, outputPerMillion: 340 },
  // Cerebras models
  "cerebras:llama3.1-8b": { inputPerMillion: 10, outputPerMillion: 10 },
  "cerebras:gpt-oss-120b": { inputPerMillion: 60, outputPerMillion: 60 },
  "cerebras:zai-glm-4.7": { inputPerMillion: 60, outputPerMillion: 60 },
  "cerebras:qwen-3-235b-a22b-instruct-2507": { inputPerMillion: 60, outputPerMillion: 60 },
  // Gemini models
  "gemini:gemini-2.5-flash": { inputPerMillion: 150, outputPerMillion: 600 },
  "gemini:gemini-2.5-flash-lite": { inputPerMillion: 75, outputPerMillion: 300 },
  "gemini:gemini-2.5-pro": { inputPerMillion: 1250, outputPerMillion: 5000 },
  // OpenRouter free models — $0 cost
  "openrouter:openrouter/owl-alpha": { inputPerMillion: 0, outputPerMillion: 0 },
  "openrouter:nvidia/nemotron-3-super-120b-a12b:free": { inputPerMillion: 0, outputPerMillion: 0 },
  "openrouter:openai/gpt-oss-120b:free": { inputPerMillion: 0, outputPerMillion: 0 },
  "openrouter:openai/gpt-oss-20b:free": { inputPerMillion: 0, outputPerMillion: 0 },
  "openrouter:z-ai/glm-4.5-air:free": { inputPerMillion: 0, outputPerMillion: 0 },
  "openrouter:deepseek/deepseek-v4-flash:free": { inputPerMillion: 0, outputPerMillion: 0 },
  "openrouter:google/gemma-4-31b-it:free": { inputPerMillion: 0, outputPerMillion: 0 },
  "openrouter:poolside/laguna-m.1:free": { inputPerMillion: 0, outputPerMillion: 0 },
  "openrouter:minimax/minimax-m2.5:free": { inputPerMillion: 0, outputPerMillion: 0 },
  "openrouter:nvidia/nemotron-3-nano-30b-a3b:free": { inputPerMillion: 0, outputPerMillion: 0 },
  // Mistral — free tier (data training opt-in)
  "mistral:mistral-small-latest": { inputPerMillion: 0, outputPerMillion: 0 },
  "mistral:mistral-medium-latest": { inputPerMillion: 0, outputPerMillion: 0 },
  "mistral:codestral-latest": { inputPerMillion: 0, outputPerMillion: 0 },
  // Cloudflare Workers AI — free tier
  "cloudflare:@cf/openai/gpt-oss-120b": { inputPerMillion: 0, outputPerMillion: 0 },
  "cloudflare:@cf/moonshotai/kimi-k2.5": { inputPerMillion: 0, outputPerMillion: 0 },
  "cloudflare:@cf/zai-org/glm-4.7-flash": { inputPerMillion: 0, outputPerMillion: 0 },
  "cloudflare:@cf/qwen/qwen3-30b-a3b-fp8": { inputPerMillion: 0, outputPerMillion: 0 },
  "cloudflare:@cf/meta/llama-3.3-70b-instruct-fp8-fast": { inputPerMillion: 0, outputPerMillion: 0 },
};

/** Parameters for logging an AI invocation. */
export type LogAiInvocationParams = {
  userId: string;
  businessId: string;
  taskType: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  cacheHit: boolean;
  latencyMs: number;
  status: "success" | "error";
  errorMessage?: string | null;
};

/** The shape of a persisted token log entry. */
export type TokenLogEntry = {
  id: string;
  userId: string;
  businessId: string;
  taskType: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostCents: number | null;
  cacheHit: boolean;
  latencyMs: number;
  status: string;
  errorMessage: string | null;
  unpriced: boolean;
};

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

/**
 * Computes estimated cost in cents for a given model/provider combination.
 *
 * Formula: (inputTokens × inputRatePerMillion / 1_000_000) +
 *          (outputTokens × outputRatePerMillion / 1_000_000)
 * The result is in dollars per token, then converted to cents.
 *
 * Returns `null` if the model/provider is not in the cost table.
 */
export function computeEstimatedCostCents(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
): number | null {
  const key = `${provider}:${model}`;
  const rates = TOKEN_COST_TABLE[key];

  if (!rates) {
    return null;
  }

  // Rates are in cents per million tokens
  const inputCost = (inputTokens * rates.inputPerMillion) / 1_000_000;
  const outputCost = (outputTokens * rates.outputPerMillion) / 1_000_000;

  return inputCost + outputCost;
}

/**
 * Logs an AI invocation to the database and writes a structured JSON line
 * to the server console for log aggregation.
 *
 * - Cache hits are logged with inputTokens: 0, outputTokens: 0, cacheHit: true
 * - If model/provider not in cost table, records null cost and unpriced: true
 * - Error messages are truncated to 1024 characters
 */
export async function logAiInvocation(
  params: LogAiInvocationParams,
): Promise<TokenLogEntry> {
  const {
    userId,
    businessId,
    taskType,
    model,
    provider,
    inputTokens,
    outputTokens,
    cacheHit,
    latencyMs,
    status,
    errorMessage,
  } = params;

  const totalTokens = inputTokens + outputTokens;
  const estimatedCostCents = computeEstimatedCostCents(
    provider,
    model,
    inputTokens,
    outputTokens,
  );
  const unpriced = estimatedCostCents === null;
  const truncatedErrorMessage = errorMessage
    ? errorMessage.slice(0, 1024)
    : null;

  const id = createId("atl");

  const entry: TokenLogEntry = {
    id,
    userId,
    businessId,
    taskType,
    model,
    provider,
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCostCents,
    cacheHit,
    latencyMs,
    status,
    errorMessage: truncatedErrorMessage,
    unpriced,
  };

  // Database insert
  await db.insert(aiTokenLogs).values({
    id,
    userId,
    businessId,
    taskType,
    model,
    provider,
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCostCents,
    cacheHit,
    latencyMs,
    status,
    errorMessage: truncatedErrorMessage,
    unpriced,
  });

  // Structured JSON console.info line for server log aggregation
  console.info(
    JSON.stringify({
      type: "ai_invocation",
      timestamp: new Date().toISOString(),
      userId,
      businessId,
      taskType,
      model,
      provider,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCostCents,
      latencyMs,
      cacheHit,
      status,
    }),
  );

  return entry;
}

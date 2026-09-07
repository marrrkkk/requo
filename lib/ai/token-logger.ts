import "server-only";

import { db } from "@/lib/db/client";
import { aiTokenLogs } from "@/lib/db/schema";
import { getDerivedCostTable } from "@/lib/ai/catalog";

// ---------------------------------------------------------------------------
// Token Logger — records every AI invocation for cost monitoring and debugging
//
// Dual logging:
// 1. Database insert into ai_token_logs for queryable admin views (90-day retention)
// 2. Structured JSON console.info line for server log aggregation
// ---------------------------------------------------------------------------

/** Per-model cost rates in cents per million tokens. Derived from the unified catalog. */
export function getTokenCostTable(): Record<
  string,
  { inputPerMillion: number; outputPerMillion: number }
> {
  try {
    return getDerivedCostTable();
  } catch {
    return {};
  }
}

export const TOKEN_COST_TABLE: Record<
  string,
  { inputPerMillion: number; outputPerMillion: number }
> = getTokenCostTable();

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
  // Read through the live catalog (with a static fallback) so Gemini turns
  // served via the `google:` registry prefix are priced instead of logged as
  // unpriced. Accepts both `google:` and legacy `gemini:` prefixes.
  const table = getTokenCostTable();
  const rates =
    table[key] ??
    (provider === "gemini" ? table[`google:${model}`] : undefined) ??
    (provider === "google" ? table[`gemini:${model}`] : undefined) ??
    TOKEN_COST_TABLE[key];

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
    estimatedCostCents: estimatedCostCents !== null ? Math.round(estimatedCostCents) : null,
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

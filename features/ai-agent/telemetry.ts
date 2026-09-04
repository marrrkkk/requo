/**
 * AI Agent Telemetry Service
 *
 * Agent run logging for observability and cost tracking.
 */

import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { aiAgentRuns } from "@/lib/db/schema";
import type { AgentRun, RunStatus, RunMetadata } from "@/features/ai-agent/types";

/**
 * Generate a prefixed ID.
 */
function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

/**
 * Start a new agent run.
 */
export async function startAgentRun({
  businessId,
  sessionId,
  model,
  provider,
  metadata = {},
}: {
  businessId: string;
  sessionId: string;
  model: string;
  provider: string;
  metadata?: RunMetadata;
}): Promise<AgentRun> {
  const runId = createId("agr");
  const now = new Date();

  const [run] = await db
    .insert(aiAgentRuns)
    .values({
      id: runId,
      businessId,
      sessionId,
      model,
      provider,
      status: "running",
      startedAt: now,
      inputTokens: 0,
      outputTokens: 0,
      metadata,
    })
    .returning();

  return run;
}

/**
 * Update an agent run with completion data.
 */
export async function updateAgentRun({
  runId,
  status,
  inputTokens,
  outputTokens,
  estimatedCostCents,
  error,
  completedAt,
  metadata,
}: {
  runId: string;
  status?: RunStatus;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostCents?: number;
  error?: string;
  completedAt?: Date;
  metadata?: RunMetadata;
}): Promise<void> {
  const updates: Partial<AgentRun> = {};

  if (status !== undefined) {
    updates.status = status;
  }

  if (inputTokens !== undefined) {
    updates.inputTokens = inputTokens;
  }

  if (outputTokens !== undefined) {
    updates.outputTokens = outputTokens;
  }

  if (estimatedCostCents !== undefined) {
    updates.estimatedCostCents = String(estimatedCostCents);
  }

  if (error !== undefined) {
    updates.error = error;
  }

  if (completedAt !== undefined) {
    updates.completedAt = completedAt;
  }

  if (metadata !== undefined) {
    const [existingRun] = await db
      .select()
      .from(aiAgentRuns)
      .where(eq(aiAgentRuns.id, runId))
      .limit(1);

    if (existingRun) {
      updates.metadata = {
        ...(existingRun.metadata as RunMetadata),
        ...metadata,
      };
    } else {
      updates.metadata = metadata;
    }
  }

  await db.update(aiAgentRuns).set(updates).where(eq(aiAgentRuns.id, runId));
}

/**
 * Mark a run as failed.
 */
export async function failAgentRun({
  runId,
  error,
}: {
  runId: string;
  error: string;
}): Promise<void> {
  await db
    .update(aiAgentRuns)
    .set({
      status: "failed",
      error,
      completedAt: new Date(),
    })
    .where(eq(aiAgentRuns.id, runId));
}

/**
 * Load a run by ID.
 */
export async function loadAgentRun(runId: string): Promise<AgentRun | null> {
  const [run] = await db
    .select()
    .from(aiAgentRuns)
    .where(eq(aiAgentRuns.id, runId))
    .limit(1);

  return run ?? null;
}

/**
 * Load all runs for a session.
 */
export async function loadSessionRuns(sessionId: string): Promise<AgentRun[]> {
  return await db
    .select()
    .from(aiAgentRuns)
    .where(eq(aiAgentRuns.sessionId, sessionId))
    .orderBy(aiAgentRuns.startedAt);
}

/**
 * Load runs for a business.
 */
export async function loadBusinessRuns(
  businessId: string,
  options?: {
    limit?: number;
    offset?: number;
  },
): Promise<AgentRun[]> {
  const query = db
    .select()
    .from(aiAgentRuns)
    .where(eq(aiAgentRuns.businessId, businessId))
    .orderBy(aiAgentRuns.startedAt);

  if (options?.limit) {
    query.limit(options.limit);
  }

  if (options?.offset) {
    query.offset(options.offset);
  }

  return await query;
}

/**
 * Compute estimated cost in cents from token counts.
 * This is a simplified version - uses average pricing.
 */
export function computeEstimatedCostCents({
  inputTokens,
  outputTokens,
  model,
}: {
  inputTokens: number;
  outputTokens: number;
  model: string;
}): number {
  // Simplified pricing model (USD cents per 1M tokens)
  // These are rough averages; actual costs vary by provider
  const pricing: Record<string, { input: number; output: number }> = {
    default: { input: 50, output: 150 }, // ~$0.50 input, $1.50 output per 1M tokens
    "gpt-4": { input: 3000, output: 6000 },
    "gpt-3.5": { input: 50, output: 150 },
    "claude-3": { input: 300, output: 1500 },
    gemini: { input: 35, output: 105 },
    llama: { input: 20, output: 20 },
  };

  // Find matching pricing tier
  let tier = pricing.default;
  for (const [key, value] of Object.entries(pricing)) {
    if (model.toLowerCase().includes(key)) {
      tier = value;
      break;
    }
  }

  // Calculate cost in cents
  const inputCost = (inputTokens / 1_000_000) * tier.input;
  const outputCost = (outputTokens / 1_000_000) * tier.output;

  return Math.round((inputCost + outputCost) * 100) / 100; // Round to 2 decimal places
}

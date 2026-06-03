import "server-only";

import { createHash } from "crypto";

import {
  generateWithFallback,
  streamWithFallback,
  getCachedOutput,
  setCachedOutput,
  logAiInvocation,
  checkUsageLimit,
  recordUsage,
  startCooldown,
  TASK_WEIGHTS,
} from "@/lib/ai";
import type {
  AiCompletionRequest,
  AiCompletionResponse,
  AiStreamResponse,
  AiQualityTier,
  CacheKeyComponents,
  CachedAiOutput,
} from "@/lib/ai";
import { getEffectivePlan } from "@/lib/billing/subscription-service";
import { getTaskConfig, type AiTaskType } from "@/features/ai/task-registry";
import { buildTaskContext } from "@/features/ai/context-builder";
import { saveDraft, type SaveDraftParams } from "@/features/ai/draft-store";
import type { BusinessPlan } from "@/lib/plans/plans";

// ---------------------------------------------------------------------------
// AI Pipeline — reusable orchestration for all AI server actions
//
// Flow:
// 1. Validate input (caller responsibility — Zod + business access)
// 2. Check usage limit (cooldown + monthly quota)
// 3. Get task config from registry
// 4. Build context via context builder
// 5. Check cache
// 6. On cache hit: return cached output, log with zero tokens, skip usage/cooldown
// 7. On cache miss: invoke model router, cache result, record usage, start cooldown, log tokens
// 8. Optionally persist to draft store
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PipelineInput = {
  userId: string;
  businessId: string;
  taskType: AiTaskType;
  /** Available data fields for context assembly */
  availableData: Record<string, string | null>;
  /** Source data version identifiers for cache key computation */
  sourceDataVersions: Record<string, string | null>;
  /** Prompt version identifier (hash of the prompt template) */
  promptVersion: string;
  /** System prompt content */
  systemPrompt: string;
  /** User message content */
  userMessage: string;
  /** Optional: persist result to draft store */
  draftParams?: Omit<SaveDraftParams, "content"> | null;
};

export type PipelineResult =
  | {
      ok: true;
      text: string;
      model: string;
      provider: string;
      cacheHit: boolean;
      usage?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
      };
    }
  | {
      ok: false;
      error: string;
      reason: "quota_exceeded" | "cooldown" | "provider_error" | "validation_error";
    };

export type StreamingPipelineInput = {
  userId: string;
  businessId: string;
  taskType: AiTaskType;
  /** Available data fields for context assembly */
  availableData: Record<string, string | null>;
  /** Source data version identifiers for cache key computation */
  sourceDataVersions: Record<string, string | null>;
  /** Prompt version identifier (hash of the prompt template) */
  promptVersion: string;
  /** System prompt content */
  systemPrompt: string;
  /** User message content */
  userMessage: string;
};

export type StreamingPipelineResult =
  | {
      ok: true;
      stream: AiStreamResponse;
      /** Call this after streaming completes to record usage and log tokens */
      onComplete: (params: {
        totalText: string;
        inputTokens: number;
        outputTokens: number;
      }) => Promise<void>;
    }
  | {
      ok: false;
      error: string;
      reason: "quota_exceeded" | "cooldown" | "provider_error" | "validation_error";
    };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generates a stable prompt version hash from the system prompt content.
 * Used when callers don't provide an explicit prompt version.
 */
export function hashPromptVersion(systemPrompt: string): string {
  return createHash("sha256").update(systemPrompt).digest("hex").slice(0, 16);
}

// ---------------------------------------------------------------------------
// Non-streaming pipeline
// ---------------------------------------------------------------------------

/**
 * Executes the full AI pipeline for non-streaming tasks:
 * check usage → get config → build context → check cache → invoke AI → cache → log → draft
 */
export async function executeAiPipeline(
  input: PipelineInput,
): Promise<PipelineResult> {
  const {
    userId,
    businessId,
    taskType,
    availableData,
    sourceDataVersions,
    promptVersion,
    systemPrompt,
    userMessage,
    draftParams,
  } = input;

  // 1. Get task config
  const taskConfig = getTaskConfig(taskType);

  // 2. Resolve plan and check usage limit
  const plan: BusinessPlan = await getEffectivePlan(businessId);

  const usageCheck = await checkUsageLimit({
    userId,
    businessId,
    taskType,
    plan,
  });

  if (!usageCheck.allowed) {
    return {
      ok: false,
      error: usageCheck.message,
      reason: usageCheck.reason,
    };
  }

  // 3. Build context (validates required fields are present)
  const _contextResult = buildTaskContext({
    taskType,
    availableData,
  });

  // 4. Check cache
  const cacheKey: CacheKeyComponents = {
    businessId,
    userId,
    taskType,
    promptVersion,
    modelTier: taskConfig.qualityTier as AiQualityTier,
    sourceDataVersions,
  };

  const cachedOutput = await getCachedOutput(cacheKey);

  if (cachedOutput) {
    // Cache hit: log with zero tokens, skip usage deduction and cooldown
    const startTime = Date.now();

    await logAiInvocation({
      userId,
      businessId,
      taskType,
      model: cachedOutput.model,
      provider: cachedOutput.provider,
      inputTokens: 0,
      outputTokens: 0,
      cacheHit: true,
      latencyMs: Date.now() - startTime,
      status: "success",
    });

    return {
      ok: true,
      text: cachedOutput.text,
      model: cachedOutput.model,
      provider: cachedOutput.provider,
      cacheHit: true,
      usage: cachedOutput.usage,
    };
  }

  // 5. Cache miss: invoke AI via model router
  const startTime = Date.now();

  const completionRequest: AiCompletionRequest = {
    model: "",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: taskConfig.temperature,
    maxOutputTokens: taskConfig.maxOutputTokens,
    qualityTier: taskConfig.qualityTier as AiQualityTier,
  };

  let response: AiCompletionResponse;

  try {
    response = await generateWithFallback(completionRequest);
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "AI provider error";

    // Log the failed invocation
    await logAiInvocation({
      userId,
      businessId,
      taskType,
      model: "unknown",
      provider: "unknown",
      inputTokens: 0,
      outputTokens: 0,
      cacheHit: false,
      latencyMs,
      status: "error",
      errorMessage,
    }).catch((logError) => {
      console.warn("[ai-pipeline] Failed to log error invocation:", logError);
    });

    return {
      ok: false,
      error: "The AI assistant is temporarily unavailable. Try again in a moment.",
      reason: "provider_error",
    };
  }

  const latencyMs = Date.now() - startTime;
  const inputTokens = response.usage?.promptTokens ?? 0;
  const outputTokens = response.usage?.completionTokens ?? 0;

  // 6. Cache the result
  if (taskConfig.cacheTTL > 0) {
    const cachedResult: CachedAiOutput = {
      text: response.text,
      model: response.model,
      provider: response.provider,
      createdAt: new Date().toISOString(),
      usage: response.usage,
    };

    await setCachedOutput(cacheKey, cachedResult, taskConfig.cacheTTL);
  }

  // 7. Record usage and start cooldown
  const weight = TASK_WEIGHTS[taskType];
  await recordUsage(userId, businessId, taskType, weight);
  await startCooldown(userId, taskType);

  // 8. Log tokens
  await logAiInvocation({
    userId,
    businessId,
    taskType,
    model: response.model,
    provider: response.provider,
    inputTokens,
    outputTokens,
    cacheHit: false,
    latencyMs,
    status: "success",
  }).catch((logError) => {
    console.warn("[ai-pipeline] Failed to log invocation:", logError);
  });

  // 9. Optionally save draft
  if (draftParams) {
    try {
      await saveDraft({
        ...draftParams,
        content: { text: response.text, model: response.model, provider: response.provider },
      });
    } catch (draftError) {
      console.warn("[ai-pipeline] Failed to save draft:", draftError);
    }
  }

  return {
    ok: true,
    text: response.text,
    model: response.model,
    provider: response.provider,
    cacheHit: false,
    usage: response.usage,
  };
}

// ---------------------------------------------------------------------------
// Streaming pipeline
// ---------------------------------------------------------------------------

/**
 * Executes the AI pipeline for streaming tasks (quote_draft, quote_improvement).
 * Streaming tasks skip caching but still check usage limits and log tokens.
 *
 * Returns a stream response and an `onComplete` callback that the caller
 * must invoke after consuming the stream to record usage and log tokens.
 */
export async function executeStreamingAiPipeline(
  input: StreamingPipelineInput,
): Promise<StreamingPipelineResult> {
  const {
    userId,
    businessId,
    taskType,
    availableData,
    sourceDataVersions: _sourceDataVersions,
    promptVersion: _promptVersion,
    systemPrompt,
    userMessage,
  } = input;

  // 1. Get task config
  const taskConfig = getTaskConfig(taskType);

  // 2. Resolve plan and check usage limit
  const plan: BusinessPlan = await getEffectivePlan(businessId);

  const usageCheck = await checkUsageLimit({
    userId,
    businessId,
    taskType,
    plan,
  });

  if (!usageCheck.allowed) {
    return {
      ok: false,
      error: usageCheck.message,
      reason: usageCheck.reason,
    };
  }

  // 3. Build context (validates required fields are present)
  const _contextResult = buildTaskContext({
    taskType,
    availableData,
  });

  // 4. Streaming tasks skip cache — invoke AI directly
  const startTime = Date.now();

  const completionRequest: AiCompletionRequest = {
    model: "",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: taskConfig.temperature,
    maxOutputTokens: taskConfig.maxOutputTokens,
    qualityTier: taskConfig.qualityTier as AiQualityTier,
  };

  let streamResponse: AiStreamResponse;

  try {
    streamResponse = await streamWithFallback(completionRequest);
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "AI provider error";

    await logAiInvocation({
      userId,
      businessId,
      taskType,
      model: "unknown",
      provider: "unknown",
      inputTokens: 0,
      outputTokens: 0,
      cacheHit: false,
      latencyMs,
      status: "error",
      errorMessage,
    }).catch((logError) => {
      console.warn("[ai-pipeline] Failed to log streaming error:", logError);
    });

    return {
      ok: false,
      error: "The AI assistant is temporarily unavailable. Try again in a moment.",
      reason: "provider_error",
    };
  }

  // 5. Return stream with onComplete callback for post-stream logging
  const onComplete = async (params: {
    totalText: string;
    inputTokens: number;
    outputTokens: number;
  }) => {
    const latencyMs = Date.now() - startTime;

    // Record usage and start cooldown
    const weight = TASK_WEIGHTS[taskType];
    await recordUsage(userId, businessId, taskType, weight);
    await startCooldown(userId, taskType);

    // Log tokens
    await logAiInvocation({
      userId,
      businessId,
      taskType,
      model: streamResponse.model,
      provider: streamResponse.provider,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      cacheHit: false,
      latencyMs,
      status: "success",
    }).catch((logError) => {
      console.warn("[ai-pipeline] Failed to log streaming invocation:", logError);
    });
  };

  return {
    ok: true,
    stream: streamResponse,
    onComplete,
  };
}

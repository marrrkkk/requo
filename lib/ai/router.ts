import "server-only";

import { generateText, streamText } from "ai";

import { registry, groq, cerebras, google, openrouter, mistral, cloudflare, nvidia } from "@/lib/ai/registry";
import {
  AiProviderError,
  getSanitizedErrorInfo,
  isRetryableError,
  wrapProviderError,
} from "@/lib/ai/errors";
import { getModelsForProvider } from "@/lib/ai/model-options";
import {
  selectModels,
  recordModelUsage,
  markModelExhausted,
} from "@/lib/ai/capacity-selector";
import type {
  AiCompletionRequest,
  AiCompletionResponse,
  AiProviderName,
  AiStreamResponse,
  AiStreamChunk,
} from "@/lib/ai/types";

// ---------------------------------------------------------------------------
// AI Provider + Model Fallback Router — Vercel AI SDK
//
// Two-level fallback: providers (Groq → Cerebras → Gemini → OpenRouter),
// then models within each provider. The quality tier selects the model list.
//
// Uses the Vercel AI SDK's `generateText` and `streamText` with models
// accessed through the provider registry.
//
// Fallback rules:
// - Retryable errors (408, 409, 429, 5xx, timeout, network) → next model.
// - Non-retryable errors (400, 401, 403, 404, 422) → stop immediately.
// - Logs which provider/model was used and sanitised error info on failure.
// ---------------------------------------------------------------------------

const MAX_RETRY_AFTER_MS = 5_000;

const PROVIDER_TIMEOUTS: Record<AiProviderName, number> = {
  groq: 15_000,
  cerebras: 20_000,
  gemini: 20_000,
  mistral: 25_000,
  cloudflare: 25_000,
  nvidia: 30_000,
  openrouter: 30_000,
};

/** Ordered list of provider names that are configured. */
function getConfiguredProviderNames(): AiProviderName[] {
  const names: AiProviderName[] = [];
  if (groq) names.push("groq");
  if (cerebras) names.push("cerebras");
  if (google) names.push("gemini");
  if (mistral) names.push("mistral");
  if (cloudflare) names.push("cloudflare");
  if (nvidia) names.push("nvidia");
  if (openrouter) names.push("openrouter");
  return names;
}

function getProviderCandidates(
  requestedProvider: AiProviderName | undefined,
): AiProviderName[] {
  const all = getConfiguredProviderNames();
  return requestedProvider
    ? all.filter((p) => p === requestedProvider)
    : all;
}

function getModelCandidates(
  request: AiCompletionRequest,
  providerName: AiProviderName,
): string[] {
  if (request.provider === providerName && request.model.trim()) {
    return [request.model];
  }
  return getModelsForProvider(providerName, request.qualityTier ?? "balanced");
}

/** Get the registry model ID string for a provider + model combination. */
function getRegistryModelId(providerName: AiProviderName, model: string): `${string}:${string}` {
  // The registry uses the provider key we registered:
  // groq, cerebras, google (for gemini), mistral, cloudflare, openrouter
  const registryPrefix = providerName === "gemini" ? "google" : providerName;
  return `${registryPrefix}:${model}` as `${string}:${string}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function buildMessages(request: AiCompletionRequest) {
  return {
    system: request.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n") || undefined,
    messages: request.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
  };
}

// ---------------------------------------------------------------------------
// generateWithFallback
// ---------------------------------------------------------------------------

/**
 * Generate a completion using the capacity-aware model selector + fallback chain.
 *
 * Strategy:
 * 1. If a specific provider/model is requested, try only that (pinned).
 * 2. Otherwise, use the capacity selector to get an ordered list of models
 *    ranked by quality × available headroom.
 * 3. Try each model in order. On retryable errors (429, 5xx), mark exhausted
 *    and continue to the next. On non-retryable errors (401, 403), stop.
 * 4. If ALL models fail, throw.
 */
export async function generateWithFallback(
  request: AiCompletionRequest,
): Promise<AiCompletionResponse> {
  // If a specific provider+model is requested, use the old per-provider path
  if (request.provider && request.model.trim()) {
    return generateWithProviderFallback(request);
  }

  // Use capacity selector for smart model ordering
  const tier = request.qualityTier ?? "balanced";
  const modelIds = selectModels({
    needsTools: false,
    minQuality: tier === "cheap" ? 4 : tier === "best" ? 8 : 6,
  });

  if (modelIds.length === 0) {
    throw new Error(
      "No AI providers are configured. Add at least one API key to enable the assistant.",
    );
  }

  let lastError: unknown;
  const { system, messages } = buildMessages(request);

  for (const modelId of modelIds) {
    const [providerPrefix, ...modelParts] = modelId.split(":");
    const providerName = (providerPrefix === "google" ? "gemini" : providerPrefix) as AiProviderName;
    const model = modelParts.join(":");
    const timeout = PROVIDER_TIMEOUTS[providerName] ?? 25_000;

    try {
      const result = await generateText({
        model: registry.languageModel(modelId),
        system,
        messages,
        temperature: request.temperature,
        maxOutputTokens: request.maxOutputTokens,
        abortSignal: AbortSignal.timeout(timeout),
      });

      recordModelUsage(modelId);
      console.info(
        `[ai-router] Completion succeeded: model="${modelId}"`,
      );

      return {
        provider: providerName,
        model,
        text: result.text,
        usage: {
          promptTokens: result.usage?.inputTokens ?? undefined,
          completionTokens: result.usage?.outputTokens ?? undefined,
          totalTokens: result.usage
            ? (result.usage.inputTokens ?? 0) + (result.usage.outputTokens ?? 0)
            : undefined,
        },
        raw: result,
      };
    } catch (error) {
      lastError = error;
      const errorInfo = getSanitizedErrorInfo(error);

      console.warn(
        `[ai-router] Failed: model="${modelId}" status=${errorInfo.statusCode ?? "N/A"} retryable=${errorInfo.retryable} message="${errorInfo.message}"`,
      );

      if (!isRetryableError(error)) {
        throw error instanceof AiProviderError
          ? error
          : wrapProviderError(providerName, error);
      }

      markModelExhausted(modelId);

      if (error instanceof AiProviderError && error.retryAfterMs) {
        const waitMs = Math.min(error.retryAfterMs, MAX_RETRY_AFTER_MS);
        await sleep(waitMs);
      }
    }
  }

  if (lastError instanceof AiProviderError) throw lastError;
  throw new Error(lastError instanceof Error ? lastError.message : "All AI providers failed.");
}

/**
 * Legacy provider-specific fallback (used when a specific provider is pinned).
 */
async function generateWithProviderFallback(
  request: AiCompletionRequest,
): Promise<AiCompletionResponse> {
  const providers = getProviderCandidates(request.provider);

  if (providers.length === 0) {
    throw new Error(
      `The selected AI provider "${request.provider}" is not configured.`,
    );
  }

  let lastError: unknown;
  const { system, messages } = buildMessages(request);

  for (const providerName of providers) {
    const models = getModelCandidates(request, providerName);
    const timeout = PROVIDER_TIMEOUTS[providerName];

    for (const model of models) {
      const modelId = getRegistryModelId(providerName, model);

      try {
        const result = await generateText({
          model: registry.languageModel(modelId),
          system,
          messages,
          temperature: request.temperature,
          maxOutputTokens: request.maxOutputTokens,
          abortSignal: AbortSignal.timeout(timeout),
        });

        recordModelUsage(modelId);
        console.info(
          `[ai-router] Completion succeeded: provider="${providerName}" model="${model}"`,
        );

        return {
          provider: providerName,
          model,
          text: result.text,
          usage: {
            promptTokens: result.usage?.inputTokens ?? undefined,
            completionTokens: result.usage?.outputTokens ?? undefined,
            totalTokens: result.usage
              ? (result.usage.inputTokens ?? 0) + (result.usage.outputTokens ?? 0)
              : undefined,
          },
          raw: result,
        };
      } catch (error) {
        lastError = error;
        const errorInfo = getSanitizedErrorInfo(error);

        console.warn(
          `[ai-router] Failed: provider="${providerName}" model="${model}" status=${errorInfo.statusCode ?? "N/A"} retryable=${errorInfo.retryable}`,
        );

        if (!isRetryableError(error)) {
          throw error instanceof AiProviderError
            ? error
            : wrapProviderError(providerName, error);
        }

        markModelExhausted(modelId);
      }
    }
  }

  if (lastError instanceof AiProviderError) throw lastError;
  throw new Error(lastError instanceof Error ? lastError.message : "All AI providers failed.");
}

// ---------------------------------------------------------------------------
// streamWithFallback
// ---------------------------------------------------------------------------

/**
 * Start a streaming completion using the capacity-aware model selector + fallback chain.
 * Same strategy as generateWithFallback but returns an async iterable stream.
 */
export async function streamWithFallback(
  request: AiCompletionRequest,
  options?: { onFallback?: () => void },
): Promise<AiStreamResponse> {
  // If a specific provider+model is requested, use the pinned path
  if (request.provider && request.model.trim()) {
    return streamWithProviderFallback(request, options);
  }

  // Use capacity selector for smart model ordering
  const tier = request.qualityTier ?? "balanced";
  const modelIds = selectModels({
    needsTools: false,
    minQuality: tier === "cheap" ? 4 : tier === "best" ? 8 : 6,
  });

  if (modelIds.length === 0) {
    throw new Error(
      "No AI providers are configured. Add at least one API key to enable the assistant.",
    );
  }

  let lastError: unknown;
  let attemptCount = 0;
  const { system, messages } = buildMessages(request);

  for (const modelId of modelIds) {
    const [providerPrefix, ...modelParts] = modelId.split(":");
    const providerName = (providerPrefix === "google" ? "gemini" : providerPrefix) as AiProviderName;
    const model = modelParts.join(":");
    const timeout = PROVIDER_TIMEOUTS[providerName] ?? 25_000;

    try {
      const result = streamText({
        model: registry.languageModel(modelId),
        system,
        messages,
        temperature: request.temperature,
        maxOutputTokens: request.maxOutputTokens,
        abortSignal: AbortSignal.timeout(timeout),
      });

      const textStream = result.textStream;

      recordModelUsage(modelId);
      console.info(`[ai-router] Stream started: model="${modelId}"`);

      async function* chunks(): AsyncGenerator<AiStreamChunk> {
        for await (const chunk of textStream) {
          if (chunk) {
            yield { delta: chunk, finishReason: null };
          }
        }
        yield { delta: "", finishReason: "stop" };
      }

      return {
        provider: providerName,
        model,
        stream: chunks(),
      };
    } catch (error) {
      lastError = error;
      attemptCount += 1;
      const errorInfo = getSanitizedErrorInfo(error);

      console.warn(
        `[ai-router] Stream failed: model="${modelId}" status=${errorInfo.statusCode ?? "N/A"} retryable=${errorInfo.retryable}`,
      );

      if (!isRetryableError(error)) {
        throw error instanceof AiProviderError
          ? error
          : wrapProviderError(providerName, error);
      }

      markModelExhausted(modelId);

      if (attemptCount === 1 && options?.onFallback) {
        options.onFallback();
      }

      if (error instanceof AiProviderError && error.retryAfterMs) {
        const waitMs = Math.min(error.retryAfterMs, MAX_RETRY_AFTER_MS);
        await sleep(waitMs);
      }
    }
  }

  if (lastError instanceof AiProviderError) throw lastError;
  throw new Error(lastError instanceof Error ? lastError.message : "All AI providers failed.");
}

/**
 * Legacy provider-specific streaming fallback (used when a specific provider is pinned).
 */
async function streamWithProviderFallback(
  request: AiCompletionRequest,
  options?: { onFallback?: () => void },
): Promise<AiStreamResponse> {
  const providers = getProviderCandidates(request.provider);

  if (providers.length === 0) {
    throw new Error(
      `The selected AI provider "${request.provider}" is not configured.`,
    );
  }

  let lastError: unknown;
  let attemptCount = 0;
  const { system, messages } = buildMessages(request);

  for (const providerName of providers) {
    const models = getModelCandidates(request, providerName);
    const timeout = PROVIDER_TIMEOUTS[providerName];

    for (const model of models) {
      const modelId = getRegistryModelId(providerName, model);

      try {
        const result = streamText({
          model: registry.languageModel(modelId),
          system,
          messages,
          temperature: request.temperature,
          maxOutputTokens: request.maxOutputTokens,
          abortSignal: AbortSignal.timeout(timeout),
        });

        const textStream = result.textStream;

        recordModelUsage(modelId);
        console.info(
          `[ai-router] Stream started: provider="${providerName}" model="${model}"`,
        );

        async function* chunks(): AsyncGenerator<AiStreamChunk> {
          for await (const chunk of textStream) {
            if (chunk) {
              yield { delta: chunk, finishReason: null };
            }
          }
          yield { delta: "", finishReason: "stop" };
        }

        return {
          provider: providerName,
          model,
          stream: chunks(),
        };
      } catch (error) {
        lastError = error;
        attemptCount += 1;
        const errorInfo = getSanitizedErrorInfo(error);

        console.warn(
          `[ai-router] Stream failed: provider="${providerName}" model="${model}" status=${errorInfo.statusCode ?? "N/A"} retryable=${errorInfo.retryable}`,
        );

        if (!isRetryableError(error)) {
          throw error instanceof AiProviderError
            ? error
            : wrapProviderError(providerName, error);
        }

        markModelExhausted(modelId);

        if (attemptCount === 1 && options?.onFallback) {
          options.onFallback();
        }
      }
    }
  }

  if (lastError instanceof AiProviderError) throw lastError;
  throw new Error(lastError instanceof Error ? lastError.message : "All AI providers failed.");
}

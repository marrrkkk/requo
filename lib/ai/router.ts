import "server-only";

import { getConfiguredProviders, getModelsForProvider } from "@/lib/ai/config";
import {
  AiProviderError,
  getSanitizedErrorInfo,
  isRetryableError,
} from "@/lib/ai/errors";
import type {
  AiCompletionRequest,
  AiCompletionResponse,
  AiStreamResponse,
} from "@/lib/ai/types";

// ---------------------------------------------------------------------------
// AI Provider + Model Fallback Router
//
// Two-level fallback: providers (Groq → Gemini → OpenRouter), then models
// within each provider. The quality tier (balanced / cheap / best / coding)
// selects which model list each provider uses.
//
// Loop logic:
//   for each provider in [groq, gemini, openrouter]:
//     for each model in provider.models[qualityTier]:
//       try request
//       if success → return normalised response
//       if retryable error → continue to next model/provider
//       if non-retryable error → stop immediately
//
// Fallback rules:
// - Retryable errors (408, 409, 429, 5xx, timeout, network) → next model.
// - Non-retryable errors (400, 401, 403, 404, 422) → stop immediately.
// - Respects Retry-After header but caps waiting to MAX_RETRY_AFTER_MS.
// - Logs which provider/model was used and sanitised error info on failure.
//
// Adding a new provider:
//   1. Implement the AiProvider interface in a new file.
//   2. Add it to ALL_PROVIDERS in config.ts.
//   3. Add model lists to PROVIDER_MODELS in config.ts.
//   4. Done — the router picks it up automatically.
// ---------------------------------------------------------------------------

const MAX_RETRY_AFTER_MS = 5_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Generate a completion using the provider + model fallback chain.
 *
 * Tries each model within each configured provider. Falls back to the next
 * model (or next provider) only for retryable errors. Non-retryable errors
 * stop the chain immediately.
 */
export async function generateWithFallback(
  request: AiCompletionRequest,
): Promise<AiCompletionResponse> {
  const providers = getConfiguredProviders();

  if (providers.length === 0) {
    throw new Error(
      "No AI providers are configured. Add at least one API key (GROQ_API_KEY, GEMINI_API_KEY, or OPENROUTER_API_KEY) to enable the assistant.",
    );
  }

  const tier = request.qualityTier ?? "balanced";
  let lastError: unknown;

  for (const provider of providers) {
    const models = getModelsForProvider(provider.name, tier);

    for (let m = 0; m < models.length; m += 1) {
      const model = models[m];

      try {
        const response = await provider.generateCompletion({
          ...request,
          model,
        });

        console.info(
          `[ai-router] Completion succeeded: provider="${response.provider}" model="${response.model}"`,
        );

        return response;
      } catch (error) {
        lastError = error;

        const errorInfo = getSanitizedErrorInfo(error);

        console.warn(
          `[ai-router] Failed: provider="${provider.name}" model="${model}" status=${errorInfo.statusCode ?? "N/A"} retryable=${errorInfo.retryable} message="${errorInfo.message}"`,
        );

        // Non-retryable → stop the entire chain
        if (!isRetryableError(error)) {
          console.warn(
            `[ai-router] Non-retryable error, stopping fallback chain.`,
          );
          throw error instanceof AiProviderError
            ? error
            : new Error(
                error instanceof Error
                  ? error.message
                  : "All AI providers failed.",
              );
        }

        // Honour Retry-After (capped) before trying the next model/provider
        if (error instanceof AiProviderError && error.retryAfterMs) {
          const waitMs = Math.min(error.retryAfterMs, MAX_RETRY_AFTER_MS);

          console.info(
            `[ai-router] Waiting ${waitMs}ms (Retry-After) before next attempt.`,
          );

          await sleep(waitMs);
        }
      }
    }
  }

  // All providers and models exhausted
  if (lastError instanceof AiProviderError) {
    throw lastError;
  }

  throw new Error(
    lastError instanceof Error
      ? lastError.message
      : "All AI providers failed.",
  );
}

/**
 * Start a streaming completion using the provider + model fallback chain.
 *
 * The fallback applies to the initial connection phase. Once a provider
 * starts streaming successfully, we commit to it. If the connection itself
 * fails with a retryable error, we try the next model/provider.
 */
export async function streamWithFallback(
  request: AiCompletionRequest,
): Promise<AiStreamResponse> {
  const providers = getConfiguredProviders();

  if (providers.length === 0) {
    throw new Error(
      "No AI providers are configured. Add at least one API key (GROQ_API_KEY, GEMINI_API_KEY, or OPENROUTER_API_KEY) to enable the assistant.",
    );
  }

  const tier = request.qualityTier ?? "balanced";
  let lastError: unknown;

  for (const provider of providers) {
    const models = getModelsForProvider(provider.name, tier);

    for (let m = 0; m < models.length; m += 1) {
      const model = models[m];

      try {
        const streamResponse = await provider.generateStream({
          ...request,
          model,
        });

        console.info(
          `[ai-router] Stream started: provider="${streamResponse.provider}" model="${streamResponse.model}"`,
        );

        return streamResponse;
      } catch (error) {
        lastError = error;

        const errorInfo = getSanitizedErrorInfo(error);

        console.warn(
          `[ai-router] Stream failed: provider="${provider.name}" model="${model}" status=${errorInfo.statusCode ?? "N/A"} retryable=${errorInfo.retryable} message="${errorInfo.message}"`,
        );

        if (!isRetryableError(error)) {
          console.warn(
            `[ai-router] Non-retryable stream error, stopping fallback chain.`,
          );
          throw error instanceof AiProviderError
            ? error
            : new Error(
                error instanceof Error
                  ? error.message
                  : "All AI providers failed.",
              );
        }

        if (error instanceof AiProviderError && error.retryAfterMs) {
          const waitMs = Math.min(error.retryAfterMs, MAX_RETRY_AFTER_MS);

          console.info(
            `[ai-router] Waiting ${waitMs}ms (Retry-After) before next attempt.`,
          );

          await sleep(waitMs);
        }
      }
    }
  }

  if (lastError instanceof AiProviderError) {
    throw lastError;
  }

  throw new Error(
    lastError instanceof Error
      ? lastError.message
      : "All AI providers failed.",
  );
}

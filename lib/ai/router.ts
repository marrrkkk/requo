import "server-only";

import { getConfiguredProviders } from "@/lib/ai/config";
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
// AI Provider Fallback Router
//
// Attempts providers in order: Groq → Gemini → OpenRouter.
// Only providers with valid API keys are attempted.
//
// Fallback rules:
// - Retryable errors (429, 5xx, timeout, network) → try next provider.
// - Non-retryable errors (400, 401, 403, 404, 422) → stop immediately.
// - Respects Retry-After header but caps waiting to MAX_RETRY_AFTER_MS.
// - Logs which provider was used and sanitized error info for failures.
//
// Adding a new provider:
//   1. Implement the AiProvider interface in a new file.
//   2. Add it to the ALL_PROVIDERS array in config.ts.
//   3. Done — the router will include it automatically.
// ---------------------------------------------------------------------------

const MAX_RETRY_AFTER_MS = 5_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Generate a completion using the provider fallback chain.
 *
 * Tries each configured provider in order. Falls back to the next provider
 * only for retryable errors. Non-retryable errors stop the chain immediately.
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

  let lastError: unknown;

  for (let i = 0; i < providers.length; i += 1) {
    const provider = providers[i];

    try {
      const response = await provider.generateCompletion(request);

      console.info(
        `[ai-router] Completion succeeded with provider="${response.provider}" model="${response.model}"`,
      );

      return response;
    } catch (error) {
      lastError = error;

      const errorInfo = getSanitizedErrorInfo(error);
      const isLast = i === providers.length - 1;

      console.warn(
        `[ai-router] Provider "${provider.name}" failed: status=${errorInfo.statusCode ?? "N/A"} retryable=${errorInfo.retryable} message="${errorInfo.message}"`,
      );

      // Non-retryable error → stop immediately, do not try other providers
      if (!isRetryableError(error)) {
        console.warn(
          `[ai-router] Non-retryable error from "${provider.name}", stopping fallback chain.`,
        );
        break;
      }

      // If there is a Retry-After delay and we have more providers, honour
      // it (capped) before trying the next provider
      if (!isLast && error instanceof AiProviderError && error.retryAfterMs) {
        const waitMs = Math.min(error.retryAfterMs, MAX_RETRY_AFTER_MS);

        console.info(
          `[ai-router] Waiting ${waitMs}ms (Retry-After) before trying next provider.`,
        );

        await sleep(waitMs);
      }
    }
  }

  // All providers failed or a non-retryable error was hit
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
 * Start a streaming completion using the provider fallback chain.
 *
 * The fallback applies to the initial connection phase. Once a provider
 * starts streaming successfully, we commit to it. If the connection itself
 * fails with a retryable error, we fall back to the next provider.
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

  let lastError: unknown;

  for (let i = 0; i < providers.length; i += 1) {
    const provider = providers[i];

    try {
      const streamResponse = await provider.generateStream(request);

      console.info(
        `[ai-router] Stream started with provider="${streamResponse.provider}" model="${streamResponse.model}"`,
      );

      return streamResponse;
    } catch (error) {
      lastError = error;

      const errorInfo = getSanitizedErrorInfo(error);
      const isLast = i === providers.length - 1;

      console.warn(
        `[ai-router] Provider "${provider.name}" stream failed: status=${errorInfo.statusCode ?? "N/A"} retryable=${errorInfo.retryable} message="${errorInfo.message}"`,
      );

      if (!isRetryableError(error)) {
        console.warn(
          `[ai-router] Non-retryable stream error from "${provider.name}", stopping fallback chain.`,
        );
        break;
      }

      if (!isLast && error instanceof AiProviderError && error.retryAfterMs) {
        const waitMs = Math.min(error.retryAfterMs, MAX_RETRY_AFTER_MS);

        console.info(
          `[ai-router] Waiting ${waitMs}ms (Retry-After) before trying next provider.`,
        );

        await sleep(waitMs);
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

import "server-only";

import Cerebras from "@cerebras/cerebras_cloud_sdk";

import { env, isCerebrasConfigured } from "@/lib/env";
import { wrapProviderError } from "@/lib/ai/errors";
import type {
  AiCompletionRequest,
  AiCompletionResponse,
  AiProvider,
  AiStreamChunk,
  AiStreamResponse,
} from "@/lib/ai/types";

// ---------------------------------------------------------------------------
// Cerebras Provider
//
// Uses the official @cerebras/cerebras_cloud_sdk which is OpenAI-compatible.
// Base URL: https://api.cerebras.ai/v1 (SDK default).
// Timeout: 20 s — Cerebras is extremely fast (2000+ tok/s) but network
// latency and cold starts can add a few seconds.
// SDK retries disabled (maxRetries: 0) because the app-level router
// controls fallback across providers.
// ---------------------------------------------------------------------------

const CEREBRAS_TIMEOUT_MS = 20_000;

function getCerebrasClient(): Cerebras | null {
  if (!isCerebrasConfigured || !env.CEREBRAS_API_KEY) {
    return null;
  }

  return new Cerebras({
    apiKey: env.CEREBRAS_API_KEY,
    maxRetries: 0,
    timeout: CEREBRAS_TIMEOUT_MS,
  });
}

export const cerebrasProvider: AiProvider = {
  name: "cerebras",

  isConfigured() {
    return isCerebrasConfigured;
  },

  async generateCompletion(
    request: AiCompletionRequest,
  ): Promise<AiCompletionResponse> {
    const client = getCerebrasClient();

    if (!client) {
      throw wrapProviderError("cerebras", new Error("Cerebras is not configured."));
    }

    try {
      const response = await client.chat.completions.create({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature,
        max_completion_tokens: request.maxOutputTokens,
        stream: false,
      }) as {
        choices?: Array<{ message?: { content?: string } }>;
        model?: string;
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };

      const text = response.choices?.[0]?.message?.content ?? "";

      return {
        provider: "cerebras",
        model: response.model || request.model,
        text,
        usage: response.usage
          ? {
              promptTokens: response.usage.prompt_tokens ?? undefined,
              completionTokens: response.usage.completion_tokens ?? undefined,
              totalTokens: response.usage.total_tokens ?? undefined,
            }
          : undefined,
        raw: response,
      };
    } catch (error) {
      throw wrapProviderError("cerebras", error);
    }
  },

  async generateStream(
    request: AiCompletionRequest,
  ): Promise<AiStreamResponse> {
    const client = getCerebrasClient();

    if (!client) {
      throw wrapProviderError("cerebras", new Error("Cerebras is not configured."));
    }

    try {
      const stream = await client.chat.completions.create({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature,
        max_completion_tokens: request.maxOutputTokens,
        stream: true,
      }) as AsyncIterable<{
        choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }>;
      }>;

      async function* chunks(): AsyncGenerator<AiStreamChunk> {
        for await (const chunk of stream) {
          const delta = chunk.choices?.[0]?.delta?.content ?? "";
          const finishReason = chunk.choices?.[0]?.finish_reason ?? null;

          if (delta || finishReason) {
            yield { delta, finishReason };
          }
        }
      }

      return {
        provider: "cerebras",
        model: request.model,
        stream: chunks(),
      };
    } catch (error) {
      throw wrapProviderError("cerebras", error);
    }
  },
};

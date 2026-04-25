import "server-only";

import Groq from "groq-sdk";

import { env, isGroqConfigured } from "@/lib/env";
import { wrapProviderError } from "@/lib/ai/errors";
import type {
  AiCompletionRequest,
  AiCompletionResponse,
  AiProvider,
  AiStreamChunk,
  AiStreamResponse,
} from "@/lib/ai/types";

// ---------------------------------------------------------------------------
// Groq Provider
//
// Uses the official Groq TypeScript SDK which is OpenAI-compatible.
// Base URL: https://api.groq.com/openai/v1 (SDK default).
// Timeout: 15 s — Groq is fast, so a short timeout is appropriate.
// SDK retries disabled (maxRetries: 0) because the app-level router
// controls fallback across providers.
// ---------------------------------------------------------------------------

const GROQ_TIMEOUT_MS = 15_000;

function getGroqClient(): Groq | null {
  if (!isGroqConfigured || !env.GROQ_API_KEY) {
    return null;
  }

  return new Groq({
    apiKey: env.GROQ_API_KEY,
    maxRetries: 0,
    timeout: GROQ_TIMEOUT_MS,
  });
}

export const groqProvider: AiProvider = {
  name: "groq",

  isConfigured() {
    return isGroqConfigured;
  },

  async generateCompletion(
    request: AiCompletionRequest,
  ): Promise<AiCompletionResponse> {
    const client = getGroqClient();

    if (!client) {
      throw wrapProviderError("groq", new Error("Groq is not configured."));
    }

    try {
      const response = await client.chat.completions.create({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature,
        max_completion_tokens: request.maxOutputTokens,
        stream: false,
      });

      const text = response.choices?.[0]?.message?.content ?? "";

      return {
        provider: "groq",
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
      throw wrapProviderError("groq", error);
    }
  },

  async generateStream(
    request: AiCompletionRequest,
  ): Promise<AiStreamResponse> {
    const client = getGroqClient();

    if (!client) {
      throw wrapProviderError("groq", new Error("Groq is not configured."));
    }

    try {
      const stream = await client.chat.completions.create({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature,
        max_completion_tokens: request.maxOutputTokens,
        stream: true,
      });

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
        provider: "groq",
        model: request.model,
        stream: chunks(),
      };
    } catch (error) {
      throw wrapProviderError("groq", error);
    }
  },
};

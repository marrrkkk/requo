import "server-only";

import { isOpenRouterConfigured } from "@/lib/env";
import { getOpenRouterClient } from "@/lib/openrouter/client";
import { wrapProviderError } from "@/lib/ai/errors";
import type {
  AiCompletionRequest,
  AiCompletionResponse,
  AiProvider,
  AiStreamChunk,
  AiStreamResponse,
} from "@/lib/ai/types";

// ---------------------------------------------------------------------------
// OpenRouter Provider
//
// Wraps the existing lib/openrouter/client.ts so it can be used as a
// provider in the fallback chain. This is the final fallback and keeps
// the most generous timeout (30 s).
//
// The OpenRouter SDK does not expose a `maxRetries` or `timeout` option
// on the client constructor, so we rely on the router-level timeout
// (AbortSignal) for safety.
// ---------------------------------------------------------------------------

const OPENROUTER_TIMEOUT_MS = 30_000;

export const openrouterProvider: AiProvider = {
  name: "openrouter",

  isConfigured() {
    return isOpenRouterConfigured;
  },

  async generateCompletion(
    request: AiCompletionRequest,
  ): Promise<AiCompletionResponse> {
    const client = getOpenRouterClient();

    if (!client) {
      throw wrapProviderError(
        "openrouter",
        new Error("OpenRouter is not configured."),
      );
    }

    const model = request.model;

    try {
      const response = await client.chat.send(
        {
          chatGenerationParams: {
            model,
            messages: request.messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            temperature: request.temperature,
            maxCompletionTokens: request.maxOutputTokens,
            stream: false,
          },
        },
        { timeoutMs: OPENROUTER_TIMEOUT_MS },
      );

      // Extract text from the OpenRouter response shape
      const text = extractTextFromResponse(response);

      return {
        provider: "openrouter",
        model: response.model || model,
        text,
        usage: response.usage
          ? {
              promptTokens: response.usage.promptTokens ?? undefined,
              completionTokens: response.usage.completionTokens ?? undefined,
              totalTokens: response.usage.totalTokens ?? undefined,
            }
          : undefined,
        raw: response,
      };
    } catch (error) {
      throw wrapProviderError("openrouter", error);
    }
  },

  async generateStream(
    request: AiCompletionRequest,
  ): Promise<AiStreamResponse> {
    const client = getOpenRouterClient();

    if (!client) {
      throw wrapProviderError(
        "openrouter",
        new Error("OpenRouter is not configured."),
      );
    }

    const model = request.model;

    try {
      const stream = await client.chat.send(
        {
          chatGenerationParams: {
            model,
            messages: request.messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            temperature: request.temperature,
            maxCompletionTokens: request.maxOutputTokens,
            stream: true,
          },
        },
        { timeoutMs: OPENROUTER_TIMEOUT_MS },
      );

      async function* chunks(): AsyncGenerator<AiStreamChunk> {
        for await (const chunk of stream) {
          // Handle stream-level errors from OpenRouter
          if (chunk.error?.message) {
            throw new Error(chunk.error.message);
          }

          const choice = chunk.choices?.[0];
          const delta = choice?.delta?.content ?? "";
          const finishReason = choice?.finishReason ?? null;

          if (delta || finishReason) {
            yield { delta, finishReason: typeof finishReason === "string" ? finishReason : null };
          }
        }
      }

      return {
        provider: "openrouter",
        model,
        stream: chunks(),
      };
    } catch (error) {
      throw wrapProviderError("openrouter", error);
    }
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractTextFromResponse(response: {
  choices?: Array<{
    message?: {
      content?: unknown;
      refusal?: string | null;
    };
  }>;
}): string {
  const message = response.choices?.[0]?.message;

  if (!message) {
    return "";
  }

  const content = extractTextFromMessageContent(message.content).trim();

  if (content) {
    return content;
  }

  if (typeof message.refusal === "string" && message.refusal.trim()) {
    return message.refusal.trim();
  }

  return "";
}

function extractTextFromMessageContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (
          typeof part === "object" &&
          part !== null &&
          "text" in part &&
          typeof part.text === "string"
        ) {
          return part.text;
        }

        return "";
      })
      .join("");
  }

  return "";
}

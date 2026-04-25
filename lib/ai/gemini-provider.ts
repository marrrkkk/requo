import "server-only";

import { GoogleGenAI } from "@google/genai";

import { env, isGeminiConfigured } from "@/lib/env";
import { wrapProviderError } from "@/lib/ai/errors";
import type {
  AiCompletionRequest,
  AiCompletionResponse,
  AiProvider,
  AiStreamChunk,
  AiStreamResponse,
} from "@/lib/ai/types";

// ---------------------------------------------------------------------------
// Gemini Provider
//
// Uses the official @google/genai TypeScript SDK.
// Timeout: 20 s via AbortSignal.timeout().
// The SDK does not expose a retry config, so we rely on the router for
// fallback. Each call is a single attempt with a hard timeout.
// ---------------------------------------------------------------------------

const GEMINI_TIMEOUT_MS = 20_000;

function getGeminiClient(): GoogleGenAI | null {
  if (!isGeminiConfigured || !env.GEMINI_API_KEY) {
    return null;
  }

  return new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
}

export const geminiProvider: AiProvider = {
  name: "gemini",

  isConfigured() {
    return isGeminiConfigured;
  },

  async generateCompletion(
    request: AiCompletionRequest,
  ): Promise<AiCompletionResponse> {
    const client = getGeminiClient();

    if (!client) {
      throw wrapProviderError("gemini", new Error("Gemini is not configured."));
    }

    const model = request.model;

    // Build contents from messages. Gemini uses `contents` instead of
    // `messages`. System instructions are passed separately.
    const systemInstruction = request.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n");

    const contents = request.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? ("model" as const) : ("user" as const),
        parts: [{ text: m.content }],
      }));

    try {
      const response = await client.models.generateContent({
        model,
        contents,
        config: {
          temperature: request.temperature,
          maxOutputTokens: request.maxOutputTokens,
          systemInstruction: systemInstruction || undefined,
          abortSignal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
        },
      });

      const text = response.text ?? "";

      return {
        provider: "gemini",
        model,
        text,
        usage: response.usageMetadata
          ? {
              promptTokens: response.usageMetadata.promptTokenCount ?? undefined,
              completionTokens:
                response.usageMetadata.candidatesTokenCount ?? undefined,
              totalTokens:
                response.usageMetadata.totalTokenCount ?? undefined,
            }
          : undefined,
        raw: response,
      };
    } catch (error) {
      throw wrapProviderError("gemini", error);
    }
  },

  async generateStream(
    request: AiCompletionRequest,
  ): Promise<AiStreamResponse> {
    const client = getGeminiClient();

    if (!client) {
      throw wrapProviderError("gemini", new Error("Gemini is not configured."));
    }

    const model = request.model;

    const systemInstruction = request.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n");

    const contents = request.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? ("model" as const) : ("user" as const),
        parts: [{ text: m.content }],
      }));

    try {
      const streamResponse = await client.models.generateContentStream({
        model,
        contents,
        config: {
          temperature: request.temperature,
          maxOutputTokens: request.maxOutputTokens,
          systemInstruction: systemInstruction || undefined,
          abortSignal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
        },
      });

      async function* chunks(): AsyncGenerator<AiStreamChunk> {
        for await (const chunk of streamResponse) {
          const delta = chunk.text ?? "";
          const finishReason =
            chunk.candidates?.[0]?.finishReason ?? null;

          if (delta || finishReason) {
            yield { delta, finishReason };
          }
        }
      }

      return {
        provider: "gemini",
        model,
        stream: chunks(),
      };
    } catch (error) {
      throw wrapProviderError("gemini", error);
    }
  },
};

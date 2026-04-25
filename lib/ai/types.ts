import "server-only";

// ---------------------------------------------------------------------------
// AI Provider Abstraction — shared types
//
// Every provider (Groq, Gemini, OpenRouter) normalizes its SDK-specific
// inputs and outputs into these shapes. The router in `router.ts` works
// exclusively with these types so adding a new provider later only requires
// implementing the `AiProvider` interface.
// ---------------------------------------------------------------------------

/** Identifiers for each supported AI provider. */
export type AiProviderName = "groq" | "gemini" | "openrouter";

/**
 * Quality tier controls which models are preferred within each provider.
 *
 * - "balanced" — default order, good quality/speed tradeoff.
 * - "cheap"    — prefer fast/high-volume models first.
 * - "best"     — prefer strongest models first.
 * - "coding"   — prefer coding-capable models.
 */
export type AiQualityTier = "balanced" | "cheap" | "best" | "coding";

/** Normalized chat message shape sent to every provider. */
export type AiChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/** Normalized request shape passed to each provider. */
export type AiCompletionRequest = {
  model: string;
  messages: AiChatMessage[];
  temperature: number;
  maxOutputTokens: number;
  qualityTier?: AiQualityTier;
};

/** Normalized response returned by every provider. */
export type AiCompletionResponse = {
  provider: AiProviderName;
  model: string;
  text: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  raw?: unknown;
};

/** Normalized streaming chunk from any provider. */
export type AiStreamChunk = {
  delta: string;
  finishReason?: string | null;
};

/** Async iterable of stream chunks, plus metadata about the provider. */
export type AiStreamResponse = {
  provider: AiProviderName;
  model: string;
  stream: AsyncIterable<AiStreamChunk>;
};

/**
 * Provider interface — each provider implements this contract.
 *
 * `isConfigured()` gates whether the router will attempt the provider.
 * `generateCompletion()` returns the full response in one shot.
 * `generateStream()` returns an async iterable of text deltas.
 */
export type AiProvider = {
  name: AiProviderName;
  isConfigured: () => boolean;
  generateCompletion: (
    request: AiCompletionRequest,
  ) => Promise<AiCompletionResponse>;
  generateStream: (
    request: AiCompletionRequest,
  ) => Promise<AiStreamResponse>;
};

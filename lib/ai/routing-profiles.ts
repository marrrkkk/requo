import "server-only";

/**
 * Routing profiles — one per kind of work.
 *
 * Replaces the inert quality-tier lever (minimum quality scores of 4/6/8
 * where every entry scored 7+, so "cheap" and "balanced" selected an
 * identical pool). Each surface declares which kind of work it is doing; the
 * provider order for each kind is data, so changing a chain is an edit to a
 * table rather than to control flow.
 */

export type AiRoutingProfile =
  | "assistant_chat" // owner Assistant: 12 tool schemas, long history
  | "agent_chat" // public customer Agent: 5 tool schemas, short turns
  | "quote_draft" // 4K output, large grounded prompt, accuracy-critical
  | "quote_improvement"
  | "short_text" // follow-up suggestions, analytics summaries, digests
  | "extraction"; // importer, multimodal

export type RoutingProfileDefinition = {
  /** Whether the chain may only contain tool-capable entries. */
  needsTools: boolean;
  /** Minimum quality score. */
  minQuality: number;
  /** Explicit provider/model order — data, not control flow. */
  order: Array<`${string}:${string}`>;
  /** Providers excluded outright (never offered a request they must refuse). */
  excludedProviders: string[];
  /** Human-readable reasoning for the order. */
  reasoning: string;
};

/**
 * Twelve tool schemas plus a long system prompt is ~2.5-3K tokens of fixed
 * overhead per step across up to five steps. Only high-TPM providers survive
 * that; Groq's 8K TPM puts it late in the chain, not first.
 */
const ASSISTANT_CHAT_ORDER = [
  "google:gemini-2.5-flash-lite",
  "cerebras:gpt-oss-120b",
  "cerebras:qwen-3-32b",
  "mistral:mistral-medium-latest",
  "openrouter:z-ai/glm-4.5-air:free",
  "groq:openai/gpt-oss-120b",
  "groq:openai/gpt-oss-20b",
  "google:gemini-2.5-flash",
  "google:gemini-2.5-pro",
] as Array<`${string}:${string}`>;

/**
 * Five tools and a short system prompt fit 8K TPM, and Groq is the fastest —
 * the right trade for an anonymous public surface.
 */
const AGENT_CHAT_ORDER = [
  "groq:openai/gpt-oss-20b",
  "groq:openai/gpt-oss-120b",
  "google:gemini-2.5-flash-lite",
  "cerebras:gpt-oss-120b",
  "cerebras:qwen-3-32b",
  "mistral:mistral-small-latest",
  "openrouter:nvidia/nemotron-3-super-120b-a12b:free",
] as Array<`${string}:${string}`>;

/**
 * A 4,000-token output plus a knowledge-grounded prompt cannot fit Groq's 8K
 * TPM, so Groq is excluded entirely. The 1M-context OpenRouter entries are
 * the escape hatch for the largest grounded prompts; Gemini Pro is reserve.
 */
const QUOTE_ORDER = [
  "mistral:mistral-medium-latest",
  "cerebras:gpt-oss-120b",
  "cerebras:qwen-3-32b",
  "google:gemini-2.5-flash",
  "openrouter:deepseek/deepseek-v4-flash:free",
  "openrouter:nvidia/nemotron-3-super-120b-a12b:free",
  "openrouter:openai/gpt-oss-120b:free",
  "google:gemini-2.5-pro",
] as Array<`${string}:${string}`>;

/**
 * 150-300 output tokens. Deliberately keeps the high-TPM providers free for
 * chat.
 */
const SHORT_TEXT_ORDER = [
  "groq:openai/gpt-oss-20b",
  "cloudflare:@cf/openai/gpt-oss-20b",
  "cerebras:qwen-3-32b",
  "nvidia:meta/llama-3.1-8b-instruct",
  "openrouter:z-ai/glm-4.5-air:free",
] as Array<`${string}:${string}`>;

const EXTRACTION_ORDER = [
  "google:gemini-2.5-flash",
  "google:gemini-2.5-flash-lite",
] as Array<`${string}:${string}`>;

export const ROUTING_PROFILES: Record<
  AiRoutingProfile,
  RoutingProfileDefinition
> = {
  assistant_chat: {
    needsTools: true,
    minQuality: 7,
    order: ASSISTANT_CHAT_ORDER,
    excludedProviders: ["cloudflare", "nvidia"],
    reasoning:
      "Chat with 12 tool schemas served by the most generous tool-capable free allowance first.",
  },
  agent_chat: {
    needsTools: true,
    minQuality: 7,
    order: AGENT_CHAT_ORDER,
    excludedProviders: ["cloudflare", "nvidia"],
    reasoning:
      "Public agent ordered by speed within what fits short turns.",
  },
  quote_draft: {
    needsTools: false,
    minQuality: 7,
    order: QUOTE_ORDER,
    excludedProviders: ["groq", "cloudflare", "nvidia"],
    reasoning:
      "4K draft plus grounding cannot fit Groq 8K TPM; 1M-context escape hatch kept.",
  },
  quote_improvement: {
    needsTools: false,
    minQuality: 7,
    order: QUOTE_ORDER,
    excludedProviders: ["groq", "cloudflare", "nvidia"],
    reasoning: "Refining a draft is no more fragile than creating one.",
  },
  short_text: {
    needsTools: false,
    minQuality: 5,
    order: SHORT_TEXT_ORDER,
    excludedProviders: [],
    reasoning: "Short background work on small models; keeps chat allowance free.",
  },
  extraction: {
    needsTools: false,
    minQuality: 7,
    order: EXTRACTION_ORDER,
    excludedProviders: [],
    reasoning: "Multimodal document reading via Gemini.",
  },
};

/** Map legacy AI task types onto routing profiles. */
export function profileForTaskType(
  taskType: string,
): AiRoutingProfile {
  switch (taskType) {
    case "assistant_message":
      return "assistant_chat";
    case "agent_conversation":
      return "agent_chat";
    case "quote_draft":
      return "quote_draft";
    case "quote_improvement":
      return "quote_improvement";
    default:
      return "short_text";
  }
}

import "server-only";

import { generateWithFallback } from "@/lib/ai/router";
import type { IntentResult, ToolCategory } from "./types";

// ---------------------------------------------------------------------------
// Intent Classifier
//
// Lightweight pre-classification using cheap-tier model to determine which
// tools, memory categories, and prompt modules are relevant for a message.
// ---------------------------------------------------------------------------

const DEFAULT_INTENT_RESULT: IntentResult = {
  intent: "general_question",
  toolCategories: ["query_tools", "action_tools"],
  memoryCategories: [],
  promptModules: ["base_identity", "safety_constraints"],
};

const MAX_MESSAGE_LENGTH = 600;
const CACHE_TTL_MS = 60_000;
const CLASSIFICATION_TIMEOUT_MS = 2_000;

// ---------------------------------------------------------------------------
// In-memory cache (60s TTL)
// ---------------------------------------------------------------------------

type CacheEntry = {
  result: IntentResult;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

function getCacheKey(message: string, conversationId: string): string {
  return `${message.slice(0, MAX_MESSAGE_LENGTH)}::${conversationId}`;
}

function getCached(key: string): IntentResult | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.result;
}

function setCache(key: string, result: IntentResult): void {
  cache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ---------------------------------------------------------------------------
// System prompt for classification (kept ≤ 400 tokens)
// ---------------------------------------------------------------------------

const CLASSIFICATION_SYSTEM_PROMPT = `You are an intent classifier for a business assistant. Classify the user message and output JSON only.

Output format:
{"intent":"<category>","toolCategories":[...],"memoryCategories":[...],"promptModules":[...]}

intent values: data_query, quote_action, follow_up_action, analytics, general_question, memory_recall, workflow_guidance

toolCategories values: query_tools, action_tools (include relevant ones)

memoryCategories values: business_rules, pricing_knowledge, customer_context, workflow_preferences (include only if needed)

promptModules values: base_identity, formatting_rules, tool_usage_instructions, sales_support, quoting_guidance, follow_up_guidance, safety_constraints, analytics_guidance
Always include base_identity and safety_constraints. Add others relevant to the intent. Max 10 modules.

Rules:
- data_query: user asks about inquiries, quotes, customers, or data
- quote_action: user wants to create, edit, send, or manage quotes
- follow_up_action: user wants to schedule or manage follow-ups
- analytics: user asks about metrics, conversion, or performance
- memory_recall: user references past preferences or stored knowledge
- workflow_guidance: user asks how to use the system
- general_question: anything else

Output valid JSON only. No explanation.`;

// ---------------------------------------------------------------------------
// Classification function
// ---------------------------------------------------------------------------

/**
 * Classifies the intent of a user message using a cheap-tier model call.
 * Returns a default IntentResult on any failure or timeout (2s).
 */
export async function classifyIntent(
  message: string,
  conversationId: string,
): Promise<IntentResult> {
  const truncatedMessage = message.slice(0, MAX_MESSAGE_LENGTH);
  const cacheKey = getCacheKey(message, conversationId);

  // Check cache first
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      CLASSIFICATION_TIMEOUT_MS,
    );

    const response = await Promise.race([
      generateWithFallback({
        model: "",
        messages: [
          { role: "system", content: CLASSIFICATION_SYSTEM_PROMPT },
          { role: "user", content: truncatedMessage },
        ],
        qualityTier: "cheap",
        maxOutputTokens: 128,
        temperature: 0.1,
      }),
      new Promise<never>((_, reject) => {
        const id = setTimeout(
          () => reject(new Error("Intent classification timeout")),
          CLASSIFICATION_TIMEOUT_MS,
        );
        // Allow the timer to not block process exit
        if (typeof id === "object" && "unref" in id) {
          (id as NodeJS.Timeout).unref();
        }
      }),
    ]);

    clearTimeout(timeout);

    const parsed = parseIntentResult(response.text);
    setCache(cacheKey, parsed);
    return parsed;
  } catch (error) {
    console.warn(
      `[intent-classifier] Classification failed, using defaults: ${error instanceof Error ? error.message : "unknown error"}`,
    );
    return DEFAULT_INTENT_RESULT;
  }
}

// ---------------------------------------------------------------------------
// Response parsing with validation
// ---------------------------------------------------------------------------

const VALID_INTENTS = new Set([
  "data_query",
  "quote_action",
  "follow_up_action",
  "analytics",
  "general_question",
  "memory_recall",
  "workflow_guidance",
]);

const VALID_TOOL_CATEGORIES = new Set(["query_tools", "action_tools"]);

const VALID_MEMORY_CATEGORIES = new Set([
  "business_rules",
  "pricing_knowledge",
  "customer_context",
  "workflow_preferences",
]);

function parseIntentResult(text: string): IntentResult {
  // Extract JSON from potential markdown code blocks
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return DEFAULT_INTENT_RESULT;

  const raw = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

  const intent = VALID_INTENTS.has(raw.intent as string)
    ? (raw.intent as IntentResult["intent"])
    : "general_question";

  const toolCategories: ToolCategory[] = Array.isArray(raw.toolCategories)
    ? (raw.toolCategories.filter((c) =>
        VALID_TOOL_CATEGORIES.has(c as string),
      ) as ToolCategory[])
    : ["query_tools", "action_tools"];

  const memoryCategories = Array.isArray(raw.memoryCategories)
    ? (raw.memoryCategories.filter((c) =>
        VALID_MEMORY_CATEGORIES.has(c as string),
      ) as IntentResult["memoryCategories"])
    : [];

  const promptModules = Array.isArray(raw.promptModules)
    ? (raw.promptModules
        .filter(
          (m): m is string =>
            typeof m === "string" && m.length > 0 && m.length <= 64,
        )
        .slice(0, 10) as string[])
    : ["base_identity", "safety_constraints"];

  // Ensure mandatory modules are always present
  if (!promptModules.includes("base_identity")) {
    promptModules.unshift("base_identity");
  }
  if (!promptModules.includes("safety_constraints")) {
    promptModules.push("safety_constraints");
  }

  return {
    intent,
    toolCategories:
      toolCategories.length > 0
        ? toolCategories
        : ["query_tools", "action_tools"],
    memoryCategories,
    promptModules: promptModules.slice(0, 10),
  };
}

// ---------------------------------------------------------------------------
// Exports for testing
// ---------------------------------------------------------------------------

export { DEFAULT_INTENT_RESULT };
export type { CacheEntry };

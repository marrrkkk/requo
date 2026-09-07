/**
 * Owner Assistant Orchestrator
 *
 * Coordinates the conversational assistant loop for business owners:
 * builds the system prompt from persisted history, invokes the LLM with
 * tools over the UI message stream transport, and manages telemetry.
 *
 * Ordering guarantee: the incoming user turn is persisted first and the
 * prompt is built from the conversation *after* that persist (the new turn
 * appended to the in-memory list), so the model always receives the user's
 * text — including on the first turn.
 */

import "server-only";

import { stepCountIs, streamText } from "ai";
import { CHAT_MAX_ATTEMPTS, correctTokenUsage, selectModels } from "@/lib/ai/capacity-selector";
import type { FallbackAttemptTrailEntry } from "@/lib/ai/fallback-model";
import { createFallbackLanguageModel } from "@/lib/ai/fallback-model";
import {
  CHAT_TOKEN_BUDGETS,
  compactMessages,
  estimateChatRequestTokens,
  measurePromptOverhead,
} from "@/lib/ai/token-budget";
import { truncateToolOutput } from "@/lib/ai/tool-truncator";
import {
  checkUsageLimit,
  recordUsage,
  TASK_WEIGHTS,
} from "@/lib/ai/usage-limiter";
import { checkAssistantMessageLimit } from "@/lib/ai/conversation-limits";
import { sanitizeAiInput } from "@/lib/ai/input-sanitizer";
import { filterAiOutput } from "@/lib/ai/output-filter";
import { logAiInvocation } from "@/lib/ai/token-logger";
import type { BusinessPlan } from "@/lib/plans/plans";
import { ownerAssistantTools } from "@/features/owner-assistant/tools";
import type { ToolExecutionContext } from "@/features/owner-assistant/types";
import { generateSystemPrompt } from "@/features/owner-assistant/prompts/system-prompt";
import {
  loadOrCreateSession,
  addMessage,
  updateSessionState,
} from "@/features/owner-assistant/session-service";

export type AssistantChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type RunOwnerAssistantParams = {
  businessId: string;
  businessName: string;
  businessSlug: string;
  userId: string;
  userRole: string;
  plan: BusinessPlan;
  businessTimezone?: string;
  sessionId?: string;
  messages: AssistantChatMessage[];
};

/**
 * Static instruction fragments used for output-leak filtering. Business
 * specifics (name, plan) are intentionally excluded so legitimate mentions
 * are never redacted; only the generic instruction envelope is guarded,
 * alongside the filter's built-in leakage patterns.
 */
const PROMPT_LEAK_FRAGMENTS = [
  "You help business owners manage their inquiries, quotes, and operations",
  "High-Risk Operations",
  "Never send or change a status without confirmation",
  "You're a business operations assistant, not a general AI chatbot",
];

/** Surface copy when every candidate fails — plain language, no raw JSON. */
export const ASSISTANT_UNAVAILABLE_COPY =
  "The assistant is temporarily unavailable. Please try again in a minute. If this keeps happening, something is wrong on our side.";

/**
 * Narrow active tools per step: twelve schemas re-sent on each of five steps
 * is the single largest fixed cost on the surface with the tightest budget.
 * Early steps search, later steps act, the final step answers.
 */
const ASSISTANT_SEARCH_TOOLS = [
  "search_inquiries",
  "get_inquiry_stats",
  "search_quotes",
  "get_quote_stats",
  "search_customers",
  "get_conversion_analytics",
  "search_knowledge",
  "get_follow_up_stats",
] as const;

function getActiveAssistantTools(stepNumber: number) {
  if (stepNumber <= 1) {
    return Object.fromEntries(
      Object.entries(ownerAssistantTools).filter(([name]) =>
        (ASSISTANT_SEARCH_TOOLS as readonly string[]).includes(name),
      ),
    );
  }
  return ownerAssistantTools;
}

/**
 * Run the owner assistant for one turn of conversation.
 * Returns the UI message stream response plus the canonical session id.
 */
export async function runOwnerAssistant({
  businessId,
  businessName,
  businessSlug: _businessSlug,
  userId,
  userRole,
  plan,
  businessTimezone,
  sessionId,
  messages: clientMessages,
}: RunOwnerAssistantParams): Promise<{ response: Response; sessionId: string }> {
  // Hard usage quota check — block requests that exceed the plan's monthly allowance
  const quotaResult = await checkUsageLimit({
    userId,
    businessId,
    taskType: "assistant_message",
    plan,
  });

  if (!quotaResult.allowed) {
    throw new Error(`QUOTA_EXCEEDED: ${quotaResult.message}`);
  }

  // Per-surface daily bucket — customer-independent, Assistant-only.
  const bucketResult = await checkAssistantMessageLimit({ businessId, plan });
  if (!bucketResult.allowed) {
    throw new Error(`ASSISTANT_LIMIT_EXCEEDED: ${bucketResult.message}`);
  }

  // Load or create session (server owns the identifier).
  const session = await loadOrCreateSession({
    businessId,
    userId,
    userRole,
    plan,
    sessionId,
  });

  // The latest user turn is the only client input we act on.
  const latestUserMessage = [...clientMessages]
    .reverse()
    .find((m) => m.role === "user");

  if (!latestUserMessage || !latestUserMessage.content.trim()) {
    throw new Error("A user message is required.");
  }

  const userText = latestUserMessage.content;

  // Mitigate prompt injection before untrusted input reaches a model with tools.
  const sanitized = await sanitizeAiInput(
    userText,
    `owner-assistant:${session.sessionId}`,
  );
  if (sanitized.status === "rejected" || sanitized.status === "locked") {
    throw new Error(
      "INPUT_REJECTED: That message can't be processed. Please rephrase and try again.",
    );
  }
  const safeUserText = sanitized.output || userText;

  // Persist the user turn BEFORE building the prompt…
  await addMessage({
    sessionId: session.sessionId,
    role: "user",
    content: safeUserText,
  });

  // …and build the prompt from the conversation AFTER the persist, so the
  // model receives the user's text on every turn (including the first).
  //
  // History hygiene:
  // - Empty user/assistant rows (written before the empty-content guard) are
  //   dropped: the Google provider rejects messages with no parts.
  // - Tool rows are replayed as compact text context (`[data from <tool>]`),
  //   not as real `tool` role messages: our rows record results without the
  //   matching tool-call ids in the same assistant message, and a mismatched
  //   pair is a provider 400. Replaying the data as text keeps follow-ups
  //   grounded in retrieved values instead of prose paraphrase.
  const historyParts: AssistantChatMessage[] = [];
  for (const m of session.messages) {
    if (m.role === "tool") {
      const toolName =
        (m as { toolName?: string | null }).toolName ?? "tool";
      const raw = typeof m.content === "string" ? m.content : "";
      if (!raw.trim()) continue;
      const { output } = truncateToolOutput(raw, false);
      historyParts.push({
        role: "assistant",
        content: `[data from ${toolName}] ${output}`,
      });
    } else if (m.role === "user" || m.role === "assistant") {
      if (!m.content.trim()) continue;
      historyParts.push({
        role: m.role as "user" | "assistant",
        content: m.content,
      });
    }
  }
  historyParts.push({ role: "user", content: safeUserText });

  // Build system prompt first so overhead is measured, not guessed.
  // (Plan-aware, with the business-local date so the model fills dateRange
  // without inventing it.)
  const systemPrompt = generateSystemPrompt({
    businessName,
    plan,
    userRole,
    businessTimezone,
  });
  const measuredOverhead = measurePromptOverhead(systemPrompt, ownerAssistantTools);

  const conversationMessages: AssistantChatMessage[] = compactMessages(
    historyParts,
    CHAT_TOKEN_BUDGETS.assistant.input,
  );

  // Build tool context (pre-validated, never from user input or LLM output)
  const toolContext: ToolExecutionContext = {
    businessId,
    userId,
    userRole,
    plan,
    session,
  };

  const estimatedTokens = estimateChatRequestTokens(
    conversationMessages,
    CHAT_TOKEN_BUDGETS.assistant.output,
    measuredOverhead,
  );

  // Owner Assistant: most generous tool-capable allowance first (Groq's 8K
  // TPM sits late — one turn can consume a whole Groq minute).
  const selectedModels = await selectModels({
    profile: "assistant_chat",
    estimatedTokens,
  });

  if (selectedModels.length === 0) {
    throw new Error("No suitable AI model available");
  }

  // The model that actually serves the final step. Updated by the fallback
  // wrapper per step (streamText calls doStream once per step), and read in
  // onFinish so persistence and logging attribute the serving model — not the
  // first candidate that may never have been used.
  const firstId = selectedModels[0];
  const firstColon = firstId.indexOf(":");
  let servingModelId = firstId;
  let servingProvider =
    firstColon >= 0 ? firstId.slice(0, firstColon) : firstId;
  let servingModel =
    firstColon >= 0 ? firstId.slice(firstColon + 1) : firstId;
  const attemptTrail: FallbackAttemptTrailEntry[] = [];

  const fallbackModel = createFallbackLanguageModel({
    modelIds: selectedModels,
    maxAttempts: CHAT_MAX_ATTEMPTS,
    estimatedTokens,
    onModelSelected: (selected) => {
      servingModelId = selected.modelId;
      servingProvider = selected.provider;
      servingModel = selected.model;
    },
    onAttemptFailed: (selected, error) => {
      attemptTrail.push({
        modelId: selected.modelId,
        reason:
          error instanceof Error ? error.message.slice(0, 200) : "unknown error",
      });
    },
  });
  void servingModelId;

  const startedAt = Date.now();

  try {
    // Invoke AI SDK with streaming and tools over the UI message stream, so
    // tool calls and tool results reach the client as structured parts.
    const result = streamText({
      model: fallbackModel,
      system: systemPrompt,
      messages: conversationMessages,
      tools: ownerAssistantTools,
      toolChoice: "auto",
      // Up to four tool steps plus a final text step: three chained tool
      // calls must still leave room for the closing answer, otherwise the
      // turn ends with zero text.
      stopWhen: stepCountIs(5),
      // Narrow active tools per step — twelve schemas on every step is the
      // largest fixed cost on this surface.
      prepareStep: async ({ stepNumber }) => {
        if (stepNumber >= 4) return { toolChoice: "none" as const };
        return { tools: getActiveAssistantTools(stepNumber) as typeof ownerAssistantTools };
      },
      // Retry a step that dies after emitting content so a half-written
      // reply is finished rather than abandoned.
      maxRetries: 2,
      // Retrieval and arithmetic over the business's own data, not prose.
      temperature: 0.2,
      maxOutputTokens: CHAT_TOKEN_BUDGETS.assistant.output,
      providerOptions: {
        // gemini-2.5-flash thinks by default with no cap: reasoning tokens
        // can eat the whole per-step budget and emit no candidate text.
        // Keys for other providers are ignored, so this is safe shared.
        google: { thinkingConfig: { thinkingBudget: 0, includeThoughts: false } },
      },
      experimental_context: toolContext,
      onStepFinish: async (step) => {
        // Remember created/found entities for conversation continuity.
        const mentions: Record<string, string> = {};
        // Persist tool calls/results so history (and reloads) show what ran.
        // Live output is truncated like replayed output (4K cap).
        for (const toolResult of step.toolResults ?? []) {
          const raw = JSON.stringify(toolResult.output);
          const { output: capped } = truncateToolOutput(raw, false);
          await addMessage({
            sessionId: session.sessionId,
            role: "tool",
            content: capped,
            toolName: toolResult.toolName,
            toolCallId: toolResult.toolCallId,
            provider: servingProvider,
            model: servingModel,
          }).catch((err) => {
            console.error(
              "[owner-assistant] Failed to persist tool result:",
              err,
            );
          });

          const output = toolResult.output as {
            type?: string;
            data?: { id?: unknown };
          } | null;
          if (
            output &&
            typeof output === "object" &&
            typeof output.data?.id === "string"
          ) {
            if (
              output.type === "inquiry_created" ||
              output.type === "inquiry_updated"
            ) {
              mentions.inquiryId = output.data.id;
            } else if (output.type === "quote_created") {
              mentions.quoteId = output.data.id;
            }
          }
        }

        if (Object.keys(mentions).length > 0) {
          const current = session.state.lastMentioned ?? {};
          await updateSessionState({
            sessionId: session.sessionId,
            state: {
              lastMentioned: { ...current, ...mentions },
            },
          }).catch((err) => {
            console.error(
              "[owner-assistant] Failed to update session state:",
              err,
            );
          });
        }
      },
      onFinish: async ({ text, usage, finishReason }) => {
        const inputTokens = usage?.inputTokens ?? 0;
        const outputTokens = usage?.outputTokens ?? 0;

        void correctTokenUsage(servingModelId, estimatedTokens, {
          inputTokens,
          outputTokens,
        }).catch(() => {});
        if (attemptTrail.length > 0) {
          console.warn(
            `[owner-assistant] Attempt trail for session ${session.sessionId}: ${attemptTrail.map((t) => `${t.modelId} (${t.reason})`).join("; ")} — served by ${servingModelId}`,
          );
        }

        // Filter model output before it is stored.
        const filtered = filterAiOutput(text, PROMPT_LEAK_FRAGMENTS);
        const isEmpty = !filtered.output.trim();

        // A zero-text turn is a failure, not a success: persisting an empty
        // assistant row poisons the next turn (Google rejects part-less
        // messages), and logging it as success hid the regression.
        if (isEmpty) {
          recordUsage(
            userId,
            businessId,
            "assistant_message",
            TASK_WEIGHTS["assistant_message"],
          ).catch((err) => {
            console.warn("[owner-assistant] Failed to record usage:", err);
          });
          void logAiInvocation({
            userId,
            businessId,
            taskType: "assistant_message",
            model: servingModel,
            provider: servingProvider,
            inputTokens,
            outputTokens,
            cacheHit: false,
            latencyMs: Date.now() - startedAt,
            status: "error",
            errorMessage: `empty_completion finishReason=${finishReason ?? "unknown"} serving=${servingModelId} trail=${attemptTrail.map((t) => t.modelId).join(",")}`,
          }).catch((err) => {
            console.warn("[owner-assistant] Failed to log invocation:", err);
          });
          return;
        }

        // Persist assistant message
        await addMessage({
          sessionId: session.sessionId,
          role: "assistant",
          content: filtered.output,
          provider: servingProvider,
          model: servingModel,
        }).catch((err) => {
          console.error("[owner-assistant] Failed to persist message:", err);
        });

        // Record usage against the business plan (non-blocking)
        recordUsage(
          userId,
          businessId,
          "assistant_message",
          TASK_WEIGHTS["assistant_message"],
        ).catch((err) => {
          console.warn("[owner-assistant] Failed to record usage:", err);
        });

        // Attribute token spend for this surface (non-blocking)
        void logAiInvocation({
          userId,
          businessId,
          taskType: "assistant_message",
          model: servingModel,
          provider: servingProvider,
          inputTokens,
          outputTokens,
          cacheHit: false,
          latencyMs: Date.now() - startedAt,
          status: "success",
        }).catch((err) => {
          console.warn("[owner-assistant] Failed to log invocation:", err);
        });
      },
      onError: async ({ error }) => {
        console.error("Owner assistant stream error:", error);
        void logAiInvocation({
          userId,
          businessId,
          taskType: "assistant_message",
          model: servingModel,
          provider: servingProvider,
          inputTokens: 0,
          outputTokens: 0,
          cacheHit: false,
          latencyMs: Date.now() - startedAt,
          status: "error",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        }).catch(() => {});
      },
    });

    return {
      response: result.toUIMessageStreamResponse({
        onError: () => ASSISTANT_UNAVAILABLE_COPY,
      }),
      sessionId: session.sessionId,
    };
  } catch (error) {
    console.error("Owner assistant orchestrator error:", error);
    throw error;
  }
}

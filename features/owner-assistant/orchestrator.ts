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
import { registry } from "@/lib/ai/registry";
import { selectModels } from "@/lib/ai/capacity-selector";
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
  const conversationMessages: AssistantChatMessage[] = [
    ...session.messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    { role: "user", content: safeUserText },
  ];

  // Build tool context (pre-validated, never from user input or LLM output)
  const toolContext: ToolExecutionContext = {
    businessId,
    userId,
    userRole,
    plan,
    session,
  };

  // Select model using capacity-aware selection
  const selectedModels = await selectModels({
    needsTools: true,
    minQuality: 6,
  });

  if (selectedModels.length === 0) {
    throw new Error("No suitable AI model available");
  }

  const modelId = selectedModels[0];
  const colonIndex = modelId.indexOf(":");
  const provider = colonIndex >= 0 ? modelId.slice(0, colonIndex) : modelId;
  const model = colonIndex >= 0 ? modelId.slice(colonIndex + 1) : modelId;

  // Build system prompt (plan-aware)
  const systemPrompt = generateSystemPrompt({
    businessName,
    plan,
    userRole,
  });

  const startedAt = Date.now();

  try {
    // Invoke AI SDK with streaming and tools over the UI message stream, so
    // tool calls and tool results reach the client as structured parts.
    const result = streamText({
      model: registry.languageModel(modelId),
      system: systemPrompt,
      messages: conversationMessages,
      tools: ownerAssistantTools,
      toolChoice: "auto",
      stopWhen: stepCountIs(5), // Prevent infinite loops
      temperature: 0.7,
      maxOutputTokens: 2000,
      experimental_context: toolContext,
      onStepFinish: async (step) => {
        // Remember created/found entities for conversation continuity.
        const mentions: Record<string, string> = {};
        // Persist tool calls/results so history (and reloads) show what ran.
        for (const toolResult of step.toolResults ?? []) {
          await addMessage({
            sessionId: session.sessionId,
            role: "tool",
            content: JSON.stringify(toolResult.output),
            toolName: toolResult.toolName,
            toolCallId: toolResult.toolCallId,
            provider,
            model,
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
      onFinish: async ({ text, usage }) => {
        const inputTokens = usage?.inputTokens ?? 0;
        const outputTokens = usage?.outputTokens ?? 0;

        // Filter model output before it is stored.
        const filtered = filterAiOutput(text, PROMPT_LEAK_FRAGMENTS);

        // Persist assistant message
        await addMessage({
          sessionId: session.sessionId,
          role: "assistant",
          content: filtered.output,
          provider,
          model,
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
          model,
          provider,
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
          model,
          provider,
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
      response: result.toUIMessageStreamResponse(),
      sessionId: session.sessionId,
    };
  } catch (error) {
    console.error("Owner assistant orchestrator error:", error);
    throw error;
  }
}

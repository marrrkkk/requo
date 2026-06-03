"use server";

import { aiGenerateQuoteDraftSchema } from "@/features/ai/schemas";
import { generateQuoteDraftForBusiness } from "@/features/ai/quote-generator";
import type { AiQuoteDraftActionState } from "@/features/ai/types";
import type { AiSurface } from "@/features/ai/types";
import {
  getOrCreateDefaultEntityConversation,
  getPaginatedAiMessagesForConversation,
  deleteEntityConversation,
} from "@/features/ai/conversations";
import { getBusinessActionContext } from "@/lib/db/business-access";
import { getAppShellContext } from "@/lib/app-shell/context";
import { hasFeatureAccess } from "@/lib/plans";
import { checkUsageLimit } from "@/lib/ai";
import { getEffectivePlan } from "@/lib/billing/subscription-service";
import type { AiTaskType } from "@/features/ai/task-registry";

// ---------------------------------------------------------------------------
// Server Actions
//
// NOTE: Pipeline utilities (executeAiPipeline, executeStreamingAiPipeline,
// hashPromptVersion) are imported directly from "@/features/ai/pipeline"
// by modules that need them. They cannot be re-exported from a "use server"
// file because Next.js only allows async function exports here.
// ---------------------------------------------------------------------------

/**
 * Generate an AI-drafted quote for the current business.
 *
 * Returns a structured draft the client can merge into the quote editor.
 * The action never mutates saved quotes; saving still happens through
 * `createQuoteAction` / `updateQuoteAction`.
 *
 * Pipeline: validate input → check usage limit → invoke quote generator
 * (which internally uses the AI pipeline for context building, model routing,
 * and response parsing).
 */
export async function generateQuoteDraftAction(
  businessSlug: string,
  prevState: AiQuoteDraftActionState,
  formData: FormData,
): Promise<AiQuoteDraftActionState> {
  void prevState;

  // 1. Validate input (Zod)
  const parsed = aiGenerateQuoteDraftSchema.safeParse({
    businessSlug,
    inquiryId: formData.get("inquiryId"),
    brief: formData.get("brief"),
    revisionComment: formData.get("revisionComment"),
    currentItems: formData.get("currentItems"),
    currentItemsJson: formData.get("currentItemsJson"),
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];

    return {
      error: firstIssue?.message ?? "Check the request and try again.",
    };
  }

  // 2. Check business access
  const actionContext = await getBusinessActionContext({
    businessSlug: parsed.data.businessSlug,
    minimumRole: "staff",
    requireActiveBusiness: true,
    unauthorizedMessage: "You do not have access to that business action.",
  });

  if (!actionContext.ok) {
    return {
      error: actionContext.error,
    };
  }

  // 3. Check plan feature access
  if (
    !hasFeatureAccess(
      actionContext.businessContext.business.plan,
      "aiAssistant",
    )
  ) {
    return {
      error: "Upgrade to Pro to use the AI quote generator.",
    };
  }

  // 4. Check usage limit (replaces the old rate limiter for AI actions)
  const taskType: AiTaskType = "quote_draft";
  const businessId = actionContext.businessContext.business.id;
  const userId = actionContext.user.id;

  const plan = await getEffectivePlan(businessId);

  const usageCheck = await checkUsageLimit({
    userId,
    businessId,
    taskType,
    plan,
  });

  if (!usageCheck.allowed) {
    return {
      error: usageCheck.message,
    };
  }

  // 5. Invoke the quote generator (handles context building, AI call, response parsing)
  // 5. Invoke the quote generator (handles context building, AI call, response parsing)
  let currentItemsData: Array<{
    description: string;
    quantity: number;
    unitPriceInCents: number;
  }> | null = null;
  if (parsed.data.currentItemsJson) {
    try {
      const parsed_items = JSON.parse(parsed.data.currentItemsJson);
      if (Array.isArray(parsed_items)) {
        currentItemsData = parsed_items.filter(
          (item) =>
            item &&
            typeof item.description === "string" &&
            typeof item.quantity === "number" &&
            typeof item.unitPriceInCents === "number",
        );
      }
    } catch {
      // Ignore parse errors - fall back to text-only revision
    }
  }

  const result = await generateQuoteDraftForBusiness({
    businessId,
    userId,
    inquiryId: parsed.data.inquiryId ?? null,
    brief: parsed.data.brief ?? null,
    revisionComment: parsed.data.revisionComment ?? null,
    currentItems: parsed.data.currentItems ?? null,
    currentItemsData,
  });

  if (!result.ok) {
    return {
      error: result.error,
    };
  }

  return {
    draft: result.draft,
  };
}

/**
 * Resolves (or creates) the default AI conversation for an entity.
 * Called client-side when the chat panel opens for the first time.
 * Returns the conversation ID plus persisted message history so the panel
 * can hydrate immediately without a second round-trip.
 */
export async function resolveEntityConversationAction(input: {
  businessSlug: string;
  surface: Extract<AiSurface, "inquiry" | "quote">;
  entityId: string;
  title: string;
}) {
  const { user, businessContext } = await getAppShellContext(input.businessSlug);

  const conversation = await getOrCreateDefaultEntityConversation({
    userId: user.id,
    businessId: businessContext.business.id,
    surface: input.surface,
    entityId: input.entityId,
    title: input.title,
  });

  // Fetch persisted messages so the panel can hydrate with history.
  const page = await getPaginatedAiMessagesForConversation({
    conversationId: conversation.id,
    userId: user.id,
    limit: 50,
  });

  // Map to the serializable shape the client needs for initialMessages.
  const initialMessages = page.messages
    .filter((m) => {
      if (m.role === "system") return false;
      if (m.role === "user") return true;
      if (m.status === "completed") return true;
      if (m.status === "failed" && m.content) return true;
      return false;
    })
    .map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      parts: [{ type: "text" as const, text: m.content || "" }],
    }));

  const failedMessageIds = page.messages
    .filter((m) => m.role === "assistant" && m.status === "failed" && m.content)
    .map((m) => m.id);

  const toolCallsByMessageId: Record<string, string[]> = {};
  const structuredOutputsByMessageId: Record<string, unknown[]> = {};
  const actionProposalsByMessageId: Record<string, unknown[]> = {};
  for (const m of page.messages) {
    const meta = m.metadata as Record<string, unknown> | null;
    if (m.role === "assistant" && meta) {
      if (Array.isArray(meta.toolCalls) && meta.toolCalls.length > 0) {
        toolCallsByMessageId[m.id] = meta.toolCalls as string[];
      }
      if (
        Array.isArray(meta.structuredOutputs) &&
        meta.structuredOutputs.length > 0
      ) {
        structuredOutputsByMessageId[m.id] = meta.structuredOutputs;
      }
      if (
        Array.isArray(meta.actionProposals) &&
        meta.actionProposals.length > 0
      ) {
        actionProposalsByMessageId[m.id] = meta.actionProposals;
      }
    }
  }

  return {
    conversationId: conversation.id,
    initialMessages,
    failedMessageIds,
    toolCallsByMessageId,
    structuredOutputsByMessageId,
    actionProposalsByMessageId,
  };
}

/**
 * Resets the entity conversation by deleting the current one and creating
 * a fresh default conversation. Returns the new conversation ID.
 */
export async function resetEntityConversationAction(input: {
  businessSlug: string;
  surface: Extract<AiSurface, "inquiry" | "quote">;
  entityId: string;
  conversationId: string;
  title: string;
}) {
  const { user, businessContext } = await getAppShellContext(input.businessSlug);

  // Delete the existing conversation (messages cascade-delete).
  await deleteEntityConversation({
    conversationId: input.conversationId,
    userId: user.id,
    surface: input.surface,
  });

  // Create a fresh default conversation for this entity.
  const conversation = await getOrCreateDefaultEntityConversation({
    userId: user.id,
    businessId: businessContext.business.id,
    surface: input.surface,
    entityId: input.entityId,
    title: input.title,
  });

  return { conversationId: conversation.id };
}

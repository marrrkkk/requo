import "server-only";

import { streamText, stepCountIs, wrapLanguageModel } from "ai";

import { sanitizeAiInput } from "@/lib/ai/input-sanitizer";
import { filterAiOutput } from "@/lib/ai/output-filter";
import { logAiSecurityEvent } from "@/lib/ai/security-events";
import {
  checkAssistantBudget,
  MAX_TOOL_CALLS_PER_TURN,
  recordAssistantTurn,
} from "@/lib/ai/assistant-usage";
import {
  conversationMatchesSurface,
  getAuthorizedAiConversation,
  resolveAiSurfaceAccess,
} from "@/features/ai/access";
import {
  createAiAssistantMessage,
  createAiUserMessage,
  createDashboardConversation,
  decodeAiMessageCursor,
  deleteDashboardConversation,
  getOrCreateDefaultEntityConversation,
  getOrCreateLatestDashboardConversation,
  getPaginatedAiMessagesForConversation,
  getRecentCompletedAiMessages,
  listDashboardConversations,
  toGenericAiChatHistory,
  updateAiAssistantMessage,
} from "@/features/ai/conversations";
import {
  aiChatRequestSchema,
  aiChatUseChatRequestSchema,
  aiConversationListQuerySchema,
  aiConversationMessagesQuerySchema,
  aiConversationQuerySchema,
  aiCreateConversationSchema,
} from "@/features/ai/schemas";
import { orchestrate } from "@/features/ai/orchestrator";
import { generateCanaryToken } from "@/features/ai/orchestrator/prompt-builder";
import type { AiProviderName } from "@/lib/ai";
import { registry } from "@/lib/ai/registry";
import { stripReasoningMiddleware } from "@/lib/ai/strip-reasoning-middleware";
import {
  selectToolCallingModels,
  selectSimpleTextModels,
  selectComplexTextModels,
  recordModelUsage,
  markModelExhausted,
} from "@/lib/ai/capacity-selector";
import {
  classifyMessageComplexity,
} from "@/lib/ai/message-complexity";
import {
  autoAiModelOptionValue,
  parseAiModelOptionValue,
} from "@/lib/ai/model-options";
import type { AiModelSelection } from "@/lib/ai/model-options";
import { getCurrentUser } from "@/lib/auth/session";
import { hasFeatureAccess } from "@/lib/plans";
import { assertPublicActionRateLimit } from "@/lib/public-action-rate-limit";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { aiMessages as aiMessagesTable } from "@/lib/db/schema";

function getQueryObject(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  return Object.fromEntries(searchParams.entries());
}

function getVisibleText(text: string): string {
  let result = text.replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/g, "");
  const openMatch = result.match(/<think(?:ing)?>/);
  if (openMatch && openMatch.index !== undefined) {
    result = result.slice(0, openMatch.index);
  }
  return result;
}

function resolveExplicitModelId(
  modelSelection: AiModelSelection,
): `${string}:${string}` {
  const prefix = modelSelection.provider === "gemini" ? "google" : modelSelection.provider;
  return `${prefix}:${modelSelection.model}` as `${string}:${string}`;
}

async function getAuthenticatedUserResponse() {
  const user = await getCurrentUser();
  if (!user) {
    return {
      user: null,
      response: Response.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }
  return { user, response: null };
}

export async function getAiConversationRouteResponse(request: Request) {
  const { user, response } = await getAuthenticatedUserResponse();
  if (!user) return response;

  const parsedQuery = aiConversationQuerySchema.safeParse(getQueryObject(request));
  if (!parsedQuery.success) {
    return Response.json({ error: "Check the AI request and try again." }, { status: 400 });
  }

  const access = await resolveAiSurfaceAccess({
    userId: user.id,
    businessSlug: parsedQuery.data.businessSlug,
    surface: parsedQuery.data.surface,
    entityId: parsedQuery.data.entityId,
  });

  if (!access) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  if (!hasFeatureAccess(access.businessContext.business.plan, "aiAssistant")) {
    return Response.json(
      { error: "Upgrade to Pro to use the AI assistant." },
      { status: 403 },
    );
  }

  const conversation =
    access.surface === "dashboard"
      ? await getOrCreateLatestDashboardConversation({
          userId: user.id,
          businessId: access.businessId,
          entityId: access.entityId,
        })
      : await getOrCreateDefaultEntityConversation({
          userId: user.id,
          businessId: access.businessId,
          surface: access.surface,
          entityId: access.entityId,
          title: access.title,
        });

  return Response.json(
    { conversation },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function listAiConversationsRouteResponse(request: Request) {
  const { user, response } = await getAuthenticatedUserResponse();
  if (!user) return response;

  const parsedQuery = aiConversationListQuerySchema.safeParse(getQueryObject(request));
  if (!parsedQuery.success || parsedQuery.data.surface !== "dashboard") {
    return Response.json({ error: "Check the AI request and try again." }, { status: 400 });
  }

  const access = await resolveAiSurfaceAccess({
    userId: user.id,
    businessSlug: parsedQuery.data.businessSlug,
    surface: parsedQuery.data.surface,
    entityId: parsedQuery.data.entityId,
  });

  if (!access) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  if (!hasFeatureAccess(access.businessContext.business.plan, "aiAssistant")) {
    return Response.json(
      { error: "Upgrade to Pro to use the AI assistant." },
      { status: 403 },
    );
  }

  const conversations = await listDashboardConversations({
    userId: user.id,
    businessId: access.businessId,
    entityId: access.entityId,
    limit: parsedQuery.data.limit,
  });

  return Response.json(
    { conversations },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function createAiConversationRouteResponse(request: Request) {
  const { user, response } = await getAuthenticatedUserResponse();
  if (!user) return response;

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return Response.json({ error: "Check the AI request and try again." }, { status: 400 });
  }

  const parsedBody = aiCreateConversationSchema.safeParse(requestBody);
  if (!parsedBody.success || parsedBody.data.surface !== "dashboard") {
    return Response.json({ error: "Check the AI request and try again." }, { status: 400 });
  }

  const access = await resolveAiSurfaceAccess({
    userId: user.id,
    businessSlug: parsedBody.data.businessSlug,
    surface: parsedBody.data.surface,
    entityId: parsedBody.data.entityId,
  });

  if (!access) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  if (!hasFeatureAccess(access.businessContext.business.plan, "aiAssistant")) {
    return Response.json(
      { error: "Upgrade to Pro to use the AI assistant." },
      { status: 403 },
    );
  }

  const conversation = await createDashboardConversation({
    userId: user.id,
    businessId: access.businessId,
    entityId: access.entityId,
  });

  return Response.json(
    { conversation },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function deleteAiConversationRouteResponse({
  request,
  conversationId,
}: {
  request: Request;
  conversationId: string;
}) {
  void request;
  const { user, response } = await getAuthenticatedUserResponse();
  if (!user) return response;

  const result = await deleteDashboardConversation({
    conversationId,
    userId: user.id,
  });

  if (!result) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  return Response.json(
    { deleted: true },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function getAiMessagesRouteResponse({
  request,
  conversationId,
}: {
  request: Request;
  conversationId: string;
}) {
  const { user, response } = await getAuthenticatedUserResponse();
  if (!user) return response;

  const authorization = await getAuthorizedAiConversation({
    userId: user.id,
    conversationId,
  });

  if (!authorization) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  if (!hasFeatureAccess(authorization.businessPlan, "aiAssistant")) {
    return Response.json(
      { error: "Upgrade to Pro to use the AI assistant." },
      { status: 403 },
    );
  }

  const parsedQuery = aiConversationMessagesQuerySchema.safeParse(getQueryObject(request));
  if (!parsedQuery.success) {
    return Response.json({ error: "Check the message request and try again." }, { status: 400 });
  }

  const decodedCursor = parsedQuery.data.before
    ? decodeAiMessageCursor(parsedQuery.data.before)
    : null;

  if (decodedCursor && !decodedCursor.ok) {
    return Response.json({ error: "Invalid message cursor." }, { status: 400 });
  }

  const page = await getPaginatedAiMessagesForConversation({
    conversationId,
    userId: user.id,
    limit: parsedQuery.data.limit,
    before: decodedCursor?.ok ? decodedCursor.cursor : null,
  });

  return Response.json(page, {
    headers: { "cache-control": "private, no-store" },
  });
}

export async function createAiChatRouteResponse(request: Request) {
  const { user, response } = await getAuthenticatedUserResponse();
  if (!user) return response;

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return Response.json({ error: "Check the AI request and try again." }, { status: 400 });
  }

  // Support both useChat SDK format and legacy custom format (popup chat)
  const useChatParsed = aiChatUseChatRequestSchema.safeParse(requestBody);
  const legacyParsed = !useChatParsed.success
    ? aiChatRequestSchema.safeParse(requestBody)
    : null;

  if (!useChatParsed.success && (!legacyParsed || !legacyParsed.success)) {
    return Response.json({ error: "Check the AI request and try again." }, { status: 400 });
  }

  // Normalize into common shape
  const parsedData = useChatParsed.success
    ? (() => {
        // Extract user message text from parts-based UIMessage format
        const lastUserMsg = useChatParsed.data.messages
          .filter(m => m.role === "user").pop();
        const messageText = lastUserMsg?.parts
          ?.filter(p => p.type === "text" && p.text)
          .map(p => p.text!)
          .join("")
          ?? lastUserMsg?.content
          ?? "";
        // "regenerate-message" trigger means re-send the existing message
        const isRegenerate = useChatParsed.data.trigger === "regenerate-message";
        return {
          businessSlug: useChatParsed.data.businessSlug,
          conversationId: useChatParsed.data.conversationId,
          surface: useChatParsed.data.surface,
          entityId: useChatParsed.data.entityId,
          devModel: useChatParsed.data.devModel,
          replyToExisting: useChatParsed.data.replyToExisting || isRegenerate,
          message: messageText,
        };
      })()
    : {
        businessSlug: legacyParsed!.data!.businessSlug,
        conversationId: legacyParsed!.data!.conversationId,
        surface: legacyParsed!.data!.surface,
        entityId: legacyParsed!.data!.entityId,
        devModel: legacyParsed!.data!.devModel,
        replyToExisting: legacyParsed!.data!.replyToExisting,
        message: legacyParsed!.data!.message,
      };

  if (!parsedData.message.trim()) {
    return Response.json({ error: "Check the AI request and try again." }, { status: 400 });
  }

  const modelSelection =
    process.env.NODE_ENV === "development"
      ? parseAiModelOptionValue(parsedData.devModel)
      : null;

  if (
    process.env.NODE_ENV === "development" &&
    parsedData.devModel &&
    parsedData.devModel !== autoAiModelOptionValue &&
    !modelSelection
  ) {
    return Response.json(
      { error: "Choose a valid development AI model." },
      { status: 400 },
    );
  }

  const authorization = await getAuthorizedAiConversation({
    userId: user.id,
    conversationId: parsedData.conversationId,
  });
  const businessSlug = parsedData.businessSlug ?? authorization?.businessSlug;

  if (!businessSlug) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const access = await resolveAiSurfaceAccess({
    userId: user.id,
    businessSlug,
    surface: parsedData.surface,
    entityId: parsedData.entityId,
  });

  if (!access) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  if (!hasFeatureAccess(access.businessContext.business.plan, "aiAssistant")) {
    return Response.json(
      { error: "Upgrade to Pro to use the AI assistant." },
      { status: 403 },
    );
  }

  if (
    !authorization ||
    !conversationMatchesSurface({
      conversation: authorization.conversation,
      businessId: access.businessId,
      surface: parsedData.surface,
      entityId: parsedData.entityId,
    })
  ) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const authorizedConversation = authorization.conversation;
  const authorizedBusinessId =
    parsedData.surface === "dashboard"
      ? access.businessContext.business.id
      : authorization.businessId ?? access.businessContext.business.id;

  const isAllowed = await assertPublicActionRateLimit({
    action: "ai-chat",
    limit: 20,
    scope: `${access.entityId}:${user.id}`,
    windowMs: 60_000,
  });

  if (!isAllowed) {
    const errorText = "Too many AI requests. Wait a minute and try again.";
    await createAiAssistantMessage({
      conversationId: authorizedConversation.id,
      status: "failed",
      content: errorText,
      metadata: { errorReason: "rate_limit" },
    });
    return Response.json(
      { error: errorText },
      { status: 429 },
    );
  }

  const budgetCheck = await checkAssistantBudget({
    userId: user.id,
    businessId: authorizedBusinessId,
    plan: access.businessContext.business.plan,
  });

  if (!budgetCheck.allowed) {
    await createAiAssistantMessage({
      conversationId: authorizedConversation.id,
      status: "failed",
      content: budgetCheck.message,
      metadata: { errorReason: "budget_exceeded" },
    });
    return Response.json(
      { error: budgetCheck.message },
      { status: 429 },
    );
  }

  // --- Input Sanitization ---
  const inputSanitization = await sanitizeAiInput(parsedData.message, authorizedConversation.id);

  if (inputSanitization.status === "locked") {
    const errorText = "This conversation has been locked due to repeated policy violations.";
    await createAiAssistantMessage({
      conversationId: authorizedConversation.id,
      status: "failed",
      content: errorText,
      metadata: { errorReason: "conversation_locked" },
    });
    return Response.json(
      { error: errorText },
      { status: 403 },
    );
  }

  if (inputSanitization.status === "rejected") {
    logAiSecurityEvent({
      eventType: "injection_rejected",
      patternMatched: inputSanitization.patterns.join(", "),
      userId: user.id,
      businessId: authorizedBusinessId,
      rawInput: parsedData.message,
    });
    const errorText = "Your message could not be processed. Please rephrase your request.";
    await createAiAssistantMessage({
      conversationId: authorizedConversation.id,
      status: "failed",
      content: errorText,
      metadata: { errorReason: "input_rejected" },
    });
    return Response.json(
      { error: errorText },
      { status: 400 },
    );
  }

  const sanitizedMessage = inputSanitization.status === "sanitized"
    ? inputSanitization.output
    : parsedData.message;

  if (inputSanitization.status === "sanitized") {
    logAiSecurityEvent({
      eventType: "injection_detected",
      patternMatched: inputSanitization.patterns.join(", "),
      userId: user.id,
      businessId: authorizedBusinessId,
      rawInput: parsedData.message,
    });
  }

  // --- Persist user message ---
  const userMessage = parsedData.replyToExisting
    ? await (async () => {
        const [existing] = await db
          .select()
          .from(aiMessagesTable)
          .where(
            and(
              eq(aiMessagesTable.conversationId, authorizedConversation.id),
              eq(aiMessagesTable.role, "user"),
            ),
          )
          .orderBy(desc(aiMessagesTable.createdAt))
          .limit(1);
        return existing ?? null;
      })()
    : await createAiUserMessage({
        conversationId: authorizedConversation.id,
        content: sanitizedMessage,
      });

  if (!userMessage) {
    return Response.json({ error: "No user message found." }, { status: 400 });
  }

  const assistantMessage = await createAiAssistantMessage({
    conversationId: authorizedConversation.id,
    status: "generating",
    metadata: { userMessageId: userMessage.id },
  });
  const startedAt = Date.now();

  // --- Orchestrate ---
  const history = toGenericAiChatHistory(
    await getRecentCompletedAiMessages({
      conversationId: authorizedConversation.id,
      userId: user.id,
      limit: 20,
    }),
    userMessage.id,
  );

  const orchestrateResult = await orchestrate({
    userId: user.id,
    businessId: authorizedBusinessId,
    businessName: access.businessContext.business.name,
    conversationId: authorizedConversation.id,
    message: sanitizedMessage,
    surface: parsedData.surface,
    entityId: parsedData.entityId,
    businessSlug: access.businessContext.business.slug,
    conversationHistory: history,
  });

  if (!orchestrateResult.ok) {
    const msg = `The assistant could not prepare a response: ${orchestrateResult.failedPhase}.`;
    await updateAiAssistantMessage({
      conversationId: authorizedConversation.id,
      messageId: assistantMessage.id,
      content: "",
      provider: null,
      model: null,
      status: "failed",
      metadata: { errorReason: msg, latencyMs: Date.now() - startedAt },
    });
    return Response.json({ error: msg }, { status: 500 });
  }

  const { systemPrompt, tools, messages: orchestratedMessages, maxOutputTokens, onStreamComplete } = orchestrateResult;

  // --- Model selection ---
  const messageComplexity = classifyMessageComplexity(sanitizedMessage);

  const modelsToTry = modelSelection
    ? [resolveExplicitModelId(modelSelection)]
    : tools
      ? await selectToolCallingModels()
      : messageComplexity === "simple"
        ? await selectSimpleTextModels()
        : await selectComplexTextModels();

  // --- Stream with model fallback, returning standard AI SDK data stream ---
  for (const modelId of modelsToTry) {
    try {
      const baseModel = registry.languageModel(modelId);

      // Wrap with stripReasoningMiddleware for providers that reject reasoning_content
      const needsReasoningStrip =
        modelId.startsWith("cerebras:") ||
        modelId.startsWith("mistral:");
      const model = needsReasoningStrip
        ? wrapLanguageModel({ model: baseModel, middleware: stripReasoningMiddleware })
        : baseModel;

      const result = streamText({
        model,
        system: systemPrompt,
        messages: orchestratedMessages,
        tools,
        maxRetries: 0,
        stopWhen: tools ? stepCountIs(5) : undefined,
        temperature: 0.2,
        maxOutputTokens,
        abortSignal: AbortSignal.timeout(30_000),
        onError: ({ error: streamError }) => {
          const errorMsg = streamError instanceof Error
            ? streamError.message : String(streamError);
          const isRateLimit =
            errorMsg.includes("429") ||
            errorMsg.includes("quota") ||
            errorMsg.includes("RESOURCE_EXHAUSTED") ||
            errorMsg.includes("rate_limit") ||
            errorMsg.includes("high traffic");
          if (isRateLimit) markModelExhausted(modelId);
          console.warn(
            `[ai-chat] onError for ${modelId}:`,
            errorMsg.slice(0, 200),
          );
        },
        onFinish: async ({ text, usage, steps }) => {
          const visibleText = getVisibleText(text);

          // Output filtering (with canary token detection)
          const canaryToken = generateCanaryToken(authorizedBusinessId);
          let finalContent = visibleText;
          const chatOutputFilter = filterAiOutput(finalContent, [
            "inquiry assistant",
            "quote assistant",
            "dashboard assistant",
            "business context",
            "conversation history",
            "relevant context",
          ], { canaryToken });
          if (chatOutputFilter.status === "redacted") {
            finalContent = chatOutputFilter.output;
            const isCanaryLeak = chatOutputFilter.redactedPatterns.includes("canary_leak_detected");
            logAiSecurityEvent({
              eventType: isCanaryLeak ? "canary_leak_detected" : "output_redacted",
              patternMatched: chatOutputFilter.redactedPatterns.join(", "),
              userId: user.id,
              businessId: authorizedBusinessId,
              rawInput: finalContent.slice(0, 200),
            });
          }

          const providerName = (modelId.split(":")[0] as AiProviderName) ?? "groq";
          const modelName = modelId.split(":").slice(1).join(":") ?? "auto";

          await updateAiAssistantMessage({
            conversationId: authorizedConversation.id,
            messageId: assistantMessage.id,
            content: finalContent,
            provider: providerName,
            model: modelName,
            status: finalContent.trim() ? "completed" : "failed",
            metadata: {
              latencyMs: Date.now() - startedAt,
              ...(!finalContent.trim() && { errorReason: "Empty response from model." }),
              ...(steps && steps.length > 0 && {
                toolCalls: steps
                  .flatMap((step) => step.toolCalls ?? [])
                  .map((tc) => tc.toolName),
                structuredOutputs: steps
                  .flatMap((step) => step.toolResults ?? [])
                  .filter((tr) => typeof tr.output === "object" && tr.output !== null && "structured" in (tr.output as object))
                  .map((tr) => (tr.output as { structured: unknown }).structured),
                actionProposals: steps
                  .flatMap((step) => step.toolResults ?? [])
                  .filter((tr) => typeof tr.output === "string" && (tr.output as string).includes("[ACTION_PROPOSAL]"))
                  .flatMap((tr) => {
                    const regex = /\[ACTION_PROPOSAL\]([\s\S]*?)\[\/ACTION_PROPOSAL\]/g;
                    const proposals: unknown[] = [];
                    let match: RegExpExecArray | null;
                    while ((match = regex.exec(tr.output as string)) !== null) {
                      try { proposals.push(JSON.parse(match[1])); } catch { /* skip */ }
                    }
                    return proposals;
                  }),
              }),
            },
          });

          // Post-stream ops (fire-and-forget)
          if (finalContent.trim()) {
            const inputTokens = usage?.inputTokens ?? 0;
            const outputTokens = usage?.outputTokens ?? 0;
            onStreamComplete(finalContent, inputTokens, outputTokens).catch((err) => {
              console.error("[ai-chat] onStreamComplete failed:",
                err instanceof Error ? err.message : err);
            });

            const toolCallCount = steps
              ?.reduce((count, step) =>
                count + (step.toolCalls?.length ?? 0), 0) ?? 0;

            recordAssistantTurn({
              userId: user.id,
              businessId: authorizedBusinessId,
              toolCallCount: Math.min(toolCallCount, MAX_TOOL_CALLS_PER_TURN),
            }).catch((err) => {
              console.error("[ai-chat] recordAssistantTurn failed:",
                err instanceof Error ? err.message : err);
            });
          }
        },
      });

      // Verify the model can be reached by consuming the first text event.
      // Rate limits from providers (429) surface as stream errors. The onError
      // callback marks the model exhausted so the NEXT request skips it.
      // For THIS request, the SDK's built-in error propagation will surface
      // the error to the client which displays it with a retry button.
      await recordModelUsage(modelId);
      return result.toUIMessageStreamResponse();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isRateLimit =
        errorMsg.includes("429") ||
        errorMsg.includes("quota") ||
        errorMsg.includes("RESOURCE_EXHAUSTED") ||
        errorMsg.includes("rate_limit") ||
        errorMsg.includes("Rate limit") ||
        errorMsg.includes("high traffic");

      if (isRateLimit) {
        await markModelExhausted(modelId);
        console.warn(`[ai-chat] ${modelId} rate limited (sync), trying next...`);
        continue;
      }

      console.error(`[ai-chat] ${modelId} failed (non-retryable):`, errorMsg);
      break;
    }
  }

  // All models failed
  const failMessage = modelSelection
    ? `[Dev] ${resolveExplicitModelId(modelSelection)} failed to start. Check API key and model availability.`
    : "The assistant is busy right now. Please try again in a moment.";

  await updateAiAssistantMessage({
    conversationId: authorizedConversation.id,
    messageId: assistantMessage.id,
    content: "",
    provider: null,
    model: null,
    status: "failed",
    metadata: { errorReason: failMessage, latencyMs: Date.now() - startedAt },
  });

  return Response.json({ error: failMessage }, { status: 503 });
}

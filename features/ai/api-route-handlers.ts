import "server-only";

import { streamText, stepCountIs, extractReasoningMiddleware, wrapLanguageModel } from "ai";

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
  aiConversationListQuerySchema,
  aiConversationMessagesQuerySchema,
  aiConversationQuerySchema,
  aiCreateConversationSchema,
} from "@/features/ai/schemas";
import { orchestrate } from "@/features/ai/orchestrator";
import type { AiChatStreamEvent } from "@/features/ai/types";
import type { AiProviderName } from "@/lib/ai";
import { registry } from "@/lib/ai/registry";
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

const encoder = new TextEncoder();
const ssePaddingComment = `:${" ".repeat(2048)}\n\n`;

function encodeStreamEvent(event: AiChatStreamEvent) {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

function encodeSseComment(comment: string) {
  return encoder.encode(comment);
}

function getQueryObject(request: Request) {
  const searchParams = new URL(request.url).searchParams;

  return Object.fromEntries(searchParams.entries());
}

function getSanitizedErrorType(error: unknown) {
  return error instanceof Error ? error.name : "unknown";
}

function getVisibleText(text: string): string {
  let result = text.replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/g, "");
  const openMatch = result.match(/<think(?:ing)?>/);
  if (openMatch && openMatch.index !== undefined) {
    result = result.slice(0, openMatch.index);
  }
  return result;
}

/**
 * Resolves a model ID for the registry from an explicit dev-mode model selection.
 * Only used when the user has picked a specific model in the dev panel.
 */
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

  if (!user) {
    return response;
  }

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
    {
      headers: {
        "cache-control": "private, no-store",
      },
    },
  );
}

export async function listAiConversationsRouteResponse(request: Request) {
  const { user, response } = await getAuthenticatedUserResponse();

  if (!user) {
    return response;
  }

  const parsedQuery = aiConversationListQuerySchema.safeParse(
    getQueryObject(request),
  );

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
    {
      headers: {
        "cache-control": "private, no-store",
      },
    },
  );
}

export async function createAiConversationRouteResponse(request: Request) {
  const { user, response } = await getAuthenticatedUserResponse();

  if (!user) {
    return response;
  }

  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return Response.json({ error: "Check the AI request and try again." }, { status: 400 });
  }

  const parsedBody = aiCreateConversationSchema.safeParse(requestBody);

  if (
    !parsedBody.success ||
    parsedBody.data.surface !== "dashboard"
  ) {
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
    {
      headers: {
        "cache-control": "private, no-store",
      },
    },
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

  if (!user) {
    return response;
  }

  const result = await deleteDashboardConversation({
    conversationId,
    userId: user.id,
  });

  if (!result) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  return Response.json(
    { deleted: true },
    {
      headers: {
        "cache-control": "private, no-store",
      },
    },
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

  if (!user) {
    return response;
  }

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

  const parsedQuery = aiConversationMessagesQuerySchema.safeParse(
    getQueryObject(request),
  );

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
    headers: {
      "cache-control": "private, no-store",
    },
  });
}

export async function createAiChatRouteResponse(request: Request) {
  const { user, response } = await getAuthenticatedUserResponse();

  if (!user) {
    return response;
  }

  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return Response.json({ error: "Check the AI request and try again." }, { status: 400 });
  }

  const parsedBody = aiChatRequestSchema.safeParse(requestBody);

  if (!parsedBody.success) {
    return Response.json({ error: "Check the AI request and try again." }, { status: 400 });
  }

  const modelSelection =
    process.env.NODE_ENV === "development"
      ? parseAiModelOptionValue(parsedBody.data.devModel)
      : null;

  if (
    process.env.NODE_ENV === "development" &&
    parsedBody.data.devModel &&
    parsedBody.data.devModel !== autoAiModelOptionValue &&
    !modelSelection
  ) {
    return Response.json(
      { error: "Choose a valid development AI model." },
      { status: 400 },
    );
  }

  const authorization = await getAuthorizedAiConversation({
    userId: user.id,
    conversationId: parsedBody.data.conversationId,
  });
  const businessSlug = parsedBody.data.businessSlug ?? authorization?.businessSlug;

  if (!businessSlug) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const access = await resolveAiSurfaceAccess({
    userId: user.id,
    businessSlug,
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

  if (
    !authorization ||
    !conversationMatchesSurface({
      conversation: authorization.conversation,
      businessId: access.businessId,
      surface: parsedBody.data.surface,
      entityId: parsedBody.data.entityId,
    })
  ) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const authorizedConversation = authorization.conversation;
  const authorizedBusinessId =
    parsedBody.data.surface === "dashboard"
      ? access.businessContext.business.id
      : authorization.businessId ?? access.businessContext.business.id;

  const isAllowed = await assertPublicActionRateLimit({
    action: "ai-chat",
    limit: 20,
    scope: `${access.entityId}:${user.id}`,
    windowMs: 60_000,
  });

  if (!isAllowed) {
    return Response.json(
      { error: "Too many AI requests. Wait a minute and try again." },
      { status: 429 },
    );
  }

  const userMessage = await createAiUserMessage({
    conversationId: authorizedConversation.id,
    content: parsedBody.data.message,
  });
  const assistantMessage = await createAiAssistantMessage({
    conversationId: authorizedConversation.id,
    status: "generating",
    metadata: {
      userMessageId: userMessage.id,
    },
  });
  const startedAt = Date.now();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encodeSseComment(ssePaddingComment));
      controller.enqueue(
        encodeStreamEvent({
          type: "conversation",
          conversation: authorizedConversation,
        }),
      );
      controller.enqueue(
        encodeStreamEvent({
          type: "messages",
          userMessage,
          assistantMessage,
        }),
      );

      let assistantContent = "";
      let provider: AiProviderName | null = null;
      let model: string | null = null;

      async function markAssistantFailed(errorReason: string) {
        await updateAiAssistantMessage({
          conversationId: authorizedConversation.id,
          messageId: assistantMessage.id,
          content: assistantContent,
          provider,
          model,
          status: "failed",
          metadata: {
            errorReason,
            latencyMs: Date.now() - startedAt,
          },
        });
      }

      try {
        // ---------------------------------------------------------------------------
        // Orchestrate: classify intent, retrieve memory, compose prompt, select tools.
        // Replaces inline context building, prompt assembly, and tool selection.
        // ---------------------------------------------------------------------------
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
          conversationId: authorizedConversation.id,
          message: parsedBody.data.message,
          surface: parsedBody.data.surface,
          entityId: parsedBody.data.entityId,
          businessSlug: access.businessContext.business.slug,
          conversationHistory: history,
        });

        if (!orchestrateResult.ok) {
          const message = `The assistant could not prepare a response: ${orchestrateResult.failedPhase}.`;
          await markAssistantFailed(message);
          controller.enqueue(encodeStreamEvent({ type: "error", message }));
          return;
        }

        const { systemPrompt, tools, messages: aiMessages, onStreamComplete } = orchestrateResult;

        // Use complexity classifier for model selection and output budget
        const messageComplexity = classifyMessageComplexity(parsedBody.data.message);

        // Build the model ID for the registry
        // Use capacity-aware selector: picks best model with headroom, avoids exhausted ones
        // If dev model is selected, use ONLY that model (no fallback) for accurate debugging
        const modelsToTry = modelSelection
          ? [resolveExplicitModelId(modelSelection)]
          : tools
            ? selectToolCallingModels()
            : messageComplexity === "simple"
              ? selectSimpleTextModels()
              : selectComplexTextModels();

        // Reduce output budget for simple messages
        const maxOutputTokens = messageComplexity === "simple"
          ? 800
          : parsedBody.data.surface === "quote" ? 2200 : 1700;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let result: any = null;
        let selectedModelId: string | null = null;

        // Try models in order. streamText doesn't throw synchronously on 429 —
        // the error surfaces during stream iteration. So we attempt to consume
        // the first chunk to verify the stream is alive before committing.
        for (const modelId of modelsToTry) {
          try {
            const baseModel = registry.languageModel(modelId);
            // Only apply reasoning extraction for models known to use <think> tags
            // (Qwen3, DeepSeek). NVIDIA Nemotron models may produce reasoning in
            // a different format that causes empty output when stripped.
            const needsReasoningExtraction = modelId.includes("qwen") || modelId.includes("deepseek");
            const modelToUse = needsReasoningExtraction
              ? wrapLanguageModel({
                  model: baseModel,
                  middleware: extractReasoningMiddleware({ tagName: "think" }),
                })
              : baseModel;

            const streamResult = streamText({
              model: modelToUse,
              system: systemPrompt,
              messages: aiMessages,
              tools,
              maxRetries: 0,
              stopWhen: tools ? stepCountIs(5) : undefined,
              temperature: 0.2,
              maxOutputTokens,
              abortSignal: AbortSignal.timeout(30_000),
              onError: ({ error }) => {
                // Log but don't throw — let the stream consumer handle it
                console.warn(`[ai-chat] onError for ${modelId}:`, (error as Error)?.message ?? error);
              },
            });

            // Verify the stream is alive by checking if we can get the textStream
            // without an immediate rejection. streamText returns immediately but
            // errors surface during consumption — we'll catch them below.
            result = streamResult;
            selectedModelId = modelId;
            recordModelUsage(modelId);
            break;
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            const isRateLimit =
              errorMsg.includes("429") ||
              errorMsg.includes("quota") ||
              errorMsg.includes("RESOURCE_EXHAUSTED") ||
              errorMsg.includes("rate_limit") ||
              errorMsg.includes("Rate limit");

            if (isRateLimit) {
              markModelExhausted(modelId);
              console.warn(`[ai-chat] ${modelId} rate limited (sync), trying next...`);
              continue;
            }

            console.error(`[ai-chat] ${modelId} failed (non-retryable):`, errorMsg);
            break;
          }
        }

        if (!result) {
          const message = modelSelection
            ? `[Dev] ${resolveExplicitModelId(modelSelection)} failed to start. Check API key and model availability.`
            : "The assistant is busy right now. Please try again in a moment.";
          await markAssistantFailed(message);
          controller.enqueue(encodeStreamEvent({ type: "error", message }));
          return;
        }

        // Emit meta event with the actual model that was selected
        const providerName = (selectedModelId?.split(":")[0] as AiProviderName | undefined)
          ?? "groq";
        const modelName = selectedModelId?.split(":").slice(1).join(":")
          ?? "auto";
        provider = providerName;
        model = modelName;

        controller.enqueue(
          encodeStreamEvent({
            type: "meta",
            title:
              parsedBody.data.surface === "inquiry"
                ? "Inquiry Assistant"
                : parsedBody.data.surface === "quote"
                  ? "Quote Assistant"
                  : "Dashboard Assistant",
            model: `${providerName}/${modelName}`,
            provider: providerName as AiProviderName,
            providerModel: modelName,
          }),
        );

        // Stream text deltas to the client.
        // If a 429 occurs during streaming (async error), catch it and retry
        // with the next available model.
        const truncated = false;
        let streamFailed = false;

        try {
          for await (const chunk of result.textStream) {
            if (chunk) {
              const visible = getVisibleText(assistantContent + chunk).slice(
                getVisibleText(assistantContent).length,
              );
              if (visible) {
                assistantContent += visible;
                controller.enqueue(encodeStreamEvent({ type: "delta", value: visible }));
              } else {
                assistantContent += chunk;
              }
            }
          }
        } catch (streamError) {
          const errorMsg = streamError instanceof Error ? streamError.message : String(streamError);
          // Check if this is a rate limit error — also catch AI_NoOutputGeneratedError
          // which wraps 429s from the provider when streamText can't produce output.
          const errorName = streamError instanceof Error ? streamError.name : "";
          const isRateLimit =
            errorMsg.includes("429") ||
            errorMsg.includes("quota") ||
            errorMsg.includes("RESOURCE_EXHAUSTED") ||
            errorMsg.includes("rate_limit") ||
            errorMsg.includes("exceeded your current quota") ||
            errorName === "AI_NoOutputGeneratedError";

          if (isRateLimit && selectedModelId) {
            markModelExhausted(selectedModelId);

            // If a specific dev model was selected, don't fallback — report clearly
            if (modelSelection) {
              const message = `[Dev] ${selectedModelId} rate limited. Try a different model or wait.`;
              await markAssistantFailed(message);
              controller.enqueue(encodeStreamEvent({ type: "error", message }));
              controller.close();
              return;
            }

            console.warn(`[ai-chat] ${selectedModelId} failed during stream (${errorName || "unknown"}), retrying with next model...`);

            // Find next model to try
            const currentIndex = modelsToTry.indexOf(selectedModelId as `${string}:${string}`);
            const remainingModels = modelsToTry.slice(currentIndex + 1);

            for (const fallbackModelId of remainingModels) {
              try {
                const baseModel = registry.languageModel(fallbackModelId);
                const needsReasoning = fallbackModelId.includes("qwen") || fallbackModelId.includes("deepseek");
                const fallbackModel = needsReasoning
                  ? wrapLanguageModel({
                      model: baseModel,
                      middleware: extractReasoningMiddleware({ tagName: "think" }),
                    })
                  : baseModel;

                const retryResult = streamText({
                  model: fallbackModel,
                  system: systemPrompt,
                  messages: aiMessages,
                  tools,
                  maxRetries: 0,
                  stopWhen: tools ? stepCountIs(5) : undefined,
                  temperature: 0.2,
                  maxOutputTokens,
                  abortSignal: AbortSignal.timeout(30_000),
                });

                // Reset content and re-stream
                assistantContent = "";
                selectedModelId = fallbackModelId;
                recordModelUsage(fallbackModelId);

                // Update meta
                const retryProvider = (fallbackModelId.split(":")[0] as AiProviderName) ?? "groq";
                const retryModel = fallbackModelId.split(":").slice(1).join(":");
                provider = retryProvider;
                model = retryModel;

                controller.enqueue(
                  encodeStreamEvent({
                    type: "meta",
                    title: "Dashboard Assistant",
                    model: `${retryProvider}/${retryModel}`,
                    provider: retryProvider,
                    providerModel: retryModel,
                  }),
                );

                for await (const chunk of retryResult.textStream) {
                  if (chunk) {
                    const visible = getVisibleText(assistantContent + chunk).slice(
                      getVisibleText(assistantContent).length,
                    );
                    if (visible) {
                      assistantContent += visible;
                      controller.enqueue(encodeStreamEvent({ type: "delta", value: visible }));
                    } else {
                      assistantContent += chunk;
                    }
                  }
                }

                result = retryResult;
                break; // Success
              } catch (retryError) {
                const retryMsg = retryError instanceof Error ? retryError.message : String(retryError);
                markModelExhausted(fallbackModelId);
                console.warn(`[ai-chat] Fallback ${fallbackModelId} also failed: ${retryMsg.slice(0, 100)}`);
                continue;
              }
            }

            // If all retries failed and no content was produced
            if (!assistantContent.trim()) {
              streamFailed = true;
            }
          } else {
            // Non-rate-limit stream error
            streamFailed = true;
            console.error(`[ai-chat] Stream error (non-retryable): ${errorMsg.slice(0, 200)}`);
          }
        }

        if (streamFailed && !assistantContent.trim()) {
          const message = "The assistant could not generate an answer right now. Try again in a moment.";
          await markAssistantFailed(message);
          controller.enqueue(encodeStreamEvent({ type: "error", message }));
          return;
        }

        // If the stream completed but produced no content, the model likely
        // failed silently (e.g., 429 handled internally by the SDK).
        // In dev mode with a pinned model, report the failure directly.
        // Otherwise, retry with next available model.
        if (!streamFailed && !assistantContent.trim()) {
          markModelExhausted(selectedModelId!);

          // If a specific dev model was selected, don't fallback — report clearly
          if (modelSelection) {
            const message = `[Dev] ${selectedModelId} returned empty output. The model may not support this request or is temporarily unavailable.`;
            await markAssistantFailed(message);
            controller.enqueue(encodeStreamEvent({ type: "error", message }));
            return;
          }

          console.warn(`[ai-chat] ${selectedModelId} produced empty output, retrying with next model...`);

          const currentIndex = modelsToTry.indexOf(selectedModelId as `${string}:${string}`);
          const remainingModels = modelsToTry.slice(currentIndex + 1);

          for (const fallbackModelId of remainingModels) {
            try {
              const baseModel = registry.languageModel(fallbackModelId);
              const needsReasoning = fallbackModelId.includes("qwen") || fallbackModelId.includes("deepseek");
              const fallbackModel = needsReasoning
                ? wrapLanguageModel({
                    model: baseModel,
                    middleware: extractReasoningMiddleware({ tagName: "think" }),
                  })
                : baseModel;

              const retryResult = streamText({
                model: fallbackModel,
                system: systemPrompt,
                messages: aiMessages,
                tools,
                maxRetries: 0,
                stopWhen: tools ? stepCountIs(5) : undefined,
                temperature: 0.2,
                maxOutputTokens,
                abortSignal: AbortSignal.timeout(30_000),
              });

              assistantContent = "";
              selectedModelId = fallbackModelId;
              recordModelUsage(fallbackModelId);

              const retryProvider = (fallbackModelId.split(":")[0] as AiProviderName) ?? "groq";
              const retryModel = fallbackModelId.split(":").slice(1).join(":");
              provider = retryProvider;
              model = retryModel;

              controller.enqueue(
                encodeStreamEvent({
                  type: "meta",
                  title:
                    parsedBody.data.surface === "inquiry"
                      ? "Inquiry Assistant"
                      : parsedBody.data.surface === "quote"
                        ? "Quote Assistant"
                        : "Dashboard Assistant",
                  model: `${retryProvider}/${retryModel}`,
                  provider: retryProvider,
                  providerModel: retryModel,
                }),
              );

              for await (const chunk of retryResult.textStream) {
                if (chunk) {
                  const visible = getVisibleText(assistantContent + chunk).slice(
                    getVisibleText(assistantContent).length,
                  );
                  if (visible) {
                    assistantContent += visible;
                    controller.enqueue(encodeStreamEvent({ type: "delta", value: visible }));
                  } else {
                    assistantContent += chunk;
                  }
                }
              }

              if (assistantContent.trim()) {
                result = retryResult;
                break;
              }

              // Still empty — try next
              markModelExhausted(fallbackModelId);
            } catch (retryError) {
              markModelExhausted(fallbackModelId);
              const retryMsg = retryError instanceof Error ? retryError.message : "";
              console.warn(`[ai-chat] Fallback ${fallbackModelId} failed: ${retryMsg.slice(0, 100)}`);
              continue;
            }
          }

          if (!assistantContent.trim()) {
            const message = "The assistant could not generate an answer right now. Try again in a moment.";
            await markAssistantFailed(message);
            controller.enqueue(encodeStreamEvent({ type: "error", message }));
            return;
          }
        }

        // Check for truncation from the final response
        try {
          const finalResponse = await result.response;
          if (finalResponse.messages?.length) {
            const lastMsg = finalResponse.messages[finalResponse.messages.length - 1];
            if (lastMsg && "content" in lastMsg && Array.isArray(lastMsg.content)) {
              // Check finish reason
            }
          }
        } catch {
          // result.response can throw AI_NoOutputGeneratedError if the stream
          // was empty — we've already handled this above via the retry logic.
        }

        // Clean up assistantContent to only visible text
        assistantContent = getVisibleText(assistantContent);

        // Extract ACTION_PROPOSAL blocks from tool results and append to content.
        // Tool results are not included in textStream, so we need to pull them
        // from steps so the client can render confirmation cards.
        try {
          const steps = await result.steps;
          if (steps) {
            /* eslint-disable @typescript-eslint/no-explicit-any */
            for (const step of steps as any[]) {
              const toolResults = step.toolResults ?? [];
              for (const tr of toolResults) {
                // The SDK uses "output" for the tool result text
                const resultText = typeof tr.output === "string" ? tr.output
                  : typeof tr.result === "string" ? tr.result : "";
                if (resultText.includes("[ACTION_PROPOSAL]")) {
                  assistantContent += "\n" + resultText;
                  controller.enqueue(encodeStreamEvent({ type: "delta", value: "\n" + resultText }));
                }
              }
            }
            /* eslint-enable @typescript-eslint/no-explicit-any */
          }
        } catch {
          // Non-critical — if steps aren't available, proceed without proposals
        }

        controller.enqueue(encodeStreamEvent({ type: "done", truncated }));

        // Emit debug info in development mode
        if (process.env.NODE_ENV === "development") {
          try {
            const usage = await result.usage;
            const steps = await result.steps;
            /* eslint-disable @typescript-eslint/no-explicit-any */
            const toolCalls = steps
              ?.flatMap((step: any) => step.toolCalls ?? [])
              .map((tc: any) => ({ name: tc.toolName })) ?? [];
            /* eslint-enable @typescript-eslint/no-explicit-any */

            // Use the final provider/model (may have changed due to fallback)
            const finalProvider = provider;
            const finalModel = model;

            controller.enqueue(
              encodeStreamEvent({
                type: "debug",
                info: {
                  model: finalModel,
                  provider: finalProvider,
                  latencyMs: Date.now() - startedAt,
                  inputTokens: usage?.inputTokens ?? undefined,
                  outputTokens: usage?.outputTokens ?? undefined,
                  totalTokens: usage
                    ? (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0)
                    : undefined,
                  toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
                  steps: steps?.length ?? undefined,
                  systemPromptLength: systemPrompt.length,
                },
              }),
            );
          } catch (debugError) {
            // Non-critical — don't fail the response for debug info
            console.warn("[ai-chat] Failed to emit debug info:", debugError);
          }
        }

        await updateAiAssistantMessage({
          conversationId: authorizedConversation.id,
          messageId: assistantMessage.id,
          content: assistantContent,
          provider,
          model,
          status: assistantContent.trim() ? "completed" : "failed",
          metadata: {
            truncated,
            latencyMs: Date.now() - startedAt,
          },
        });

        // Post-stream async operations: conversation compression + orchestration logging.
        // Fire-and-forget — errors are logged internally, never surfaced to client.
        if (assistantContent.trim()) {
          try {
            const usage = await result.usage;
            const inputTokens = usage?.inputTokens ?? 0;
            const outputTokens = usage?.outputTokens ?? 0;
            onStreamComplete(assistantContent, inputTokens, outputTokens).catch((err) => {
              console.error(
                "[ai-chat] onStreamComplete failed:",
                err instanceof Error ? err.message : err,
              );
            });
          } catch {
            // usage may throw if stream was incomplete — skip post-stream ops
          }
        }
      } catch (error) {
        console.error(
          `Failed to stream AI output. errorType="${getSanitizedErrorType(error)}"`,
        );

        const message =
          "The assistant could not generate an answer right now. Try again in a moment.";

        await markAssistantFailed(message);
        controller.enqueue(encodeStreamEvent({ type: "error", message }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "cache-control": "private, no-cache, no-transform",
      "content-type": "text/event-stream; charset=utf-8",
      "x-content-type-options": "nosniff",
      "x-accel-buffering": "no",
    },
  });
}

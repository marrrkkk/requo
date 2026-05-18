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
import {
  buildAiSurfaceContext,
  getSurfaceInstructions,
} from "@/features/ai/surface-service";
import { createDashboardTools } from "@/features/ai/tools";
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
  getHistoryLimitForComplexity,
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

function truncateText(value: string | null | undefined, maxLength: number) {
  const normalized = value?.replace(/\r\n?/g, "\n").trim() ?? "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trimEnd()}...`;
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
      : authorization.businessId;

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
        // History and surface context are independent — fetch in parallel.
        // Use complexity classifier to determine how much history to load.
        const messageComplexity = classifyMessageComplexity(parsedBody.data.message);
        const historyLimit = getHistoryLimitForComplexity(
          messageComplexity,
          parsedBody.data.surface,
        );

        const [historyMessages, surfaceContext] = await Promise.all([
          getRecentCompletedAiMessages({
            conversationId: authorizedConversation.id,
            userId: user.id,
            limit: historyLimit,
          }),
          buildAiSurfaceContext({
            surface: parsedBody.data.surface,
            entityId: parsedBody.data.entityId,
            businessId: authorizedBusinessId,
            userMessage: parsedBody.data.message,
          }),
        ]);

        if (!surfaceContext) {
          const message = "The assistant context could not be loaded.";

          await markAssistantFailed(message);
          controller.enqueue(encodeStreamEvent({ type: "error", message }));
          return;
        }

        const history = toGenericAiChatHistory(historyMessages, userMessage.id);

        // Build system prompt with surface instructions + context
        const systemPrompt = [
          getSurfaceInstructions(parsedBody.data.surface),
          "",
          "Current Requo context",
          surfaceContext,
        ].join("\n");

        // Build message history for the AI SDK
        // Strip any reasoning content from history — reasoning blocks are model-internal
        // and cause errors when sent to providers that don't support them.
        const aiMessages = [
          ...history.map((msg) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content.replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/g, "").trim(),
          })),
          {
            role: "user" as const,
            content: truncateText(parsedBody.data.message, 4000),
          },
        ];

        // For dashboard surface, use streamText with native tool calling
        // For inquiry/quote surfaces, stream without tools (context-only)
        const tools =
          parsedBody.data.surface === "dashboard" && authorizedBusinessId
            ? createDashboardTools({
                businessId: authorizedBusinessId,
                businessSlug: access.businessContext.business.slug,
                userId: user.id,
              })
            : undefined;

        // Build the model ID for the registry
        // Use capacity-aware selector: picks best model with headroom, avoids exhausted ones
        // If dev model is selected, put it first but include fallbacks after it
        const modelsToTry = modelSelection
          ? [resolveExplicitModelId(modelSelection), ...(tools
              ? selectToolCallingModels()
              : messageComplexity === "simple"
                ? selectSimpleTextModels()
                : selectComplexTextModels()
            ).filter((m) => m !== resolveExplicitModelId(modelSelection))]
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
            const wrappedModel = wrapLanguageModel({
              model: baseModel,
              middleware: extractReasoningMiddleware({ tagName: "think" }),
            });

            const streamResult = streamText({
              model: wrappedModel,
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
          const message = "The assistant is busy right now. Please try again in a moment.";
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
            console.warn(`[ai-chat] ${selectedModelId} failed during stream (${errorName || "unknown"}), retrying with next model...`);

            // Find next model to try
            const currentIndex = modelsToTry.indexOf(selectedModelId as `${string}:${string}`);
            const remainingModels = modelsToTry.slice(currentIndex + 1);

            for (const fallbackModelId of remainingModels) {
              try {
                const baseModel = registry.languageModel(fallbackModelId);
                const wrappedModel = wrapLanguageModel({
                  model: baseModel,
                  middleware: extractReasoningMiddleware({ tagName: "think" }),
                });

                const retryResult = streamText({
                  model: wrappedModel,
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
        // Retry with next available model.
        if (!streamFailed && !assistantContent.trim()) {
          markModelExhausted(selectedModelId!);
          console.warn(`[ai-chat] ${selectedModelId} produced empty output, retrying with next model...`);

          const currentIndex = modelsToTry.indexOf(selectedModelId as `${string}:${string}`);
          const remainingModels = modelsToTry.slice(currentIndex + 1);

          for (const fallbackModelId of remainingModels) {
            try {
              const baseModel = registry.languageModel(fallbackModelId);
              const wrappedModel = wrapLanguageModel({
                model: baseModel,
                middleware: extractReasoningMiddleware({ tagName: "think" }),
              });

              const retryResult = streamText({
                model: wrappedModel,
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

            controller.enqueue(
              encodeStreamEvent({
                type: "debug",
                info: {
                  model: modelName,
                  provider: providerName,
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

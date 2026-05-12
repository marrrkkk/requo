import "server-only";

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
  createAiSurfaceAssistantStream,
} from "@/features/ai/surface-service";
import type { AiChatStreamEvent } from "@/features/ai/types";
import type { AiProviderName } from "@/lib/ai";
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
      let terminalEvent: Extract<AiChatStreamEvent, { type: "done" | "error" }> | null = null;

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
        const [historyMessages, surfaceContext] = await Promise.all([
          getRecentCompletedAiMessages({
            conversationId: authorizedConversation.id,
            userId: user.id,
            limit: 20,
          }),
          buildAiSurfaceContext({
            surface: parsedBody.data.surface,
            entityId: parsedBody.data.entityId,
            businessId: authorizedBusinessId,
          }),
        ]);

        if (!surfaceContext) {
          const message = "The assistant context could not be loaded.";

          await markAssistantFailed(message);
          controller.enqueue(encodeStreamEvent({ type: "error", message }));
          return;
        }

        const history = toGenericAiChatHistory(historyMessages, userMessage.id);

        for await (const event of createAiSurfaceAssistantStream({
          surface: parsedBody.data.surface,
          context: surfaceContext,
          message: parsedBody.data.message,
          history,
          qualityTier: parsedBody.data.qualityTier,
        })) {
          if (event.type === "meta") {
            provider = event.provider ?? null;
            model = event.providerModel ?? null;
          }

          if (event.type === "delta") {
            assistantContent += event.value;
          }

          if (event.type === "done" || event.type === "error") {
            terminalEvent = event;
          }

          controller.enqueue(encodeStreamEvent(event));
        }

        if (terminalEvent?.type === "done") {
          await updateAiAssistantMessage({
            conversationId: authorizedConversation.id,
            messageId: assistantMessage.id,
            content: assistantContent,
            provider,
            model,
            status: assistantContent.trim() ? "completed" : "failed",
            metadata: {
              truncated: terminalEvent.truncated,
              latencyMs: Date.now() - startedAt,
            },
          });
        } else if (terminalEvent?.type === "error") {
          await markAssistantFailed(terminalEvent.message);
        } else {
          const message =
            "The stream ended unexpectedly. Try again if you need a fresh reply.";

          await markAssistantFailed(message);
          controller.enqueue(encodeStreamEvent({ type: "error", message }));
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

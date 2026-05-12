import "server-only";

import { randomUUID } from "node:crypto";

import { and, desc, eq, inArray, sql } from "drizzle-orm";

import type {
  AiConversation,
  AiConversationSummary,
  AiMessage,
  AiMessageRole,
  AiMessageStatus,
  AiMessagesPage,
  AiSurface,
} from "@/features/ai/types";
import type { AiChatMessage, AiProviderName } from "@/lib/ai";
import { db } from "@/lib/db/client";
import { aiConversations, aiMessages } from "@/lib/db/schema";

const aiProviderNames = new Set<AiProviderName>([
  "groq",
  "gemini",
  "openrouter",
]);

type AiConversationRow = typeof aiConversations.$inferSelect;
type AiMessageRow = typeof aiMessages.$inferSelect;

type AiMessageCursor = {
  createdAt: Date;
  id: string;
};

type CreateAiMessageInput = {
  conversationId: string;
  role: AiMessageRole;
  content: string;
  provider?: AiProviderName | null;
  model?: string | null;
  status?: AiMessageStatus;
  metadata?: Record<string, unknown>;
};

type UpdateAiAssistantMessageInput = {
  conversationId: string;
  messageId: string;
  content?: string;
  provider?: AiProviderName | null;
  model?: string | null;
  status: Extract<AiMessageStatus, "completed" | "failed">;
  metadata?: Record<string, unknown>;
};

function createId(prefix: string) {
  return `${prefix}_${randomUUID().replace(/-/g, "")}`;
}

function normalizeProvider(value: string | null): AiProviderName | null {
  if (!value) {
    return null;
  }

  return aiProviderNames.has(value as AiProviderName)
    ? (value as AiProviderName)
    : null;
}

function toAiConversation(row: AiConversationRow): AiConversation {
  return {
    id: row.id,
    userId: row.userId,
    businessId: row.businessId,
    surface: row.surface,
    entityId: row.entityId,
    title: row.title,
    isDefault: row.isDefault,
    lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toAiMessage(row: AiMessageRow): AiMessage {
  return {
    id: row.id,
    conversationId: row.conversationId,
    role: row.role,
    content: row.content,
    provider: normalizeProvider(row.provider),
    model: row.model,
    status: row.status,
    metadata: row.metadata ?? {},
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function isUniqueConflict(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function getConversationOrderExpression() {
  return sql<Date>`coalesce(${aiConversations.lastMessageAt}, ${aiConversations.createdAt})`;
}

function createDashboardTitle(message: string) {
  const normalized = message.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "New dashboard chat";
  }

  const words = normalized.split(" ").slice(0, 8).join(" ");
  const title = words.length > 64 ? `${words.slice(0, 61).trimEnd()}...` : words;

  return title || "New dashboard chat";
}

function createPreview(value: string, limit = 120) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return null;
  }

  return normalized.length <= limit
    ? normalized
    : `${normalized.slice(0, limit - 3).trimEnd()}...`;
}

export function encodeAiMessageCursor(input: {
  createdAt: Date | string;
  id: string;
}) {
  const createdAt =
    typeof input.createdAt === "string"
      ? input.createdAt
      : input.createdAt.toISOString();

  return Buffer.from(JSON.stringify({ createdAt, id: input.id })).toString(
    "base64url",
  );
}

export function decodeAiMessageCursor(
  value: string,
): { ok: true; cursor: AiMessageCursor } | { ok: false } {
  try {
    const decoded = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as {
      createdAt?: unknown;
      id?: unknown;
    };

    if (typeof decoded.createdAt !== "string" || typeof decoded.id !== "string") {
      return { ok: false };
    }

    const createdAt = new Date(decoded.createdAt);

    if (Number.isNaN(createdAt.getTime()) || !decoded.id.trim()) {
      return { ok: false };
    }

    return { ok: true, cursor: { createdAt, id: decoded.id } };
  } catch {
    return { ok: false };
  }
}

export async function getConversationByIdForUser({
  conversationId,
  userId,
}: {
  conversationId: string;
  userId: string;
}) {
  const [conversation] = await db
    .select()
    .from(aiConversations)
    .where(
      and(
        eq(aiConversations.id, conversationId),
        eq(aiConversations.userId, userId),
      ),
    )
    .limit(1);

  return conversation ? toAiConversation(conversation) : null;
}

export async function getOrCreateDefaultEntityConversation({
  userId,
  businessId,
  surface,
  entityId,
  title,
}: {
  userId: string;
  businessId: string;
  surface: Extract<AiSurface, "inquiry" | "quote">;
  entityId: string;
  title: string;
}) {
  const existing = await getDefaultEntityConversation({
    userId,
    businessId,
    surface,
    entityId,
  });

  if (existing) {
    return existing;
  }

  const now = new Date();

  try {
    const [conversation] = await db
      .insert(aiConversations)
      .values({
        id: createId("aic"),
        userId,
        businessId,
        surface,
        entityId,
        title,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return toAiConversation(conversation);
  } catch (error) {
    if (!isUniqueConflict(error)) {
      throw error;
    }

    const raced = await getDefaultEntityConversation({
      userId,
      businessId,
      surface,
      entityId,
    });

    if (!raced) {
      throw error;
    }

    return raced;
  }
}

async function getDefaultEntityConversation({
  userId,
  businessId,
  surface,
  entityId,
}: {
  userId: string;
  businessId: string;
  surface: Extract<AiSurface, "inquiry" | "quote">;
  entityId: string;
}) {
  const [conversation] = await db
    .select()
    .from(aiConversations)
    .where(
      and(
        eq(aiConversations.userId, userId),
        eq(aiConversations.businessId, businessId),
        eq(aiConversations.surface, surface),
        eq(aiConversations.entityId, entityId),
        eq(aiConversations.isDefault, true),
      ),
    )
    .limit(1);

  return conversation ? toAiConversation(conversation) : null;
}

export async function getOrCreateLatestDashboardConversation({
  userId,
  businessId,
  entityId,
}: {
  userId: string;
  businessId: string;
  entityId: string;
}) {
  const [conversation] = await db
    .select()
    .from(aiConversations)
    .where(
      and(
        eq(aiConversations.userId, userId),
        eq(aiConversations.businessId, businessId),
        eq(aiConversations.surface, "dashboard"),
        eq(aiConversations.entityId, entityId),
      ),
    )
    .orderBy(desc(getConversationOrderExpression()), desc(aiConversations.id))
    .limit(1);

  if (conversation) {
    return toAiConversation(conversation);
  }

  return createDashboardConversation({ userId, businessId, entityId });
}

export async function createDashboardConversation({
  userId,
  businessId,
  entityId,
  title = "New dashboard chat",
}: {
  userId: string;
  businessId: string;
  entityId: string;
  title?: string;
}) {
  const now = new Date();
  const [conversation] = await db
    .insert(aiConversations)
    .values({
      id: createId("aic"),
      userId,
      businessId,
      surface: "dashboard",
      entityId,
      title,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return toAiConversation(conversation);
}

export async function listDashboardConversations({
  userId,
  businessId,
  entityId,
  limit = 20,
}: {
  userId: string;
  businessId: string;
  entityId: string;
  limit?: number;
}): Promise<AiConversationSummary[]> {
  const boundedLimit = Math.min(Math.max(limit, 1), 50);
  const conversations = await db
    .select()
    .from(aiConversations)
    .where(
      and(
        eq(aiConversations.userId, userId),
        eq(aiConversations.businessId, businessId),
        eq(aiConversations.surface, "dashboard"),
        eq(aiConversations.entityId, entityId),
      ),
    )
    .orderBy(desc(getConversationOrderExpression()), desc(aiConversations.id))
    .limit(boundedLimit);

  if (!conversations.length) {
    return [];
  }

  const conversationIds = conversations.map((conversation) => conversation.id);
  const recentMessages = await db
    .selectDistinctOn([aiMessages.conversationId], {
      conversationId: aiMessages.conversationId,
      content: aiMessages.content,
    })
    .from(aiMessages)
    .where(inArray(aiMessages.conversationId, conversationIds))
    .orderBy(
      aiMessages.conversationId,
      desc(aiMessages.createdAt),
      desc(aiMessages.id),
    );
  const previewByConversationId = new Map<string, string | null>();

  for (const message of recentMessages) {
    if (previewByConversationId.has(message.conversationId)) {
      continue;
    }

    previewByConversationId.set(
      message.conversationId,
      createPreview(message.content),
    );
  }

  return conversations.map((conversation) => ({
    ...toAiConversation(conversation),
    lastMessagePreview: previewByConversationId.get(conversation.id) ?? null,
  }));
}

export async function getPaginatedAiMessagesForConversation({
  conversationId,
  userId,
  limit,
  before,
}: {
  conversationId: string;
  userId: string;
  limit: number;
  before?: AiMessageCursor | null;
}): Promise<AiMessagesPage> {
  const boundedLimit = Math.min(Math.max(limit, 1), 50);
  const beforeCondition = before
    ? sql`(${aiMessages.createdAt}, ${aiMessages.id}) < (${before.createdAt}::timestamptz, ${before.id})`
    : undefined;

  const rawRows = await db
    .select({
      id: aiMessages.id,
      conversationId: aiMessages.conversationId,
      role: aiMessages.role,
      content: aiMessages.content,
      provider: aiMessages.provider,
      model: aiMessages.model,
      status: aiMessages.status,
      metadata: aiMessages.metadata,
      createdAt: aiMessages.createdAt,
      updatedAt: aiMessages.updatedAt,
    })
    .from(aiMessages)
    .innerJoin(aiConversations, eq(aiMessages.conversationId, aiConversations.id))
    .where(
      and(
        eq(aiConversations.userId, userId),
        eq(aiMessages.conversationId, conversationId),
        beforeCondition,
      ),
    )
    .orderBy(desc(aiMessages.createdAt), desc(aiMessages.id))
    .limit(boundedLimit + 1);

  const hasMore = rawRows.length > boundedLimit;
  const rows = (hasMore ? rawRows.slice(0, boundedLimit) : rawRows).reverse();
  const oldest = rows[0];

  return {
    messages: rows.map(toAiMessage),
    nextCursor:
      hasMore && oldest
        ? encodeAiMessageCursor({
            createdAt: oldest.createdAt,
            id: oldest.id,
          })
        : null,
    hasMore,
  };
}

export async function getRecentCompletedAiMessages({
  conversationId,
  userId,
  limit = 20,
}: {
  conversationId: string;
  userId: string;
  limit?: number;
}) {
  const boundedLimit = Math.min(Math.max(limit, 1), 50);
  const rows = await db
    .select({
      id: aiMessages.id,
      conversationId: aiMessages.conversationId,
      role: aiMessages.role,
      content: aiMessages.content,
      provider: aiMessages.provider,
      model: aiMessages.model,
      status: aiMessages.status,
      metadata: aiMessages.metadata,
      createdAt: aiMessages.createdAt,
      updatedAt: aiMessages.updatedAt,
    })
    .from(aiMessages)
    .innerJoin(aiConversations, eq(aiMessages.conversationId, aiConversations.id))
    .where(
      and(
        eq(aiConversations.userId, userId),
        eq(aiMessages.conversationId, conversationId),
        eq(aiMessages.status, "completed"),
      ),
    )
    .orderBy(desc(aiMessages.createdAt), desc(aiMessages.id))
    .limit(boundedLimit);

  return rows.reverse().map(toAiMessage);
}

export async function getLatestCompletedAssistantMessage({
  conversationId,
  userId,
}: {
  conversationId: string;
  userId: string;
}) {
  const [message] = await db
    .select({
      id: aiMessages.id,
      conversationId: aiMessages.conversationId,
      role: aiMessages.role,
      content: aiMessages.content,
      provider: aiMessages.provider,
      model: aiMessages.model,
      status: aiMessages.status,
      metadata: aiMessages.metadata,
      createdAt: aiMessages.createdAt,
      updatedAt: aiMessages.updatedAt,
    })
    .from(aiMessages)
    .innerJoin(aiConversations, eq(aiMessages.conversationId, aiConversations.id))
    .where(
      and(
        eq(aiConversations.userId, userId),
        eq(aiMessages.conversationId, conversationId),
        eq(aiMessages.role, "assistant"),
        eq(aiMessages.status, "completed"),
      ),
    )
    .orderBy(desc(aiMessages.createdAt), desc(aiMessages.id))
    .limit(1);

  return message ? toAiMessage(message) : null;
}

export function toGenericAiChatHistory(
  messages: AiMessage[],
  excludeMessageId?: string,
): AiChatMessage[] {
  return messages
    .filter(
      (message) =>
        message.id !== excludeMessageId &&
        message.status === "completed" &&
        message.content.trim().length > 0,
    )
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}

export async function createAiMessageForConversation(
  input: CreateAiMessageInput,
) {
  const now = new Date();
  const [message] = await db
    .insert(aiMessages)
    .values({
      id: createId("aim"),
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      provider: input.provider ?? null,
      model: input.model ?? null,
      status: input.status ?? "completed",
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  await touchConversationAfterMessage({
    conversationId: input.conversationId,
    messageCreatedAt: now,
    userMessageForTitle:
      input.role === "user" && input.status !== "failed" ? input.content : null,
  });

  return toAiMessage(message);
}

export function createAiUserMessage(input: {
  conversationId: string;
  content: string;
  metadata?: Record<string, unknown>;
}) {
  return createAiMessageForConversation({
    ...input,
    role: "user",
    status: "completed",
  });
}

export function createAiAssistantMessage(input: {
  conversationId: string;
  content?: string;
  provider?: AiProviderName | null;
  model?: string | null;
  status?: AiMessageStatus;
  metadata?: Record<string, unknown>;
}) {
  return createAiMessageForConversation({
    ...input,
    role: "assistant",
    content: input.content ?? "",
    status: input.status ?? "generating",
  });
}

export async function updateAiAssistantMessage(
  input: UpdateAiAssistantMessageInput,
) {
  const [existing] = await db
    .select({
      id: aiMessages.id,
      metadata: aiMessages.metadata,
    })
    .from(aiMessages)
    .where(
      and(
        eq(aiMessages.conversationId, input.conversationId),
        eq(aiMessages.id, input.messageId),
        eq(aiMessages.role, "assistant"),
      ),
    )
    .limit(1);

  if (!existing) {
    return null;
  }

  const now = new Date();
  const [message] = await db
    .update(aiMessages)
    .set({
      content: input.content,
      provider: input.provider ?? null,
      model: input.model ?? null,
      status: input.status,
      metadata: {
        ...(existing.metadata ?? {}),
        ...(input.metadata ?? {}),
      },
      updatedAt: now,
    })
    .where(eq(aiMessages.id, input.messageId))
    .returning();

  await touchConversationAfterMessage({
    conversationId: input.conversationId,
    messageCreatedAt: now,
  });

  return message ? toAiMessage(message) : null;
}

export async function updateConversationTitle({
  conversationId,
  userId,
  title,
}: {
  conversationId: string;
  userId: string;
  title: string;
}) {
  const [conversation] = await db
    .update(aiConversations)
    .set({
      title,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(aiConversations.id, conversationId),
        eq(aiConversations.userId, userId),
      ),
    )
    .returning();

  return conversation ? toAiConversation(conversation) : null;
}

async function touchConversationAfterMessage({
  conversationId,
  messageCreatedAt,
  userMessageForTitle,
}: {
  conversationId: string;
  messageCreatedAt: Date;
  userMessageForTitle?: string | null;
}) {
  const [conversation] = await db
    .select({
      id: aiConversations.id,
      surface: aiConversations.surface,
      title: aiConversations.title,
    })
    .from(aiConversations)
    .where(eq(aiConversations.id, conversationId))
    .limit(1);

  if (!conversation) {
    return;
  }

  const shouldGenerateDashboardTitle =
    conversation.surface === "dashboard" &&
    userMessageForTitle &&
    (!conversation.title || conversation.title === "New dashboard chat");

  await db
    .update(aiConversations)
    .set({
      lastMessageAt: messageCreatedAt,
      title: shouldGenerateDashboardTitle
        ? createDashboardTitle(userMessageForTitle)
        : conversation.title,
      updatedAt: new Date(),
    })
    .where(eq(aiConversations.id, conversationId));
}

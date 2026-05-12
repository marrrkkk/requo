import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "@/lib/db/schema/auth";
import { businesses } from "@/lib/db/schema/businesses";

export const aiConversationSurfaceEnum = pgEnum("ai_conversation_surface", [
  "inquiry",
  "quote",
  "dashboard",
]);

export const aiMessageRoleEnum = pgEnum("ai_message_role", [
  "user",
  "assistant",
  "system",
]);

export const aiMessageStatusEnum = pgEnum("ai_message_status", [
  "completed",
  "generating",
  "failed",
]);

export const aiConversations = pgTable(
  "ai_conversations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    surface: aiConversationSurfaceEnum("surface").notNull(),
    entityId: text("entity_id").notNull(),
    title: text("title"),
    isDefault: boolean("is_default").notNull().default(false),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ai_conversations_user_business_idx").on(
      table.userId,
      table.businessId,
    ),
    index("ai_conversations_surface_entity_idx").on(
      table.surface,
      table.entityId,
    ),
    index("ai_conversations_dashboard_recent_idx")
      .on(table.userId, table.businessId, table.lastMessageAt)
      .where(sql`${table.surface} = 'dashboard'`),
    uniqueIndex("ai_conversations_default_entity_unique")
      .on(table.userId, table.businessId, table.surface, table.entityId)
      .where(sql`${table.surface} in ('inquiry', 'quote') and ${table.isDefault} = true`),
  ],
);

export const aiMessages = pgTable(
  "ai_messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => aiConversations.id, { onDelete: "cascade" }),
    role: aiMessageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    provider: text("provider"),
    model: text("model"),
    status: aiMessageStatusEnum("status").notNull().default("completed"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(
      sql`'{}'::jsonb`,
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ai_messages_conversation_id_idx").on(table.conversationId),
    index("ai_messages_created_at_idx").on(table.createdAt),
    index("ai_messages_conversation_created_at_idx").on(
      table.conversationId,
      table.createdAt,
    ),
    index("ai_messages_conversation_created_at_id_idx").on(
      table.conversationId,
      table.createdAt,
      table.id,
    ),
  ],
);

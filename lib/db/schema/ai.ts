import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
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

export const aiUsageEvents = pgTable(
  "ai_usage_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    businessId: text("business_id").notNull(),
    taskType: text("task_type").notNull(),
    weight: integer("weight").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ai_usage_events_user_month_idx").on(table.userId, table.createdAt),
    index("ai_usage_events_business_month_idx").on(
      table.businessId,
      table.createdAt,
    ),
  ],
);

export const aiTokenLogs = pgTable(
  "ai_token_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    businessId: text("business_id").notNull(),
    taskType: text("task_type").notNull(),
    model: text("model").notNull(),
    provider: text("provider").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    estimatedCostCents: integer("estimated_cost_cents"),
    cacheHit: boolean("cache_hit").notNull().default(false),
    latencyMs: integer("latency_ms").notNull(),
    status: text("status").notNull(),
    errorMessage: text("error_message"),
    unpriced: boolean("unpriced").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ai_token_logs_user_idx").on(table.userId),
    index("ai_token_logs_business_idx").on(table.businessId),
    index("ai_token_logs_task_type_idx").on(table.taskType),
    index("ai_token_logs_created_at_idx").on(table.createdAt),
    index("ai_token_logs_provider_idx").on(table.provider),
  ],
);

export const conversationSummaries = pgTable(
  "conversation_summaries",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .unique()
      .references(() => aiConversations.id, { onDelete: "cascade" }),
    summary: text("summary").notNull(),
    messageCount: integer("message_count").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("conversation_summaries_conversation_id_idx").on(
      table.conversationId,
    ),
  ],
);

export const aiDrafts = pgTable(
  "ai_drafts",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    entityId: text("entity_id").notNull(),
    entityType: text("entity_type").notNull(),
    taskType: text("task_type").notNull(),
    content: jsonb("content").notNull(),
    sourceDataTimestamp: timestamp("source_data_timestamp", {
      withTimezone: true,
    }).notNull(),
    isStale: boolean("is_stale").notNull().default(false),
    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("ai_drafts_entity_task_unique").on(
      table.entityId,
      table.taskType,
    ),
    index("ai_drafts_business_idx").on(table.businessId),
    index("ai_drafts_user_idx").on(table.userId),
    index("ai_drafts_last_accessed_idx").on(table.lastAccessedAt),
  ],
);

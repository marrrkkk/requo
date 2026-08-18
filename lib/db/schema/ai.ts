import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

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
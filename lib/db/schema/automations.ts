import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "@/lib/db/schema/auth";
import { businesses } from "@/lib/db/schema/businesses";

export const triggerTypeEnum = pgEnum("trigger_type", [
  "inquiry.received",
  "inquiry.qualified",
  "inquiry.archived",
  "quote.created",
  "quote.sent",
  "quote.viewed",
  "quote.accepted",
  "quote.rejected",
  "quote.expired",
  "job.created",
  "job.completed",
  "invoice.sent",
  "invoice.paid",
  "invoice.overdue",
  "follow_up.due",
  "follow_up.overdue",
]);

export const automationJobStatusEnum = pgEnum("automation_job_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);

export const automationLogStatusEnum = pgEnum("automation_log_status", [
  "success",
  "partial_failure",
  "failure",
]);

export const businessAutomations = pgTable(
  "business_automations",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    triggerType: triggerTypeEnum("trigger_type").notNull(),
    triggerConfig: jsonb("trigger_config"),
    conditions: jsonb("conditions"),
    actions: jsonb("actions").notNull(),
    delay: jsonb("delay"),
    enabled: boolean("enabled").notNull().default(true),
    priority: integer("priority").notNull().default(0),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    consecutiveFailures: integer("consecutive_failures")
      .notNull()
      .default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("business_automations_business_trigger_enabled_idx").on(
      table.businessId,
      table.triggerType,
      table.enabled,
    ),
    index("business_automations_business_id_idx").on(table.businessId),
  ],
);

export const automationScheduledJobs = pgTable(
  "automation_scheduled_jobs",
  {
    id: text("id").primaryKey(),
    automationId: text("automation_id")
      .notNull()
      .references(() => businessAutomations.id, { onDelete: "cascade" }),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    triggerPayload: jsonb("trigger_payload").notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    status: automationJobStatusEnum("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    lastError: text("last_error"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("automation_scheduled_jobs_status_scheduled_for_idx").on(
      table.status,
      table.scheduledFor,
    ),
    index("automation_scheduled_jobs_automation_id_idx").on(table.automationId),
    index("automation_scheduled_jobs_business_id_idx").on(table.businessId),
  ],
);

export const automationLogs = pgTable(
  "automation_logs",
  {
    id: text("id").primaryKey(),
    automationId: text("automation_id").references(
      () => businessAutomations.id,
      { onDelete: "set null" },
    ),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    triggerType: triggerTypeEnum("trigger_type").notNull(),
    triggerPayload: jsonb("trigger_payload").notNull(),
    actionsExecuted: jsonb("actions_executed").notNull(),
    status: automationLogStatusEnum("status").notNull(),
    durationMs: integer("duration_ms").notNull(),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("automation_logs_automation_id_idx").on(table.automationId),
    index("automation_logs_business_id_idx").on(table.businessId),
    index("automation_logs_created_at_idx").on(table.createdAt),
  ],
);

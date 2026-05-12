import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "@/lib/db/schema/auth";
import { businesses } from "@/lib/db/schema/businesses";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    action: text("action").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    source: text("source").notNull().default("app"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_logs_business_created_at_idx").on(
      table.businessId,
      table.createdAt,
    ),
    index("audit_logs_business_actor_created_at_idx").on(
      table.businessId,
      table.actorUserId,
      table.createdAt,
    ),
    index("audit_logs_business_entity_created_at_idx").on(
      table.businessId,
      table.entityType,
      table.createdAt,
    ),
    index("audit_logs_business_action_created_at_idx").on(
      table.businessId,
      table.action,
      table.createdAt,
    ),
  ],
);

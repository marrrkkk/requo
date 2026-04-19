import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "@/lib/db/schema/auth";
import { businesses } from "@/lib/db/schema/businesses";
import { workspaces } from "@/lib/db/schema/workspaces";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    businessId: text("business_id").references(() => businesses.id, {
      onDelete: "set null",
    }),
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
    index("audit_logs_workspace_created_at_idx").on(
      table.workspaceId,
      table.createdAt,
    ),
    index("audit_logs_workspace_actor_created_at_idx").on(
      table.workspaceId,
      table.actorUserId,
      table.createdAt,
    ),
    index("audit_logs_workspace_entity_created_at_idx").on(
      table.workspaceId,
      table.entityType,
      table.createdAt,
    ),
    index("audit_logs_workspace_action_created_at_idx").on(
      table.workspaceId,
      table.action,
      table.createdAt,
    ),
    index("audit_logs_workspace_business_created_at_idx").on(
      table.workspaceId,
      table.businessId,
      table.createdAt,
    ),
  ],
);

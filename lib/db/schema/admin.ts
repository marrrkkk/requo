import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "@/lib/db/schema/auth";

export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: text("id").primaryKey(),
    adminUserId: text("admin_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    adminEmail: text("admin_email").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("admin_audit_logs_created_at_idx").on(table.createdAt),
    index("admin_audit_logs_admin_created_at_idx").on(
      table.adminUserId,
      table.createdAt,
    ),
    index("admin_audit_logs_action_created_at_idx").on(
      table.action,
      table.createdAt,
    ),
    index("admin_audit_logs_target_created_at_idx").on(
      table.targetType,
      table.targetId,
      table.createdAt,
    ),
  ],
);

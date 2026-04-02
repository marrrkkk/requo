import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "@/lib/db/schema/auth";
import { inquiries } from "@/lib/db/schema/inquiries";
import { quotes } from "@/lib/db/schema/quotes";
import { workspaces } from "@/lib/db/schema/workspaces";

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    inquiryId: text("inquiry_id").references(() => inquiries.id, {
      onDelete: "set null",
    }),
    quoteId: text("quote_id").references(() => quotes.id, {
      onDelete: "set null",
    }),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    type: text("type").notNull(),
    summary: text("summary").notNull(),
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
    index("activity_logs_workspace_id_idx").on(table.workspaceId),
    index("activity_logs_workspace_created_at_idx").on(
      table.workspaceId,
      table.createdAt,
    ),
    index("activity_logs_workspace_type_idx").on(table.workspaceId, table.type),
    index("activity_logs_inquiry_id_idx").on(table.inquiryId),
    index("activity_logs_quote_id_idx").on(table.quoteId),
    index("activity_logs_actor_user_id_idx").on(table.actorUserId),
  ],
);

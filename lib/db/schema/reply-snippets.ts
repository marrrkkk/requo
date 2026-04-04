import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { workspaces } from "@/lib/db/schema/workspaces";

export const replySnippets = pgTable(
  "reply_snippets",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("reply_snippets_workspace_id_idx").on(table.workspaceId),
    index("reply_snippets_workspace_created_at_idx").on(
      table.workspaceId,
      table.createdAt,
    ),
  ],
);

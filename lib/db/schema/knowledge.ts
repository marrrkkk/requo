import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { workspaces } from "@/lib/db/schema/workspaces";

export const knowledgeFiles = pgTable(
  "knowledge_files",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    fileSize: integer("file_size").notNull(),
    storagePath: text("storage_path").notNull(),
    extractedText: text("extracted_text"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("knowledge_files_workspace_id_idx").on(table.workspaceId),
    index("knowledge_files_workspace_created_at_idx").on(
      table.workspaceId,
      table.createdAt,
    ),
    uniqueIndex("knowledge_files_workspace_storage_path_unique").on(
      table.workspaceId,
      table.storagePath,
    ),
    check(
      "knowledge_files_file_size_nonnegative",
      sql`${table.fileSize} >= 0`,
    ),
  ],
);

export const knowledgeFaqs = pgTable(
  "knowledge_faqs",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("knowledge_faqs_workspace_id_idx").on(table.workspaceId),
    index("knowledge_faqs_workspace_position_idx").on(
      table.workspaceId,
      table.position,
    ),
    check("knowledge_faqs_position_nonnegative", sql`${table.position} >= 0`),
  ],
);

import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { businesses } from "@/lib/db/schema/businesses";

export const knowledgeFileStatusEnum = pgEnum("knowledge_file_status", [
  "pending",
  "processing",
  "ready",
  "failed",
]);

export const knowledgeFileStatuses = [
  "pending",
  "processing",
  "ready",
  "failed",
] as const;

export type KnowledgeFileStatus = (typeof knowledgeFileStatuses)[number];

/**
 * Uploaded knowledge files (PDF, CSV, TXT, Markdown). Files are stored in the
 * private Supabase `knowledge-files` bucket; this table tracks lifecycle and
 * extraction state. Content is context-only and never monetary authority.
 */
export const businessKnowledgeFiles = pgTable(
  "business_knowledge_files",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    originalFileName: text("original_file_name").notNull(),
    storagePath: text("storage_path").notNull(),
    mimeType: text("mime_type").notNull(),
    byteSize: integer("byte_size").notNull().default(0),
    status: knowledgeFileStatusEnum("status").notNull().default("pending"),
    extractedCharacterCount: integer("extracted_character_count"),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("knowledge_files_business_status_idx").on(
      table.businessId,
      table.status,
    ),
    index("knowledge_files_business_created_at_idx").on(
      table.businessId,
      table.createdAt,
    ),
    uniqueIndex("knowledge_files_storage_path_unique").on(table.storagePath),
    check(
      "knowledge_files_byte_size_nonnegative",
      sql`${table.byteSize} >= 0`,
    ),
    check(
      "knowledge_files_extracted_chars_nonnegative",
      sql`${table.extractedCharacterCount} is null or ${table.extractedCharacterCount} >= 0`,
    ),
  ],
);

/**
 * Ordered chunks of extracted knowledge file text. Each chunk stores its
 * embedding plus a content hash so stale retrieval and duplicate indexing can
 * be detected.
 */
export const businessKnowledgeChunks = pgTable(
  "business_knowledge_chunks",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    fileId: text("file_id")
      .notNull()
      .references(() => businessKnowledgeFiles.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    content: text("content").notNull(),
    contentHash: text("content_hash").notNull(),
    embedding: jsonb("embedding").$type<number[] | null>().default(null),
    tokenEstimate: integer("token_estimate").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("knowledge_chunks_business_file_position_idx").on(
      table.businessId,
      table.fileId,
      table.position,
    ),
    index("knowledge_chunks_business_content_hash_idx").on(
      table.businessId,
      table.contentHash,
    ),
    uniqueIndex("knowledge_chunks_file_position_unique").on(
      table.fileId,
      table.position,
    ),
    check(
      "knowledge_chunks_position_nonnegative",
      sql`${table.position} >= 0`,
    ),
    check(
      "knowledge_chunks_token_estimate_nonnegative",
      sql`${table.tokenEstimate} >= 0`,
    ),
  ],
);

import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { businesses } from "@/lib/db/schema/businesses";

export const businessMemories = pgTable(
  "business_memories",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Embedding vector stored as JSONB array for semantic search. Null if not yet generated. */
    embedding: jsonb("embedding").$type<number[] | null>().default(null),
    /** Memory category for intent-based retrieval filtering. */
    category: text("category").notNull().default("business_rules"),
  },
  (table) => [
    index("business_memories_business_id_idx").on(table.businessId),
    index("business_memories_business_position_idx").on(
      table.businessId,
      table.position,
    ),
    index("business_memories_business_category_idx").on(
      table.businessId,
      table.category,
    ),
    check(
      "business_memories_position_nonnegative",
      sql`${table.position} >= 0`,
    ),
    check(
      "business_memories_title_length",
      sql`char_length(${table.title}) <= 200`,
    ),
    check(
      "business_memories_content_length",
      sql`char_length(${table.content}) <= 4000`,
    ),
    check(
      "business_memories_category_check",
      sql`${table.category} IN ('business_rules', 'pricing_knowledge', 'customer_context', 'workflow_preferences')`,
    ),
  ],
);

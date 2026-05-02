import { index, pgTable, text, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";

import { businesses } from "@/lib/db/schema/businesses";
import { quotes } from "@/lib/db/schema/quotes";

export const postWinChecklistItems = pgTable(
  "post_win_checklist_items",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    quoteId: text("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("post_win_checklist_items_business_id_idx").on(table.businessId),
    index("post_win_checklist_items_quote_id_idx").on(table.quoteId),
    uniqueIndex("post_win_checklist_items_quote_position_unique").on(
      table.quoteId,
      table.position,
    ),
  ],
);

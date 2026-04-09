import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { businesses } from "@/lib/db/schema/businesses";

export const quoteLibraryEntryKindEnum = pgEnum("quote_library_entry_kind", [
  "block",
  "package",
]);

export const quoteLibraryEntries = pgTable(
  "quote_library_entries",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    kind: quoteLibraryEntryKindEnum("kind").notNull(),
    currency: text("currency").notNull().default("USD"),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("quote_library_entries_business_id_idx").on(table.businessId),
    index("quote_library_entries_business_kind_name_idx").on(
      table.businessId,
      table.kind,
      table.name,
    ),
    index("quote_library_entries_business_created_at_idx").on(
      table.businessId,
      table.createdAt,
    ),
    check(
      "quote_library_entries_currency_format",
      sql`${table.currency} ~ '^[A-Z]{3}$'`,
    ),
  ],
);

export const quoteLibraryEntryItems = pgTable(
  "quote_library_entry_items",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    entryId: text("entry_id")
      .notNull()
      .references(() => quoteLibraryEntries.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitPriceInCents: integer("unit_price_in_cents").notNull().default(0),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("quote_library_entry_items_business_id_idx").on(table.businessId),
    index("quote_library_entry_items_entry_id_idx").on(table.entryId),
    uniqueIndex("quote_library_entry_items_entry_position_unique").on(
      table.entryId,
      table.position,
    ),
    check(
      "quote_library_entry_items_values_valid",
      sql`${table.quantity} > 0 and ${table.unitPriceInCents} >= 0 and ${table.position} >= 0`,
    ),
  ],
);

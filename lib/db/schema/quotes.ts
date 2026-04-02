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

import { inquiries } from "@/lib/db/schema/inquiries";
import { workspaces } from "@/lib/db/schema/workspaces";

export const quoteStatusEnum = pgEnum("quote_status", [
  "draft",
  "sent",
  "accepted",
  "rejected",
  "expired",
]);

export const quotes = pgTable(
  "quotes",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    inquiryId: text("inquiry_id").references(() => inquiries.id, {
      onDelete: "set null",
    }),
    status: quoteStatusEnum("status").notNull().default("draft"),
    quoteNumber: text("quote_number"),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email").notNull(),
    currency: text("currency").notNull().default("USD"),
    message: text("message"),
    subtotalInCents: integer("subtotal_in_cents").notNull().default(0),
    taxInCents: integer("tax_in_cents").notNull().default(0),
    totalInCents: integer("total_in_cents").notNull().default(0),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("quotes_workspace_id_idx").on(table.workspaceId),
    index("quotes_workspace_status_idx").on(table.workspaceId, table.status),
    index("quotes_workspace_created_at_idx").on(table.workspaceId, table.createdAt),
    index("quotes_inquiry_id_idx").on(table.inquiryId),
    uniqueIndex("quotes_workspace_quote_number_unique").on(
      table.workspaceId,
      table.quoteNumber,
    ),
    check(
      "quotes_totals_nonnegative",
      sql`${table.subtotalInCents} >= 0 and ${table.taxInCents} >= 0 and ${table.totalInCents} >= 0`,
    ),
  ],
);

export const quoteItems = pgTable(
  "quote_items",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    quoteId: text("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitPriceInCents: integer("unit_price_in_cents").notNull().default(0),
    lineTotalInCents: integer("line_total_in_cents").notNull().default(0),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("quote_items_workspace_id_idx").on(table.workspaceId),
    index("quote_items_quote_id_idx").on(table.quoteId),
    uniqueIndex("quote_items_quote_position_unique").on(
      table.quoteId,
      table.position,
    ),
    check(
      "quote_items_values_valid",
      sql`${table.quantity} > 0 and ${table.unitPriceInCents} >= 0 and ${table.lineTotalInCents} >= 0 and ${table.position} >= 0`,
    ),
  ],
);

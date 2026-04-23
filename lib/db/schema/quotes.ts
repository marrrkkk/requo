import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { inquiries } from "@/lib/db/schema/inquiries";
import { businesses } from "@/lib/db/schema/businesses";
import { user } from "@/lib/db/schema/auth";

export const quoteStatusEnum = pgEnum("quote_status", [
  "draft",
  "sent",
  "accepted",
  "rejected",
  "expired",
  "voided",
]);

export const quotePostAcceptanceStatusEnum = pgEnum(
  "quote_post_acceptance_status",
  ["none", "booked", "scheduled"],
);

export const quotes = pgTable(
  "quotes",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    inquiryId: text("inquiry_id").references(() => inquiries.id, {
      onDelete: "set null",
    }),
    status: quoteStatusEnum("status").notNull().default("draft"),
    quoteNumber: text("quote_number").notNull(),
    publicToken: text("public_token"),
    publicTokenHash: text("public_token_hash"),
    title: text("title").notNull(),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email"),
    customerContactMethod: text("customer_contact_method")
      .notNull()
      .default("email"),
    customerContactHandle: text("customer_contact_handle").notNull().default(""),
    currency: text("currency").notNull().default("USD"),
    notes: text("message"),
    subtotalInCents: integer("subtotal_in_cents").notNull().default(0),
    discountInCents: integer("tax_in_cents").notNull().default(0),
    totalInCents: integer("total_in_cents").notNull().default(0),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    publicViewedAt: timestamp("public_viewed_at", { withTimezone: true }),
    customerRespondedAt: timestamp("customer_responded_at", {
      withTimezone: true,
    }),
    customerResponseMessage: text("customer_response_message"),
    postAcceptanceStatus: quotePostAcceptanceStatusEnum("post_acceptance_status")
      .notNull()
      .default("none"),
    validUntil: date("expires_at", { mode: "string" }).notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    archivedBy: text("archived_by").references(() => user.id, {
      onDelete: "set null",
    }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: text("deleted_by").references(() => user.id, {
      onDelete: "set null",
    }),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidedBy: text("voided_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("quotes_business_id_idx").on(table.businessId),
    index("quotes_business_status_idx").on(table.businessId, table.status),
    index("quotes_business_archived_at_idx").on(table.businessId, table.archivedAt),
    index("quotes_business_deleted_at_idx").on(table.businessId, table.deletedAt),
    index("quotes_business_created_at_idx").on(table.businessId, table.createdAt),
    index("quotes_sent_valid_until_idx")
      .on(table.businessId, table.validUntil)
      .where(sql`${table.status} = 'sent' and ${table.deletedAt} is null`),
    index("quotes_sent_follow_up_idx")
      .on(table.businessId, table.sentAt)
      .where(
        sql`${table.status} = 'sent' and ${table.customerRespondedAt} is null and ${table.deletedAt} is null`,
      ),
    index("quotes_inquiry_id_idx").on(table.inquiryId),
    uniqueIndex("quotes_public_token_unique").on(table.publicToken),
    uniqueIndex("quotes_public_token_hash_unique").on(table.publicTokenHash),
    uniqueIndex("quotes_business_quote_number_unique").on(
      table.businessId,
      table.quoteNumber,
    ),
    check(
      "quotes_totals_valid",
      sql`${table.subtotalInCents} >= 0 and ${table.discountInCents} >= 0 and ${table.totalInCents} >= 0 and ${table.subtotalInCents} >= ${table.discountInCents} and ${table.totalInCents} = ${table.subtotalInCents} - ${table.discountInCents}`,
    ),
  ],
);

export const quoteItems = pgTable(
  "quote_items",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
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
    index("quote_items_business_id_idx").on(table.businessId),
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

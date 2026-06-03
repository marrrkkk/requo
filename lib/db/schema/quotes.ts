import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
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
  "revision_requested",
  "accepted",
  "rejected",
  "expired",
  "voided",
]);

export const quotePostAcceptanceStatusEnum = pgEnum(
  "quote_post_acceptance_status",
  [
    "none",
    "booked",
    "scheduled",
    "in_progress",
    "no_job_tracking",
    "completed",
    "canceled",
  ],
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
    terms: text("terms"),
    subtotalInCents: integer("subtotal_in_cents").notNull().default(0),
    discountInCents: integer("discount_in_cents").notNull().default(0),
    taxInCents: integer("tax_amount_in_cents").notNull().default(0),
    taxLabel: text("tax_label"),
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
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedBy: text("completed_by").references(() => user.id, {
      onDelete: "set null",
    }),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    canceledBy: text("canceled_by").references(() => user.id, {
      onDelete: "set null",
    }),
    cancellationReason: text("cancellation_reason"),
    cancellationNote: text("cancellation_note"),
    version: integer("version").notNull().default(1),
    /** Whether auto follow-up emails are enabled for this quote. */
    autoFollowUpEnabled: boolean("auto_follow_up_enabled")
      .notNull()
      .default(false),
    /** Days to wait after send (or last auto follow-up) before sending another. */
    autoFollowUpDelayDays: integer("auto_follow_up_delay_days")
      .notNull()
      .default(3),
    /** Max number of auto follow-up emails to send. */
    autoFollowUpMaxAttempts: integer("auto_follow_up_max_attempts")
      .notNull()
      .default(2),
    /** How many auto follow-up emails have been sent so far. */
    autoFollowUpAttempts: integer("auto_follow_up_attempts")
      .notNull()
      .default(0),
    /** When the last auto follow-up email was sent. */
    autoFollowUpLastSentAt: timestamp("auto_follow_up_last_sent_at", {
      withTimezone: true,
    }),
    /** Set when auto follow-ups are manually stopped or the quote is engaged. */
    autoFollowUpStoppedAt: timestamp("auto_follow_up_stopped_at", {
      withTimezone: true,
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
    index("quotes_business_status_created_at_idx").on(
      table.businessId,
      table.status,
      table.createdAt,
    ),
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
    index("quotes_auto_follow_up_pending_idx")
      .on(table.sentAt)
      .where(
        sql`${table.autoFollowUpEnabled} = true and ${table.autoFollowUpStoppedAt} is null and ${table.status} = 'sent' and ${table.publicViewedAt} is null and ${table.customerRespondedAt} is null and ${table.deletedAt} is null`,
      ),
    index("quotes_inquiry_id_idx").on(table.inquiryId),
    uniqueIndex("quotes_public_token_unique").on(table.publicToken),
    uniqueIndex("quotes_public_token_hash_unique").on(table.publicTokenHash),
    uniqueIndex("quotes_business_quote_number_unique").on(
      table.businessId,
      table.quoteNumber,
    ),
    index("quotes_accepted_post_win_idx")
      .on(table.businessId, table.postAcceptanceStatus)
      .where(
        sql`${table.status} = 'accepted' and ${table.deletedAt} is null and ${table.archivedAt} is null`,
      ),
    check(
      "quotes_totals_valid",
      sql`${table.subtotalInCents} >= 0 and ${table.discountInCents} >= 0 and ${table.taxInCents} >= 0 and ${table.totalInCents} >= 0 and ${table.subtotalInCents} >= ${table.discountInCents} and ${table.totalInCents} = ${table.subtotalInCents} - ${table.discountInCents} + ${table.taxInCents}`,
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

export type QuoteVersionItemSnapshot = {
  id: string;
  description: string;
  quantity: number;
  unitPriceInCents: number;
  lineTotalInCents: number;
  position: number;
};

export type QuoteRevisionItemComment = {
  itemId: string;
  itemDescription: string;
  comment: string;
};

export const quoteVersions = pgTable(
  "quote_versions",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    quoteId: text("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    title: text("title").notNull(),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email"),
    customerContactMethod: text("customer_contact_method")
      .notNull()
      .default("email"),
    customerContactHandle: text("customer_contact_handle").notNull().default(""),
    currency: text("currency").notNull().default("USD"),
    notes: text("notes"),
    terms: text("terms"),
    subtotalInCents: integer("subtotal_in_cents").notNull().default(0),
    discountInCents: integer("discount_in_cents").notNull().default(0),
    taxInCents: integer("tax_amount_in_cents").notNull().default(0),
    taxLabel: text("tax_label"),
    totalInCents: integer("total_in_cents").notNull().default(0),
    validUntil: date("valid_until", { mode: "string" }).notNull(),
    items: jsonb("items").$type<QuoteVersionItemSnapshot[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("quote_versions_quote_id_idx").on(table.quoteId),
    index("quote_versions_business_id_idx").on(table.businessId),
    uniqueIndex("quote_versions_quote_version_unique").on(
      table.quoteId,
      table.version,
    ),
  ],
);

export const quoteRevisionRequests = pgTable(
  "quote_revision_requests",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    quoteId: text("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    message: text("message"),
    itemComments: jsonb("item_comments")
      .$type<QuoteRevisionItemComment[]>()
      .default([]),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    index("quote_revision_requests_quote_id_idx").on(table.quoteId),
    index("quote_revision_requests_business_id_idx").on(table.businessId),
  ],
);

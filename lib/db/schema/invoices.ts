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
import { jobs } from "@/lib/db/schema/jobs";
import { quotes } from "@/lib/db/schema/quotes";
import { user } from "@/lib/db/schema/auth";

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "viewed",
  "paid",
  "overdue",
  "voided",
]);

export const invoices = pgTable(
  "invoices",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    /** Linked job (if invoice was generated from a completed job). */
    jobId: text("job_id").references(() => jobs.id, { onDelete: "set null" }),
    /** Linked quote (if invoice was generated directly from an accepted quote). */
    quoteId: text("quote_id").references(() => quotes.id, {
      onDelete: "set null",
    }),
    invoiceNumber: text("invoice_number").notNull(),
    title: text("title").notNull(),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email"),
    customerContactMethod: text("customer_contact_method")
      .notNull()
      .default("email"),
    customerContactHandle: text("customer_contact_handle").notNull().default(""),
    status: invoiceStatusEnum("status").notNull().default("draft"),
    currency: text("currency").notNull().default("USD"),
    notes: text("notes"),
    terms: text("terms"),
    subtotalInCents: integer("subtotal_in_cents").notNull().default(0),
    discountInCents: integer("discount_in_cents").notNull().default(0),
    taxInCents: integer("tax_in_cents").notNull().default(0),
    taxLabel: text("tax_label"),
    totalInCents: integer("total_in_cents").notNull().default(0),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    viewedAt: timestamp("viewed_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    paidBy: text("paid_by").references(() => user.id, { onDelete: "set null" }),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidedBy: text("voided_by").references(() => user.id, {
      onDelete: "set null",
    }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    archivedBy: text("archived_by").references(() => user.id, {
      onDelete: "set null",
    }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: text("deleted_by").references(() => user.id, {
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
    index("invoices_business_id_idx").on(table.businessId),
    index("invoices_business_status_idx").on(table.businessId, table.status),
    index("invoices_business_created_at_idx").on(
      table.businessId,
      table.createdAt,
    ),
    index("invoices_business_deleted_at_idx").on(
      table.businessId,
      table.deletedAt,
    ),
    index("invoices_job_id_idx").on(table.jobId),
    index("invoices_quote_id_idx").on(table.quoteId),
    uniqueIndex("invoices_business_invoice_number_unique").on(
      table.businessId,
      table.invoiceNumber,
    ),
    check(
      "invoices_totals_valid",
      sql`${table.subtotalInCents} >= 0 and ${table.discountInCents} >= 0 and ${table.taxInCents} >= 0 and ${table.totalInCents} >= 0`,
    ),
  ],
);

export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
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
    index("invoice_items_business_id_idx").on(table.businessId),
    index("invoice_items_invoice_id_idx").on(table.invoiceId),
    uniqueIndex("invoice_items_invoice_position_unique").on(
      table.invoiceId,
      table.position,
    ),
    check(
      "invoice_items_values_valid",
      sql`${table.quantity} > 0 and ${table.unitPriceInCents} >= 0 and ${table.lineTotalInCents} >= 0 and ${table.position} >= 0`,
    ),
  ],
);

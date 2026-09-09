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

import { businesses } from "@/lib/db/schema/businesses";
import { quotes } from "@/lib/db/schema/quotes";
import { user } from "@/lib/db/schema/auth";

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "unpaid",
  "partially_paid",
  "paid",
  "overdue",
  "voided",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "bank_transfer",
  "gcash",
  "maya",
  "check",
  "other",
]);

export const invoices = pgTable(
  "invoices",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
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
    paymentTerms: text("payment_terms"),
    subtotalInCents: integer("subtotal_in_cents").notNull().default(0),
    discountInCents: integer("discount_in_cents").notNull().default(0),
    taxInCents: integer("tax_in_cents").notNull().default(0),
    taxLabel: text("tax_label"),
    totalInCents: integer("total_in_cents").notNull().default(0),
    issueDate: date("issue_date", { mode: "string" }).notNull(),
    dueDate: date("due_date", { mode: "string" }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidedBy: text("voided_by").references(() => user.id, { onDelete: "set null" }),
    voidReason: text("void_reason"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: text("deleted_by").references(() => user.id, { onDelete: "set null" }),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("invoices_business_id_idx").on(table.businessId),
    index("invoices_business_status_idx").on(table.businessId, table.status),
    index("invoices_business_due_date_idx").on(table.businessId, table.dueDate),
    index("invoices_business_customer_idx").on(table.businessId, table.customerEmail),
    index("invoices_quote_id_idx").on(table.quoteId),
    index("invoices_deleted_at_idx").on(table.businessId, table.deletedAt),
    uniqueIndex("invoices_business_invoice_number_unique").on(
      table.businessId,
      table.invoiceNumber,
    ),
    uniqueIndex("invoices_business_quote_active_unique")
      .on(table.businessId, table.quoteId)
      .where(sql`${table.quoteId} is not null and ${table.deletedAt} is null and ${table.status} <> 'voided'`),
    check(
      "invoices_totals_valid",
      sql`${table.subtotalInCents} >= 0 and ${table.discountInCents} >= 0 and ${table.taxInCents} >= 0 and ${table.totalInCents} >= 0 and ${table.subtotalInCents} >= ${table.discountInCents} and ${table.totalInCents} = ${table.subtotalInCents} - ${table.discountInCents} + ${table.taxInCents}`,
    ),
    check("invoices_dates_valid", sql`${table.dueDate} >= ${table.issueDate}`),
  ],
);

export const invoiceLineItems = pgTable(
  "invoice_line_items",
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("invoice_line_items_business_id_idx").on(table.businessId),
    index("invoice_line_items_invoice_id_idx").on(table.invoiceId),
    uniqueIndex("invoice_line_items_invoice_position_unique").on(table.invoiceId, table.position),
    check(
      "invoice_line_items_values_valid",
      sql`${table.quantity} > 0 and ${table.unitPriceInCents} >= 0 and ${table.lineTotalInCents} >= 0 and ${table.lineTotalInCents} = ${table.quantity} * ${table.unitPriceInCents} and ${table.position} >= 0`,
    ),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    amountInCents: integer("amount_in_cents").notNull(),
    paymentDate: date("payment_date", { mode: "string" }).notNull(),
    method: paymentMethodEnum("method").notNull(),
    reference: text("reference"),
    notes: text("notes"),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidedBy: text("voided_by").references(() => user.id, { onDelete: "set null" }),
    voidReason: text("void_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("payments_business_id_idx").on(table.businessId),
    index("payments_invoice_id_idx").on(table.invoiceId),
    index("payments_payment_date_idx").on(table.businessId, table.paymentDate),
    check("payments_amount_valid", sql`${table.amountInCents} > 0`),
  ],
);

export type InvoiceStatus = (typeof invoiceStatusEnum.enumValues)[number];
export type PaymentMethod = (typeof paymentMethodEnum.enumValues)[number];

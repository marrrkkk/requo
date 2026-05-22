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
import { quotes } from "@/lib/db/schema/quotes";
import { user } from "@/lib/db/schema/auth";

export const jobStatusEnum = pgEnum("job_status", [
  "todo",
  "in_progress",
  "done",
]);

export const jobs = pgTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    quoteId: text("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email"),
    customerContactMethod: text("customer_contact_method")
      .notNull()
      .default("email"),
    customerContactHandle: text("customer_contact_handle").notNull().default(""),
    status: jobStatusEnum("status").notNull().default("todo"),
    currency: text("currency").notNull().default("USD"),
    totalInCents: integer("total_in_cents").notNull().default(0),
    notes: text("notes"),
    position: integer("position").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedBy: text("completed_by").references(() => user.id, {
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
    index("jobs_business_id_idx").on(table.businessId),
    index("jobs_business_status_idx").on(table.businessId, table.status),
    index("jobs_business_created_at_idx").on(table.businessId, table.createdAt),
    index("jobs_business_deleted_at_idx").on(table.businessId, table.deletedAt),
    uniqueIndex("jobs_quote_id_unique").on(table.quoteId),
    check("jobs_total_nonnegative", sql`${table.totalInCents} >= 0`),
    check("jobs_position_nonnegative", sql`${table.position} >= 0`),
  ],
);

export const jobItems = pgTable(
  "job_items",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitPriceInCents: integer("unit_price_in_cents").notNull().default(0),
    lineTotalInCents: integer("line_total_in_cents").notNull().default(0),
    position: integer("position").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("job_items_business_id_idx").on(table.businessId),
    index("job_items_job_id_idx").on(table.jobId),
    uniqueIndex("job_items_job_position_unique").on(table.jobId, table.position),
    check(
      "job_items_values_valid",
      sql`${table.quantity} > 0 and ${table.unitPriceInCents} >= 0 and ${table.lineTotalInCents} >= 0 and ${table.position} >= 0`,
    ),
  ],
);

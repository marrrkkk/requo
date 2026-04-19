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
} from "drizzle-orm/pg-core";

import { user } from "@/lib/db/schema/auth";
import { businessInquiryForms } from "@/lib/db/schema/business-inquiry-forms";
import { businesses } from "@/lib/db/schema/businesses";
import type { InquirySubmittedFieldSnapshot } from "@/features/inquiries/form-config";

export const inquiryStatusEnum = pgEnum("inquiry_status", [
  "new",
  "quoted",
  "waiting",
  "won",
  "lost",
  "archived",
  "overdue",
]);

export const inquiries = pgTable(
  "inquiries",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    businessInquiryFormId: text("business_inquiry_form_id")
      .notNull()
      .references(() => businessInquiryForms.id, { onDelete: "restrict" }),
    status: inquiryStatusEnum("status").notNull().default("new"),
    subject: text("subject"),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email").notNull(),
    customerPhone: text("customer_phone"),
    serviceCategory: text("service_category").notNull(),
    requestedDeadline: date("requested_deadline", { mode: "string" }),
    budgetText: text("budget_text"),
    companyName: text("company_name"),
    details: text("details").notNull(),
    submittedFieldSnapshot:
      jsonb("submitted_field_snapshot").$type<InquirySubmittedFieldSnapshot>(),
    source: text("source"),
    quoteRequested: boolean("quote_requested").notNull().default(true),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastRespondedAt: timestamp("last_responded_at", { withTimezone: true }),
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
    index("inquiries_business_id_idx").on(table.businessId),
    index("inquiries_business_inquiry_form_id_idx").on(
      table.businessInquiryFormId,
    ),
    index("inquiries_business_status_idx").on(table.businessId, table.status),
    index("inquiries_business_archived_at_idx").on(
      table.businessId,
      table.archivedAt,
    ),
    index("inquiries_business_deleted_at_idx").on(
      table.businessId,
      table.deletedAt,
    ),
    index("inquiries_business_submitted_at_idx").on(
      table.businessId,
      table.submittedAt,
    ),
    index("inquiries_open_deadline_idx")
      .on(table.businessId, table.requestedDeadline)
      .where(
        sql`${table.status} in ('new', 'waiting', 'quoted') and ${table.requestedDeadline} is not null and ${table.archivedAt} is null and ${table.deletedAt} is null`,
      ),
    index("inquiries_business_service_category_idx").on(
      table.businessId,
      table.serviceCategory,
    ),
  ],
);

export const inquiryAttachments = pgTable(
  "inquiry_attachments",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    inquiryId: text("inquiry_id")
      .notNull()
      .references(() => inquiries.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    fileSize: integer("file_size").notNull(),
    storagePath: text("storage_path").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("inquiry_attachments_business_id_idx").on(table.businessId),
    index("inquiry_attachments_inquiry_id_idx").on(table.inquiryId),
    index("inquiry_attachments_business_inquiry_idx").on(
      table.businessId,
      table.inquiryId,
    ),
    check(
      "inquiry_attachments_file_size_nonnegative",
      sql`${table.fileSize} >= 0`,
    ),
  ],
);

export const inquiryNotes = pgTable(
  "inquiry_notes",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    inquiryId: text("inquiry_id")
      .notNull()
      .references(() => inquiries.id, { onDelete: "cascade" }),
    authorUserId: text("author_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("inquiry_notes_business_id_idx").on(table.businessId),
    index("inquiry_notes_inquiry_id_idx").on(table.inquiryId),
    index("inquiry_notes_business_inquiry_idx").on(
      table.businessId,
      table.inquiryId,
    ),
    index("inquiry_notes_author_user_id_idx").on(table.authorUserId),
  ],
);

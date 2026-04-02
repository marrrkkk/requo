import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "@/lib/db/schema/auth";
import { workspaces } from "@/lib/db/schema/workspaces";

export const inquiryStatusEnum = pgEnum("inquiry_status", [
  "new",
  "reviewing",
  "quoted",
  "booked",
  "closed",
  "archived",
]);

export const inquiries = pgTable(
  "inquiries",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    status: inquiryStatusEnum("status").notNull().default("new"),
    subject: text("subject"),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email").notNull(),
    customerPhone: text("customer_phone"),
    companyName: text("company_name"),
    details: text("details").notNull(),
    source: text("source"),
    quoteRequested: boolean("quote_requested").notNull().default(true),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastRespondedAt: timestamp("last_responded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("inquiries_workspace_id_idx").on(table.workspaceId),
    index("inquiries_workspace_status_idx").on(table.workspaceId, table.status),
    index("inquiries_workspace_submitted_at_idx").on(
      table.workspaceId,
      table.submittedAt,
    ),
  ],
);

export const inquiryAttachments = pgTable(
  "inquiry_attachments",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
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
    index("inquiry_attachments_workspace_id_idx").on(table.workspaceId),
    index("inquiry_attachments_inquiry_id_idx").on(table.inquiryId),
    index("inquiry_attachments_workspace_inquiry_idx").on(
      table.workspaceId,
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
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
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
    index("inquiry_notes_workspace_id_idx").on(table.workspaceId),
    index("inquiry_notes_inquiry_id_idx").on(table.inquiryId),
    index("inquiry_notes_workspace_inquiry_idx").on(
      table.workspaceId,
      table.inquiryId,
    ),
    index("inquiry_notes_author_user_id_idx").on(table.authorUserId),
  ],
);

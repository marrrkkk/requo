import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "@/lib/db/schema/auth";
import { businesses } from "@/lib/db/schema/businesses";
import { inquiries } from "@/lib/db/schema/inquiries";
import { quotes } from "@/lib/db/schema/quotes";

export const followUpStatusEnum = pgEnum("follow_up_status", [
  "pending",
  "completed",
  "skipped",
]);

export const followUpChannelEnum = pgEnum("follow_up_channel", [
  "email",
  "phone",
  "sms",
  "whatsapp",
  "messenger",
  "instagram",
  "other",
]);

export const followUps = pgTable(
  "follow_ups",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    inquiryId: text("inquiry_id").references(() => inquiries.id, {
      onDelete: "cascade",
    }),
    quoteId: text("quote_id").references(() => quotes.id, {
      onDelete: "cascade",
    }),
    assignedToUserId: text("assigned_to_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    reason: text("reason").notNull(),
    category: text("category").notNull().default("sales"),
    channel: followUpChannelEnum("channel").notNull().default("email"),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    skippedAt: timestamp("skipped_at", { withTimezone: true }),
    status: followUpStatusEnum("status").notNull().default("pending"),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
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
    index("follow_ups_business_status_due_at_idx").on(
      table.businessId,
      table.status,
      table.dueAt,
    ),
    index("follow_ups_business_pending_due_at_idx")
      .on(table.businessId, table.dueAt)
      .where(sql`${table.status} = 'pending'`),
    index("follow_ups_inquiry_id_idx").on(table.inquiryId),
    index("follow_ups_quote_id_idx").on(table.quoteId),
    index("follow_ups_assigned_to_user_id_idx").on(table.assignedToUserId),
    check(
      "follow_ups_related_record_required",
      sql`${table.inquiryId} is not null or ${table.quoteId} is not null`,
    ),
  ],
);

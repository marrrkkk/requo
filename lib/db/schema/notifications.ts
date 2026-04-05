import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "@/lib/db/schema/auth";
import { businesses } from "@/lib/db/schema/businesses";
import { inquiries } from "@/lib/db/schema/inquiries";
import { quotes } from "@/lib/db/schema/quotes";

export const businessNotificationTypeEnum = pgEnum("business_notification_type", [
  "public_inquiry_submitted",
  "quote_customer_accepted",
  "quote_customer_rejected",
]);

export const businessNotifications = pgTable(
  "business_notifications",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    inquiryId: text("inquiry_id").references(() => inquiries.id, {
      onDelete: "set null",
    }),
    quoteId: text("quote_id").references(() => quotes.id, {
      onDelete: "set null",
    }),
    type: businessNotificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(
      sql`'{}'::jsonb`,
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("business_notifications_business_created_at_idx").on(
      table.businessId,
      table.createdAt,
    ),
    index("business_notifications_business_type_created_at_idx").on(
      table.businessId,
      table.type,
      table.createdAt,
    ),
    index("business_notifications_inquiry_id_idx").on(table.inquiryId),
    index("business_notifications_quote_id_idx").on(table.quoteId),
  ],
);

export const businessNotificationStates = pgTable(
  "business_notification_states",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("business_notification_states_business_user_unique").on(
      table.businessId,
      table.userId,
    ),
    index("business_notification_states_user_business_idx").on(
      table.userId,
      table.businessId,
    ),
  ],
);

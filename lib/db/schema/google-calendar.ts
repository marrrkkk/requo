import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "@/lib/db/schema/auth";
import { businesses } from "@/lib/db/schema/businesses";
import { inquiries } from "@/lib/db/schema/inquiries";
import { quotes } from "@/lib/db/schema/quotes";

/**
 * Stores the user's Google Calendar OAuth connection.
 * User-scoped: one connection per user, shared across all their businesses.
 */
export const googleCalendarConnections = pgTable(
  "google_calendar_connections",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    googleAccountId: text("google_account_id").notNull(),
    googleEmail: text("google_email").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }).notNull(),
    scope: text("scope").notNull(),
    selectedCalendarId: text("selected_calendar_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("google_calendar_connections_user_id_unique").on(table.userId),
  ],
);

/**
 * Lightweight reference to calendar events created from Requo.
 * Business-scoped for isolation; linked to inquiry/quote for context.
 */
export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    inquiryId: text("inquiry_id").references(() => inquiries.id, {
      onDelete: "set null",
    }),
    quoteId: text("quote_id").references(() => quotes.id, {
      onDelete: "set null",
    }),
    googleEventId: text("google_event_id").notNull(),
    googleCalendarId: text("google_calendar_id").notNull(),
    title: text("title").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    eventUrl: text("event_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("calendar_events_business_id_idx").on(table.businessId),
    index("calendar_events_user_id_idx").on(table.userId),
    index("calendar_events_inquiry_id_idx").on(table.inquiryId),
    index("calendar_events_quote_id_idx").on(table.quoteId),
    index("calendar_events_business_starts_at_idx").on(
      table.businessId,
      table.startsAt,
    ),
  ],
);

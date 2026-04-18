import { index, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { businessInquiryForms } from "@/lib/db/schema/business-inquiry-forms";
import { businesses } from "@/lib/db/schema/businesses";
import { quotes } from "@/lib/db/schema/quotes";

export const analyticsEventTypeEnum = pgEnum("analytics_event_type", [
  "inquiry_form_viewed",
  "quote_public_viewed",
]);

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    businessInquiryFormId: text("business_inquiry_form_id").references(
      () => businessInquiryForms.id,
      { onDelete: "set null" },
    ),
    quoteId: text("quote_id").references(() => quotes.id, {
      onDelete: "set null",
    }),
    eventType: analyticsEventTypeEnum("event_type").notNull(),
    visitorHash: text("visitor_hash").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("analytics_events_business_type_occurred_at_idx").on(
      table.businessId,
      table.eventType,
      table.occurredAt,
    ),
    index("analytics_events_form_type_occurred_at_idx").on(
      table.businessInquiryFormId,
      table.eventType,
      table.occurredAt,
    ),
    index("analytics_events_quote_type_occurred_at_idx").on(
      table.quoteId,
      table.eventType,
      table.occurredAt,
    ),
    index("analytics_events_business_type_visitor_hash_idx").on(
      table.businessId,
      table.eventType,
      table.visitorHash,
    ),
  ],
);

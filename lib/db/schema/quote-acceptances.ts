import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { businesses } from "@/lib/db/schema/businesses";
import { quotes } from "@/lib/db/schema/quotes";

export type QuoteAcceptanceSnapshotItem = {
  description: string;
  quantity: number;
  unitPriceInCents: number;
  lineTotalInCents: number;
  position: number;
};

export type QuoteAcceptanceSnapshot = {
  quoteNumber: string;
  quoteVersion: number;
  title: string;
  businessName: string;
  customerName: string;
  customerEmail: string | null;
  currency: string;
  notes: string | null;
  terms: string | null;
  validUntil: string;
  subtotalInCents: number;
  discountInCents: number;
  taxInCents: number;
  taxLabel: string | null;
  totalInCents: number;
  items: QuoteAcceptanceSnapshotItem[];
  acceptanceText: string;
  acceptanceTextVersion: number;
};

export const quoteAcceptances = pgTable(
  "quote_acceptances",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    quoteId: text("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    quoteVersion: integer("quote_version").notNull(),
    signerName: text("signer_name").notNull(),
    signerEmail: text("signer_email"),
    acceptanceMethod: text("acceptance_method").notNull().default("typed_name"),
    acceptanceText: text("acceptance_text").notNull(),
    acceptanceTextVersion: integer("acceptance_text_version").notNull().default(1),
    snapshot: jsonb("snapshot").$type<QuoteAcceptanceSnapshot>().notNull(),
    snapshotHash: text("snapshot_hash").notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("quote_acceptances_business_id_idx").on(table.businessId),
    index("quote_acceptances_quote_id_idx").on(table.quoteId),
    uniqueIndex("quote_acceptances_quote_version_unique").on(
      table.quoteId,
      table.quoteVersion,
    ),
  ],
);

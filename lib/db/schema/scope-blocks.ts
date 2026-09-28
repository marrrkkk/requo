import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "@/lib/db/schema/auth";
import { businesses } from "@/lib/db/schema/businesses";
import { quotes } from "@/lib/db/schema/quotes";

export const scopeBlockKindEnum = pgEnum("scope_block_kind", [
  "deliverables",
  "exclusions",
  "assumptions",
  "allowances",
  "revision_cap",
  "acceptance_criteria",
  "usage_rights",
  "client_responsibilities",
  "timeline",
  "payment_schedule",
]);

export type ScopeBlockKind = (typeof scopeBlockKindEnum.enumValues)[number];

export const scopeBlockKinds: readonly ScopeBlockKind[] = [
  "deliverables",
  "exclusions",
  "assumptions",
  "allowances",
  "revision_cap",
  "acceptance_criteria",
  "usage_rights",
  "client_responsibilities",
  "timeline",
  "payment_schedule",
];

export const scopeBlockStateEnum = pgEnum("scope_block_state", [
  "complete",
  "incomplete",
  "waived",
]);

export type ScopeBlockState = (typeof scopeBlockStateEnum.enumValues)[number];

/**
 * Structured commercial scope blocks (verticalization P3). Rows are owned by
 * a quote and versioned with it (copied into `quote_versions.scope_blocks`
 * at send/accept time). Requiredness comes from the active scope recipe;
 * `required` is denormalized here at write time so later recipe changes
 * cannot retroactively alter an accepted record (waiver pinned at
 * acceptance).
 *
 * Waived blocks are hidden from the customer view by default; the business
 * view and audit trail retain them.
 */
export const quoteScopeBlocks = pgTable(
  "quote_scope_blocks",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    quoteId: text("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    kind: scopeBlockKindEnum("kind").notNull(),
    position: integer("position").notNull(),
    content: jsonb("content").$type<Record<string, unknown>>().notNull(),
    required: boolean("required").notNull().default(false),
    state: scopeBlockStateEnum("state").notNull().default("incomplete"),
    waiverActorUserId: text("waiver_actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    waivedAt: timestamp("waived_at", { withTimezone: true }),
    waiverReason: text("waiver_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("quote_scope_blocks_quote_position_unique").on(
      table.quoteId,
      table.position,
    ),
    index("quote_scope_blocks_business_quote_idx").on(
      table.businessId,
      table.quoteId,
    ),
    check(
      "quote_scope_blocks_waiver_consistency",
      sql`(${table.state} = 'waived' AND ${table.waivedAt} IS NOT NULL) OR (${table.state} != 'waived')`,
    ),
  ],
);

export type QuoteScopeBlock = typeof quoteScopeBlocks.$inferSelect;

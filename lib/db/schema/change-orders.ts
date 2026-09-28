import { sql } from "drizzle-orm";
import {
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

import { approvalChains } from "@/lib/db/schema/approvals";
import { user } from "@/lib/db/schema/auth";
import { businesses } from "@/lib/db/schema/businesses";
import { quotes } from "@/lib/db/schema/quotes";

export const changeOrderStateEnum = pgEnum("change_order_state", [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
  "withdrawn",
  "canceled",
  "superseded",
]);

export type ChangeOrderState =
  (typeof changeOrderStateEnum.enumValues)[number];

export const changeOrderTargetKindEnum = pgEnum("change_order_target_kind", [
  "line",
  "block",
  "schedule_item",
]);

export type ChangeOrderTargetKind =
  (typeof changeOrderTargetKindEnum.enumValues)[number];

export const changeOrderChangeEnum = pgEnum("change_order_change", [
  "add",
  "modify",
  "remove",
]);

/**
 * Change orders (verticalization P2). Append-only children of the accepted
 * quote covering quote lines, structured scope blocks, and commercial
 * schedule components. Parent quote, accepted blocks, and accepted schedule
 * stay immutable; approved deltas join derived state only.
 *
 * Customer approval is a P1 approval instance (`approvalChainId`), not a
 * second implementation. One pending approval per quote (partial unique).
 * The parent link is history-preserving: deleting a quote row with change
 * orders is RESTRICTed.
 */
export const changeOrders = pgTable(
  "change_orders",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    quoteId: text("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "restrict" }),
    coNumber: integer("co_number").notNull(),
    displayNumber: text("display_number").notNull(),
    state: changeOrderStateEnum("state").notNull().default("draft"),
    baseQuoteVersion: integer("base_quote_version").notNull(),
    reason: text("reason").notNull().default(""),
    customerExplanation: text("customer_explanation"),
    riskNotes: text("risk_notes"),
    dependencies: text("dependencies"),
    /** Display only — recomputation from line math is truth. */
    priceDeltaCents: integer("price_delta_cents").notNull().default(0),
    approvalChainId: text("approval_chain_id").references(
      () => approvalChains.id,
      { onDelete: "set null" },
    ),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("change_orders_quote_number_unique").on(
      table.quoteId,
      table.coNumber,
    ),
    uniqueIndex("change_orders_quote_pending_unique")
      .on(table.quoteId)
      .where(sql`${table.state} = 'pending_approval'`),
    index("change_orders_business_quote_idx").on(
      table.businessId,
      table.quoteId,
    ),
    check("change_orders_number_positive", sql`${table.coNumber} >= 1`),
  ],
);

export type ChangeOrder = typeof changeOrders.$inferSelect;

/**
 * Per-target deltas. Stable target identity plus before/after snapshots;
 * new lines carry their full payload. Exactly-one target reference per
 * `targetKind` (CHECK), mirroring the P1 subject-target contract.
 */
export const changeOrderLines = pgTable(
  "change_order_lines",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    changeOrderId: text("change_order_id")
      .notNull()
      .references(() => changeOrders.id, { onDelete: "cascade" }),
    targetKind: changeOrderTargetKindEnum("target_kind").notNull(),
    targetQuoteItemId: text("target_quote_item_id"),
    targetBlockId: text("target_block_id"),
    targetScheduleItemId: text("target_schedule_item_id"),
    change: changeOrderChangeEnum("change").notNull(),
    position: integer("position").notNull().default(0),
    beforeSnapshot: jsonb("before_snapshot").$type<Record<string, unknown>>(),
    afterSnapshot: jsonb("after_snapshot").$type<Record<string, unknown>>(),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("change_order_lines_co_idx").on(table.changeOrderId),
    check(
      "change_order_lines_target_exactly_one",
      sql`(
        (${table.targetKind} = 'line' AND ${table.targetQuoteItemId} IS NOT NULL AND ${table.targetBlockId} IS NULL AND ${table.targetScheduleItemId} IS NULL) OR
        (${table.targetKind} = 'block' AND ${table.targetBlockId} IS NOT NULL AND ${table.targetQuoteItemId} IS NULL AND ${table.targetScheduleItemId} IS NULL) OR
        (${table.targetKind} = 'schedule_item' AND ${table.targetScheduleItemId} IS NOT NULL AND ${table.targetQuoteItemId} IS NULL AND ${table.targetBlockId} IS NULL)
      )`,
    ),
  ],
);

export type ChangeOrderLine = typeof changeOrderLines.$inferSelect;

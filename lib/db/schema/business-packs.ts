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

import {
  type BehaviorPackAssignmentSource,
  type BehaviorPackKey,
  behaviorPackKeys,
} from "@/features/businesses/behavior-packs";
import { user } from "@/lib/db/schema/auth";
import { businesses } from "@/lib/db/schema/businesses";

export const behaviorPackEnum = pgEnum("behavior_pack", [...behaviorPackKeys]);

/**
 * Current behavior-pack assignment per business (verticalization F-01).
 *
 * One row per business (`business-unique`). `pack` is nullable: `null` means
 * unpacked — a secondary stored type (or pre-migration legacy row without an
 * assignment) that keeps legacy behavior. NULL-tolerant readers treat a
 * missing row and a `null` pack identically.
 *
 * Rows are never deleted; pack switches update this row and append to
 * `business_pack_assignment_history`, so history survives reconfiguration.
 */
export const businessPackAssignments = pgTable(
  "business_pack_assignments",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    pack: behaviorPackEnum("pack"),
    packVersion: integer("pack_version").notNull().default(1),
    source: text("source").$type<BehaviorPackAssignmentSource>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("business_pack_assignments_business_unique").on(
      table.businessId,
    ),
    check(
      "business_pack_assignments_pack_version_positive",
      sql`${table.packVersion} >= 1`,
    ),
  ],
);

export type BusinessPackAssignment = typeof businessPackAssignments.$inferSelect;

/**
 * Append-only assignment history (strategy §B11). Every seed, onboarding,
 * switch, and reset writes a row here; rows are never updated or deleted.
 * The latest row per business mirrors the current assignment row.
 */
export const businessPackAssignmentHistory = pgTable(
  "business_pack_assignment_history",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    pack: behaviorPackEnum("pack"),
    packVersion: integer("pack_version").notNull().default(1),
    source: text("source").$type<BehaviorPackAssignmentSource>().notNull(),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("business_pack_assignment_history_business_created_idx").on(
      table.businessId,
      table.createdAt,
    ),
  ],
);

export type BusinessPackAssignmentHistoryRow =
  typeof businessPackAssignmentHistory.$inferSelect;

export type { BehaviorPackAssignmentSource, BehaviorPackKey };

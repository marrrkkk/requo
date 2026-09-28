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

import { businesses } from "@/lib/db/schema/businesses";

export const packRecipeKindEnum = pgEnum("pack_recipe_kind", [
  "intake",
  "scope",
  "approval",
  "schedule",
  "ai_guidance",
]);

export type PackRecipeKind = (typeof packRecipeKindEnum.enumValues)[number];

export const packRecipeKinds: readonly PackRecipeKind[] = [
  "intake",
  "scope",
  "approval",
  "schedule",
  "ai_guidance",
];

/**
 * Versioned pack recipes (verticalization F-02). One row per
 * (business, pack, kind, version), seeded from code defaults
 * (`features/businesses/pack-recipe-defaults.ts`) and owner-editable only
 * into new versions — rows are never updated once referenced.
 *
 * Exactly one active version per (business, kind), enforced by partial
 * unique index. Config rows carry data only (Zod allowlist-validated at
 * write; never executable code, function names, SQL, or route references).
 */
export const packRecipes = pgTable(
  "pack_recipes",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    pack: text("pack").notNull(),
    kind: packRecipeKindEnum("kind").notNull(),
    version: integer("version").notNull(),
    active: boolean("active").notNull().default(false),
    config: jsonb("config").$type<Record<string, unknown>>().notNull(),
    effectiveAt: timestamp("effective_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("pack_recipes_business_kind_version_unique").on(
      table.businessId,
      table.kind,
      table.version,
    ),
    uniqueIndex("pack_recipes_business_kind_active_unique")
      .on(table.businessId, table.kind)
      .where(sql`${table.active} = true`),
    index("pack_recipes_business_kind_idx").on(table.businessId, table.kind),
    check("pack_recipes_version_positive", sql`${table.version} >= 1`),
  ],
);

export type PackRecipe = typeof packRecipes.$inferSelect;

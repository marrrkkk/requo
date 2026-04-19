import {
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { user } from "@/lib/db/schema/auth";
import type { WorkspacePlan } from "@/lib/plans/plans";

export const workspaceMemberRoles = ["owner", "admin", "member"] as const;
export type WorkspaceMemberRole = (typeof workspaceMemberRoles)[number];

export const workspaceMemberRoleEnum = pgEnum("workspace_member_role", [
  ...workspaceMemberRoles,
]);

export const workspaces = pgTable(
  "workspaces",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    plan: text("plan")
      .$type<WorkspacePlan>()
      .notNull()
      .default("free"),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    scheduledDeletionAt: timestamp("scheduled_deletion_at", {
      withTimezone: true,
    }),
    scheduledDeletionBy: text("scheduled_deletion_by").references(
      () => user.id,
      { onDelete: "set null" },
    ),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: text("deleted_by").references(() => user.id, {
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
    uniqueIndex("workspaces_slug_unique").on(table.slug),
    index("workspaces_owner_user_id_idx").on(table.ownerUserId),
    index("workspaces_scheduled_deletion_at_idx").on(table.scheduledDeletionAt),
    index("workspaces_deleted_at_idx").on(table.deletedAt),
    index("workspaces_owner_deleted_at_idx").on(
      table.ownerUserId,
      table.deletedAt,
    ),
    check(
      "workspaces_slug_format",
      sql`${table.slug} ~ '^[a-z0-9-]+$'`,
    ),
    check(
      "workspaces_plan_valid",
      sql`${table.plan} in ('free', 'pro', 'business')`,
    ),
  ],
);

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: workspaceMemberRoleEnum("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("workspace_members_workspace_user_unique").on(
      table.workspaceId,
      table.userId,
    ),
    index("workspace_members_user_id_idx").on(table.userId),
    index("workspace_members_workspace_id_idx").on(table.workspaceId),
  ],
);

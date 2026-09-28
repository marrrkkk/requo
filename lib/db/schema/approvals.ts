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

import { user } from "@/lib/db/schema/auth";
import { businesses } from "@/lib/db/schema/businesses";
import { inquiries } from "@/lib/db/schema/inquiries";
import { quotes } from "@/lib/db/schema/quotes";

export const approvalSubjectTypeEnum = pgEnum("approval_subject_type", [
  "proof",
  "final_count",
  "asset",
  "milestone",
  "hold_confirmation",
]);

export type ApprovalSubjectType =
  (typeof approvalSubjectTypeEnum.enumValues)[number];

export const approvalSubjectTypes: readonly ApprovalSubjectType[] = [
  "proof",
  "final_count",
  "asset",
  "milestone",
  "hold_confirmation",
];

export const approvalStateEnum = pgEnum("approval_state", [
  "pending",
  "approved",
  "changes_requested",
  "superseded",
  "expired",
]);

export type ApprovalState = (typeof approvalStateEnum.enumValues)[number];

/**
 * Approval chains (verticalization P1). The chain is the identity shared by
 * all versions in one logical approval sequence; each `approvals` row is one
 * version. A new chain opens per new subject target or purpose; resubmission,
 * artifact revision, or expiry renewal creates a new version, never a chain.
 *
 * Subject targeting is concrete nullable FKs + exactly-one CHECKs per kind
 * (Option C): no approval row references an arbitrary unrelated ID, and all
 * targets carry `businessId` so cross-tenant references 404 by construction.
 * `scheduleItemId` is a tenant-verified loose reference (no FK) because the
 * schedule tables are declared in a sibling module; milestone chains verify
 * the item's existence and business ownership in application code.
 */
export const approvalChains = pgTable(
  "approval_chains",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    subjectType: approvalSubjectTypeEnum("subject_type").notNull(),
    quoteId: text("quote_id").references(() => quotes.id, {
      onDelete: "cascade",
    }),
    inquiryId: text("inquiry_id").references(() => inquiries.id, {
      onDelete: "cascade",
    }),
    scheduleItemId: text("schedule_item_id"),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("approval_chains_business_idx").on(table.businessId),
    index("approval_chains_business_subject_idx").on(
      table.businessId,
      table.subjectType,
    ),
    check(
      "approval_chains_subject_exactly_one",
      sql`(
        (${table.subjectType} = 'proof' AND ((${table.quoteId} IS NULL) != (${table.inquiryId} IS NULL)) AND ${table.scheduleItemId} IS NULL) OR
        (${table.subjectType} = 'final_count' AND ${table.quoteId} IS NOT NULL AND ${table.inquiryId} IS NULL AND ${table.scheduleItemId} IS NULL) OR
        (${table.subjectType} = 'asset' AND ((${table.quoteId} IS NULL) != (${table.inquiryId} IS NULL)) AND ${table.scheduleItemId} IS NULL) OR
        (${table.subjectType} = 'milestone' AND ${table.scheduleItemId} IS NOT NULL AND ${table.quoteId} IS NULL AND ${table.inquiryId} IS NULL) OR
        (${table.subjectType} = 'hold_confirmation' AND ((${table.quoteId} IS NULL) != (${table.inquiryId} IS NULL)) AND ${table.scheduleItemId} IS NULL)
      )`,
    ),
  ],
);

export type ApprovalChain = typeof approvalChains.$inferSelect;

/**
 * Approval artifacts. Exist independently with their own lifecycle; each row
 * is immutable with `artifactVersion` + a navigation-only self-reference
 * (no FK — navigation only, per spec). Tenant isolation via `businessId` on
 * row and storage path (`approvals/{businessId}/…` inside the existing
 * private `business-assets` bucket).
 */
export const approvalArtifacts = pgTable(
  "approval_artifacts",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    uploaderUserId: text("uploader_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    storagePath: text("storage_path").notNull(),
    contentType: text("content_type"),
    sizeBytes: integer("size_bytes"),
    artifactVersion: integer("artifact_version").notNull().default(1),
    sha256: text("sha256"),
    supersededByArtifactId: text("superseded_by_artifact_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("approval_artifacts_business_idx").on(table.businessId),
    check(
      "approval_artifacts_version_positive",
      sql`${table.artifactVersion} >= 1`,
    ),
  ],
);

export type ApprovalArtifact = typeof approvalArtifacts.$inferSelect;

/**
 * Versioned approval rows. Exactly one non-terminal (`pending`) version per
 * chain (partial unique index). Transitions use conditional writes on the
 * exact version row (`WHERE chain + version + pending`); rowcount 1 decides,
 * 0 means re-read for idempotent replay.
 *
 * Artifacts are one-directional: approvals point at exact artifact/version
 * rows; artifact rows carry no approval FK. Deleting a referenced artifact
 * is RESTRICTed.
 */
export const approvals = pgTable(
  "approvals",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    chainId: text("chain_id")
      .notNull()
      .references(() => approvalChains.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    /** Navigation-only pointer to the prior version row (no FK). */
    supersedesApprovalId: text("supersedes_approval_id"),
    artifactId: text("artifact_id").references(() => approvalArtifacts.id, {
      onDelete: "restrict",
    }),
    recipeKind: text("recipe_kind").notNull().default("approval"),
    recipeVersion: integer("recipe_version").notNull().default(1),
    state: approvalStateEnum("state").notNull().default("pending"),
    requesterUserId: text("requester_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    approverName: text("approver_name"),
    approverEmail: text("approver_email"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decisionComment: text("decision_comment"),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    snapshotHash: text("snapshot_hash").notNull(),
    customerToken: text("customer_token"),
    customerTokenHash: text("customer_token_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("approvals_chain_version_unique").on(table.chainId, table.version),
    uniqueIndex("approvals_chain_pending_unique")
      .on(table.chainId)
      .where(sql`${table.state} = 'pending'`),
    uniqueIndex("approvals_customer_token_hash_unique").on(
      table.customerTokenHash,
    ),
    index("approvals_business_state_idx").on(table.businessId, table.state),
    index("approvals_chain_idx").on(table.chainId),
    index("approvals_expiry_idx").on(table.state, table.expiresAt),
    check("approvals_version_positive", sql`${table.version} >= 1`),
  ],
);

export type Approval = typeof approvals.$inferSelect;

/**
 * Admin console input schemas.
 *
 * Every server action and server-side list query under `features/admin/**`
 * validates its input through one of these schemas. The schemas are also
 * used to derive TypeScript input types.
 */

import { z } from "zod";

import {
  ADMIN_ACTIONS,
  ADMIN_AUDIT_PAGE_SIZE,
  ADMIN_DEFAULT_PAGE_SIZE,
  ADMIN_MAX_PAGE_SIZE,
  ADMIN_TARGET_TYPES,
} from "@/features/admin/constants";
import {
  billingProviders,
  subscriptionStatuses,
} from "@/lib/db/schema/subscriptions";
import { businessPlans, type BusinessPlan } from "@/lib/plans/plans";

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function firstString(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function emptyToUndefined(value: unknown) {
  if (value == null) {
    return undefined;
  }

  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
}

function coercePositiveInteger(fieldLabel: string) {
  return z.preprocess((value) => {
    const normalized = firstString(value);

    if (typeof normalized === "number") {
      return normalized;
    }

    if (typeof normalized !== "string") {
      return normalized;
    }

    const trimmed = normalized.trim();

    if (!trimmed) {
      return Number.NaN;
    }

    return Number(trimmed);
  }, z.number().int(`${fieldLabel} must be a whole number.`).min(1, `${fieldLabel} must be at least 1.`));
}

/**
 * IDs used across the admin surface are opaque strings (Better Auth uses
 * non-UUID text ids, as do our Drizzle tables). Keep the schema strict
 * enough to reject empty / pathological inputs without overspecifying.
 */
const adminIdSchema = z
  .string()
  .trim()
  .min(1, "An id is required.")
  .max(256, "That id is too long.");

/** Short-lived password re-confirmation token issued via `confirm.ts`. */
const adminConfirmTokenSchema = z
  .string()
  .trim()
  .min(16, "Confirmation token is invalid.")
  .max(512, "Confirmation token is invalid.");

/** Zod enums derived from DB / domain constants. */
const businessPlanSchema = z.enum(businessPlans);
const paidPlanSchema = businessPlanSchema.refine(
  (plan): plan is Exclude<BusinessPlan, "free"> => plan !== "free",
  "Choose a paid plan (pro or business).",
);
const subscriptionStatusSchema = z.enum(subscriptionStatuses);
const billingProviderSchema = z.enum(billingProviders);

const adminActionSchema = z.enum(ADMIN_ACTIONS);
const adminTargetTypeSchema = z.enum(ADMIN_TARGET_TYPES);

/* ── User management mutations ───────────────────────────────────────────── */

export const adminForceVerifyEmailSchema = z
  .object({
    targetUserId: adminIdSchema,
    confirmToken: adminConfirmTokenSchema,
  })
  .strict();

export const adminRevokeAllSessionsSchema = z
  .object({
    targetUserId: adminIdSchema,
    confirmToken: adminConfirmTokenSchema,
  })
  .strict();

export const adminSuspendUserSchema = z
  .object({
    targetUserId: adminIdSchema,
    reason: z
      .string()
      .trim()
      .max(500, "Suspension reasons must be 500 characters or fewer.")
      .optional(),
    confirmToken: adminConfirmTokenSchema,
  })
  .strict();

export const adminUnsuspendUserSchema = z
  .object({
    targetUserId: adminIdSchema,
    confirmToken: adminConfirmTokenSchema,
  })
  .strict();

export const adminDeleteUserSchema = z
  .object({
    targetUserId: adminIdSchema,
    confirmToken: adminConfirmTokenSchema,
  })
  .strict();

/* ── Subscription override mutations ─────────────────────────────────────── */

export const adminManualPlanOverrideSchema = z
  .object({
    userId: adminIdSchema,
    plan: paidPlanSchema,
    reason: z
      .string()
      .trim()
      .max(500, "Override reasons must be 500 characters or fewer.")
      .optional(),
    confirmToken: adminConfirmTokenSchema,
  })
  .strict();

export const adminForceCancelSubscriptionSchema = z
  .object({
    subscriptionId: adminIdSchema,
    reason: z
      .string()
      .trim()
      .max(500, "Cancellation reasons must be 500 characters or fewer.")
      .optional(),
    confirmToken: adminConfirmTokenSchema,
  })
  .strict();

/* ── Impersonation ───────────────────────────────────────────────────────── */

export const adminStartImpersonationSchema = z
  .object({
    targetUserId: adminIdSchema,
    confirmToken: adminConfirmTokenSchema,
  })
  .strict();

/* ── Password re-confirmation ────────────────────────────────────────────── */

export const adminPasswordConfirmSchema = z
  .object({
    password: z
      .string()
      .min(1, "Enter your password.")
      .max(512, "That password is too long."),
  })
  .strict();

/* ── Shared list / pagination helpers ────────────────────────────────────── */

const paginationShape = {
  page: coercePositiveInteger("Page").catch(1),
  pageSize: z
    .preprocess(
      (value) => {
        const normalized = firstString(value);

        if (normalized == null || normalized === "") {
          return ADMIN_DEFAULT_PAGE_SIZE;
        }

        if (typeof normalized === "number") {
          return normalized;
        }

        if (typeof normalized !== "string") {
          return ADMIN_DEFAULT_PAGE_SIZE;
        }

        const trimmed = normalized.trim();
        return trimmed ? Number(trimmed) : ADMIN_DEFAULT_PAGE_SIZE;
      },
      z
        .number()
        .int("Page size must be a whole number.")
        .min(1, "Page size must be at least 1.")
        .max(
          ADMIN_MAX_PAGE_SIZE,
          `Page size must be ${ADMIN_MAX_PAGE_SIZE} or fewer.`,
        ),
    )
    .catch(ADMIN_DEFAULT_PAGE_SIZE),
} as const;

const searchQueryShape = {
  search: z
    .preprocess(
      (value) => emptyToUndefined(firstString(value)),
      z
        .string()
        .trim()
        .max(120, "Search must be 120 characters or fewer.")
        .optional(),
    )
    .catch(undefined),
} as const;

/* ── List / filter inputs ────────────────────────────────────────────────── */

export const adminUsersListFiltersSchema = z.object({
  ...searchQueryShape,
  ...paginationShape,
});

export const adminBusinessesListFiltersSchema = z.object({
  ...searchQueryShape,
  ...paginationShape,
});

export const adminSubscriptionsListFiltersSchema = z.object({
  status: z
    .preprocess(
      (value) => emptyToUndefined(firstString(value)),
      subscriptionStatusSchema.optional(),
    )
    .catch(undefined),
  provider: z
    .preprocess(
      (value) => emptyToUndefined(firstString(value)),
      billingProviderSchema.optional(),
    )
    .catch(undefined),
  ...paginationShape,
});

export const adminAuditLogListFiltersSchema = z.object({
  adminUserId: z
    .preprocess(
      (value) => emptyToUndefined(firstString(value)),
      adminIdSchema.optional(),
    )
    .catch(undefined),
  action: z
    .preprocess(
      (value) => emptyToUndefined(firstString(value)),
      adminActionSchema.optional(),
    )
    .catch(undefined),
  targetType: z
    .preprocess(
      (value) => emptyToUndefined(firstString(value)),
      adminTargetTypeSchema.optional(),
    )
    .catch(undefined),
  targetId: z
    .preprocess(
      (value) => emptyToUndefined(firstString(value)),
      adminIdSchema.optional(),
    )
    .catch(undefined),
  page: paginationShape.page,
  pageSize: z
    .preprocess(
      (value) => {
        const normalized = firstString(value);

        if (normalized == null || normalized === "") {
          return ADMIN_AUDIT_PAGE_SIZE;
        }

        if (typeof normalized === "number") {
          return normalized;
        }

        if (typeof normalized !== "string") {
          return ADMIN_AUDIT_PAGE_SIZE;
        }

        const trimmed = normalized.trim();
        return trimmed ? Number(trimmed) : ADMIN_AUDIT_PAGE_SIZE;
      },
      z
        .number()
        .int("Page size must be a whole number.")
        .min(1, "Page size must be at least 1.")
        .max(
          ADMIN_MAX_PAGE_SIZE,
          `Page size must be ${ADMIN_MAX_PAGE_SIZE} or fewer.`,
        ),
    )
    .catch(ADMIN_AUDIT_PAGE_SIZE),
});

/* ── Inferred input types ────────────────────────────────────────────────── */

export type AdminForceVerifyEmailInput = z.infer<
  typeof adminForceVerifyEmailSchema
>;
export type AdminRevokeAllSessionsInput = z.infer<
  typeof adminRevokeAllSessionsSchema
>;
export type AdminSuspendUserInput = z.infer<typeof adminSuspendUserSchema>;
export type AdminUnsuspendUserInput = z.infer<typeof adminUnsuspendUserSchema>;
export type AdminDeleteUserInput = z.infer<typeof adminDeleteUserSchema>;
export type AdminManualPlanOverrideInput = z.infer<
  typeof adminManualPlanOverrideSchema
>;
export type AdminForceCancelSubscriptionInput = z.infer<
  typeof adminForceCancelSubscriptionSchema
>;
export type AdminStartImpersonationInput = z.infer<
  typeof adminStartImpersonationSchema
>;
export type AdminPasswordConfirmInput = z.infer<
  typeof adminPasswordConfirmSchema
>;

export type AdminUsersListFilters = z.infer<typeof adminUsersListFiltersSchema>;
export type AdminBusinessesListFilters = z.infer<
  typeof adminBusinessesListFiltersSchema
>;
export type AdminSubscriptionsListFilters = z.infer<
  typeof adminSubscriptionsListFiltersSchema
>;
export type AdminAuditLogListFilters = z.infer<
  typeof adminAuditLogListFiltersSchema
>;

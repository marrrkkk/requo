/**
 * Admin console domain types.
 *
 * Row shapes and detail shapes for the admin read queries. Keeps the
 * type surface colocated with the feature so `features/admin/queries.ts`,
 * `features/admin/components/**`, and `features/admin/mutations.ts` can
 * share them without reaching into schemas.
 */

import type { AdminAction, AdminTargetType } from "@/features/admin/constants";
import type { BusinessMemberRole } from "@/lib/business-members";
import type {
  BillingCurrency,
  BillingProvider,
  PaymentAttemptStatus,
  SubscriptionStatus,
} from "@/lib/billing/types";
import type { BusinessPlan } from "@/lib/plans/plans";

/** Minimal row shape rendered by `AdminUsersTable`. */
export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  banned: boolean;
  banReason: string | null;
  createdAt: Date;
  lastSessionAt: Date | null;
};

/** Summary of a target user's account subscription for the detail view. */
export type AdminUserDetailSubscription = {
  plan: BusinessPlan;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
};

/** A business owned by a target user, surfaced on the user detail page. */
export type AdminUserDetailBusiness = {
  id: string;
  name: string;
  slug: string;
  plan: BusinessPlan;
};

/** Full detail payload rendered by `AdminUserDetail`. */
export type AdminUserDetail = AdminUserRow & {
  subscription: AdminUserDetailSubscription | null;
  ownedBusinesses: AdminUserDetailBusiness[];
  activeSessionCount: number;
  recentAuditLogs: AdminAuditLogRow[];
};

/** Row shape rendered by `AdminBusinessesTable`. */
export type AdminBusinessRow = {
  id: string;
  name: string;
  slug: string;
  ownerEmail: string;
  plan: BusinessPlan;
  memberCount: number;
  createdAt: Date;
};

/** Row shape rendered by `AdminSubscriptionsTable`. */
export type AdminSubscriptionRow = {
  id: string;
  userId: string;
  ownerEmail: string;
  plan: string;
  status: SubscriptionStatus;
  provider: BillingProvider;
  currentPeriodEnd: Date | null;
  canceledAt: Date | null;
};

/** Row shape rendered by `AdminAuditTable` and nested in user detail. */
export type AdminAuditLogRow = {
  id: string;
  adminUserId: string | null;
  adminEmail: string;
  action: AdminAction;
  targetType: AdminTargetType;
  targetId: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
};

/** Pagination envelope returned by every admin list query. */
export type AdminPaginatedResult<T> = {
  items: T[];
  total: number;
};

/** Envelope returned by every admin server action. */
export type AdminActionResult<T = void> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/** Counts rendered on the admin landing dashboard. */
export type AdminDashboardCounts = {
  totalUsers: number;
  totalBusinesses: number;
  /**
   * Count of `account_subscriptions` rows whose `status = 'active'`,
   * keyed by `plan`. Plans that have zero active subscriptions are
   * absent from the map rather than mapped to `0`.
   */
  activeSubscriptionsByPlan: Record<string, number>;
  totalActiveSubscriptions: number;
  signUpsLast7d: number;
  inquiriesLast7d: number;
  quotesSentLast7d: number;
};

/** Full payload rendered by `AdminBusinessDetail`. */
export type AdminBusinessDetail = AdminBusinessRow & {
  ownerUserId: string;
  ownerName: string;
  members: Array<{
    userId: string;
    email: string;
    name: string;
    role: BusinessMemberRole;
    joinedAt: Date;
  }>;
  inquiryCount: number;
  quoteCount: number;
  lastInquiryAt: Date | null;
  lastQuoteSentAt: Date | null;
  archivedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Summary row for a recent payment attempt displayed on subscription detail. */
export type AdminSubscriptionPaymentAttempt = {
  id: string;
  plan: string;
  provider: BillingProvider;
  providerPaymentId: string;
  amount: number;
  currency: BillingCurrency;
  status: PaymentAttemptStatus;
  createdAt: Date;
};

/** Summary row for a recent billing event displayed on subscription detail. */
export type AdminSubscriptionBillingEvent = {
  id: string;
  providerEventId: string;
  provider: BillingProvider;
  eventType: string;
  processedAt: Date | null;
  createdAt: Date;
};

/** Full payload rendered by `AdminSubscriptionDetail`. */
export type AdminSubscriptionDetail = AdminSubscriptionRow & {
  billingCurrency: BillingCurrency;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  providerCheckoutId: string | null;
  paymentMethod: string | null;
  currentPeriodStart: Date | null;
  trialEndsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  recentPaymentAttempts: AdminSubscriptionPaymentAttempt[];
  recentBillingEvents: AdminSubscriptionBillingEvent[];
};

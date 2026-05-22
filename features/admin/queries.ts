import "server-only";

import {
  and,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  isNotNull,
  isNull,
  max,
  or,
  sql,
} from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";

import { requireAdminUser } from "@/features/admin/access";
import {
  type AdminAction,
  type AdminTargetType,
} from "@/features/admin/constants";
import {
  adminAuditLogListFiltersSchema,
  adminBusinessesListFiltersSchema,
  adminSubscriptionsListFiltersSchema,
  adminUsersListFiltersSchema,
  type AdminAuditLogListFilters,
  type AdminBusinessesListFilters,
  type AdminSubscriptionsListFilters,
  type AdminUsersListFilters,
} from "@/features/admin/schemas";
import type {
  AdminAuditLogRow,
  AdminBusinessDetail,
  AdminBusinessRow,
  AdminDashboardCounts,
  AdminPaginatedResult,
  AdminSubscriptionBillingEvent,
  AdminSubscriptionDetail,
  AdminSubscriptionPaymentAttempt,
  AdminSubscriptionRow,
  AdminUserDetail,
  AdminUserDetailBusiness,
  AdminUserDetailSubscription,
  AdminUserRow,
} from "@/features/admin/types";
import { adminDashboardTag } from "@/lib/cache/admin-tags";
import { type BusinessMemberRole } from "@/lib/business-members";
import { db } from "@/lib/db/client";
import {
  accountSubscriptions,
  adminAuditLogs,
  billingEvents,
  businessMembers,
  businesses,
  inquiries,
  paymentAttempts,
  quotes,
  session,
  user,
} from "@/lib/db/schema";
import type {
  BillingCurrency,
  BillingProvider,
  PaymentAttemptStatus,
  SubscriptionStatus,
} from "@/lib/billing/types";
import type { BusinessPlan } from "@/lib/plans/plans";

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** Cache life used by the landing dashboard counts (Req 2.3: ≤ 60s). */
const adminDashboardCacheLife = {
  stale: 60,
  revalidate: 60,
  expire: 300,
} as const;

function sevenDaysAgo(): Date {
  return new Date(Date.now() - SEVEN_DAYS_MS);
}

function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function likePattern(value: string): string {
  return `%${escapeLikePattern(value)}%`;
}

function toOffset(page: number, pageSize: number): number {
  return Math.max(0, (page - 1) * pageSize);
}

/* ── Dashboard counts ────────────────────────────────────────────────────── */

async function getCachedAdminDashboardCounts(): Promise<AdminDashboardCounts> {
  "use cache";

  cacheLife(adminDashboardCacheLife);
  cacheTag(adminDashboardTag());

  const cutoff = sevenDaysAgo();

  const [
    userCountRows,
    businessCountRows,
    activePlanRows,
    signUpRows,
    inquiryRows,
    quoteRows,
  ] = await Promise.all([
    db.select({ count: count() }).from(user),
    db
      .select({ count: count() })
      .from(businesses)
      .where(isNull(businesses.deletedAt)),
    db
      .select({
        plan: accountSubscriptions.plan,
        count: count(),
      })
      .from(accountSubscriptions)
      .where(eq(accountSubscriptions.status, "active"))
      .groupBy(accountSubscriptions.plan),
    db
      .select({ count: count() })
      .from(user)
      .where(gte(user.createdAt, cutoff)),
    db
      .select({ count: count() })
      .from(inquiries)
      .where(
        and(gte(inquiries.submittedAt, cutoff)),
      ),
    db
      .select({ count: count() })
      .from(quotes)
      .where(and(gte(quotes.sentAt, cutoff), isNull(quotes.deletedAt))),
  ]);

  const activeSubscriptionsByPlan: Record<string, number> = {};
  let totalActiveSubscriptions = 0;

  for (const row of activePlanRows) {
    const planCount = Number(row.count ?? 0);
    activeSubscriptionsByPlan[row.plan] = planCount;
    totalActiveSubscriptions += planCount;
  }

  return {
    totalUsers: Number(userCountRows[0]?.count ?? 0),
    totalBusinesses: Number(businessCountRows[0]?.count ?? 0),
    activeSubscriptionsByPlan,
    totalActiveSubscriptions,
    signUpsLast7d: Number(signUpRows[0]?.count ?? 0),
    inquiriesLast7d: Number(inquiryRows[0]?.count ?? 0),
    quotesSentLast7d: Number(quoteRows[0]?.count ?? 0),
  };
}

/**
 * Landing operations dashboard counts.
 *
 * Two-layer cache: the inner `"use cache"` function caches cross-request
 * with a 60-second revalidate cap (Req 2.3), and `React.cache` dedupes
 * within a single render.
 */
export const getAdminDashboardCounts = cache(
  async (): Promise<AdminDashboardCounts> => {
    await requireAdminUser();

    return getCachedAdminDashboardCounts();
  },
);

/* ── Users ───────────────────────────────────────────────────────────────── */

function buildUserSearchCondition(search: string) {
  const pattern = likePattern(search);

  return or(ilike(user.email, pattern), ilike(user.name, pattern));
}

async function listAdminUsersInner(
  filters: AdminUsersListFilters,
): Promise<AdminPaginatedResult<AdminUserRow>> {
  const { page, pageSize, search } = filters;
  const offset = toOffset(page, pageSize);
  const searchCondition = search ? buildUserSearchCondition(search) : undefined;

  const lastSessionSql = sql<
    Date | null
  >`(select max(${session.createdAt}) from ${session} where ${session.userId} = ${user.id})`;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        banned: user.banned,
        banReason: user.banReason,
        createdAt: user.createdAt,
        lastSessionAt: lastSessionSql,
      })
      .from(user)
      .where(searchCondition)
      .orderBy(desc(user.createdAt), desc(user.id))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: count() })
      .from(user)
      .where(searchCondition),
  ]);

  return {
    items: rows.map(
      (row): AdminUserRow => ({
        id: row.id,
        email: row.email,
        name: row.name,
        emailVerified: row.emailVerified,
        banned: row.banned,
        banReason: row.banReason,
        createdAt: row.createdAt,
        lastSessionAt: row.lastSessionAt ?? null,
      }),
    ),
    total: Number(totalRows[0]?.count ?? 0),
  };
}

/**
 * Paginated list of users for `/admin/users`.
 *
 * Search matches `email` or `name` as a case-insensitive substring
 * (Req 3.2). Default ordering is `createdAt` DESC (Req 3.4).
 */
export const listAdminUsers = cache(
  async (
    input: AdminUsersListFilters,
  ): Promise<AdminPaginatedResult<AdminUserRow>> => {
    await requireAdminUser();

    const filters = adminUsersListFiltersSchema.parse(input);
    return listAdminUsersInner(filters);
  },
);

async function getAdminUserDetailInner(
  userId: string,
): Promise<AdminUserDetail | null> {
  const userRows = await db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      banned: user.banned,
      banReason: user.banReason,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  const userRow = userRows[0];

  if (!userRow) {
    return null;
  }

  const now = new Date();

  const [
    subscriptionRows,
    ownedBusinessRows,
    activeSessionRows,
    lastSessionRows,
    recentAuditRows,
  ] = await Promise.all([
    db
      .select({
        plan: accountSubscriptions.plan,
        status: accountSubscriptions.status,
        currentPeriodEnd: accountSubscriptions.currentPeriodEnd,
      })
      .from(accountSubscriptions)
      .where(eq(accountSubscriptions.userId, userId))
      .limit(1),
    db
      .select({
        id: businesses.id,
        name: businesses.name,
        slug: businesses.slug,
        plan: businesses.plan,
      })
      .from(businesses)
      .where(
        and(
          eq(businesses.ownerUserId, userId),
          isNull(businesses.deletedAt),
        ),
      )
      .orderBy(desc(businesses.createdAt)),
    db
      .select({ count: count() })
      .from(session)
      .where(and(eq(session.userId, userId), gt(session.expiresAt, now))),
    db
      .select({ lastSessionAt: max(session.createdAt) })
      .from(session)
      .where(eq(session.userId, userId)),
    db
      .select({
        id: adminAuditLogs.id,
        adminUserId: adminAuditLogs.adminUserId,
        adminEmail: adminAuditLogs.adminEmail,
        action: adminAuditLogs.action,
        targetType: adminAuditLogs.targetType,
        targetId: adminAuditLogs.targetId,
        metadata: adminAuditLogs.metadata,
        ipAddress: adminAuditLogs.ipAddress,
        userAgent: adminAuditLogs.userAgent,
        createdAt: adminAuditLogs.createdAt,
      })
      .from(adminAuditLogs)
      .where(
        and(
          eq(adminAuditLogs.targetType, "user"),
          eq(adminAuditLogs.targetId, userId),
        ),
      )
      .orderBy(desc(adminAuditLogs.createdAt), desc(adminAuditLogs.id))
      .limit(10),
  ]);

  const subscriptionRow = subscriptionRows[0] ?? null;
  const subscription: AdminUserDetailSubscription | null = subscriptionRow
    ? {
        plan: subscriptionRow.plan as BusinessPlan,
        status: subscriptionRow.status as SubscriptionStatus,
        currentPeriodEnd: subscriptionRow.currentPeriodEnd,
      }
    : null;

  const ownedBusinesses: AdminUserDetailBusiness[] = ownedBusinessRows.map(
    (row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      plan: row.plan,
    }),
  );

  const recentAuditLogs: AdminAuditLogRow[] = recentAuditRows.map((row) => ({
    id: row.id,
    adminUserId: row.adminUserId,
    adminEmail: row.adminEmail,
    action: row.action as AdminAction,
    targetType: row.targetType as AdminTargetType,
    targetId: row.targetId,
    metadata: row.metadata,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    createdAt: row.createdAt,
  }));

  return {
    id: userRow.id,
    email: userRow.email,
    name: userRow.name,
    emailVerified: userRow.emailVerified,
    banned: userRow.banned,
    banReason: userRow.banReason,
    createdAt: userRow.createdAt,
    lastSessionAt: lastSessionRows[0]?.lastSessionAt ?? null,
    subscription,
    ownedBusinesses,
    activeSessionCount: Number(activeSessionRows[0]?.count ?? 0),
    recentAuditLogs,
  };
}

/** Detail payload for `/admin/users/[userId]`. Returns `null` when missing. */
export const getAdminUserDetail = cache(
  async (userId: string): Promise<AdminUserDetail | null> => {
    await requireAdminUser();

    return getAdminUserDetailInner(userId);
  },
);

/* ── Businesses ──────────────────────────────────────────────────────────── */

function buildBusinessSearchCondition(search: string) {
  const pattern = likePattern(search);

  return or(ilike(businesses.name, pattern), ilike(businesses.slug, pattern));
}

async function listAdminBusinessesInner(
  filters: AdminBusinessesListFilters,
): Promise<AdminPaginatedResult<AdminBusinessRow>> {
  const { page, pageSize, search, plan } = filters;
  const offset = toOffset(page, pageSize);
  const searchCondition = search
    ? buildBusinessSearchCondition(search)
    : undefined;
  const planCondition = plan ? eq(businesses.plan, plan) : undefined;

  const baseConditions = and(
    isNull(businesses.deletedAt),
    ...(searchCondition ? [searchCondition] : []),
    ...(planCondition ? [planCondition] : []),
  );

  const memberCountSql = sql<number>`(
    select count(*)::int
    from ${businessMembers}
    where ${businessMembers.businessId} = ${businesses.id}
  )`;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: businesses.id,
        name: businesses.name,
        slug: businesses.slug,
        ownerEmail: user.email,
        plan: businesses.plan,
        memberCount: memberCountSql,
        createdAt: businesses.createdAt,
      })
      .from(businesses)
      .innerJoin(user, eq(user.id, businesses.ownerUserId))
      .where(baseConditions)
      .orderBy(desc(businesses.createdAt), desc(businesses.id))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: count() })
      .from(businesses)
      .where(baseConditions),
  ]);

  return {
    items: rows.map(
      (row): AdminBusinessRow => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        ownerEmail: row.ownerEmail,
        plan: row.plan,
        memberCount: Number(row.memberCount ?? 0),
        createdAt: row.createdAt,
      }),
    ),
    total: Number(totalRows[0]?.count ?? 0),
  };
}

/**
 * Paginated list of non-deleted businesses for `/admin/businesses`.
 *
 * Search matches `name` or `slug` as a case-insensitive substring
 * (Req 5.2). Default ordering is `createdAt` DESC.
 */
export const listAdminBusinesses = cache(
  async (
    input: AdminBusinessesListFilters,
  ): Promise<AdminPaginatedResult<AdminBusinessRow>> => {
    await requireAdminUser();

    const filters = adminBusinessesListFiltersSchema.parse(input);
    return listAdminBusinessesInner(filters);
  },
);

async function getAdminBusinessDetailInner(
  businessId: string,
): Promise<AdminBusinessDetail | null> {
  const [rows] = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      slug: businesses.slug,
      plan: businesses.plan,
      ownerUserId: businesses.ownerUserId,
      ownerEmail: user.email,
      ownerName: user.name,
      archivedAt: businesses.archivedAt,
      deletedAt: businesses.deletedAt,
      createdAt: businesses.createdAt,
      updatedAt: businesses.updatedAt,
    })
    .from(businesses)
    .innerJoin(user, eq(user.id, businesses.ownerUserId))
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!rows) {
    return null;
  }

  const [
    memberRows,
    inquiryCountRows,
    quoteCountRows,
    lastInquiryRows,
    lastQuoteSentRows,
  ] = await Promise.all([
    db
      .select({
        userId: businessMembers.userId,
        role: businessMembers.role,
        joinedAt: businessMembers.createdAt,
        email: user.email,
        name: user.name,
      })
      .from(businessMembers)
      .innerJoin(user, eq(user.id, businessMembers.userId))
      .where(eq(businessMembers.businessId, businessId))
      .orderBy(businessMembers.createdAt),
    db
      .select({ count: count() })
      .from(inquiries)
      .where(
        and(eq(inquiries.businessId, businessId)),
      ),
    db
      .select({ count: count() })
      .from(quotes)
      .where(and(eq(quotes.businessId, businessId), isNull(quotes.deletedAt))),
    db
      .select({ lastInquiryAt: max(inquiries.submittedAt) })
      .from(inquiries)
      .where(
        and(eq(inquiries.businessId, businessId)),
      ),
    db
      .select({ lastQuoteSentAt: max(quotes.sentAt) })
      .from(quotes)
      .where(
        and(
          eq(quotes.businessId, businessId),
          isNotNull(quotes.sentAt),
          isNull(quotes.deletedAt),
        ),
      ),
  ]);

  const memberCount = memberRows.length;

  return {
    id: rows.id,
    name: rows.name,
    slug: rows.slug,
    plan: rows.plan,
    ownerUserId: rows.ownerUserId,
    ownerEmail: rows.ownerEmail,
    ownerName: rows.ownerName,
    memberCount,
    members: memberRows.map((row) => ({
      userId: row.userId,
      email: row.email,
      name: row.name,
      role: row.role as BusinessMemberRole,
      joinedAt: row.joinedAt,
    })),
    inquiryCount: Number(inquiryCountRows[0]?.count ?? 0),
    quoteCount: Number(quoteCountRows[0]?.count ?? 0),
    lastInquiryAt: lastInquiryRows[0]?.lastInquiryAt ?? null,
    lastQuoteSentAt: lastQuoteSentRows[0]?.lastQuoteSentAt ?? null,
    archivedAt: rows.archivedAt,
    deletedAt: rows.deletedAt,
    createdAt: rows.createdAt,
    updatedAt: rows.updatedAt,
  };
}

/** Detail payload for `/admin/businesses/[businessId]`. */
export const getAdminBusinessDetail = cache(
  async (businessId: string): Promise<AdminBusinessDetail | null> => {
    await requireAdminUser();

    return getAdminBusinessDetailInner(businessId);
  },
);

/* ── Subscriptions ───────────────────────────────────────────────────────── */

async function listAdminSubscriptionsInner(
  filters: AdminSubscriptionsListFilters,
): Promise<AdminPaginatedResult<AdminSubscriptionRow>> {
  const { page, pageSize, status, provider } = filters;
  const offset = toOffset(page, pageSize);

  const conditions = [] as Array<ReturnType<typeof eq>>;

  if (status) {
    conditions.push(eq(accountSubscriptions.status, status));
  }

  if (provider) {
    conditions.push(eq(accountSubscriptions.billingProvider, provider));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: accountSubscriptions.id,
        userId: accountSubscriptions.userId,
        ownerEmail: user.email,
        plan: accountSubscriptions.plan,
        status: accountSubscriptions.status,
        provider: accountSubscriptions.billingProvider,
        currentPeriodEnd: accountSubscriptions.currentPeriodEnd,
        canceledAt: accountSubscriptions.canceledAt,
        createdAt: accountSubscriptions.createdAt,
      })
      .from(accountSubscriptions)
      .innerJoin(user, eq(user.id, accountSubscriptions.userId))
      .where(where)
      .orderBy(
        desc(accountSubscriptions.createdAt),
        desc(accountSubscriptions.id),
      )
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: count() })
      .from(accountSubscriptions)
      .where(where),
  ]);

  return {
    items: rows.map(
      (row): AdminSubscriptionRow => ({
        id: row.id,
        userId: row.userId,
        ownerEmail: row.ownerEmail,
        plan: row.plan,
        status: row.status,
        provider: row.provider,
        currentPeriodEnd: row.currentPeriodEnd,
        canceledAt: row.canceledAt,
      }),
    ),
    total: Number(totalRows[0]?.count ?? 0),
  };
}

/**
 * Paginated list of account subscriptions for `/admin/subscriptions`.
 *
 * Accepts optional `status` and `provider` filters (Req 6.3).
 */
export const listAdminSubscriptions = cache(
  async (
    input: AdminSubscriptionsListFilters,
  ): Promise<AdminPaginatedResult<AdminSubscriptionRow>> => {
    await requireAdminUser();

    const filters = adminSubscriptionsListFiltersSchema.parse(input);
    return listAdminSubscriptionsInner(filters);
  },
);

async function getAdminSubscriptionDetailInner(
  subscriptionId: string,
): Promise<AdminSubscriptionDetail | null> {
  const [row] = await db
    .select({
      id: accountSubscriptions.id,
      userId: accountSubscriptions.userId,
      ownerEmail: user.email,
      plan: accountSubscriptions.plan,
      status: accountSubscriptions.status,
      provider: accountSubscriptions.billingProvider,
      billingCurrency: accountSubscriptions.billingCurrency,
      providerCustomerId: accountSubscriptions.providerCustomerId,
      providerSubscriptionId: accountSubscriptions.providerSubscriptionId,
      providerCheckoutId: accountSubscriptions.providerCheckoutId,
      paymentMethod: accountSubscriptions.paymentMethod,
      currentPeriodStart: accountSubscriptions.currentPeriodStart,
      currentPeriodEnd: accountSubscriptions.currentPeriodEnd,
      canceledAt: accountSubscriptions.canceledAt,
      trialEndsAt: accountSubscriptions.trialEndsAt,
      createdAt: accountSubscriptions.createdAt,
      updatedAt: accountSubscriptions.updatedAt,
    })
    .from(accountSubscriptions)
    .innerJoin(user, eq(user.id, accountSubscriptions.userId))
    .where(eq(accountSubscriptions.id, subscriptionId))
    .limit(1);

  if (!row) {
    return null;
  }

  const [paymentRows, billingEventRows] = await Promise.all([
    db
      .select({
        id: paymentAttempts.id,
        plan: paymentAttempts.plan,
        provider: paymentAttempts.provider,
        providerPaymentId: paymentAttempts.providerPaymentId,
        amount: paymentAttempts.amount,
        currency: paymentAttempts.currency,
        status: paymentAttempts.status,
        createdAt: paymentAttempts.createdAt,
      })
      .from(paymentAttempts)
      .where(eq(paymentAttempts.userId, row.userId))
      .orderBy(desc(paymentAttempts.createdAt), desc(paymentAttempts.id))
      .limit(10),
    db
      .select({
        id: billingEvents.id,
        providerEventId: billingEvents.providerEventId,
        provider: billingEvents.provider,
        eventType: billingEvents.eventType,
        processedAt: billingEvents.processedAt,
        createdAt: billingEvents.createdAt,
      })
      .from(billingEvents)
      .where(eq(billingEvents.userId, row.userId))
      .orderBy(desc(billingEvents.createdAt), desc(billingEvents.id))
      .limit(10),
  ]);

  const recentPaymentAttempts: AdminSubscriptionPaymentAttempt[] =
    paymentRows.map((attempt) => ({
      id: attempt.id,
      plan: attempt.plan,
      provider: attempt.provider as BillingProvider,
      providerPaymentId: attempt.providerPaymentId,
      amount: attempt.amount,
      currency: attempt.currency as BillingCurrency,
      status: attempt.status as PaymentAttemptStatus,
      createdAt: attempt.createdAt,
    }));

  const recentBillingEvents: AdminSubscriptionBillingEvent[] =
    billingEventRows.map((event) => ({
      id: event.id,
      providerEventId: event.providerEventId,
      provider: event.provider as BillingProvider,
      eventType: event.eventType,
      processedAt: event.processedAt,
      createdAt: event.createdAt,
    }));

  return {
    id: row.id,
    userId: row.userId,
    ownerEmail: row.ownerEmail,
    plan: row.plan,
    status: row.status,
    provider: row.provider,
    billingCurrency: row.billingCurrency,
    providerCustomerId: row.providerCustomerId,
    providerSubscriptionId: row.providerSubscriptionId,
    providerCheckoutId: row.providerCheckoutId,
    paymentMethod: row.paymentMethod,
    currentPeriodStart: row.currentPeriodStart,
    currentPeriodEnd: row.currentPeriodEnd,
    canceledAt: row.canceledAt,
    trialEndsAt: row.trialEndsAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    recentPaymentAttempts,
    recentBillingEvents,
  };
}

/** Detail payload for `/admin/subscriptions/[subscriptionId]`. */
export const getAdminSubscriptionDetail = cache(
  async (subscriptionId: string): Promise<AdminSubscriptionDetail | null> => {
    await requireAdminUser();

    return getAdminSubscriptionDetailInner(subscriptionId);
  },
);

/* ── Audit logs ──────────────────────────────────────────────────────────── */

async function listAdminAuditLogsInner(
  filters: AdminAuditLogListFilters,
): Promise<AdminPaginatedResult<AdminAuditLogRow>> {
  const { page, pageSize, adminUserId, action, targetType, targetId } =
    filters;
  const offset = toOffset(page, pageSize);

  const conditions = [] as Array<ReturnType<typeof eq>>;

  if (adminUserId) {
    conditions.push(eq(adminAuditLogs.adminUserId, adminUserId));
  }

  if (action) {
    conditions.push(eq(adminAuditLogs.action, action));
  }

  if (targetType) {
    conditions.push(eq(adminAuditLogs.targetType, targetType));
  }

  if (targetId) {
    conditions.push(eq(adminAuditLogs.targetId, targetId));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: adminAuditLogs.id,
        adminUserId: adminAuditLogs.adminUserId,
        adminEmail: adminAuditLogs.adminEmail,
        action: adminAuditLogs.action,
        targetType: adminAuditLogs.targetType,
        targetId: adminAuditLogs.targetId,
        metadata: adminAuditLogs.metadata,
        ipAddress: adminAuditLogs.ipAddress,
        userAgent: adminAuditLogs.userAgent,
        createdAt: adminAuditLogs.createdAt,
      })
      .from(adminAuditLogs)
      .where(where)
      .orderBy(desc(adminAuditLogs.createdAt), desc(adminAuditLogs.id))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: count() })
      .from(adminAuditLogs)
      .where(where),
  ]);

  return {
    items: rows.map(
      (row): AdminAuditLogRow => ({
        id: row.id,
        adminUserId: row.adminUserId,
        adminEmail: row.adminEmail,
        action: row.action as AdminAction,
        targetType: row.targetType as AdminTargetType,
        targetId: row.targetId,
        metadata: row.metadata,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        createdAt: row.createdAt,
      }),
    ),
    total: Number(totalRows[0]?.count ?? 0),
  };
}

/**
 * Paginated audit log feed for `/admin/audit-logs`.
 *
 * Every non-null filter is applied with `AND` semantics. Results are
 * ordered `createdAt` DESC per Req 10.6.
 */
export const listAdminAuditLogs = cache(
  async (
    input: AdminAuditLogListFilters,
  ): Promise<AdminPaginatedResult<AdminAuditLogRow>> => {
    await requireAdminUser();

    const filters = adminAuditLogListFiltersSchema.parse(input);
    return listAdminAuditLogsInner(filters);
  },
);

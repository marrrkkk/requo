import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  isNotNull,
  isNull,
  like,
  lte,
  max,
  or,
  sql,
  type SQL,
  type SQLWrapper,
} from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";

import { requireAdminUser } from "@/features/admin/access";
import {
  ADMIN_AI_PROVIDERS,
  ADMIN_AI_PROVIDER_LABELS,
  ADMIN_AI_SECURITY_EVENTS_LIMIT,
  ADMIN_DASHBOARD_TARGET_ID,
  ADMIN_MAX_RECENT_ACTIVITY_LIMIT,
  ADMIN_RECENT_ACTIVITY_LIMIT,
  type AdminAction,
  type AdminAiProviderId,
  type AdminTargetType,
} from "@/features/admin/constants";
import { getAdminActionLabel } from "@/features/admin/labels";
import {
  ADMIN_AUDIT_LOGS_PATH,
  getAdminBusinessDetailPath,
  getAdminEmailDetailPath,
  getAdminInquiryDetailPath,
  getAdminQuoteDetailPath,
  getAdminUserDetailPath,
} from "@/features/admin/navigation";
import {
  adminAuditLogListFiltersSchema,
  adminBusinessesListFiltersSchema,
  adminInquiriesListFiltersSchema,
  adminQuotesListFiltersSchema,
  adminAiErrorsFiltersSchema,
  adminAiRequestsFiltersSchema,
  adminEmailsListFiltersSchema,
  adminSubscriptionsListFiltersSchema,
  adminUsersListFiltersSchema,
  type AdminAuditLogListFilters,
  type AdminBusinessesListFilters,
  type AdminInquiriesListFilters,
  type AdminQuotesListFilters,
  type AdminAiErrorsListFilters,
  type AdminAiRequestsListFilters,
  type AdminEmailsListFilters,
  type AdminSubscriptionsListFilters,
  type AdminUsersListFilters,
} from "@/features/admin/schemas";
import type {
  AdminAiCapacityEntry,
  AdminAiErrorRow,
  AdminAiErrorsResult,
  AdminAiOverview,
  AdminAiProvider,
  AdminAiProviders,
  AdminAiProviderBreakdown,
  AdminAiRequestRow,
  AdminAiRoutingProfile,
  AdminAiSecurityEvent,
  AdminAiSessionBreakdown,
  AdminAiTaskBreakdown,
  AdminAiWindowStats,
  AdminEmailAttempt,
  AdminEmailDetail,
  AdminEmailRow,
  AdminAuditLogRow,
  AdminBusinessBilling,
  AdminBusinessDetail,
  AdminBusinessRow,
  AdminBusinessSubscriptionSummary,
  AdminDashboardCounts,
  AdminInquiryAttachment,
  AdminInquiryDetail,
  AdminInquiryLinkedQuote,
  AdminInquiryMessage,
  AdminInquiryNote,
  AdminInquiryRow,
  AdminOverviewMetrics,
  AdminPaginatedResult,
  AdminQuoteDetail,
  AdminQuoteEmail,
  AdminQuoteItem,
  AdminQuoteRevisionRequest,
  AdminQuoteRow,
  AdminQuoteVersion,
  AdminRecentActivityItem,
  AdminStatusBreakdown,
  AdminSubscriptionBillingEvent,
  AdminSubscriptionDetail,
  AdminSubscriptionPaymentAttempt,
  AdminSubscriptionRow,
  AdminUsageBusinessResource,
  AdminUsageBusinessRow,
  AdminUsageDay,
  AdminUsageReport,
  AdminUsageResource,
  AdminUserBillingActivity,
  AdminUserDetail,
  AdminUserDetailBusiness,
  AdminUserDetailSubscription,
  AdminUserRow,
} from "@/features/admin/types";
import { inquiryStatuses, type InquiryStatus } from "@/features/inquiries/types";
import { quoteStatuses, type QuoteStatus } from "@/features/quotes/types";
import {
  adminDashboardTag,
  adminAiTag,
  adminSystemTag,
  adminUsageTag,
} from "@/lib/cache/admin-tags";
import {
  buildAdminHealthSummary,
  getAdminConfigMatrix,
  runAdminHealthChecks,
  type AdminConfigMatrixRow,
  type AdminHealthReport,
  type AdminHealthSummary,
} from "@/lib/admin/health-checks";
import { type BusinessMemberRole } from "@/lib/business-members";
import { db } from "@/lib/db/client";
import {
  accountSubscriptions,
  adminAuditLogs,
  aiAgentSessions,
  aiSecurityEvents,
  aiTokenLogs,
  billingEvents,
  businessMembers,
  businesses,
  businessSubscriptions,
  emailAttempts,
  emailOutbox,
  emailOutboxStatuses,
  inquiries,
  inquiryAttachments,
  inquiryMessages,
  inquiryNotes,
  paymentAttempts,
  quoteItems,
  quoteRevisionRequests,
  quoteVersions,
  quotes,
  session,
  user,
  type EmailOutboxStatus,
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

const ONE_HOUR_MS = 60 * 60 * 1000;

/** Cache life used by the landing dashboard counts (Req 2.3: ≤ 60s). */
const adminDashboardCacheLife = {
  stale: 60,
  revalidate: 60,
  expire: 300,
} as const;

function sevenDaysAgo(): Date {
  return new Date(Date.now() - SEVEN_DAYS_MS);
}

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * ONE_HOUR_MS);
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

/* ── Overview metrics ────────────────────────────────────────────────────── */

/**
 * Zero-fill a `GROUP BY status` result into a complete breakdown.
 *
 * Postgres only returns rows for statuses that actually occur, but the
 * Overview renders a full pipeline ("3 new · 0 quoted · 2 won"), so every
 * status is seeded to 0 first and then overwritten by the real counts.
 *
 * `count()` comes back from postgres-js as a string for `bigint`, so the
 * `::int` cast in each query is load-bearing — without it every count would
 * be a numeric string. `Number()` is kept as a belt-and-braces coercion for
 * drivers that still return text.
 */
function toStatusBreakdown<Status extends string>(
  statuses: readonly Status[],
  rows: Array<{ status: Status; count: number | string }>,
): AdminStatusBreakdown<Status> {
  const byStatus = Object.fromEntries(
    statuses.map((status) => [status, 0]),
  ) as Record<Status, number>;

  let total = 0;

  for (const row of rows) {
    const value = Number(row.count ?? 0);
    byStatus[row.status] = value;
    total += value;
  }

  return { total, byStatus };
}

/**
 * Overview aggregates.
 *
 * Aggregate-only by design: every statement below is a `count()` / `GROUP BY`
 * / `FILTER` aggregate, never a row load. The page must stay fast regardless
 * of how much data the platform holds.
 *
 * Index note (no migrations are permitted in this project): `ai_token_logs`
 * and `admin_audit_logs` have global time-leading indexes, so the 24-hour AI
 * window and the activity feed are indexed. `email_outbox`, `inquiries`, and
 * `quotes` only have `business_id`-leading time indexes, so the global
 * `created_at`/`submitted_at` filters here fall back to a scan. That is
 * tolerable because each window is bounded (24h/7d) and the whole payload is
 * cached for 60 seconds — but it is the reason these queries are windowed
 * rather than unbounded.
 */
async function getCachedAdminOverviewMetrics(): Promise<AdminOverviewMetrics> {
  "use cache";

  cacheLife(adminDashboardCacheLife);
  cacheTag(adminDashboardTag());

  const since24h = hoursAgo(24);
  const since7d = sevenDaysAgo();

  const [inquiryRows, quoteRows, email24hRows, email7dRows, aiRows] =
    await Promise.all([
      db
        .select({
          status: inquiries.status,
          count: sql<number>`count(*)::int`,
        })
        .from(inquiries)
        .where(isNull(inquiries.deletedAt))
        .groupBy(inquiries.status),
      db
        .select({
          status: quotes.status,
          count: sql<number>`count(*)::int`,
        })
        .from(quotes)
        .where(isNull(quotes.deletedAt))
        .groupBy(quotes.status),
      db
        .select({
          status: emailOutbox.status,
          count: sql<number>`count(*)::int`,
        })
        .from(emailOutbox)
        .where(gte(emailOutbox.createdAt, since24h))
        .groupBy(emailOutbox.status),
      db
        .select({
          status: emailOutbox.status,
          count: sql<number>`count(*)::int`,
        })
        .from(emailOutbox)
        .where(gte(emailOutbox.createdAt, since7d))
        .groupBy(emailOutbox.status),
      db
        .select({
          calls: sql<number>`count(*)::int`,
          errors: sql<number>`(count(*) filter (where ${aiTokenLogs.status} = 'error'))::int`,
          totalTokens: sql<number>`coalesce(sum(${aiTokenLogs.totalTokens}), 0)::int`,
          // `estimated_cost_cents` is nullable: unpriced models log NULL, so
          // the sum silently excludes them. `unpricedCalls` is what tells the
          // UI this total is a floor, not the real spend.
          estimatedCostCents: sql<number>`coalesce(sum(${aiTokenLogs.estimatedCostCents}), 0)::int`,
          unpricedCalls: sql<number>`(count(*) filter (where ${aiTokenLogs.unpriced}))::int`,
          cacheHits: sql<number>`(count(*) filter (where ${aiTokenLogs.cacheHit}))::int`,
          // avg() is NULL over an empty window; ::float8 keeps postgres-js
          // from handing back a numeric string.
          averageLatencyMs: sql<number | null>`avg(${aiTokenLogs.latencyMs})::float8`,
        })
        .from(aiTokenLogs)
        .where(gte(aiTokenLogs.createdAt, since24h)),
    ]);

  const ai = aiRows[0];

  return {
    inquiries: toStatusBreakdown<InquiryStatus>(inquiryStatuses, inquiryRows),
    quotes: toStatusBreakdown<QuoteStatus>(quoteStatuses, quoteRows),
    email: {
      last24h: toStatusBreakdown<EmailOutboxStatus>(
        emailOutboxStatuses,
        email24hRows,
      ),
      last7d: toStatusBreakdown<EmailOutboxStatus>(
        emailOutboxStatuses,
        email7dRows,
      ),
    },
    ai: {
      calls: Number(ai?.calls ?? 0),
      errors: Number(ai?.errors ?? 0),
      totalTokens: Number(ai?.totalTokens ?? 0),
      estimatedCostCents: Number(ai?.estimatedCostCents ?? 0),
      unpricedCalls: Number(ai?.unpricedCalls ?? 0),
      cacheHits: Number(ai?.cacheHits ?? 0),
      averageLatencyMs:
        ai?.averageLatencyMs == null ? null : Number(ai.averageLatencyMs),
    },
  };
}

/**
 * Overview aggregates for the admin landing page.
 *
 * Same two-layer cache as the dashboard counts: `"use cache"` cross-request
 * with a 60-second cap, `React.cache` for per-render dedupe.
 */
export const getAdminOverviewMetrics = cache(
  async (): Promise<AdminOverviewMetrics> => {
    await requireAdminUser();

    return getCachedAdminOverviewMetrics();
  },
);

/* ── Recent activity ─────────────────────────────────────────────────────── */

/**
 * Where a recent audit row should link.
 *
 * Every admin detail route exists now, so each target type deep-links to
 * its own page. Unknown types fall back to the audit log — which supports
 * `targetType`/`targetId` filtering and is never a dead link.
 */
function buildAdminAuditActivityHref(
  targetType: string,
  targetId: string,
): string {
  if (!targetId || targetId === ADMIN_DASHBOARD_TARGET_ID) {
    return ADMIN_AUDIT_LOGS_PATH;
  }

  switch (targetType) {
    case "user":
      return getAdminUserDetailPath(targetId);
    case "business":
      return getAdminBusinessDetailPath(targetId);
    case "inquiry":
      return getAdminInquiryDetailPath(targetId);
    case "quote":
      return getAdminQuoteDetailPath(targetId);
    case "email":
      return getAdminEmailDetailPath(targetId);
    default:
      return ADMIN_AUDIT_LOGS_PATH;
  }
}

/**
 * Merged activity feed for the Overview page.
 *
 * Four independent `ORDER BY <time> DESC LIMIT n` queries — each one hits an
 * index whose first column is (or leads with) that timestamp where one exists
 * — merged and re-sorted in JS. This is deliberately *not* a SQL `UNION`,
 * because the four sources have different shapes and no shared sort key that
 * Postgres could exploit without materialising all four anyway.
 *
 * `limit` is clamped so a crafted URL cannot turn the feed into a table dump.
 */
export async function getAdminRecentActivity(
  limit: number = ADMIN_RECENT_ACTIVITY_LIMIT,
): Promise<AdminRecentActivityItem[]> {
  await requireAdminUser();

  const boundedLimit = Math.min(
    Math.max(1, Math.trunc(limit)),
    ADMIN_MAX_RECENT_ACTIVITY_LIMIT,
  );

  const [auditRows, inquiryRows, quoteRows, emailRows] = await Promise.all([
    db
      .select({
        id: adminAuditLogs.id,
        action: adminAuditLogs.action,
        adminEmail: adminAuditLogs.adminEmail,
        targetType: adminAuditLogs.targetType,
        targetId: adminAuditLogs.targetId,
        createdAt: adminAuditLogs.createdAt,
      })
      .from(adminAuditLogs)
      .orderBy(desc(adminAuditLogs.createdAt))
      .limit(boundedLimit),
    db
      .select({
        id: inquiries.id,
        subject: inquiries.subject,
        customerName: inquiries.customerName,
        submittedAt: inquiries.submittedAt,
        businessName: businesses.name,
      })
      .from(inquiries)
      .leftJoin(businesses, eq(businesses.id, inquiries.businessId))
      .where(isNull(inquiries.deletedAt))
      .orderBy(desc(inquiries.submittedAt))
      .limit(boundedLimit),
    db
      .select({
        id: quotes.id,
        quoteNumber: quotes.quoteNumber,
        customerName: quotes.customerName,
        sentAt: quotes.sentAt,
        totalInCents: quotes.totalInCents,
        currency: quotes.currency,
        businessName: businesses.name,
      })
      .from(quotes)
      .leftJoin(businesses, eq(businesses.id, quotes.businessId))
      .where(and(isNotNull(quotes.sentAt), isNull(quotes.deletedAt)))
      .orderBy(desc(quotes.sentAt))
      .limit(boundedLimit),
    db
      .select({
        id: emailOutbox.id,
        subject: emailOutbox.subject,
        status: emailOutbox.status,
        recipients: emailOutbox.to,
        createdAt: emailOutbox.createdAt,
        businessName: businesses.name,
      })
      .from(emailOutbox)
      .leftJoin(businesses, eq(businesses.id, emailOutbox.businessId))
      .orderBy(desc(emailOutbox.createdAt))
      .limit(boundedLimit),
  ]);

  const items: AdminRecentActivityItem[] = [
    ...auditRows.map((row) => ({
      id: `audit:${row.id}`,
      kind: "audit" as const,
      title: getAdminActionLabel(row.action),
      subtitle: row.adminEmail,
      occurredAt: row.createdAt,
      href: buildAdminAuditActivityHref(row.targetType, row.targetId),
    })),
    ...inquiryRows.map((row) => ({
      id: `inquiry:${row.id}`,
      kind: "inquiry" as const,
      title: row.subject?.trim() || `Inquiry from ${row.customerName}`,
      subtitle: [row.customerName, row.businessName]
        .filter(Boolean)
        .join(" · "),
      occurredAt: row.submittedAt,
      href: getAdminInquiryDetailPath(row.id),
    })),
    ...quoteRows
      .filter((row) => row.sentAt !== null)
      .map((row) => ({
        id: `quote:${row.id}`,
        kind: "quote" as const,
        title: `Quote ${row.quoteNumber} sent`,
        subtitle: [row.businessName, row.customerName]
          .filter(Boolean)
          .join(" · "),
        occurredAt: row.sentAt as Date,
        href: getAdminQuoteDetailPath(row.id),
      })),
    ...emailRows.map((row) => ({
      id: `email:${row.id}`,
      kind: "email" as const,
      title: row.subject,
      subtitle: [row.businessName, row.recipients?.[0]]
        .filter(Boolean)
        .join(" · "),
      occurredAt: row.createdAt,
      href: getAdminEmailDetailPath(row.id),
    })),
  ];

  items.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

  return items.slice(0, boundedLimit);
}

/* ── Users ───────────────────────────────────────────────────────────────── */

function buildUserSearchCondition(search: string) {
  const pattern = likePattern(search);

  return or(ilike(user.email, pattern), ilike(user.name, pattern));
}

function buildUserStatusCondition(
  status: AdminUsersListFilters["status"],
) {
  if (!status || status === "all") {
    return undefined;
  }

  if (status === "verified") {
    return eq(user.emailVerified, true);
  }

  if (status === "unverified") {
    return eq(user.emailVerified, false);
  }

  return eq(user.banned, true);
}

async function listAdminUsersInner(
  filters: AdminUsersListFilters,
): Promise<AdminPaginatedResult<AdminUserRow>> {
  const { page, pageSize, search, status } = filters;
  const offset = toOffset(page, pageSize);
  const searchCondition = search ? buildUserSearchCondition(search) : undefined;
  const statusCondition = buildUserStatusCondition(status);
  const whereClause =
    searchCondition && statusCondition
      ? and(searchCondition, statusCondition)
      : searchCondition ?? statusCondition;

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
        role: user.role,
        createdAt: user.createdAt,
        lastSessionAt: lastSessionSql,
      })
      .from(user)
      .where(whereClause)
      .orderBy(desc(user.createdAt), desc(user.id))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: count() })
      .from(user)
      .where(whereClause),
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
        role: row.role ?? null,
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
      role: user.role,
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
    adminCountRows,
  ] = await Promise.all([
    db
      .select({
        plan: accountSubscriptions.plan,
        status: accountSubscriptions.status,
        currentPeriodEnd: accountSubscriptions.currentPeriodEnd,
        id: accountSubscriptions.id,
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
    db
      .select({ count: count() })
      .from(user)
      .where(and(eq(user.role, "admin"), eq(user.banned, false))),
  ]);

  const subscriptionRow = subscriptionRows[0] ?? null;
  const subscription: AdminUserDetailSubscription | null = subscriptionRow
    ? {
        id: subscriptionRow.id,
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

  const adminCount = Number(adminCountRows[0]?.count ?? 0);

  return {
    id: userRow.id,
    email: userRow.email,
    name: userRow.name,
    emailVerified: userRow.emailVerified,
    banned: userRow.banned,
    banReason: userRow.banReason,
    role: userRow.role ?? null,
    createdAt: userRow.createdAt,
    lastSessionAt: lastSessionRows[0]?.lastSessionAt ?? null,
    subscription,
    ownedBusinesses,
    activeSessionCount: Number(activeSessionRows[0]?.count ?? 0),
    recentAuditLogs,
    canDemoteTarget: userRow.role === "admin" && adminCount > 1,
  };
}

/** Detail payload for `/admin/users/[userId]`. Returns `null` when missing. */
export const getAdminUserDetail = cache(
  async (userId: string): Promise<AdminUserDetail | null> => {
    await requireAdminUser();

    return getAdminUserDetailInner(userId);
  },
);

/**
 * Every admin account for the settings roster.
 *
 * Same row shape as `listAdminUsers` (including the last-session
 * subquery), oldest first for a stable roster. No pagination — the admin
 * count is operationally tiny.
 */
export const listAdminAccounts = cache(async (): Promise<AdminUserRow[]> => {
  await requireAdminUser();

  const lastSessionSql = sql<
    Date | null
  >`(select max(${session.createdAt}) from ${session} where ${session.userId} = ${user.id})`;

  const rows = await db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      banned: user.banned,
      banReason: user.banReason,
      role: user.role,
      createdAt: user.createdAt,
      lastSessionAt: lastSessionSql,
    })
    .from(user)
    .where(eq(user.role, "admin"))
    .orderBy(asc(user.createdAt), asc(user.id));

  return rows.map(
    (row): AdminUserRow => ({
      id: row.id,
      email: row.email,
      name: row.name,
      emailVerified: row.emailVerified,
      banned: row.banned,
      banReason: row.banReason,
      role: row.role ?? null,
      createdAt: row.createdAt,
      lastSessionAt: row.lastSessionAt ?? null,
    }),
  );
});

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

/* ── Inquiries ─────────────────────────────────────────────────────────── */

function buildInquirySearchCondition(search: string) {
  const pattern = likePattern(search);

  return or(
    ilike(inquiries.customerName, pattern),
    ilike(inquiries.customerEmail, pattern),
    ilike(inquiries.subject, pattern),
  );
}

async function listAdminInquiriesInner(
  filters: AdminInquiriesListFilters,
): Promise<AdminPaginatedResult<AdminInquiryRow>> {
  const { page, pageSize, search, status } = filters;
  const offset = toOffset(page, pageSize);

  const conditions = [isNull(inquiries.deletedAt)];

  if (search) {
    const searchCondition = buildInquirySearchCondition(search);

    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  if (status) {
    conditions.push(eq(inquiries.status, status));
  }

  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: inquiries.id,
        subject: inquiries.subject,
        customerName: inquiries.customerName,
        customerEmail: inquiries.customerEmail,
        status: inquiries.status,
        submittedAt: inquiries.submittedAt,
        businessId: inquiries.businessId,
        businessName: businesses.name,
      })
      .from(inquiries)
      .innerJoin(businesses, eq(businesses.id, inquiries.businessId))
      .where(where)
      .orderBy(desc(inquiries.submittedAt), desc(inquiries.id))
      .limit(pageSize)
      .offset(offset),
    db.select({ count: count() }).from(inquiries).where(where),
  ]);

  return {
    items: rows.map(
      (row): AdminInquiryRow => ({
        id: row.id,
        subject: row.subject,
        customerName: row.customerName,
        customerEmail: row.customerEmail,
        status: row.status as InquiryStatus,
        submittedAt: row.submittedAt,
        businessId: row.businessId,
        businessName: row.businessName,
      }),
    ),
    total: Number(totalRows[0]?.count ?? 0),
  };
}

/**
 * Paginated cross-business inquiry list for `/admin/inquiries`.
 *
 * Soft-deleted rows are excluded. Search matches customer name, customer
 * email, or subject as a case-insensitive substring. Default ordering is
 * `submittedAt` DESC.
 */
export const listAdminInquiries = cache(
  async (
    input: AdminInquiriesListFilters,
  ): Promise<AdminPaginatedResult<AdminInquiryRow>> => {
    await requireAdminUser();

    const filters = adminInquiriesListFiltersSchema.parse(input);
    return listAdminInquiriesInner(filters);
  },
);

async function getAdminInquiryDetailInner(
  inquiryId: string,
): Promise<AdminInquiryDetail | null> {
  const [row] = await db
    .select({
      id: inquiries.id,
      businessId: inquiries.businessId,
      subject: inquiries.subject,
      customerName: inquiries.customerName,
      customerEmail: inquiries.customerEmail,
      customerContactMethod: inquiries.customerContactMethod,
      customerContactHandle: inquiries.customerContactHandle,
      serviceCategory: inquiries.serviceCategory,
      requestedDeadline: inquiries.requestedDeadline,
      budgetText: inquiries.budgetText,
      details: inquiries.details,
      source: inquiries.source,
      quoteRequested: inquiries.quoteRequested,
      status: inquiries.status,
      submittedAt: inquiries.submittedAt,
      lastRespondedAt: inquiries.lastRespondedAt,
      archivedAt: inquiries.archivedAt,
      deletedAt: inquiries.deletedAt,
      qualificationScore: inquiries.qualificationScore,
      qualificationTemperature: inquiries.qualificationTemperature,
      aiAssisted: inquiries.aiAssisted,
      escalated: inquiries.escalated,
      businessName: businesses.name,
      businessSlug: businesses.slug,
      businessPlan: businesses.plan,
      ownerUserId: businesses.ownerUserId,
      ownerName: user.name,
      ownerEmail: user.email,
    })
    .from(inquiries)
    .innerJoin(businesses, eq(businesses.id, inquiries.businessId))
    .innerJoin(user, eq(user.id, businesses.ownerUserId))
    .where(eq(inquiries.id, inquiryId))
    .limit(1);

  if (!row) {
    return null;
  }

  const [messageRows, noteRows, attachmentRows, linkedQuoteRows] =
    await Promise.all([
      db
        .select({
          id: inquiryMessages.id,
          role: inquiryMessages.role,
          content: inquiryMessages.content,
          status: inquiryMessages.status,
          createdAt: inquiryMessages.createdAt,
        })
        .from(inquiryMessages)
        .where(eq(inquiryMessages.inquiryId, inquiryId))
        .orderBy(asc(inquiryMessages.createdAt), asc(inquiryMessages.id))
        .limit(50),
      db
        .select({
          id: inquiryNotes.id,
          body: inquiryNotes.body,
          createdAt: inquiryNotes.createdAt,
          authorName: user.name,
          authorEmail: user.email,
        })
        .from(inquiryNotes)
        .leftJoin(user, eq(user.id, inquiryNotes.authorUserId))
        .where(eq(inquiryNotes.inquiryId, inquiryId))
        .orderBy(asc(inquiryNotes.createdAt), asc(inquiryNotes.id))
        .limit(50),
      db
        .select({
          id: inquiryAttachments.id,
          fileName: inquiryAttachments.fileName,
          contentType: inquiryAttachments.contentType,
          fileSize: inquiryAttachments.fileSize,
          createdAt: inquiryAttachments.createdAt,
        })
        .from(inquiryAttachments)
        .where(eq(inquiryAttachments.inquiryId, inquiryId))
        .orderBy(asc(inquiryAttachments.createdAt), asc(inquiryAttachments.id))
        .limit(50),
      db
        .select({
          id: quotes.id,
          quoteNumber: quotes.quoteNumber,
          status: quotes.status,
          totalInCents: quotes.totalInCents,
          currency: quotes.currency,
          sentAt: quotes.sentAt,
        })
        .from(quotes)
        .where(
          and(eq(quotes.inquiryId, inquiryId), isNull(quotes.deletedAt)),
        )
        .orderBy(desc(quotes.createdAt), desc(quotes.id))
        .limit(20),
    ]);

  const messages: AdminInquiryMessage[] = messageRows.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    status: message.status,
    createdAt: message.createdAt,
  }));

  const notes: AdminInquiryNote[] = noteRows.map((note) => ({
    id: note.id,
    body: note.body,
    authorName: note.authorName,
    authorEmail: note.authorEmail,
    createdAt: note.createdAt,
  }));

  const attachments: AdminInquiryAttachment[] = attachmentRows.map(
    (attachment) => ({
      id: attachment.id,
      fileName: attachment.fileName,
      contentType: attachment.contentType,
      fileSize: attachment.fileSize,
      createdAt: attachment.createdAt,
    }),
  );

  const linkedQuotes: AdminInquiryLinkedQuote[] = linkedQuoteRows.map(
    (quote) => ({
      id: quote.id,
      quoteNumber: quote.quoteNumber,
      status: quote.status as QuoteStatus,
      totalInCents: quote.totalInCents,
      currency: quote.currency,
      sentAt: quote.sentAt,
    }),
  );

  return {
    id: row.id,
    businessId: row.businessId,
    subject: row.subject,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerContactMethod: row.customerContactMethod,
    customerContactHandle: row.customerContactHandle,
    serviceCategory: row.serviceCategory,
    requestedDeadline: row.requestedDeadline,
    budgetText: row.budgetText,
    details: row.details,
    source: row.source,
    quoteRequested: row.quoteRequested,
    status: row.status as InquiryStatus,
    submittedAt: row.submittedAt,
    lastRespondedAt: row.lastRespondedAt,
    archivedAt: row.archivedAt,
    deletedAt: row.deletedAt,
    qualificationScore: row.qualificationScore,
    qualificationTemperature: row.qualificationTemperature,
    aiAssisted: row.aiAssisted,
    escalated: row.escalated,
    business: {
      id: row.businessId,
      name: row.businessName,
      slug: row.businessSlug,
      plan: row.businessPlan,
    },
    owner: {
      userId: row.ownerUserId,
      name: row.ownerName,
      email: row.ownerEmail,
    },
    messages,
    notes,
    attachments,
    linkedQuotes,
  };
}

/** Detail payload for `/admin/inquiries/[inquiryId]`. */
export const getAdminInquiryDetail = cache(
  async (inquiryId: string): Promise<AdminInquiryDetail | null> => {
    await requireAdminUser();

    return getAdminInquiryDetailInner(inquiryId);
  },
);

/* ── Quotes ──────────────────────────────────────────────────────────────── */

function buildQuoteSearchCondition(search: string) {
  const pattern = likePattern(search);

  return or(
    ilike(quotes.quoteNumber, pattern),
    ilike(quotes.customerName, pattern),
    ilike(quotes.customerEmail, pattern),
  );
}

async function listAdminQuotesInner(
  filters: AdminQuotesListFilters,
): Promise<AdminPaginatedResult<AdminQuoteRow>> {
  const { page, pageSize, search, status } = filters;
  const offset = toOffset(page, pageSize);

  const conditions = [isNull(quotes.deletedAt)];

  if (search) {
    const searchCondition = buildQuoteSearchCondition(search);

    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  if (status) {
    conditions.push(eq(quotes.status, status));
  }

  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: quotes.id,
        quoteNumber: quotes.quoteNumber,
        title: quotes.title,
        customerName: quotes.customerName,
        customerEmail: quotes.customerEmail,
        status: quotes.status,
        totalInCents: quotes.totalInCents,
        currency: quotes.currency,
        sentAt: quotes.sentAt,
        createdAt: quotes.createdAt,
        businessId: quotes.businessId,
        businessName: businesses.name,
      })
      .from(quotes)
      .innerJoin(businesses, eq(businesses.id, quotes.businessId))
      .where(where)
      .orderBy(desc(quotes.createdAt), desc(quotes.id))
      .limit(pageSize)
      .offset(offset),
    db.select({ count: count() }).from(quotes).where(where),
  ]);

  return {
    items: rows.map(
      (row): AdminQuoteRow => ({
        id: row.id,
        quoteNumber: row.quoteNumber,
        title: row.title,
        customerName: row.customerName,
        customerEmail: row.customerEmail,
        status: row.status as QuoteStatus,
        totalInCents: row.totalInCents,
        currency: row.currency,
        sentAt: row.sentAt,
        createdAt: row.createdAt,
        businessId: row.businessId,
        businessName: row.businessName,
      }),
    ),
    total: Number(totalRows[0]?.count ?? 0),
  };
}

/**
 * Paginated cross-business quote list for `/admin/quotes`.
 *
 * Soft-deleted rows are excluded. Search matches quote number, customer
 * name, or customer email as a case-insensitive substring. Default
 * ordering is `createdAt` DESC.
 */
export const listAdminQuotes = cache(
  async (
    input: AdminQuotesListFilters,
  ): Promise<AdminPaginatedResult<AdminQuoteRow>> => {
    await requireAdminUser();

    const filters = adminQuotesListFiltersSchema.parse(input);
    return listAdminQuotesInner(filters);
  },
);

async function getAdminQuoteDetailInner(
  quoteId: string,
): Promise<AdminQuoteDetail | null> {
  const [row] = await db
    .select({
      id: quotes.id,
      businessId: quotes.businessId,
      inquiryId: quotes.inquiryId,
      quoteNumber: quotes.quoteNumber,
      title: quotes.title,
      customerName: quotes.customerName,
      customerEmail: quotes.customerEmail,
      customerContactMethod: quotes.customerContactMethod,
      customerContactHandle: quotes.customerContactHandle,
      status: quotes.status,
      currency: quotes.currency,
      notes: quotes.notes,
      terms: quotes.terms,
      subtotalInCents: quotes.subtotalInCents,
      discountInCents: quotes.discountInCents,
      taxInCents: quotes.taxInCents,
      totalInCents: quotes.totalInCents,
      sentAt: quotes.sentAt,
      acceptedAt: quotes.acceptedAt,
      publicViewedAt: quotes.publicViewedAt,
      customerRespondedAt: quotes.customerRespondedAt,
      customerResponseMessage: quotes.customerResponseMessage,
      validUntil: quotes.validUntil,
      version: quotes.version,
      autoFollowUpEnabled: quotes.autoFollowUpEnabled,
      autoFollowUpDelayDays: quotes.autoFollowUpDelayDays,
      autoFollowUpMaxAttempts: quotes.autoFollowUpMaxAttempts,
      autoFollowUpAttempts: quotes.autoFollowUpAttempts,
      autoFollowUpLastSentAt: quotes.autoFollowUpLastSentAt,
      autoFollowUpStoppedAt: quotes.autoFollowUpStoppedAt,
      createdAt: quotes.createdAt,
      updatedAt: quotes.updatedAt,
      businessName: businesses.name,
      businessSlug: businesses.slug,
      businessPlan: businesses.plan,
      inquirySubject: inquiries.subject,
      inquiryCustomerName: inquiries.customerName,
      inquiryStatus: inquiries.status,
    })
    .from(quotes)
    .innerJoin(businesses, eq(businesses.id, quotes.businessId))
    .leftJoin(inquiries, eq(inquiries.id, quotes.inquiryId))
    .where(eq(quotes.id, quoteId))
    .limit(1);

  if (!row) {
    return null;
  }

  const [itemRows, versionRows, revisionRows, emailRows] = await Promise.all([
    db
      .select({
        id: quoteItems.id,
        description: quoteItems.description,
        quantity: quoteItems.quantity,
        unitPriceInCents: quoteItems.unitPriceInCents,
        lineTotalInCents: quoteItems.lineTotalInCents,
        position: quoteItems.position,
      })
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, quoteId))
      .orderBy(asc(quoteItems.position), asc(quoteItems.id))
      .limit(100),
    db
      .select({
        id: quoteVersions.id,
        version: quoteVersions.version,
        title: quoteVersions.title,
        totalInCents: quoteVersions.totalInCents,
        currency: quoteVersions.currency,
        validUntil: quoteVersions.validUntil,
        createdAt: quoteVersions.createdAt,
      })
      .from(quoteVersions)
      .where(eq(quoteVersions.quoteId, quoteId))
      .orderBy(desc(quoteVersions.version))
      .limit(20),
    db
      .select({
        id: quoteRevisionRequests.id,
        version: quoteRevisionRequests.version,
        message: quoteRevisionRequests.message,
        status: quoteRevisionRequests.status,
        createdAt: quoteRevisionRequests.createdAt,
        resolvedAt: quoteRevisionRequests.resolvedAt,
      })
      .from(quoteRevisionRequests)
      .where(eq(quoteRevisionRequests.quoteId, quoteId))
      .orderBy(desc(quoteRevisionRequests.createdAt), desc(quoteRevisionRequests.id))
      .limit(20),
    // Delivery emails for this quote share an idempotency-key prefix
    // (`quote:<id>:sent:*` for the send, `auto-followup:<id>:attempt:*`
    // for follow-ups), so a prefix LIKE hits the unique key's btree
    // instead of scanning. Scoped to the business, newest first.
    db
      .select({
        id: emailOutbox.id,
        subject: emailOutbox.subject,
        status: emailOutbox.status,
        provider: emailOutbox.provider,
        sentAt: emailOutbox.sentAt,
        createdAt: emailOutbox.createdAt,
        attempts: emailOutbox.attempts,
      })
      .from(emailOutbox)
      .where(
        and(
          eq(emailOutbox.businessId, row.businessId),
          or(
            like(
              emailOutbox.idempotencyKey,
              `quote:${escapeLikePattern(quoteId)}:%`,
            ),
            like(
              emailOutbox.idempotencyKey,
              `auto-followup:${escapeLikePattern(quoteId)}:%`,
            ),
          ),
        ),
      )
      .orderBy(desc(emailOutbox.createdAt), desc(emailOutbox.id))
      .limit(10),
  ]);

  const items: AdminQuoteItem[] = itemRows.map((item) => ({
    id: item.id,
    description: item.description,
    quantity: item.quantity,
    unitPriceInCents: item.unitPriceInCents,
    lineTotalInCents: item.lineTotalInCents,
    position: item.position,
  }));

  const versions: AdminQuoteVersion[] = versionRows.map((version) => ({
    id: version.id,
    version: version.version,
    title: version.title,
    totalInCents: version.totalInCents,
    currency: version.currency,
    validUntil: version.validUntil,
    createdAt: version.createdAt,
  }));

  const revisionRequests: AdminQuoteRevisionRequest[] = revisionRows.map(
    (request) => ({
      id: request.id,
      version: request.version,
      message: request.message,
      status: request.status,
      createdAt: request.createdAt,
      resolvedAt: request.resolvedAt,
    }),
  );

  const emails: AdminQuoteEmail[] = emailRows.map((email) => ({
    id: email.id,
    subject: email.subject,
    status: email.status as EmailOutboxStatus,
    provider: email.provider,
    sentAt: email.sentAt,
    createdAt: email.createdAt,
    attempts: email.attempts,
  }));

  return {
    id: row.id,
    businessId: row.businessId,
    inquiryId: row.inquiryId,
    quoteNumber: row.quoteNumber,
    title: row.title,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerContactMethod: row.customerContactMethod,
    customerContactHandle: row.customerContactHandle,
    status: row.status as QuoteStatus,
    currency: row.currency,
    notes: row.notes,
    terms: row.terms,
    subtotalInCents: row.subtotalInCents,
    discountInCents: row.discountInCents,
    taxInCents: row.taxInCents,
    totalInCents: row.totalInCents,
    sentAt: row.sentAt,
    acceptedAt: row.acceptedAt,
    publicViewedAt: row.publicViewedAt,
    customerRespondedAt: row.customerRespondedAt,
    customerResponseMessage: row.customerResponseMessage,
    validUntil: row.validUntil,
    version: row.version,
    autoFollowUp: {
      enabled: row.autoFollowUpEnabled,
      delayDays: row.autoFollowUpDelayDays,
      maxAttempts: row.autoFollowUpMaxAttempts,
      attempts: row.autoFollowUpAttempts,
      lastSentAt: row.autoFollowUpLastSentAt,
      stoppedAt: row.autoFollowUpStoppedAt,
    },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    business: {
      id: row.businessId,
      name: row.businessName,
      slug: row.businessSlug,
      plan: row.businessPlan,
    },
    linkedInquiry:
      row.inquiryId === null
        ? null
        : {
            id: row.inquiryId,
            subject: row.inquirySubject,
            customerName: row.inquiryCustomerName ?? row.customerName,
            status: row.inquiryStatus as InquiryStatus,
          },
    items,
    versions,
    revisionRequests,
    emails,
  };
}

/** Detail payload for `/admin/quotes/[quoteId]`. */
export const getAdminQuoteDetail = cache(
  async (quoteId: string): Promise<AdminQuoteDetail | null> => {
    await requireAdminUser();

    return getAdminQuoteDetailInner(quoteId);
  },
);

/* ── Subscriptions ───────────────────────────────────────────────────────── */

async function listAdminSubscriptionsInner(
  filters: AdminSubscriptionsListFilters,
): Promise<AdminPaginatedResult<AdminSubscriptionRow>> {
  const { page, pageSize, status, provider, search } = filters;
  const offset = toOffset(page, pageSize);

  const conditions = [] as Array<ReturnType<typeof eq> | ReturnType<typeof or>>;

  if (status) {
    conditions.push(eq(accountSubscriptions.status, status));
  }

  if (provider) {
    conditions.push(eq(accountSubscriptions.billingProvider, provider));
  }

  if (search) {
    const pattern = likePattern(search);
    conditions.push(ilike(user.email, pattern));
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

/**
 * Base `account_subscriptions` row (joined to its owner) shared by every
 * subscription-detail query.
 *
 * The `WHERE` clause is the only thing that differs between "by id", "by
 * user", and the business-billing lookup, so it is a parameter rather than
 * three near-identical selects.
 */
async function selectAdminSubscriptionBaseRow(where: SQL) {
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
    .where(where)
    .limit(1);

  return row ?? null;
}

type AdminSubscriptionBaseRow = NonNullable<
  Awaited<ReturnType<typeof selectAdminSubscriptionBaseRow>>
>;

/**
 * Assemble the full detail payload from a base row.
 *
 * Recent payments and billing events are keyed by the owning `userId` (via
 * `payment_attempts_user_id_idx` / `billing_events_user_id_idx`), newest
 * first, capped at 10 each.
 */
async function assembleAdminSubscriptionDetail(
  row: AdminSubscriptionBaseRow,
): Promise<AdminSubscriptionDetail> {
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

async function getAdminSubscriptionDetailInner(
  subscriptionId: string,
): Promise<AdminSubscriptionDetail | null> {
  const row = await selectAdminSubscriptionBaseRow(
    eq(accountSubscriptions.id, subscriptionId),
  );

  if (!row) {
    return null;
  }

  return assembleAdminSubscriptionDetail(row);
}

/** Detail payload for `/admin/subscriptions/[subscriptionId]`. */
export const getAdminSubscriptionDetail = cache(
  async (subscriptionId: string): Promise<AdminSubscriptionDetail | null> => {
    await requireAdminUser();

    return getAdminSubscriptionDetailInner(subscriptionId);
  },
);

/**
 * Complete billing picture for `/admin/users/[userId]`.
 *
 * Resolves the user's `account_subscriptions` row (via
 * `account_subscriptions_user_id_unique`) and assembles the same full
 * detail the subscription page used to render — details grid, recent
 * payment attempts, recent billing events. Users without a row are
 * implicitly on the free plan, so `subscription` is null rather than an
 * error.
 */
export const getAdminUserBillingActivity = cache(
  async (userId: string): Promise<AdminUserBillingActivity> => {
    await requireAdminUser();

    const row = await selectAdminSubscriptionBaseRow(
      eq(accountSubscriptions.userId, userId),
    );

    return {
      subscription: row ? await assembleAdminSubscriptionDetail(row) : null,
    };
  },
);

/**
 * Every plan signal for `/admin/businesses/[businessId]`.
 *
 * Returns null when the business does not exist. Otherwise returns three
 * separately-labelled facts: the denormalized `businesses.plan` read cache
 * (what the product enforces), the owner's full `account_subscriptions`
 * detail, and the business-scoped `business_subscriptions` row. Callers
 * must label each distinctly — the two subscription tables can disagree.
 */
export const getAdminBusinessBilling = cache(
  async (businessId: string): Promise<AdminBusinessBilling | null> => {
    await requireAdminUser();

    const [businessRow] = await db
      .select({
        id: businesses.id,
        plan: businesses.plan,
        ownerUserId: businesses.ownerUserId,
        ownerEmail: user.email,
      })
      .from(businesses)
      .innerJoin(user, eq(user.id, businesses.ownerUserId))
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!businessRow) {
      return null;
    }

    const [accountRow, businessSubscriptionRows] = await Promise.all([
      selectAdminSubscriptionBaseRow(
        eq(accountSubscriptions.userId, businessRow.ownerUserId),
      ),
      db
        .select({
          id: businessSubscriptions.id,
          plan: businessSubscriptions.plan,
          status: businessSubscriptions.status,
          provider: businessSubscriptions.billingProvider,
          currentPeriodEnd: businessSubscriptions.currentPeriodEnd,
          canceledAt: businessSubscriptions.canceledAt,
        })
        .from(businessSubscriptions)
        .where(eq(businessSubscriptions.businessId, businessId))
        .limit(1),
    ]);

    const businessSubscriptionRow = businessSubscriptionRows[0] ?? null;

    const businessSubscription: AdminBusinessSubscriptionSummary | null =
      businessSubscriptionRow
        ? {
            id: businessSubscriptionRow.id,
            plan: businessSubscriptionRow.plan,
            status: businessSubscriptionRow.status as SubscriptionStatus,
            provider: businessSubscriptionRow.provider as BillingProvider,
            currentPeriodEnd: businessSubscriptionRow.currentPeriodEnd,
            canceledAt: businessSubscriptionRow.canceledAt,
          }
        : null;

    return {
      businessId: businessRow.id,
      effectivePlan: businessRow.plan,
      ownerUserId: businessRow.ownerUserId,
      ownerEmail: businessRow.ownerEmail,
      accountSubscription: accountRow
        ? await assembleAdminSubscriptionDetail(accountRow)
        : null,
      businessSubscription,
    };
  },
);

/* ── AI ──────────────────────────────────────────────────────────────────── */

const adminAiCacheLife = {
  stale: 60,
  revalidate: 60,
  expire: 300,
} as const;

/** Provider error strings are capped at this length in admin payloads. */
const AI_ERROR_MESSAGE_MAX_LENGTH = 1024;

function truncateAiErrorMessage(value: string | null): string | null {
  if (!value || value.length <= AI_ERROR_MESSAGE_MAX_LENGTH) {
    return value;
  }

  return value.slice(0, AI_ERROR_MESSAGE_MAX_LENGTH);
}

/** Inclusive upper bound for a `to` date filter (end of that UTC day). */
function endOfDay(date: Date): Date {
  const end = new Date(date.getTime());
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

async function selectAiWindowStats(since: Date): Promise<AdminAiWindowStats> {
  const [row] = await db
    .select({
      requests: sql<number>`count(*)::int`,
      tokens: sql<number>`coalesce(sum(${aiTokenLogs.totalTokens}), 0)::int`,
      // Nullable for unpriced models — the sum silently excludes them, so
      // `unpricedCalls` tells the UI this total is a floor.
      estimatedCostCents: sql<number>`coalesce(sum(${aiTokenLogs.estimatedCostCents}), 0)::int`,
      unpricedCalls: sql<number>`(count(*) filter (where ${aiTokenLogs.unpriced}))::int`,
      errors: sql<number>`(count(*) filter (where ${aiTokenLogs.status} = 'error'))::int`,
      cacheHits: sql<number>`(count(*) filter (where ${aiTokenLogs.cacheHit}))::int`,
      averageLatencyMs: sql<number | null>`avg(${aiTokenLogs.latencyMs})::float8`,
    })
    .from(aiTokenLogs)
    .where(gte(aiTokenLogs.createdAt, since));

  return {
    requests: Number(row?.requests ?? 0),
    tokens: Number(row?.tokens ?? 0),
    estimatedCostCents: Number(row?.estimatedCostCents ?? 0),
    unpricedCalls: Number(row?.unpricedCalls ?? 0),
    errors: Number(row?.errors ?? 0),
    cacheHits: Number(row?.cacheHits ?? 0),
    averageLatencyMs:
      row?.averageLatencyMs == null ? null : Number(row.averageLatencyMs),
  };
}

/**
 * AI overview aggregates.
 *
 * Aggregate-only: counts / sums / GROUP BYs over bounded trailing windows,
 * never row loads. `ai_security_events` has no usable index, so its 7-day
 * count is a bounded scan by design — no migrations are permitted to fix
 * that. The whole payload caches for 60 seconds.
 */
async function getCachedAdminAiOverview(): Promise<AdminAiOverview> {
  "use cache";

  cacheLife(adminAiCacheLife);
  cacheTag(adminAiTag());

  const since24h = hoursAgo(24);
  const since7d = sevenDaysAgo();

  const [
    stats24h,
    stats7d,
    providerRows,
    taskRows,
    securityRows,
    sessionRows,
  ] = await Promise.all([
    selectAiWindowStats(since24h),
    selectAiWindowStats(since7d),
    db
      .select({
        provider: aiTokenLogs.provider,
        requests: sql<number>`count(*)::int`,
        tokens: sql<number>`coalesce(sum(${aiTokenLogs.totalTokens}), 0)::int`,
        errors: sql<number>`(count(*) filter (where ${aiTokenLogs.status} = 'error'))::int`,
      })
      .from(aiTokenLogs)
      .where(gte(aiTokenLogs.createdAt, since7d))
      .groupBy(aiTokenLogs.provider),
    db
      .select({
        taskType: aiTokenLogs.taskType,
        requests: sql<number>`count(*)::int`,
        tokens: sql<number>`coalesce(sum(${aiTokenLogs.totalTokens}), 0)::int`,
        errors: sql<number>`(count(*) filter (where ${aiTokenLogs.status} = 'error'))::int`,
      })
      .from(aiTokenLogs)
      .where(gte(aiTokenLogs.createdAt, since7d))
      .groupBy(aiTokenLogs.taskType),
    db
      .select({ count: count() })
      .from(aiSecurityEvents)
      .where(gte(aiSecurityEvents.createdAt, since7d)),
    db
      .select({
        status: aiAgentSessions.status,
        count: sql<number>`count(*)::int`,
      })
      .from(aiAgentSessions)
      .groupBy(aiAgentSessions.status),
  ]);

  const byProvider: AdminAiProviderBreakdown[] = providerRows
    .map((row) => ({
      provider: row.provider,
      requests: Number(row.requests ?? 0),
      tokens: Number(row.tokens ?? 0),
      errors: Number(row.errors ?? 0),
    }))
    .sort((a, b) => b.requests - a.requests);

  const byTaskType: AdminAiTaskBreakdown[] = taskRows
    .map((row) => ({
      taskType: row.taskType,
      requests: Number(row.requests ?? 0),
      tokens: Number(row.tokens ?? 0),
      errors: Number(row.errors ?? 0),
    }))
    .sort((a, b) => b.requests - a.requests);

  const agentSessionsByStatus: AdminAiSessionBreakdown[] = sessionRows
    .map((row) => ({ status: row.status, count: Number(row.count ?? 0) }))
    .sort((a, b) => b.count - a.count);

  return {
    last24h: stats24h,
    last7d: stats7d,
    byProvider,
    byTaskType,
    securityEventsLast7d: Number(securityRows[0]?.count ?? 0),
    agentSessionsByStatus,
  };
}

/**
 * AI overview for `/admin/ai`.
 *
 * Same two-layer cache as the other overview payloads: `"use cache"`
 * cross-request with a 60-second cap, `React.cache` for per-render dedupe.
 */
export const getAdminAiOverview = cache(
  async (): Promise<AdminAiOverview> => {
    await requireAdminUser();

    return getCachedAdminAiOverview();
  },
);

function buildAiRequestConditions(filters: AdminAiRequestsListFilters) {
  const conditions: SQL[] = [];

  if (filters.provider) {
    conditions.push(eq(aiTokenLogs.provider, filters.provider));
  }

  if (filters.status) {
    conditions.push(eq(aiTokenLogs.status, filters.status));
  }

  if (filters.businessId) {
    conditions.push(eq(aiTokenLogs.businessId, filters.businessId));
  }

  if (filters.model) {
    conditions.push(ilike(aiTokenLogs.model, likePattern(filters.model)));
  }

  if (filters.taskType) {
    conditions.push(ilike(aiTokenLogs.taskType, likePattern(filters.taskType)));
  }

  // `search` is an exact request-id lookup for support flows.
  if (filters.search) {
    conditions.push(eq(aiTokenLogs.id, filters.search));
  }

  if (filters.from) {
    conditions.push(gte(aiTokenLogs.createdAt, filters.from));
  }

  if (filters.to) {
    conditions.push(lte(aiTokenLogs.createdAt, endOfDay(filters.to)));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

async function listAdminAiRequestsInner(
  filters: AdminAiRequestsListFilters,
): Promise<AdminPaginatedResult<AdminAiRequestRow>> {
  const { page, pageSize } = filters;
  const offset = toOffset(page, pageSize);
  const where = buildAiRequestConditions(filters);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: aiTokenLogs.id,
        provider: aiTokenLogs.provider,
        model: aiTokenLogs.model,
        taskType: aiTokenLogs.taskType,
        status: aiTokenLogs.status,
        totalTokens: aiTokenLogs.totalTokens,
        estimatedCostCents: aiTokenLogs.estimatedCostCents,
        cacheHit: aiTokenLogs.cacheHit,
        latencyMs: aiTokenLogs.latencyMs,
        errorMessage: aiTokenLogs.errorMessage,
        businessId: aiTokenLogs.businessId,
        createdAt: aiTokenLogs.createdAt,
      })
      .from(aiTokenLogs)
      .where(where)
      .orderBy(desc(aiTokenLogs.createdAt), desc(aiTokenLogs.id))
      .limit(pageSize)
      .offset(offset),
    db.select({ count: count() }).from(aiTokenLogs).where(where),
  ]);

  return {
    items: rows.map(
      (row): AdminAiRequestRow => ({
        id: row.id,
        provider: row.provider,
        model: row.model,
        taskType: row.taskType,
        status: row.status,
        totalTokens: row.totalTokens,
        estimatedCostCents: row.estimatedCostCents,
        cacheHit: row.cacheHit,
        latencyMs: row.latencyMs,
        errorMessage: truncateAiErrorMessage(row.errorMessage),
        businessId: row.businessId,
        createdAt: row.createdAt,
      }),
    ),
    total: Number(totalRows[0]?.count ?? 0),
  };
}

/**
 * Paginated per-call AI request log for `/admin/ai/requests`.
 *
 * `ai_token_logs` has 90-day retention, so history is bounded by design —
 * the page says so. Default ordering is `createdAt` DESC.
 */
export const listAdminAiRequests = cache(
  async (
    input: AdminAiRequestsListFilters,
  ): Promise<AdminPaginatedResult<AdminAiRequestRow>> => {
    await requireAdminUser();

    const filters = adminAiRequestsFiltersSchema.parse(input);
    return listAdminAiRequestsInner(filters);
  },
);

async function listAdminAiErrorsInner(
  filters: AdminAiErrorsListFilters,
): Promise<AdminAiErrorsResult> {
  const { page, pageSize, provider, model, taskType } = filters;
  const offset = toOffset(page, pageSize);

  const conditions: SQL[] = [eq(aiTokenLogs.status, "error")];

  if (provider) {
    conditions.push(eq(aiTokenLogs.provider, provider));
  }

  if (model) {
    conditions.push(ilike(aiTokenLogs.model, likePattern(model)));
  }

  if (taskType) {
    conditions.push(ilike(aiTokenLogs.taskType, likePattern(taskType)));
  }

  const where = and(...conditions);

  const [errorRows, errorTotalRows, securityRows] = await Promise.all([
    db
      .select({
        id: aiTokenLogs.id,
        provider: aiTokenLogs.provider,
        model: aiTokenLogs.model,
        taskType: aiTokenLogs.taskType,
        errorMessage: aiTokenLogs.errorMessage,
        createdAt: aiTokenLogs.createdAt,
      })
      .from(aiTokenLogs)
      .where(where)
      .orderBy(desc(aiTokenLogs.createdAt), desc(aiTokenLogs.id))
      .limit(pageSize)
      .offset(offset),
    db.select({ count: count() }).from(aiTokenLogs).where(where),
    db
      .select({
        id: aiSecurityEvents.id,
        eventType: aiSecurityEvents.eventType,
        patternMatched: aiSecurityEvents.patternMatched,
        businessId: aiSecurityEvents.businessId,
        createdAt: aiSecurityEvents.createdAt,
      })
      .from(aiSecurityEvents)
      .orderBy(desc(aiSecurityEvents.createdAt), desc(aiSecurityEvents.id))
      .limit(ADMIN_AI_SECURITY_EVENTS_LIMIT),
  ]);

  const items: AdminAiErrorRow[] = errorRows.map((row) => ({
    id: row.id,
    provider: row.provider,
    model: row.model,
    taskType: row.taskType,
    errorMessage: truncateAiErrorMessage(row.errorMessage),
    createdAt: row.createdAt,
  }));

  const securityEvents: AdminAiSecurityEvent[] = securityRows.map((row) => ({
    id: row.id,
    eventType: row.eventType,
    patternMatched: row.patternMatched,
    businessId: row.businessId,
    createdAt: row.createdAt,
  }));

  return {
    items,
    total: Number(errorTotalRows[0]?.count ?? 0),
    securityEvents,
  };
}

/**
 * Failed AI calls plus the newest security events for `/admin/ai/errors`.
 *
 * Only persisted failures are shown: `ai_token_logs.status = 'error'` and
 * `ai_security_events`. Rate-limit / exhaustion / fallback events are
 * `console.warn` only and are never persisted, so no such panel exists —
 * the page says so rather than faking it.
 */
export const listAdminAiErrors = cache(
  async (input: AdminAiErrorsListFilters): Promise<AdminAiErrorsResult> => {
    await requireAdminUser();

    const filters = adminAiErrorsFiltersSchema.parse(input);
    return listAdminAiErrorsInner(filters);
  },
);

/**
 * Configured providers and routing profiles for `/admin/ai/providers`.
 *
 * No database table backs this — it composes env-driven provider flags
 * with the static routing profiles. Deliberately *not* `"use cache"`d:
 * it is cheap, and a redeploy with new credentials should reflect
 * immediately. Live Redis capacity is separate (`getAdminAiCapacity`).
 */
export const getAdminAiProviders = cache(
  async (): Promise<AdminAiProviders> => {
    await requireAdminUser();

    const { ROUTING_PROFILES } = await import("@/lib/ai/routing-profiles");
    const {
      isGroqConfigured,
      isCerebrasConfigured,
      isGeminiConfigured,
      isOpenRouterConfigured,
      isMistralConfigured,
      isCloudflareAiConfigured,
      isNvidiaNimConfigured,
    } = await import("@/lib/env");

    const configuredById: Record<AdminAiProviderId, boolean> = {
      groq: isGroqConfigured,
      cerebras: isCerebrasConfigured,
      google: isGeminiConfigured,
      openrouter: isOpenRouterConfigured,
      mistral: isMistralConfigured,
      cloudflare: isCloudflareAiConfigured,
      nvidia: isNvidiaNimConfigured,
    };

    const providers: AdminAiProvider[] = ADMIN_AI_PROVIDERS.map((id) => ({
      id,
      label: ADMIN_AI_PROVIDER_LABELS[id],
      configured: configuredById[id] ?? false,
    }));

    const profiles: AdminAiRoutingProfile[] = Object.entries(
      ROUTING_PROFILES,
    ).map(([name, profile]) => ({
      name,
      needsTools: profile.needsTools,
      minQuality: profile.minQuality,
      order: [...profile.order],
      excludedProviders: [...profile.excludedProviders],
      reasoning: profile.reasoning,
    }));

    return { providers, profiles };
  },
);

/**
 * Live per-model capacity for `/admin/ai/providers`.
 *
 * Fans out many Redis GETs, so it sits behind its own Suspense boundary
 * plus an explicit opt-in (`?capacity=1`) — never cached, never part of
 * the initial page payload. Dynamic import keeps the capacity selector's
 * module graph out of every other admin query.
 */
export async function getAdminAiCapacity(): Promise<AdminAiCapacityEntry[]> {
  await requireAdminUser();

  const { getCapacitySnapshot } = await import("@/lib/ai/capacity-selector");
  const snapshot = await getCapacitySnapshot();

  return snapshot
    .map((entry) => ({
      modelId: entry.modelId,
      loadRatio: entry.loadRatio,
      minuteUsage: entry.minuteUsage,
      dayUsage: entry.dayUsage,
      available: entry.available,
    }))
    .sort((a, b) => b.loadRatio - a.loadRatio);
}

/* ── Emails ─────────────────────────────────────────────────────────────── */

function buildEmailSearchCondition(search: string) {
  const pattern = likePattern(search);

  return or(
    ilike(emailOutbox.subject, pattern),
    // `to` is a jsonb array — cast to text for the substring match.
    sql`(${emailOutbox.to}::text ILIKE ${pattern})`,
    ilike(emailOutbox.idempotencyKey, pattern),
  );
}

async function listAdminEmailsInner(
  filters: AdminEmailsListFilters,
): Promise<AdminPaginatedResult<AdminEmailRow>> {
  const { page, pageSize, search, status, emailType, provider } = filters;
  const offset = toOffset(page, pageSize);

  const conditions: SQL[] = [];

  if (search) {
    const searchCondition = buildEmailSearchCondition(search);

    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  if (status) {
    conditions.push(eq(emailOutbox.status, status));
  }

  if (emailType) {
    conditions.push(eq(emailOutbox.type, emailType));
  }

  if (provider) {
    conditions.push(eq(emailOutbox.provider, provider));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: emailOutbox.id,
        subject: emailOutbox.subject,
        type: emailOutbox.type,
        status: emailOutbox.status,
        provider: emailOutbox.provider,
        recipients: emailOutbox.to,
        businessId: emailOutbox.businessId,
        businessName: businesses.name,
        senderEmail: user.email,
        sentAt: emailOutbox.sentAt,
        createdAt: emailOutbox.createdAt,
      })
      .from(emailOutbox)
      .leftJoin(businesses, eq(businesses.id, emailOutbox.businessId))
      .leftJoin(user, eq(user.id, emailOutbox.userId))
      .where(where)
      .orderBy(desc(emailOutbox.createdAt), desc(emailOutbox.id))
      .limit(pageSize)
      .offset(offset),
    db.select({ count: count() }).from(emailOutbox).where(where),
  ]);

  return {
    items: rows.map(
      (row): AdminEmailRow => ({
        id: row.id,
        subject: row.subject,
        type: row.type,
        status: row.status as EmailOutboxStatus,
        provider: row.provider,
        recipient: row.recipients[0] ?? null,
        businessId: row.businessId,
        businessName: row.businessName,
        senderEmail: row.senderEmail,
        sentAt: row.sentAt,
        createdAt: row.createdAt,
      }),
    ),
    total: Number(totalRows[0]?.count ?? 0),
  };
}

/**
 * Paginated transactional email list for `/admin/emails`.
 *
 * Search matches subject, any recipient, or the idempotency key as a
 * case-insensitive substring. Default ordering is `createdAt` DESC.
 */
export const listAdminEmails = cache(
  async (
    input: AdminEmailsListFilters,
  ): Promise<AdminPaginatedResult<AdminEmailRow>> => {
    await requireAdminUser();

    const filters = adminEmailsListFiltersSchema.parse(input);
    return listAdminEmailsInner(filters);
  },
);

async function getAdminEmailDetailInner(
  emailId: string,
): Promise<AdminEmailDetail | null> {
  const [row] = await db
    .select({
      id: emailOutbox.id,
      businessId: emailOutbox.businessId,
      businessName: businesses.name,
      type: emailOutbox.type,
      recipients: emailOutbox.to,
      subject: emailOutbox.subject,
      status: emailOutbox.status,
      provider: emailOutbox.provider,
      providerMessageId: emailOutbox.providerMessageId,
      attempts: emailOutbox.attempts,
      lastError: emailOutbox.lastError,
      idempotencyKey: emailOutbox.idempotencyKey,
      sentAt: emailOutbox.sentAt,
      createdAt: emailOutbox.createdAt,
      updatedAt: emailOutbox.updatedAt,
    })
    .from(emailOutbox)
    .leftJoin(businesses, eq(businesses.id, emailOutbox.businessId))
    .where(eq(emailOutbox.id, emailId))
    .limit(1);

  if (!row) {
    return null;
  }

  // Privacy contract: auth email bodies never leave the database. The
  // second select only runs for non-auth types, so verification codes
  // and magic links cannot reach the browser even through the RSC
  // payload. `cc`/`bcc` are never selected at all.
  const bodyRedacted = row.type === "auth";
  let html: string | null = null;
  let textBody: string | null = null;

  if (!bodyRedacted) {
    const [bodyRow] = await db
      .select({
        html: emailOutbox.html,
        textBody: emailOutbox.textBody,
      })
      .from(emailOutbox)
      .where(eq(emailOutbox.id, emailId))
      .limit(1);

    html = bodyRow?.html ?? null;
    textBody = bodyRow?.textBody ?? null;
  }

  const attemptRows = await db
    .select({
      id: emailAttempts.id,
      provider: emailAttempts.provider,
      status: emailAttempts.status,
      errorMessage: emailAttempts.errorMessage,
      retryable: emailAttempts.retryable,
      createdAt: emailAttempts.createdAt,
    })
    .from(emailAttempts)
    .where(eq(emailAttempts.emailOutboxId, emailId))
    .orderBy(asc(emailAttempts.createdAt), asc(emailAttempts.id));

  const timeline: AdminEmailAttempt[] = attemptRows.map((attempt) => ({
    id: attempt.id,
    provider: attempt.provider,
    status: attempt.status,
    errorMessage: attempt.errorMessage,
    retryable: attempt.retryable,
    createdAt: attempt.createdAt,
  }));

  return {
    id: row.id,
    businessId: row.businessId,
    businessName: row.businessName,
    type: row.type,
    recipients: row.recipients,
    subject: row.subject,
    html,
    textBody,
    bodyRedacted,
    status: row.status as EmailOutboxStatus,
    provider: row.provider,
    providerMessageId: row.providerMessageId,
    attempts: row.attempts,
    lastError: row.lastError,
    idempotencyKey: row.idempotencyKey,
    sentAt: row.sentAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    timeline,
  };
}

/** Detail payload for `/admin/emails/[emailId]`. */
export const getAdminEmailDetail = cache(
  async (emailId: string): Promise<AdminEmailDetail | null> => {
    await requireAdminUser();

    return getAdminEmailDetailInner(emailId);
  },
);

/* ── Usage ───────────────────────────────────────────────────────────────── */

const ADMIN_USAGE_MAX_DAYS = 90;

function resolveUsageDays(days: number | undefined): number {
  if (!days || !Number.isFinite(days)) {
    return 30;
  }

  return Math.min(Math.max(1, Math.trunc(days)), ADMIN_USAGE_MAX_DAYS);
}

type UsageDayBuckets = Record<AdminUsageResource, Map<string, number>>;

function emptyUsageBuckets(): UsageDayBuckets {
  return {
    signups: new Map(),
    businesses: new Map(),
    inquiries: new Map(),
    quotes: new Map(),
    emails: new Map(),
    aiCalls: new Map(),
  };
}

function toDayKey(value: string): string {
  return value.slice(0, 10);
}

async function getCachedAdminUsageReport(
  days: number,
): Promise<AdminUsageReport> {
  "use cache";

  cacheLife(adminAiCacheLife);
  cacheTag(adminUsageTag());

  const resolvedDays = resolveUsageDays(days);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const since = new Date(today);
  since.setUTCDate(since.getUTCDate() - (resolvedDays - 1));

  const dayKey = (column: SQLWrapper) =>
    sql<string>`date_trunc('day', ${column})::date::text`;

  const [
    signupRows,
    businessRows,
    inquiryRows,
    quoteRows,
    emailRows,
    aiRows,
  ] = await Promise.all([
    db
      .select({ day: dayKey(user.createdAt), count: sql<number>`count(*)::int` })
      .from(user)
      .where(gte(user.createdAt, since))
      .groupBy(sql`1`),
    db
      .select({ day: dayKey(businesses.createdAt), count: sql<number>`count(*)::int` })
      .from(businesses)
      .where(gte(businesses.createdAt, since))
      .groupBy(sql`1`),
    db
      .select({ day: dayKey(inquiries.submittedAt), count: sql<number>`count(*)::int` })
      .from(inquiries)
      .where(gte(inquiries.submittedAt, since))
      .groupBy(sql`1`),
    db
      .select({ day: dayKey(quotes.sentAt), count: sql<number>`count(*)::int` })
      .from(quotes)
      .where(
        and(gte(quotes.sentAt, since), isNotNull(quotes.sentAt)),
      )
      .groupBy(sql`1`),
    db
      .select({ day: dayKey(emailOutbox.sentAt), count: sql<number>`count(*)::int` })
      .from(emailOutbox)
      .where(
        and(gte(emailOutbox.sentAt, since), isNotNull(emailOutbox.sentAt)),
      )
      .groupBy(sql`1`),
    db
      .select({ day: dayKey(aiTokenLogs.createdAt), count: sql<number>`count(*)::int` })
      .from(aiTokenLogs)
      .where(gte(aiTokenLogs.createdAt, since))
      .groupBy(sql`1`),
  ]);

  const buckets = emptyUsageBuckets();
  const sources: Array<[AdminUsageResource, typeof signupRows]> = [
    ["signups", signupRows],
    ["businesses", businessRows],
    ["inquiries", inquiryRows],
    ["quotes", quoteRows],
    ["emails", emailRows],
    ["aiCalls", aiRows],
  ];

  for (const [resource, rows] of sources) {
    for (const row of rows) {
      buckets[resource].set(toDayKey(row.day), Number(row.count ?? 0));
    }
  }

  const series: AdminUsageDay[] = [];
  const totals: Record<AdminUsageResource, number> = {
    signups: 0,
    businesses: 0,
    inquiries: 0,
    quotes: 0,
    emails: 0,
    aiCalls: 0,
  };

  for (let index = resolvedDays - 1; index >= 0; index--) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - index);
    const key = date.toISOString().slice(0, 10);

    const day: AdminUsageDay = {
      date: key,
      signups: buckets.signups.get(key) ?? 0,
      businesses: buckets.businesses.get(key) ?? 0,
      inquiries: buckets.inquiries.get(key) ?? 0,
      quotesSent: buckets.quotes.get(key) ?? 0,
      emailsSent: buckets.emails.get(key) ?? 0,
      aiCalls: buckets.aiCalls.get(key) ?? 0,
    };

    totals.signups += day.signups;
    totals.businesses += day.businesses;
    totals.inquiries += day.inquiries;
    totals.quotes += day.quotesSent;
    totals.emails += day.emailsSent;
    totals.aiCalls += day.aiCalls;

    series.push(day);
  }

  return {
    days: resolvedDays,
    from: series[0]?.date ?? "",
    to: series[series.length - 1]?.date ?? "",
    series,
    totals,
  };
}

/**
 * Platform activity per day for `/admin/usage`.
 *
 * Six bounded `date_trunc('day', …)` aggregates merged and zero-filled in
 * JS. No storage-usage series exists, so none is shown. `"use cache"` is
 * argument-scoped, so each day-range caches separately for 60 seconds.
 */
export const getAdminUsageReport = cache(
  async (days = 30): Promise<AdminUsageReport> => {
    await requireAdminUser();

    return getCachedAdminUsageReport(days);
  },
);

const ADMIN_USAGE_TOP_BUSINESSES_LIMIT = 10;

async function getCachedAdminUsageTopBusinesses(
  days: number,
  resource: AdminUsageBusinessResource,
): Promise<AdminUsageBusinessRow[]> {
  "use cache";

  cacheLife(adminAiCacheLife);
  cacheTag(adminUsageTag());

  const resolvedDays = resolveUsageDays(days);
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (resolvedDays - 1));

  function toRows(
    rows: Array<{ businessId: string; businessName: string; count: number | string }>,
  ): AdminUsageBusinessRow[] {
    return rows.map((row) => ({
      businessId: row.businessId,
      businessName: row.businessName,
      count: Number(row.count ?? 0),
    }));
  }

  switch (resource) {
    case "inquiries": {
      const rows = await db
        .select({
          businessId: inquiries.businessId,
          businessName: businesses.name,
          count: sql<number>`count(*)::int`,
        })
        .from(inquiries)
        .innerJoin(businesses, eq(businesses.id, inquiries.businessId))
        .where(gte(inquiries.submittedAt, since))
        .groupBy(inquiries.businessId, businesses.name)
        .orderBy(desc(sql`count(*)`))
        .limit(ADMIN_USAGE_TOP_BUSINESSES_LIMIT);

      return toRows(rows);
    }
    case "quotes": {
      const rows = await db
        .select({
          businessId: quotes.businessId,
          businessName: businesses.name,
          count: sql<number>`count(*)::int`,
        })
        .from(quotes)
        .innerJoin(businesses, eq(businesses.id, quotes.businessId))
        .where(and(gte(quotes.sentAt, since), isNotNull(quotes.sentAt)))
        .groupBy(quotes.businessId, businesses.name)
        .orderBy(desc(sql`count(*)`))
        .limit(ADMIN_USAGE_TOP_BUSINESSES_LIMIT);

      return toRows(rows);
    }
    case "emails": {
      const rows = await db
        .select({
          businessId: emailOutbox.businessId,
          businessName: businesses.name,
          count: sql<number>`count(*)::int`,
        })
        .from(emailOutbox)
        .innerJoin(businesses, eq(businesses.id, emailOutbox.businessId))
        .where(
          and(
            gte(emailOutbox.sentAt, since),
            isNotNull(emailOutbox.sentAt),
            isNotNull(emailOutbox.businessId),
          ),
        )
        .groupBy(emailOutbox.businessId, businesses.name)
        .orderBy(desc(sql`count(*)`))
        .limit(ADMIN_USAGE_TOP_BUSINESSES_LIMIT);

      // The inner join already excludes null business ids; the cast only
      // satisfies the row type.
      return toRows(
        rows as Array<{ businessId: string; businessName: string; count: number }>,
      );
    }
    case "aiCalls": {
      const rows = await db
        .select({
          businessId: aiTokenLogs.businessId,
          businessName: businesses.name,
          count: sql<number>`count(*)::int`,
        })
        .from(aiTokenLogs)
        .innerJoin(businesses, eq(businesses.id, aiTokenLogs.businessId))
        .where(gte(aiTokenLogs.createdAt, since))
        .groupBy(aiTokenLogs.businessId, businesses.name)
        .orderBy(desc(sql`count(*)`))
        .limit(ADMIN_USAGE_TOP_BUSINESSES_LIMIT);

      return toRows(rows);
    }
  }
}

/**
 * Highest-consuming businesses for one resource over the trailing window.
 *
 * Cross-business view backing the usage page's top-consumers table.
 * `businessId` is non-nullable on every source except `email_outbox`,
 * which filters nulls out explicitly.
 */
export const getAdminUsageTopBusinesses = cache(
  async (
    days = 30,
    resource: AdminUsageBusinessResource = "inquiries",
  ): Promise<AdminUsageBusinessRow[]> => {
    await requireAdminUser();

    return getCachedAdminUsageTopBusinesses(days, resource);
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

/* ── System health ───────────────────────────────────────────────────────── */

const adminSystemCacheLife = {
  stale: 60,
  revalidate: 60,
  expire: 300,
} as const;

async function getCachedAdminHealthReport(): Promise<AdminHealthReport> {
  "use cache";

  cacheLife(adminSystemCacheLife);
  cacheTag(adminSystemTag());

  return runAdminHealthChecks();
}

export const getAdminHealthReport = cache(async (): Promise<AdminHealthReport> => {
  await requireAdminUser();
  return getCachedAdminHealthReport();
});

export const getAdminHealthSummary = cache(
  async (): Promise<AdminHealthSummary> => {
    await requireAdminUser();
    const report = await getCachedAdminHealthReport();
    return buildAdminHealthSummary(report);
  },
);

export const getAdminSystemConfigMatrix = cache(
  async (): Promise<AdminConfigMatrixRow[]> => {
    await requireAdminUser();
    return getAdminConfigMatrix();
  },
);

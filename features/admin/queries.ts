import "server-only";

import packageJson from "@/package.json";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";

import {
  adminDetailAuditLimit,
  adminPageSize,
  adminRecentListLimit,
} from "@/features/admin/constants";
import type {
  AdminAuditLogFilters,
  AdminBusinessStatus,
  AdminListFilters,
  AdminPageInfo,
  AdminUsageLimitRow,
  AdminWorkspaceStatus,
} from "@/features/admin/types";
import { db } from "@/lib/db/client";
import {
  adminAuditLogs,
  auditLogs,
  billingEvents,
  businessMembers,
  businesses,
  followUps,
  inquiries,
  paymentAttempts,
  profiles,
  quotes,
  session,
  user,
  workspaceMembers,
  workspaceSubscriptions,
  workspaces,
} from "@/lib/db/schema";
import {
  env,
  isBrevoConfigured,
  isEmailConfigured,
  isGeminiConfigured,
  isGroqConfigured,
  isMailtrapConfigured,
  isOpenRouterConfigured,
  isPaddleConfigured,
  isPayMongoConfigured,
  isPushConfigured,
  isResendConfigured,
  isSupabaseRealtimeConfigured,
} from "@/lib/env";
import type { WorkspacePlan } from "@/lib/plans/plans";
import { workspacePlans } from "@/lib/plans/plans";
import {
  getUsageLimit,
  usageLimitKeys,
  usageLimitLabels,
} from "@/lib/plans/usage-limits";

const countValue = (rows: Array<{ value: number | string | bigint }>) =>
  Number(rows[0]?.value ?? 0);

function getPageInfo({
  page,
  pageSize = adminPageSize,
  totalCount,
}: {
  page: number;
  pageSize?: number;
  totalCount: number;
}): AdminPageInfo {
  return {
    page,
    pageCount: Math.max(1, Math.ceil(totalCount / pageSize)),
    pageSize,
    totalCount,
  };
}

function getOffset(filters: AdminListFilters | AdminAuditLogFilters) {
  return (filters.page - 1) * adminPageSize;
}

function getSearchPattern(value: string) {
  return `%${value.trim()}%`;
}

function daysAgo(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

function daysFromNow(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function getDayStart(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDayEnd(value: string) {
  const start = getDayStart(value);

  if (!start) {
    return null;
  }

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return end;
}

function getWorkspaceStatus(row: {
  deletedAt: Date | null;
  scheduledDeletionAt: Date | null;
}): AdminWorkspaceStatus {
  if (row.deletedAt) {
    return "deleted";
  }

  if (row.scheduledDeletionAt) {
    return "scheduled_deletion";
  }

  return "active";
}

function getBusinessStatus(row: {
  archivedAt: Date | null;
  deletedAt: Date | null;
}): AdminBusinessStatus {
  if (row.deletedAt) {
    return "trash";
  }

  if (row.archivedAt) {
    return "archived";
  }

  return "active";
}

async function countByWorkspaceIds(workspaceIds: string[]) {
  if (!workspaceIds.length) {
    return {
      businesses: new Map<string, number>(),
      members: new Map<string, number>(),
    };
  }

  const [businessRows, memberRows] = await Promise.all([
    db
      .select({
        workspaceId: businesses.workspaceId,
        value: count(),
      })
      .from(businesses)
      .where(inArray(businesses.workspaceId, workspaceIds))
      .groupBy(businesses.workspaceId),
    db
      .select({
        workspaceId: workspaceMembers.workspaceId,
        value: count(),
      })
      .from(workspaceMembers)
      .where(inArray(workspaceMembers.workspaceId, workspaceIds))
      .groupBy(workspaceMembers.workspaceId),
  ]);

  return {
    businesses: new Map(
      businessRows.map((row) => [row.workspaceId, Number(row.value)]),
    ),
    members: new Map(
      memberRows.map((row) => [row.workspaceId, Number(row.value)]),
    ),
  };
}

async function countByBusinessIds(businessIds: string[]) {
  if (!businessIds.length) {
    return {
      followUps: new Map<string, number>(),
      inquiries: new Map<string, number>(),
      quotes: new Map<string, number>(),
    };
  }

  const [inquiryRows, quoteRows, followUpRows] = await Promise.all([
    db
      .select({
        businessId: inquiries.businessId,
        value: count(),
      })
      .from(inquiries)
      .where(inArray(inquiries.businessId, businessIds))
      .groupBy(inquiries.businessId),
    db
      .select({
        businessId: quotes.businessId,
        value: count(),
      })
      .from(quotes)
      .where(inArray(quotes.businessId, businessIds))
      .groupBy(quotes.businessId),
    db
      .select({
        businessId: followUps.businessId,
        value: count(),
      })
      .from(followUps)
      .where(inArray(followUps.businessId, businessIds))
      .groupBy(followUps.businessId),
  ]);

  return {
    followUps: new Map(
      followUpRows.map((row) => [row.businessId, Number(row.value)]),
    ),
    inquiries: new Map(
      inquiryRows.map((row) => [row.businessId, Number(row.value)]),
    ),
    quotes: new Map(quoteRows.map((row) => [row.businessId, Number(row.value)])),
  };
}

export async function getAdminOverview() {
  const now = new Date();
  const recentSince = daysAgo(7);
  const followUpWindowEnd = daysFromNow(7);

  const [
    totalUsers,
    recentUserAccounts,
    unverifiedUsers,
    totalWorkspaces,
    totalBusinesses,
    activeSubscriptions,
    canceledSubscriptions,
    pastDueSubscriptions,
    pendingSubscriptions,
    failedPayments,
    unprocessedBillingEvents,
    pendingDeletionRequests,
    dueDeletionRequestsCount,
    openInquiries,
    recentInquiries,
    totalQuotes,
    recentQuotes,
    recentAcceptedQuotes,
    acceptedQuotes,
    sentQuotesAwaitingResponse,
    viewedQuotesAwaitingResponse,
    overdueFollowUps,
    upcomingFollowUps,
    planRows,
    recentUsers,
    recentWorkspaces,
    dueDeletionRequests,
    recentFailedPayments,
    recentUnprocessedBillingEvents,
    atRiskSubscriptions,
  ] = await Promise.all([
    db.select({ value: count() }).from(user),
    db
      .select({ value: count() })
      .from(user)
      .where(gte(user.createdAt, recentSince)),
    db
      .select({ value: count() })
      .from(user)
      .where(eq(user.emailVerified, false)),
    db
      .select({ value: count() })
      .from(workspaces)
      .where(isNull(workspaces.deletedAt)),
    db
      .select({ value: count() })
      .from(businesses)
      .where(isNull(businesses.deletedAt)),
    db
      .select({ value: count() })
      .from(workspaceSubscriptions)
      .where(inArray(workspaceSubscriptions.status, ["active", "past_due"])),
    db
      .select({ value: count() })
      .from(workspaceSubscriptions)
      .where(eq(workspaceSubscriptions.status, "canceled")),
    db
      .select({ value: count() })
      .from(workspaceSubscriptions)
      .where(eq(workspaceSubscriptions.status, "past_due")),
    db
      .select({ value: count() })
      .from(workspaceSubscriptions)
      .where(inArray(workspaceSubscriptions.status, ["pending", "incomplete"])),
    db
      .select({ value: count() })
      .from(paymentAttempts)
      .where(eq(paymentAttempts.status, "failed")),
    db
      .select({ value: count() })
      .from(billingEvents)
      .where(isNull(billingEvents.processedAt)),
    db
      .select({ value: count() })
      .from(workspaces)
      .where(
        and(
          isNotNull(workspaces.scheduledDeletionAt),
          isNull(workspaces.deletedAt),
        ),
      ),
    db
      .select({ value: count() })
      .from(workspaces)
      .where(
        and(
          isNotNull(workspaces.scheduledDeletionAt),
          lte(workspaces.scheduledDeletionAt, now),
          isNull(workspaces.deletedAt),
        ),
      ),
    db
      .select({ value: count() })
      .from(inquiries)
      .where(
        and(
          inArray(inquiries.status, ["new", "waiting"]),
          isNull(inquiries.archivedAt),
          isNull(inquiries.deletedAt),
        ),
      ),
    db
      .select({ value: count() })
      .from(inquiries)
      .where(gte(inquiries.createdAt, recentSince)),
    db
      .select({ value: count() })
      .from(quotes)
      .where(and(isNull(quotes.archivedAt), isNull(quotes.deletedAt))),
    db
      .select({ value: count() })
      .from(quotes)
      .where(gte(quotes.createdAt, recentSince)),
    db
      .select({ value: count() })
      .from(quotes)
      .where(
        and(
          eq(quotes.status, "accepted"),
          gte(quotes.acceptedAt, recentSince),
          isNull(quotes.archivedAt),
          isNull(quotes.deletedAt),
        ),
      ),
    db
      .select({ value: count() })
      .from(quotes)
      .where(
        and(
          eq(quotes.status, "accepted"),
          isNull(quotes.archivedAt),
          isNull(quotes.deletedAt),
        ),
      ),
    db
      .select({ value: count() })
      .from(quotes)
      .where(
        and(
          eq(quotes.status, "sent"),
          isNull(quotes.customerRespondedAt),
          isNull(quotes.archivedAt),
          isNull(quotes.deletedAt),
        ),
      ),
    db
      .select({ value: count() })
      .from(quotes)
      .where(
        and(
          eq(quotes.status, "sent"),
          isNotNull(quotes.publicViewedAt),
          isNull(quotes.customerRespondedAt),
          isNull(quotes.archivedAt),
          isNull(quotes.deletedAt),
        ),
      ),
    db
      .select({ value: count() })
      .from(followUps)
      .where(and(eq(followUps.status, "pending"), lte(followUps.dueAt, now))),
    db
      .select({ value: count() })
      .from(followUps)
      .where(
        and(
          eq(followUps.status, "pending"),
          gte(followUps.dueAt, now),
          lte(followUps.dueAt, followUpWindowEnd),
        ),
      ),
    db
      .select({
        plan: workspaces.plan,
        value: count(),
      })
      .from(workspaces)
      .where(isNull(workspaces.deletedAt))
      .groupBy(workspaces.plan),
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(desc(user.createdAt))
      .limit(adminRecentListLimit),
    db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        ownerEmail: user.email,
        createdAt: workspaces.createdAt,
      })
      .from(workspaces)
      .innerJoin(user, eq(workspaces.ownerUserId, user.id))
      .orderBy(desc(workspaces.createdAt))
      .limit(adminRecentListLimit),
    db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        ownerEmail: user.email,
        scheduledDeletionAt: workspaces.scheduledDeletionAt,
      })
      .from(workspaces)
      .innerJoin(user, eq(workspaces.ownerUserId, user.id))
      .where(
        and(
          isNotNull(workspaces.scheduledDeletionAt),
          isNull(workspaces.deletedAt),
        ),
      )
      .orderBy(asc(workspaces.scheduledDeletionAt))
      .limit(adminRecentListLimit),
    db
      .select({
        id: paymentAttempts.id,
        workspaceId: paymentAttempts.workspaceId,
        workspaceName: workspaces.name,
        provider: paymentAttempts.provider,
        status: paymentAttempts.status,
        createdAt: paymentAttempts.createdAt,
      })
      .from(paymentAttempts)
      .innerJoin(workspaces, eq(paymentAttempts.workspaceId, workspaces.id))
      .where(eq(paymentAttempts.status, "failed"))
      .orderBy(desc(paymentAttempts.createdAt))
      .limit(adminRecentListLimit),
    db
      .select({
        id: billingEvents.id,
        provider: billingEvents.provider,
        eventType: billingEvents.eventType,
        workspaceId: billingEvents.workspaceId,
        workspaceName: workspaces.name,
        createdAt: billingEvents.createdAt,
      })
      .from(billingEvents)
      .leftJoin(workspaces, eq(billingEvents.workspaceId, workspaces.id))
      .where(isNull(billingEvents.processedAt))
      .orderBy(desc(billingEvents.createdAt))
      .limit(adminRecentListLimit),
    db
      .select({
        workspaceId: workspaces.id,
        workspaceName: workspaces.name,
        ownerEmail: user.email,
        status: workspaceSubscriptions.status,
        billingProvider: workspaceSubscriptions.billingProvider,
        currentPeriodEnd: workspaceSubscriptions.currentPeriodEnd,
      })
      .from(workspaceSubscriptions)
      .innerJoin(workspaces, eq(workspaceSubscriptions.workspaceId, workspaces.id))
      .innerJoin(user, eq(workspaces.ownerUserId, user.id))
      .where(inArray(workspaceSubscriptions.status, ["past_due", "pending", "incomplete"]))
      .orderBy(desc(workspaceSubscriptions.updatedAt))
      .limit(adminRecentListLimit),
  ]);

  const planCounts = Object.fromEntries(
    workspacePlans.map((plan) => [plan, 0]),
  ) as Record<WorkspacePlan, number>;

  for (const row of planRows) {
    if (workspacePlans.includes(row.plan as WorkspacePlan)) {
      planCounts[row.plan as WorkspacePlan] = Number(row.value);
    }
  }

  return {
    counts: {
      acceptedQuotes: countValue(acceptedQuotes),
      activeSubscriptions: countValue(activeSubscriptions),
      canceledSubscriptions: countValue(canceledSubscriptions),
      dueDeletionRequests: countValue(dueDeletionRequestsCount),
      failedPayments: countValue(failedPayments),
      openInquiries: countValue(openInquiries),
      overdueFollowUps: countValue(overdueFollowUps),
      pastDueSubscriptions: countValue(pastDueSubscriptions),
      pendingDeletionRequests: countValue(pendingDeletionRequests),
      pendingSubscriptions: countValue(pendingSubscriptions),
      recentAcceptedQuotes: countValue(recentAcceptedQuotes),
      recentInquiries: countValue(recentInquiries),
      recentQuotes: countValue(recentQuotes),
      recentUserAccounts: countValue(recentUserAccounts),
      sentQuotesAwaitingResponse: countValue(sentQuotesAwaitingResponse),
      totalBusinesses: countValue(totalBusinesses),
      totalQuotes: countValue(totalQuotes),
      totalUsers: countValue(totalUsers),
      totalWorkspaces: countValue(totalWorkspaces),
      unverifiedUsers: countValue(unverifiedUsers),
      unprocessedBillingEvents: countValue(unprocessedBillingEvents),
      upcomingFollowUps: countValue(upcomingFollowUps),
      viewedQuotesAwaitingResponse: countValue(viewedQuotesAwaitingResponse),
    },
    atRiskSubscriptions,
    dueDeletionRequests,
    planCounts,
    recentFailedPayments,
    recentUnprocessedBillingEvents,
    recentUsers,
    recentWorkspaces,
  };
}

export async function getAdminUsersPage(filters: AdminListFilters) {
  const pattern = filters.q ? getSearchPattern(filters.q) : "";
  const where = filters.q
    ? or(
        ilike(user.email, pattern),
        ilike(user.name, pattern),
        ilike(user.id, pattern),
      )
    : undefined;
  const [items, totalRows] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(where)
      .orderBy(desc(user.createdAt))
      .limit(adminPageSize)
      .offset(getOffset(filters)),
    db.select({ value: count() }).from(user).where(where),
  ]);
  const userIds = items.map((item) => item.id);
  const [workspaceRows, ownedPlanRows, sessionRows] = userIds.length
    ? await Promise.all([
        db
          .select({
            userId: workspaceMembers.userId,
            value: count(),
          })
          .from(workspaceMembers)
          .where(inArray(workspaceMembers.userId, userIds))
          .groupBy(workspaceMembers.userId),
        db
          .select({
            userId: workspaces.ownerUserId,
            plan: workspaces.plan,
            value: count(),
          })
          .from(workspaces)
          .where(inArray(workspaces.ownerUserId, userIds))
          .groupBy(workspaces.ownerUserId, workspaces.plan),
        db
          .select({
            userId: session.userId,
            lastActiveAt: sql<Date | null>`max(${session.updatedAt})`,
          })
          .from(session)
          .where(inArray(session.userId, userIds))
          .groupBy(session.userId),
      ])
    : [[], [], []];
  const workspaceCounts = new Map(
    workspaceRows.map((row) => [row.userId, Number(row.value)]),
  );
  const lastActiveByUserId = new Map(
    sessionRows.map((row) => [row.userId, row.lastActiveAt]),
  );
  const planSummaryByUserId = new Map<string, Record<WorkspacePlan, number>>();

  for (const row of ownedPlanRows) {
    const summary =
      planSummaryByUserId.get(row.userId) ??
      ({
        free: 0,
        pro: 0,
        business: 0,
      } satisfies Record<WorkspacePlan, number>);
    summary[row.plan as WorkspacePlan] = Number(row.value);
    planSummaryByUserId.set(row.userId, summary);
  }

  return {
    items: items.map((item) => ({
      ...item,
      lastActiveAt: lastActiveByUserId.get(item.id) ?? null,
      planSummary: planSummaryByUserId.get(item.id) ?? {
        free: 0,
        pro: 0,
        business: 0,
      },
      workspaceCount: workspaceCounts.get(item.id) ?? 0,
    })),
    pageInfo: getPageInfo({
      page: filters.page,
      totalCount: countValue(totalRows),
    }),
  };
}

export async function getAdminUserDetail(userId: string) {
  const [accountRow] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      fullName: profiles.fullName,
      jobTitle: profiles.jobTitle,
      phone: profiles.phone,
      onboardingCompletedAt: profiles.onboardingCompletedAt,
    })
    .from(user)
    .leftJoin(profiles, eq(profiles.userId, user.id))
    .where(eq(user.id, userId))
    .limit(1);

  if (!accountRow) {
    return null;
  }

  const [workspaceRows, ownedWorkspaceRows, businessRows, sessionRows] =
    await Promise.all([
      db
        .select({
          workspaceId: workspaces.id,
          workspaceName: workspaces.name,
          workspaceSlug: workspaces.slug,
          role: workspaceMembers.role,
          plan: workspaces.plan,
          subscriptionStatus: workspaceSubscriptions.status,
          scheduledDeletionAt: workspaces.scheduledDeletionAt,
          deletedAt: workspaces.deletedAt,
          createdAt: workspaceMembers.createdAt,
        })
        .from(workspaceMembers)
        .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
        .leftJoin(
          workspaceSubscriptions,
          eq(workspaceSubscriptions.workspaceId, workspaces.id),
        )
        .where(eq(workspaceMembers.userId, userId))
        .orderBy(asc(workspaces.name)),
      db
        .select({
          id: workspaces.id,
          name: workspaces.name,
          slug: workspaces.slug,
          plan: workspaces.plan,
          scheduledDeletionAt: workspaces.scheduledDeletionAt,
          deletedAt: workspaces.deletedAt,
          createdAt: workspaces.createdAt,
        })
        .from(workspaces)
        .where(eq(workspaces.ownerUserId, userId))
        .orderBy(desc(workspaces.createdAt)),
      db
        .select({
          businessId: businesses.id,
          businessName: businesses.name,
          businessSlug: businesses.slug,
          workspaceId: workspaces.id,
          workspaceName: workspaces.name,
          workspaceSlug: workspaces.slug,
          role: businessMembers.role,
          archivedAt: businesses.archivedAt,
          deletedAt: businesses.deletedAt,
        })
        .from(businessMembers)
        .innerJoin(businesses, eq(businessMembers.businessId, businesses.id))
        .innerJoin(workspaces, eq(businesses.workspaceId, workspaces.id))
        .where(eq(businessMembers.userId, userId))
        .orderBy(asc(businesses.name)),
      db
        .select({
          id: session.id,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          expiresAt: session.expiresAt,
        })
        .from(session)
        .where(eq(session.userId, userId))
        .orderBy(desc(session.updatedAt))
        .limit(10),
    ]);

  const businessIds = businessRows.map((row) => row.businessId);
  const usageCounts = await countByBusinessIds(businessIds);
  const [recentWorkspaceAuditLogs, recentAdminAuditLogs] = await Promise.all([
    db
      .select({
        id: auditLogs.id,
        workspaceId: auditLogs.workspaceId,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        metadata: auditLogs.metadata,
        source: auditLogs.source,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(eq(auditLogs.actorUserId, userId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(adminDetailAuditLimit),
    db
      .select()
      .from(adminAuditLogs)
      .where(and(eq(adminAuditLogs.targetType, "user"), eq(adminAuditLogs.targetId, userId)))
      .orderBy(desc(adminAuditLogs.createdAt))
      .limit(adminDetailAuditLimit),
  ]);

  return {
    account: accountRow,
    workspaces: workspaceRows.map((row) => ({
      ...row,
      status: getWorkspaceStatus(row),
    })),
    ownedWorkspaces: ownedWorkspaceRows.map((row) => ({
      ...row,
      status: getWorkspaceStatus(row),
    })),
    businesses: businessRows.map((row) => ({
      ...row,
      status: getBusinessStatus(row),
      followUpCount: usageCounts.followUps.get(row.businessId) ?? 0,
      inquiryCount: usageCounts.inquiries.get(row.businessId) ?? 0,
      quoteCount: usageCounts.quotes.get(row.businessId) ?? 0,
    })),
    sessions: sessionRows,
    recentAdminAuditLogs,
    recentWorkspaceAuditLogs,
  };
}

export async function getAdminWorkspacesPage(filters: AdminListFilters) {
  const pattern = filters.q ? getSearchPattern(filters.q) : "";
  const where = filters.q
    ? or(
        ilike(workspaces.name, pattern),
        ilike(workspaces.slug, pattern),
        ilike(workspaces.id, pattern),
        ilike(user.email, pattern),
      )
    : undefined;
  const [items, totalRows] = await Promise.all([
    db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        plan: workspaces.plan,
        ownerUserId: workspaces.ownerUserId,
        ownerName: user.name,
        ownerEmail: user.email,
        scheduledDeletionAt: workspaces.scheduledDeletionAt,
        deletedAt: workspaces.deletedAt,
        createdAt: workspaces.createdAt,
        subscriptionStatus: workspaceSubscriptions.status,
        subscriptionProvider: workspaceSubscriptions.billingProvider,
      })
      .from(workspaces)
      .innerJoin(user, eq(workspaces.ownerUserId, user.id))
      .leftJoin(
        workspaceSubscriptions,
        eq(workspaceSubscriptions.workspaceId, workspaces.id),
      )
      .where(where)
      .orderBy(desc(workspaces.createdAt))
      .limit(adminPageSize)
      .offset(getOffset(filters)),
    db
      .select({ value: count() })
      .from(workspaces)
      .innerJoin(user, eq(workspaces.ownerUserId, user.id))
      .where(where),
  ]);
  const counts = await countByWorkspaceIds(items.map((item) => item.id));

  return {
    items: items.map((item) => ({
      ...item,
      businessCount: counts.businesses.get(item.id) ?? 0,
      memberCount: counts.members.get(item.id) ?? 0,
      status: getWorkspaceStatus(item),
    })),
    pageInfo: getPageInfo({
      page: filters.page,
      totalCount: countValue(totalRows),
    }),
  };
}

export async function getAdminWorkspaceDetail(workspaceId: string) {
  const [workspace] = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      plan: workspaces.plan,
      ownerUserId: workspaces.ownerUserId,
      ownerName: user.name,
      ownerEmail: user.email,
      scheduledDeletionAt: workspaces.scheduledDeletionAt,
      scheduledDeletionBy: workspaces.scheduledDeletionBy,
      deletedAt: workspaces.deletedAt,
      deletedBy: workspaces.deletedBy,
      createdAt: workspaces.createdAt,
      updatedAt: workspaces.updatedAt,
      subscriptionId: workspaceSubscriptions.id,
      subscriptionStatus: workspaceSubscriptions.status,
      subscriptionPlan: workspaceSubscriptions.plan,
      billingProvider: workspaceSubscriptions.billingProvider,
      billingCurrency: workspaceSubscriptions.billingCurrency,
      providerCustomerId: workspaceSubscriptions.providerCustomerId,
      providerSubscriptionId: workspaceSubscriptions.providerSubscriptionId,
      currentPeriodEnd: workspaceSubscriptions.currentPeriodEnd,
      canceledAt: workspaceSubscriptions.canceledAt,
    })
    .from(workspaces)
    .innerJoin(user, eq(workspaces.ownerUserId, user.id))
    .leftJoin(
      workspaceSubscriptions,
      eq(workspaceSubscriptions.workspaceId, workspaces.id),
    )
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (!workspace) {
    return null;
  }

  const [members, workspaceBusinesses, usage, recentAuditLogs, payments] =
    await Promise.all([
      db
        .select({
          id: workspaceMembers.id,
          userId: user.id,
          name: user.name,
          email: user.email,
          role: workspaceMembers.role,
          createdAt: workspaceMembers.createdAt,
        })
        .from(workspaceMembers)
        .innerJoin(user, eq(workspaceMembers.userId, user.id))
        .where(eq(workspaceMembers.workspaceId, workspaceId))
        .orderBy(asc(user.email)),
      db
        .select({
          id: businesses.id,
          name: businesses.name,
          slug: businesses.slug,
          archivedAt: businesses.archivedAt,
          deletedAt: businesses.deletedAt,
          createdAt: businesses.createdAt,
        })
        .from(businesses)
        .where(eq(businesses.workspaceId, workspaceId))
        .orderBy(asc(businesses.name)),
      getWorkspaceUsageSummary(workspaceId),
      db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.workspaceId, workspaceId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(adminDetailAuditLimit),
      db
        .select()
        .from(paymentAttempts)
        .where(eq(paymentAttempts.workspaceId, workspaceId))
        .orderBy(desc(paymentAttempts.createdAt))
        .limit(adminDetailAuditLimit),
    ]);

  return {
    workspace: {
      ...workspace,
      status: getWorkspaceStatus(workspace),
    },
    members,
    businesses: workspaceBusinesses.map((business) => ({
      ...business,
      status: getBusinessStatus(business),
    })),
    payments,
    recentAuditLogs,
    usage,
  };
}

export async function getAdminBusinessesPage(filters: AdminListFilters) {
  const pattern = filters.q ? getSearchPattern(filters.q) : "";
  const where = filters.q
    ? or(
        ilike(businesses.name, pattern),
        ilike(businesses.slug, pattern),
        ilike(businesses.id, pattern),
        ilike(workspaces.name, pattern),
        ilike(workspaces.slug, pattern),
        ilike(user.email, pattern),
      )
    : undefined;
  const [items, totalRows] = await Promise.all([
    db
      .select({
        id: businesses.id,
        name: businesses.name,
        slug: businesses.slug,
        workspaceId: workspaces.id,
        workspaceName: workspaces.name,
        workspaceSlug: workspaces.slug,
        ownerUserId: workspaces.ownerUserId,
        ownerEmail: user.email,
        archivedAt: businesses.archivedAt,
        deletedAt: businesses.deletedAt,
        createdAt: businesses.createdAt,
      })
      .from(businesses)
      .innerJoin(workspaces, eq(businesses.workspaceId, workspaces.id))
      .innerJoin(user, eq(workspaces.ownerUserId, user.id))
      .where(where)
      .orderBy(desc(businesses.createdAt))
      .limit(adminPageSize)
      .offset(getOffset(filters)),
    db
      .select({ value: count() })
      .from(businesses)
      .innerJoin(workspaces, eq(businesses.workspaceId, workspaces.id))
      .innerJoin(user, eq(workspaces.ownerUserId, user.id))
      .where(where),
  ]);
  const counts = await countByBusinessIds(items.map((item) => item.id));

  return {
    items: items.map((item) => ({
      ...item,
      followUpCount: counts.followUps.get(item.id) ?? 0,
      inquiryCount: counts.inquiries.get(item.id) ?? 0,
      quoteCount: counts.quotes.get(item.id) ?? 0,
      status: getBusinessStatus(item),
    })),
    pageInfo: getPageInfo({
      page: filters.page,
      totalCount: countValue(totalRows),
    }),
  };
}

export async function getAdminBusinessDetail(businessId: string) {
  const [business] = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      slug: businesses.slug,
      businessType: businesses.businessType,
      countryCode: businesses.countryCode,
      defaultCurrency: businesses.defaultCurrency,
      publicInquiryEnabled: businesses.publicInquiryEnabled,
      workspaceId: workspaces.id,
      workspaceName: workspaces.name,
      workspaceSlug: workspaces.slug,
      workspacePlan: workspaces.plan,
      ownerUserId: workspaces.ownerUserId,
      ownerName: user.name,
      ownerEmail: user.email,
      archivedAt: businesses.archivedAt,
      deletedAt: businesses.deletedAt,
      createdAt: businesses.createdAt,
      updatedAt: businesses.updatedAt,
    })
    .from(businesses)
    .innerJoin(workspaces, eq(businesses.workspaceId, workspaces.id))
    .innerJoin(user, eq(workspaces.ownerUserId, user.id))
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!business) {
    return null;
  }

  const [members, counts, quoteStatusRows, recentAuditLogs] = await Promise.all([
    db
      .select({
        id: businessMembers.id,
        userId: user.id,
        name: user.name,
        email: user.email,
        role: businessMembers.role,
        createdAt: businessMembers.createdAt,
      })
      .from(businessMembers)
      .innerJoin(user, eq(businessMembers.userId, user.id))
      .where(eq(businessMembers.businessId, businessId))
      .orderBy(asc(user.email)),
    countByBusinessIds([businessId]),
    db
      .select({
        status: quotes.status,
        value: count(),
      })
      .from(quotes)
      .where(eq(quotes.businessId, businessId))
      .groupBy(quotes.status),
    db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.businessId, businessId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(adminDetailAuditLimit),
  ]);

  return {
    business: {
      ...business,
      status: getBusinessStatus(business),
    },
    members,
    quoteStatusCounts: Object.fromEntries(
      quoteStatusRows.map((row) => [row.status, Number(row.value)]),
    ),
    recentAuditLogs,
    usage: {
      followUps: counts.followUps.get(businessId) ?? 0,
      inquiries: counts.inquiries.get(businessId) ?? 0,
      quotes: counts.quotes.get(businessId) ?? 0,
    },
  };
}

export async function getAdminSubscriptionsPage(filters: AdminListFilters) {
  const pattern = filters.q ? getSearchPattern(filters.q) : "";
  const where = filters.q
    ? or(
        ilike(workspaces.name, pattern),
        ilike(workspaces.slug, pattern),
        ilike(workspaces.id, pattern),
        ilike(user.email, pattern),
        ilike(workspaceSubscriptions.providerCustomerId, pattern),
        ilike(workspaceSubscriptions.providerSubscriptionId, pattern),
      )
    : undefined;
  const [items, totalRows] = await Promise.all([
    db
      .select({
        workspaceId: workspaces.id,
        workspaceName: workspaces.name,
        workspaceSlug: workspaces.slug,
        ownerEmail: user.email,
        currentPlan: workspaces.plan,
        subscriptionStatus: workspaceSubscriptions.status,
        subscriptionPlan: workspaceSubscriptions.plan,
        billingProvider: workspaceSubscriptions.billingProvider,
        billingCurrency: workspaceSubscriptions.billingCurrency,
        providerCustomerId: workspaceSubscriptions.providerCustomerId,
        providerSubscriptionId: workspaceSubscriptions.providerSubscriptionId,
        currentPeriodEnd: workspaceSubscriptions.currentPeriodEnd,
        canceledAt: workspaceSubscriptions.canceledAt,
        createdAt: workspaceSubscriptions.createdAt,
      })
      .from(workspaces)
      .innerJoin(user, eq(workspaces.ownerUserId, user.id))
      .leftJoin(
        workspaceSubscriptions,
        eq(workspaceSubscriptions.workspaceId, workspaces.id),
      )
      .where(where)
      .orderBy(desc(workspaceSubscriptions.createdAt), desc(workspaces.createdAt))
      .limit(adminPageSize)
      .offset(getOffset(filters)),
    db
      .select({ value: count() })
      .from(workspaces)
      .innerJoin(user, eq(workspaces.ownerUserId, user.id))
      .leftJoin(
        workspaceSubscriptions,
        eq(workspaceSubscriptions.workspaceId, workspaces.id),
      )
      .where(where),
  ]);
  const workspaceIds = items.map((item) => item.workspaceId);
  const counts = await countByWorkspaceIds(workspaceIds);

  return {
    items: items.map((item) => ({
      ...item,
      businessCount: counts.businesses.get(item.workspaceId) ?? 0,
      memberCount: counts.members.get(item.workspaceId) ?? 0,
    })),
    pageInfo: getPageInfo({
      page: filters.page,
      totalCount: countValue(totalRows),
    }),
  };
}

export async function getAdminSubscriptionDetail(workspaceId: string) {
  const detail = await getAdminWorkspaceDetail(workspaceId);

  if (!detail) {
    return null;
  }

  const plan = detail.workspace.plan as WorkspacePlan;
  const limits: AdminUsageLimitRow[] = usageLimitKeys.map((key) => ({
    key,
    label: usageLimitLabels[key],
    limit: getUsageLimit(plan, key),
    plan,
  }));

  return {
    ...detail,
    limits,
  };
}

export async function getAdminDeletionRequestsPage(filters: AdminListFilters) {
  const pattern = filters.q ? getSearchPattern(filters.q) : "";
  const where = and(
    isNotNull(workspaces.scheduledDeletionAt),
    isNull(workspaces.deletedAt),
    filters.q
      ? or(
          ilike(workspaces.name, pattern),
          ilike(workspaces.slug, pattern),
          ilike(workspaces.id, pattern),
          ilike(user.email, pattern),
        )
      : undefined,
  );
  const [items, totalRows] = await Promise.all([
    db
      .select({
        workspaceId: workspaces.id,
        workspaceName: workspaces.name,
        workspaceSlug: workspaces.slug,
        ownerUserId: workspaces.ownerUserId,
        ownerEmail: user.email,
        requestedByUserId: workspaces.scheduledDeletionBy,
        scheduledDeletionAt: workspaces.scheduledDeletionAt,
        createdAt: workspaces.updatedAt,
        subscriptionStatus: workspaceSubscriptions.status,
        currentPeriodEnd: workspaceSubscriptions.currentPeriodEnd,
      })
      .from(workspaces)
      .innerJoin(user, eq(workspaces.ownerUserId, user.id))
      .leftJoin(
        workspaceSubscriptions,
        eq(workspaceSubscriptions.workspaceId, workspaces.id),
      )
      .where(where)
      .orderBy(asc(workspaces.scheduledDeletionAt))
      .limit(adminPageSize)
      .offset(getOffset(filters)),
    db
      .select({ value: count() })
      .from(workspaces)
      .innerJoin(user, eq(workspaces.ownerUserId, user.id))
      .leftJoin(
        workspaceSubscriptions,
        eq(workspaceSubscriptions.workspaceId, workspaces.id),
      )
      .where(where),
  ]);

  return {
    items,
    pageInfo: getPageInfo({
      page: filters.page,
      totalCount: countValue(totalRows),
    }),
  };
}

export async function getAdminDeletionRequestDetail(workspaceId: string) {
  const detail = await getAdminWorkspaceDetail(workspaceId);

  if (!detail || !detail.workspace.scheduledDeletionAt || detail.workspace.deletedAt) {
    return null;
  }

  return {
    ...detail,
    deletionIsDue: detail.workspace.scheduledDeletionAt.getTime() <= Date.now(),
  };
}

export async function getAdminAuditLogsPage(filters: AdminAuditLogFilters) {
  const adminPattern = filters.admin ? getSearchPattern(filters.admin) : "";
  const targetIdPattern = filters.targetId
    ? getSearchPattern(filters.targetId)
    : "";
  const fromDate = filters.from ? getDayStart(filters.from) : null;
  const toDate = filters.to ? getDayEnd(filters.to) : null;
  const where = and(
    filters.action !== "all"
      ? eq(adminAuditLogs.action, filters.action)
      : undefined,
    filters.targetType !== "all"
      ? eq(adminAuditLogs.targetType, filters.targetType)
      : undefined,
    filters.admin
      ? or(
          ilike(adminAuditLogs.adminEmail, adminPattern),
          ilike(adminAuditLogs.adminUserId, adminPattern),
        )
      : undefined,
    filters.targetId
      ? ilike(adminAuditLogs.targetId, targetIdPattern)
      : undefined,
    fromDate ? gte(adminAuditLogs.createdAt, fromDate) : undefined,
    toDate ? lte(adminAuditLogs.createdAt, toDate) : undefined,
  );
  const [items, totalRows] = await Promise.all([
    db
      .select()
      .from(adminAuditLogs)
      .where(where)
      .orderBy(desc(adminAuditLogs.createdAt))
      .limit(adminPageSize)
      .offset(getOffset(filters)),
    db.select({ value: count() }).from(adminAuditLogs).where(where),
  ]);

  return {
    items,
    pageInfo: getPageInfo({
      page: filters.page,
      totalCount: countValue(totalRows),
    }),
  };
}

async function getWorkspaceUsageSummary(workspaceId: string) {
  const [businessIds] = await Promise.all([
    db
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.workspaceId, workspaceId)),
  ]);
  const ids = businessIds.map((row) => row.id);

  if (!ids.length) {
    return {
      businesses: 0,
      followUps: 0,
      inquiries: 0,
      quotes: 0,
      acceptedQuotes: 0,
    };
  }

  const [inquiryRows, quoteRows, acceptedQuoteRows, followUpRows] =
    await Promise.all([
      db
        .select({ value: count() })
        .from(inquiries)
        .where(inArray(inquiries.businessId, ids)),
      db
        .select({ value: count() })
        .from(quotes)
        .where(inArray(quotes.businessId, ids)),
      db
        .select({ value: count() })
        .from(quotes)
        .where(and(inArray(quotes.businessId, ids), eq(quotes.status, "accepted"))),
      db
        .select({ value: count() })
        .from(followUps)
        .where(inArray(followUps.businessId, ids)),
    ]);

  return {
    acceptedQuotes: countValue(acceptedQuoteRows),
    businesses: ids.length,
    followUps: countValue(followUpRows),
    inquiries: countValue(inquiryRows),
    quotes: countValue(quoteRows),
  };
}

export async function getAdminSystemStatus() {
  const dbStartedAt = Date.now();
  let databaseOk = false;
  let databaseLatencyMs: number | null = null;

  try {
    await db.execute(sql`select 1`);
    databaseOk = true;
    databaseLatencyMs = Date.now() - dbStartedAt;
  } catch {
    databaseOk = false;
  }

  const [recentFailedPayments, recentUnprocessedBillingEvents] =
    await Promise.all([
      db
        .select({
          id: paymentAttempts.id,
          workspaceId: paymentAttempts.workspaceId,
          provider: paymentAttempts.provider,
          status: paymentAttempts.status,
          createdAt: paymentAttempts.createdAt,
        })
        .from(paymentAttempts)
        .where(eq(paymentAttempts.status, "failed"))
        .orderBy(desc(paymentAttempts.createdAt))
        .limit(adminRecentListLimit),
      db
        .select({
          id: billingEvents.id,
          provider: billingEvents.provider,
          eventType: billingEvents.eventType,
          workspaceId: billingEvents.workspaceId,
          createdAt: billingEvents.createdAt,
        })
        .from(billingEvents)
        .where(isNull(billingEvents.processedAt))
        .orderBy(desc(billingEvents.createdAt))
        .limit(adminRecentListLimit),
    ]);

  return {
    app: {
      environment: env.NODE_ENV,
      version: packageJson.version,
      build:
        process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ??
        process.env.VERCEL_DEPLOYMENT_ID ??
        null,
    },
    database: {
      ok: databaseOk,
      latencyMs: databaseLatencyMs,
    },
    providers: {
      ai: {
        gemini: isGeminiConfigured,
        groq: isGroqConfigured,
        openRouter: isOpenRouterConfigured,
      },
      billing: {
        paddle: isPaddleConfigured,
        payMongo: isPayMongoConfigured,
      },
      push: isPushConfigured,
      email: isEmailConfigured,
      resend: isResendConfigured,
      mailtrap: isMailtrapConfigured,
      brevo: isBrevoConfigured,
      supabaseRealtime: isSupabaseRealtimeConfigured,
    },
    recentFailedPayments,
    recentUnprocessedBillingEvents,
  };
}

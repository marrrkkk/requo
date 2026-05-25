import "server-only";

import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/lib/db/client";
import {
  automationLogs,
  businessAutomations,
  businessMembers,
} from "@/lib/db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AutomationListItem = {
  id: string;
  name: string;
  description: string | null;
  triggerType: string;
  enabled: boolean;
  priority: number;
  actions: unknown;
  conditions: unknown;
  delay: unknown;
  createdAt: Date;
  updatedAt: Date;
  lastTriggeredAt: Date | null;
};

export type AutomationDetail = {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  triggerType: string;
  triggerConfig: unknown;
  conditions: unknown;
  actions: unknown;
  delay: unknown;
  enabled: boolean;
  priority: number;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AutomationHistoryEntry = {
  id: string;
  triggerType: string;
  triggerPayload: unknown;
  actionsExecuted: unknown;
  status: string;
  durationMs: number;
  error: string | null;
  createdAt: Date;
};

export type AutomationHistoryFilters = {
  status?: "success" | "partial_failure" | "failure";
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

export type AutomationStats = {
  totalCount: number;
  activeCount: number;
  totalExecutions: number;
  successCount: number;
  failureCount: number;
};

// ---------------------------------------------------------------------------
// Membership validation helper
// ---------------------------------------------------------------------------

async function assertBusinessMembership(
  businessId: string,
  userId: string,
): Promise<void> {
  const [membership] = await db
    .select({ id: businessMembers.id })
    .from(businessMembers)
    .where(
      and(
        eq(businessMembers.businessId, businessId),
        eq(businessMembers.userId, userId),
      ),
    )
    .limit(1);

  if (!membership) {
    throw new Error("User does not have access to this business.");
  }
}

// ---------------------------------------------------------------------------
// getBusinessAutomations
// ---------------------------------------------------------------------------

/**
 * List all automations for a business with count and last triggered timestamp.
 * Scoped by businessId with membership validation.
 */
export const getBusinessAutomations = cache(
  async (
    businessId: string,
    userId: string,
  ): Promise<AutomationListItem[]> => {
    await assertBusinessMembership(businessId, userId);

    const lastTriggeredSubquery = sql<Date | null>`(
      select max(${automationLogs.createdAt})
      from ${automationLogs}
      where ${automationLogs.automationId} = ${businessAutomations.id}
        and ${automationLogs.businessId} = ${businessAutomations.businessId}
    )`;

    return db
      .select({
        id: businessAutomations.id,
        name: businessAutomations.name,
        description: businessAutomations.description,
        triggerType: businessAutomations.triggerType,
        enabled: businessAutomations.enabled,
        priority: businessAutomations.priority,
        actions: businessAutomations.actions,
        conditions: businessAutomations.conditions,
        delay: businessAutomations.delay,
        createdAt: businessAutomations.createdAt,
        updatedAt: businessAutomations.updatedAt,
        lastTriggeredAt: lastTriggeredSubquery,
      })
      .from(businessAutomations)
      .where(eq(businessAutomations.businessId, businessId))
      .orderBy(
        desc(businessAutomations.enabled),
        desc(businessAutomations.priority),
        desc(businessAutomations.createdAt),
      );
  },
);

// ---------------------------------------------------------------------------
// getAutomationById
// ---------------------------------------------------------------------------

/**
 * Get a single automation by ID, scoped by businessId with membership validation.
 */
export const getAutomationById = cache(
  async (
    automationId: string,
    businessId: string,
    userId: string,
  ): Promise<AutomationDetail | null> => {
    await assertBusinessMembership(businessId, userId);

    const [automation] = await db
      .select({
        id: businessAutomations.id,
        businessId: businessAutomations.businessId,
        name: businessAutomations.name,
        description: businessAutomations.description,
        triggerType: businessAutomations.triggerType,
        triggerConfig: businessAutomations.triggerConfig,
        conditions: businessAutomations.conditions,
        actions: businessAutomations.actions,
        delay: businessAutomations.delay,
        enabled: businessAutomations.enabled,
        priority: businessAutomations.priority,
        createdByUserId: businessAutomations.createdByUserId,
        createdAt: businessAutomations.createdAt,
        updatedAt: businessAutomations.updatedAt,
      })
      .from(businessAutomations)
      .where(
        and(
          eq(businessAutomations.id, automationId),
          eq(businessAutomations.businessId, businessId),
        ),
      )
      .limit(1);

    return automation ?? null;
  },
);

// ---------------------------------------------------------------------------
// getAutomationHistory
// ---------------------------------------------------------------------------

/**
 * Get paginated execution logs for an automation, scoped by businessId.
 * Supports optional status filter and date range.
 */
export const getAutomationHistory = cache(
  async (
    automationId: string,
    businessId: string,
    userId: string,
    filters: AutomationHistoryFilters = {},
  ): Promise<{ entries: AutomationHistoryEntry[]; total: number }> => {
    await assertBusinessMembership(businessId, userId);

    const limit = Math.min(filters.limit ?? 50, 100);
    const offset = filters.offset ?? 0;

    const conditions = [
      eq(automationLogs.automationId, automationId),
      eq(automationLogs.businessId, businessId),
    ];

    if (filters.status) {
      conditions.push(eq(automationLogs.status, filters.status));
    }

    if (filters.from) {
      conditions.push(
        gte(automationLogs.createdAt, new Date(`${filters.from}T00:00:00.000Z`)),
      );
    }

    if (filters.to) {
      conditions.push(
        lte(automationLogs.createdAt, new Date(`${filters.to}T23:59:59.999Z`)),
      );
    }

    const whereClause = and(...conditions);

    const [entries, totalRows] = await Promise.all([
      db
        .select({
          id: automationLogs.id,
          triggerType: automationLogs.triggerType,
          triggerPayload: automationLogs.triggerPayload,
          actionsExecuted: automationLogs.actionsExecuted,
          status: automationLogs.status,
          durationMs: automationLogs.durationMs,
          error: automationLogs.error,
          createdAt: automationLogs.createdAt,
        })
        .from(automationLogs)
        .where(whereClause)
        .orderBy(desc(automationLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(automationLogs)
        .where(whereClause),
    ]);

    return {
      entries,
      total: Number(totalRows[0]?.count ?? 0),
    };
  },
);

// ---------------------------------------------------------------------------
// getAutomationStats
// ---------------------------------------------------------------------------

/**
 * Get aggregated automation stats for a business: active count and execution stats.
 */
export const getAutomationStats = cache(
  async (businessId: string, userId: string): Promise<AutomationStats> => {
    await assertBusinessMembership(businessId, userId);

    const [automationCounts, logCounts] = await Promise.all([
      db
        .select({
          totalCount: count(),
          activeCount:
            sql<number>`count(*) filter (where ${businessAutomations.enabled} = true)`,
        })
        .from(businessAutomations)
        .where(eq(businessAutomations.businessId, businessId)),
      db
        .select({
          totalExecutions: count(),
          successCount:
            sql<number>`count(*) filter (where ${automationLogs.status} = 'success')`,
          failureCount:
            sql<number>`count(*) filter (where ${automationLogs.status} = 'failure')`,
        })
        .from(automationLogs)
        .where(eq(automationLogs.businessId, businessId)),
    ]);

    return {
      totalCount: Number(automationCounts[0]?.totalCount ?? 0),
      activeCount: Number(automationCounts[0]?.activeCount ?? 0),
      totalExecutions: Number(logCounts[0]?.totalExecutions ?? 0),
      successCount: Number(logCounts[0]?.successCount ?? 0),
      failureCount: Number(logCounts[0]?.failureCount ?? 0),
    };
  },
);

// ---------------------------------------------------------------------------
// Automation log export
// ---------------------------------------------------------------------------

export type AutomationLogExportRow = {
  id: string;
  triggerType: string;
  triggerPayload: unknown;
  actionsExecuted: unknown;
  status: string;
  durationMs: number;
  error: string | null;
  createdAt: Date;
};

/**
 * Fetch automation logs for CSV export. Scoped by businessId.
 * Called from the export route which already validates session + plan access.
 */
export async function getAutomationLogExportRowsForBusiness({
  businessId,
  from,
  to,
}: {
  businessId: string;
  from?: string;
  to?: string;
}): Promise<AutomationLogExportRow[]> {
  const conditions = [eq(automationLogs.businessId, businessId)];

  if (from) {
    conditions.push(
      gte(automationLogs.createdAt, new Date(`${from}T00:00:00.000Z`)),
    );
  }

  if (to) {
    conditions.push(
      lte(automationLogs.createdAt, new Date(`${to}T23:59:59.999Z`)),
    );
  }

  return db
    .select({
      id: automationLogs.id,
      triggerType: automationLogs.triggerType,
      triggerPayload: automationLogs.triggerPayload,
      actionsExecuted: automationLogs.actionsExecuted,
      status: automationLogs.status,
      durationMs: automationLogs.durationMs,
      error: automationLogs.error,
      createdAt: automationLogs.createdAt,
    })
    .from(automationLogs)
    .where(and(...conditions))
    .orderBy(desc(automationLogs.createdAt));
}

import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  isNull,
  lte,
  sql,
} from "drizzle-orm";

import {
  auditActionOptions,
  auditEntityOptions,
  workspaceAuditPageSize,
} from "@/features/audit/constants";
import type {
  AuditAction,
  AuditEntityType,
  AuditLogFilters,
  WorkspaceAuditLogFilterOption,
  WorkspaceAuditLogFiltersView,
  WorkspaceAuditLogItem,
  WorkspaceAuditLogPage,
} from "@/features/audit/types";
import { db } from "@/lib/db/client";
import { auditLogs, businesses, user, workspaceMembers, workspaces } from "@/lib/db/schema";

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

export function parseAuditLogFilters(
  searchParams: Record<string, string | string[] | undefined>,
): AuditLogFilters {
  const actor = typeof searchParams.actor === "string" ? searchParams.actor : null;
  const business =
    typeof searchParams.business === "string" ? searchParams.business : null;
  const action =
    typeof searchParams.action === "string"
      ? (searchParams.action as AuditAction)
      : null;
  const entity =
    typeof searchParams.entity === "string"
      ? (searchParams.entity as AuditEntityType)
      : null;
  const from = typeof searchParams.from === "string" ? searchParams.from : null;
  const to = typeof searchParams.to === "string" ? searchParams.to : null;
  const pageValue = Number.parseInt(
    typeof searchParams.page === "string" ? searchParams.page : "1",
    10,
  );

  return {
    actor: actor?.trim() || null,
    business: business?.trim() || null,
    action,
    entity,
    from: from?.trim() || null,
    to: to?.trim() || null,
    page: Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1,
  };
}

export async function getWorkspaceAuditLogPageBySlug(
  userId: string,
  workspaceSlug: string,
  filters: AuditLogFilters,
): Promise<WorkspaceAuditLogPage | null> {
  const [workspace] = await db
    .select({
      id: workspaces.id,
      slug: workspaces.slug,
      memberRole: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaces.slug, workspaceSlug),
        isNull(workspaces.deletedAt),
      ),
    )
    .limit(1);

  if (!workspace) {
    return null;
  }

  if (workspace.memberRole !== "owner") {
    return null;
  }

  const fromDate = filters.from ? getDayStart(filters.from) : null;
  const toDate = filters.to ? getDayEnd(filters.to) : null;
  const offset = (filters.page - 1) * workspaceAuditPageSize;
  const where = and(
    eq(auditLogs.workspaceId, workspace.id),
    filters.actor ? eq(auditLogs.actorUserId, filters.actor) : undefined,
    filters.business ? eq(auditLogs.businessId, filters.business) : undefined,
    filters.action ? eq(auditLogs.action, filters.action) : undefined,
    filters.entity ? eq(auditLogs.entityType, filters.entity) : undefined,
    fromDate ? gte(auditLogs.createdAt, fromDate) : undefined,
    toDate ? lte(auditLogs.createdAt, toDate) : undefined,
  );

  const [items, totalRows] = await Promise.all([
    db
      .select({
        id: auditLogs.id,
        workspaceId: auditLogs.workspaceId,
        businessId: auditLogs.businessId,
        businessName: businesses.name,
        businessSlug: businesses.slug,
        actorUserId: auditLogs.actorUserId,
        actorName: sql<string | null>`coalesce(${user.name}, ${auditLogs.metadata}->>'actorName')`,
        actorEmail: sql<string | null>`coalesce(${user.email}, ${auditLogs.metadata}->>'actorEmail')`,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        action: auditLogs.action,
        metadata: auditLogs.metadata,
        source: auditLogs.source,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(user, eq(auditLogs.actorUserId, user.id))
      .leftJoin(businesses, eq(auditLogs.businessId, businesses.id))
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(workspaceAuditPageSize)
      .offset(offset),
    db
      .select({
        value: count(),
      })
      .from(auditLogs)
      .where(where),
  ]);

  return {
    items: items as WorkspaceAuditLogItem[],
    totalCount: Number(totalRows[0]?.value ?? 0),
    page: filters.page,
    pageCount: Math.max(
      1,
      Math.ceil(Number(totalRows[0]?.value ?? 0) / workspaceAuditPageSize),
    ),
    pageSize: workspaceAuditPageSize,
  };
}

export async function getWorkspaceAuditLogFiltersBySlug(
  userId: string,
  workspaceSlug: string,
): Promise<WorkspaceAuditLogFiltersView | null> {
  const [workspace] = await db
    .select({
      id: workspaces.id,
      memberRole: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaces.slug, workspaceSlug),
        isNull(workspaces.deletedAt),
      ),
    )
    .limit(1);

  if (!workspace) {
    return null;
  }

  if (workspace.memberRole !== "owner") {
    return null;
  }

  const [actorRows, businessRows] = await Promise.all([
    db
      .select({
        value: auditLogs.actorUserId,
        label: sql<string>`coalesce(${user.name}, ${auditLogs.metadata}->>'actorName', ${auditLogs.metadata}->>'actorEmail', 'Former user')`,
      })
      .from(auditLogs)
      .leftJoin(user, eq(auditLogs.actorUserId, user.id))
      .where(
        and(
          eq(auditLogs.workspaceId, workspace.id),
          sql`${auditLogs.actorUserId} is not null`,
        ),
      )
      .groupBy(
        auditLogs.actorUserId,
        user.name,
        sql`${auditLogs.metadata}->>'actorName'`,
        sql`${auditLogs.metadata}->>'actorEmail'`,
      )
      .orderBy(asc(sql<string>`coalesce(${user.name}, ${auditLogs.metadata}->>'actorName', ${auditLogs.metadata}->>'actorEmail', 'Former user')`)),
    db
      .select({
        value: businesses.id,
        label: businesses.name,
      })
      .from(businesses)
      .where(eq(businesses.workspaceId, workspace.id))
      .orderBy(asc(businesses.name)),
  ]);

  return {
    actors: actorRows
      .filter((row): row is WorkspaceAuditLogFilterOption => Boolean(row.value))
      .map((row) => ({
        value: row.value!,
        label: row.label,
      })),
    businesses: businessRows
      .filter((row): row is WorkspaceAuditLogFilterOption => Boolean(row.value))
      .map((row) => ({
        value: row.value!,
        label: row.label,
      })),
    actions: auditActionOptions,
    entities: auditEntityOptions,
  };
}

export async function getWorkspaceAuditLogExportRowsBySlug(
  userId: string,
  workspaceSlug: string,
  filters: AuditLogFilters,
): Promise<WorkspaceAuditLogItem[] | null> {
  const [workspace] = await db
    .select({
      id: workspaces.id,
      memberRole: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaces.slug, workspaceSlug),
        isNull(workspaces.deletedAt),
      ),
    )
    .limit(1);

  if (!workspace || workspace.memberRole !== "owner") {
    return null;
  }

  const fromDate = filters.from ? getDayStart(filters.from) : null;
  const toDate = filters.to ? getDayEnd(filters.to) : null;
  const where = and(
    eq(auditLogs.workspaceId, workspace.id),
    filters.actor ? eq(auditLogs.actorUserId, filters.actor) : undefined,
    filters.business ? eq(auditLogs.businessId, filters.business) : undefined,
    filters.action ? eq(auditLogs.action, filters.action) : undefined,
    filters.entity ? eq(auditLogs.entityType, filters.entity) : undefined,
    fromDate ? gte(auditLogs.createdAt, fromDate) : undefined,
    toDate ? lte(auditLogs.createdAt, toDate) : undefined,
  );

  const rows = await db
    .select({
      id: auditLogs.id,
      workspaceId: auditLogs.workspaceId,
      businessId: auditLogs.businessId,
      businessName: businesses.name,
      businessSlug: businesses.slug,
      actorUserId: auditLogs.actorUserId,
      actorName: sql<string | null>`coalesce(${user.name}, ${auditLogs.metadata}->>'actorName')`,
      actorEmail: sql<string | null>`coalesce(${user.email}, ${auditLogs.metadata}->>'actorEmail')`,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      action: auditLogs.action,
      metadata: auditLogs.metadata,
      source: auditLogs.source,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(user, eq(auditLogs.actorUserId, user.id))
    .leftJoin(businesses, eq(auditLogs.businessId, businesses.id))
    .where(where)
    .orderBy(desc(auditLogs.createdAt));

  return rows as WorkspaceAuditLogItem[];
}

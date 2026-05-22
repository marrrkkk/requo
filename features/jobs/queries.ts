import "server-only";

import { and, count, desc, eq, ilike, isNull, or, sql, asc } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { jobItems, jobs, quotes } from "@/lib/db/schema";
import type { DashboardJobDetail, DashboardJobListItem, JobListFilters, JobStatus } from "@/features/jobs/types";

const PAGE_SIZE = 50;

export async function getJobsForBusiness(
  businessId: string,
  filters: JobListFilters,
): Promise<{ items: DashboardJobListItem[]; totalCount: number }> {
  const conditions = [eq(jobs.businessId, businessId)];

  if (filters.view === "archived") {
    conditions.push(sql`${jobs.archivedAt} is not null`);
    conditions.push(isNull(jobs.deletedAt));
  } else {
    conditions.push(isNull(jobs.archivedAt));
    conditions.push(isNull(jobs.deletedAt));
  }

  if (filters.status !== "all") {
    conditions.push(eq(jobs.status, filters.status as JobStatus));
  }

  if (filters.q) {
    const searchTerm = `%${filters.q}%`;
    conditions.push(
      or(
        ilike(jobs.title, searchTerm),
        ilike(jobs.customerName, searchTerm),
      )!,
    );
  }

  const whereClause = and(...conditions);

  const [countResult, rows] = await Promise.all([
    db
      .select({ count: count() })
      .from(jobs)
      .where(whereClause)
      .then((r) => r[0]?.count ?? 0),
    db
      .select({
        id: jobs.id,
        title: jobs.title,
        customerName: jobs.customerName,
        customerEmail: jobs.customerEmail,
        customerContactMethod: jobs.customerContactMethod,
        customerContactHandle: jobs.customerContactHandle,
        status: jobs.status,
        currency: jobs.currency,
        totalInCents: jobs.totalInCents,
        quoteNumber: quotes.quoteNumber,
        createdAt: jobs.createdAt,
        startedAt: jobs.startedAt,
        completedAt: jobs.completedAt,
        archivedAt: jobs.archivedAt,
      })
      .from(jobs)
      .innerJoin(quotes, eq(jobs.quoteId, quotes.id))
      .where(whereClause)
      .orderBy(
        filters.sort === "oldest" ? asc(jobs.createdAt) : desc(jobs.createdAt),
      )
      .limit(PAGE_SIZE)
      .offset((filters.page - 1) * PAGE_SIZE),
  ]);

  // Get item counts per job
  const jobIds = rows.map((r) => r.id);
  let itemCounts: Record<string, { total: number; completed: number }> = {};

  if (jobIds.length > 0) {
    const itemCountRows = await db
      .select({
        jobId: jobItems.jobId,
        total: count(),
        completed: sql<number>`count(case when ${jobItems.completedAt} is not null then 1 end)`,
      })
      .from(jobItems)
      .where(sql`${jobItems.jobId} in ${jobIds}`)
      .groupBy(jobItems.jobId);

    itemCounts = Object.fromEntries(
      itemCountRows.map((r) => [r.jobId, { total: r.total, completed: r.completed }]),
    );
  }

  return {
    items: rows.map((row) => ({
      ...row,
      itemCount: itemCounts[row.id]?.total ?? 0,
      completedItemCount: itemCounts[row.id]?.completed ?? 0,
    })),
    totalCount: countResult,
  };
}

/**
 * Get jobs grouped by status for the kanban board view.
 */
export async function getJobsBoardForBusiness(
  businessId: string,
): Promise<Record<JobStatus, DashboardJobListItem[]>> {
  const rows = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      customerName: jobs.customerName,
      customerEmail: jobs.customerEmail,
      customerContactMethod: jobs.customerContactMethod,
      customerContactHandle: jobs.customerContactHandle,
      status: jobs.status,
      currency: jobs.currency,
      totalInCents: jobs.totalInCents,
      quoteNumber: quotes.quoteNumber,
      createdAt: jobs.createdAt,
      startedAt: jobs.startedAt,
      completedAt: jobs.completedAt,
      archivedAt: jobs.archivedAt,
      position: jobs.position,
    })
    .from(jobs)
    .innerJoin(quotes, eq(jobs.quoteId, quotes.id))
    .where(
      and(
        eq(jobs.businessId, businessId),
        isNull(jobs.archivedAt),
        isNull(jobs.deletedAt),
      ),
    )
    .orderBy(asc(jobs.position));

  // Get item counts
  const jobIds = rows.map((r) => r.id);
  let itemCounts: Record<string, { total: number; completed: number }> = {};

  if (jobIds.length > 0) {
    const itemCountRows = await db
      .select({
        jobId: jobItems.jobId,
        total: count(),
        completed: sql<number>`count(case when ${jobItems.completedAt} is not null then 1 end)`,
      })
      .from(jobItems)
      .where(sql`${jobItems.jobId} in ${jobIds}`)
      .groupBy(jobItems.jobId);

    itemCounts = Object.fromEntries(
      itemCountRows.map((r) => [r.jobId, { total: r.total, completed: r.completed }]),
    );
  }

  const board: Record<JobStatus, DashboardJobListItem[]> = {
    todo: [],
    in_progress: [],
    done: [],
  };

  for (const row of rows) {
    board[row.status].push({
      ...row,
      itemCount: itemCounts[row.id]?.total ?? 0,
      completedItemCount: itemCounts[row.id]?.completed ?? 0,
    });
  }

  return board;
}

export async function getJobDetailForBusiness(
  businessId: string,
  jobId: string,
): Promise<DashboardJobDetail | null> {
  const [job] = await db
    .select({
      id: jobs.id,
      businessId: jobs.businessId,
      quoteId: jobs.quoteId,
      title: jobs.title,
      customerName: jobs.customerName,
      customerEmail: jobs.customerEmail,
      customerContactMethod: jobs.customerContactMethod,
      customerContactHandle: jobs.customerContactHandle,
      status: jobs.status,
      currency: jobs.currency,
      totalInCents: jobs.totalInCents,
      notes: jobs.notes,
      quoteNumber: quotes.quoteNumber,
      quoteTitle: quotes.title,
      startedAt: jobs.startedAt,
      completedAt: jobs.completedAt,
      archivedAt: jobs.archivedAt,
      createdAt: jobs.createdAt,
      updatedAt: jobs.updatedAt,
    })
    .from(jobs)
    .innerJoin(quotes, eq(jobs.quoteId, quotes.id))
    .where(
      and(
        eq(jobs.id, jobId),
        eq(jobs.businessId, businessId),
        isNull(jobs.deletedAt),
      ),
    )
    .limit(1);

  if (!job) return null;

  const items = await db
    .select({
      id: jobItems.id,
      description: jobItems.description,
      quantity: jobItems.quantity,
      unitPriceInCents: jobItems.unitPriceInCents,
      lineTotalInCents: jobItems.lineTotalInCents,
      position: jobItems.position,
      completedAt: jobItems.completedAt,
    })
    .from(jobItems)
    .where(eq(jobItems.jobId, jobId))
    .orderBy(asc(jobItems.position));

  return { ...job, items };
}

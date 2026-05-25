import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  jobItems,
  jobs,
  quoteItems,
  quotes,
} from "@/lib/db/schema";
import { emitEvent } from "@/features/automations/dispatcher";
import type { JobStatus } from "@/features/jobs/types";

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

/**
 * Create a job from an accepted quote. Copies quote line items into job items.
 */
export async function createJobFromQuoteForBusiness({
  businessId,
  quoteId,
  userId: _userId,
}: {
  businessId: string;
  quoteId: string;
  userId: string;
}) {
  return db.transaction(async (tx) => {
    const [quote] = await tx
      .select({
        id: quotes.id,
        title: quotes.title,
        customerName: quotes.customerName,
        customerEmail: quotes.customerEmail,
        customerContactMethod: quotes.customerContactMethod,
        customerContactHandle: quotes.customerContactHandle,
        currency: quotes.currency,
        totalInCents: quotes.totalInCents,
        status: quotes.status,
        quoteNumber: quotes.quoteNumber,
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.id, quoteId),
          eq(quotes.businessId, businessId),
          eq(quotes.status, "accepted"),
          isNull(quotes.deletedAt),
        ),
      )
      .limit(1);

    if (!quote) {
      return { error: "Quote not found or not accepted." };
    }

    // Check if a job already exists for this quote
    const [existingJob] = await tx
      .select({ id: jobs.id })
      .from(jobs)
      .where(eq(jobs.quoteId, quoteId))
      .limit(1);

    if (existingJob) {
      return { error: "A job already exists for this quote.", jobId: existingJob.id };
    }

    const items = await tx
      .select({
        description: quoteItems.description,
        quantity: quoteItems.quantity,
        unitPriceInCents: quoteItems.unitPriceInCents,
        lineTotalInCents: quoteItems.lineTotalInCents,
        position: quoteItems.position,
      })
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, quoteId))
      .orderBy(quoteItems.position);

    // Get next position for kanban ordering
    const [maxPositionRow] = await tx
      .select({ maxPos: sql<number>`coalesce(max(${jobs.position}), -1)` })
      .from(jobs)
      .where(
        and(eq(jobs.businessId, businessId), isNull(jobs.deletedAt)),
      );

    const nextPosition = (maxPositionRow?.maxPos ?? -1) + 1;

    const jobId = createId("job");
    const now = new Date();

    await tx.insert(jobs).values({
      id: jobId,
      businessId,
      quoteId,
      title: quote.title,
      customerName: quote.customerName,
      customerEmail: quote.customerEmail,
      customerContactMethod: quote.customerContactMethod,
      customerContactHandle: quote.customerContactHandle,
      status: "todo",
      currency: quote.currency,
      totalInCents: quote.totalInCents,
      position: nextPosition,
      createdAt: now,
      updatedAt: now,
    });

    if (items.length > 0) {
      await tx.insert(jobItems).values(
        items.map((item) => ({
          id: createId("jit"),
          businessId,
          jobId,
          description: item.description,
          quantity: item.quantity,
          unitPriceInCents: item.unitPriceInCents,
          lineTotalInCents: item.lineTotalInCents,
          position: item.position,
          createdAt: now,
          updatedAt: now,
        })),
      );
    }

    // Update quote post-acceptance status
    await tx
      .update(quotes)
      .set({ postAcceptanceStatus: "in_progress", updatedAt: now })
      .where(eq(quotes.id, quoteId));

    // Emit job.created automation event
    emitEvent(businessId, "job.created", {
      jobId,
      quoteId,
      title: quote.title,
    });

    return { jobId, quoteNumber: quote.quoteNumber };
  });
}

/**
 * Move a job to a new status column.
 */
export async function updateJobStatusForBusiness({
  businessId,
  jobId,
  status,
  userId,
}: {
  businessId: string;
  jobId: string;
  status: JobStatus;
  userId: string;
}) {
  const now = new Date();
  const updates: Record<string, unknown> = {
    status,
    updatedAt: now,
  };

  if (status === "in_progress" && !updates.startedAt) {
    updates.startedAt = now;
  }

  if (status === "done") {
    updates.completedAt = now;
    updates.completedBy = userId;
  }

  const [updated] = await db
    .update(jobs)
    .set(updates)
    .where(
      and(
        eq(jobs.id, jobId),
        eq(jobs.businessId, businessId),
        isNull(jobs.deletedAt),
      ),
    )
    .returning({ id: jobs.id, quoteId: jobs.quoteId });

  if (!updated) {
    return { error: "Job not found." };
  }

  // Sync quote post-acceptance status
  if (status === "done") {
    await db
      .update(quotes)
      .set({ postAcceptanceStatus: "completed", updatedAt: now })
      .where(eq(quotes.id, updated.quoteId));

    // Emit job.completed automation event
    emitEvent(businessId, "job.completed", {
      jobId: updated.id,
      completedAt: now.toISOString(),
    });
  }

  return { jobId: updated.id };
}

/**
 * Toggle a job item's completion state.
 */
export async function toggleJobItemForBusiness({
  businessId,
  jobId,
  itemId,
}: {
  businessId: string;
  jobId: string;
  itemId: string;
}) {
  const now = new Date();

  const [item] = await db
    .select({ id: jobItems.id, completedAt: jobItems.completedAt })
    .from(jobItems)
    .where(
      and(
        eq(jobItems.id, itemId),
        eq(jobItems.jobId, jobId),
        eq(jobItems.businessId, businessId),
      ),
    )
    .limit(1);

  if (!item) {
    return { error: "Job item not found." };
  }

  await db
    .update(jobItems)
    .set({
      completedAt: item.completedAt ? null : now,
      updatedAt: now,
    })
    .where(eq(jobItems.id, itemId));

  return { itemId, completed: !item.completedAt };
}

/**
 * Delete (soft) a job.
 */
export async function deleteJobForBusiness({
  businessId,
  jobId,
  userId,
}: {
  businessId: string;
  jobId: string;
  userId: string;
}) {
  const now = new Date();

  const [deleted] = await db
    .update(jobs)
    .set({ deletedAt: now, deletedBy: userId, updatedAt: now })
    .where(
      and(
        eq(jobs.id, jobId),
        eq(jobs.businessId, businessId),
        isNull(jobs.deletedAt),
      ),
    )
    .returning({ id: jobs.id });

  if (!deleted) {
    return { error: "Job not found." };
  }

  return { jobId: deleted.id };
}

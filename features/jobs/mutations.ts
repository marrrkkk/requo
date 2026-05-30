import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  activityLogs,
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

const jobStatusLabels: Record<JobStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

/**
 * Create a job from an accepted quote. Copies quote line items into job items.
 */
export async function createJobFromQuoteForBusiness({
  businessId,
  quoteId,
  userId,
  tx: externalTx,
}: {
  businessId: string;
  quoteId: string;
  userId: string | null;
  tx?: Parameters<Parameters<typeof db.transaction>[0]>[0];
}) {
  const executeInTransaction = async (
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  ) => {
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
        inquiryId: quotes.inquiryId,
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

    // Activity log on the inquiry/quote timeline so post-acceptance progress
    // is visible alongside the rest of the workflow history.
    await tx.insert(activityLogs).values({
      id: createId("act"),
      businessId,
      inquiryId: quote.inquiryId,
      quoteId,
      actorUserId: userId,
      type: "job.created",
      summary: `Job created from quote ${quote.quoteNumber}.`,
      metadata: {
        jobId,
        quoteNumber: quote.quoteNumber,
        title: quote.title,
        itemCount: items.length,
      },
      createdAt: now,
      updatedAt: now,
    });

    // Emit job.created automation event
    emitEvent(businessId, "job.created", {
      jobId,
      quoteId,
      title: quote.title,
    });

    return { jobId, quoteNumber: quote.quoteNumber };
  };

  // Use external transaction if provided, otherwise create a new one
  if (externalTx) {
    return executeInTransaction(externalTx);
  }

  return db.transaction(executeInTransaction);
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

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({
        id: jobs.id,
        quoteId: jobs.quoteId,
        status: jobs.status,
        startedAt: jobs.startedAt,
        completedAt: jobs.completedAt,
        title: jobs.title,
      })
      .from(jobs)
      .where(
        and(
          eq(jobs.id, jobId),
          eq(jobs.businessId, businessId),
          isNull(jobs.deletedAt),
        ),
      )
      .limit(1);

    if (!existing) {
      return { error: "Job not found." };
    }

    if (existing.status === status) {
      // No-op: same status. Don't write an activity log or re-emit events
      // for an unchanged transition.
      return { jobId: existing.id };
    }

    const updates: Record<string, unknown> = {
      status,
      updatedAt: now,
    };

    if (status === "in_progress" && !existing.startedAt) {
      updates.startedAt = now;
    }

    if (status === "done") {
      updates.completedAt = now;
      updates.completedBy = userId;
    }

    await tx
      .update(jobs)
      .set(updates)
      .where(eq(jobs.id, jobId));

    // Pull the linked quote (for the inquiry id and number) so the activity
    // log is anchored on the same timeline as the rest of the workflow.
    const [linkedQuote] = await tx
      .select({
        inquiryId: quotes.inquiryId,
        quoteNumber: quotes.quoteNumber,
      })
      .from(quotes)
      .where(eq(quotes.id, existing.quoteId))
      .limit(1);

    await tx.insert(activityLogs).values({
      id: createId("act"),
      businessId,
      inquiryId: linkedQuote?.inquiryId ?? null,
      quoteId: existing.quoteId,
      actorUserId: userId,
      type: status === "done" ? "job.completed" : "job.status_changed",
      summary:
        status === "done"
          ? `Job "${existing.title}" marked done.`
          : `Job "${existing.title}" moved to ${jobStatusLabels[status]}.`,
      metadata: {
        jobId,
        previousStatus: existing.status,
        newStatus: status,
        quoteNumber: linkedQuote?.quoteNumber ?? null,
      },
      createdAt: now,
      updatedAt: now,
    });

    // Sync quote post-acceptance status
    if (status === "done") {
      await tx
        .update(quotes)
        .set({ postAcceptanceStatus: "completed", updatedAt: now })
        .where(eq(quotes.id, existing.quoteId));

      // Emit job.completed automation event
      emitEvent(businessId, "job.completed", {
        jobId: existing.id,
        completedAt: now.toISOString(),
      });
    }

    return { jobId: existing.id };
  });
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

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({
        id: jobs.id,
        quoteId: jobs.quoteId,
        title: jobs.title,
      })
      .from(jobs)
      .where(
        and(
          eq(jobs.id, jobId),
          eq(jobs.businessId, businessId),
          isNull(jobs.deletedAt),
        ),
      )
      .limit(1);

    if (!existing) {
      return { error: "Job not found." };
    }

    await tx
      .update(jobs)
      .set({ deletedAt: now, deletedBy: userId, updatedAt: now })
      .where(eq(jobs.id, jobId));

    const [linkedQuote] = await tx
      .select({
        inquiryId: quotes.inquiryId,
        quoteNumber: quotes.quoteNumber,
      })
      .from(quotes)
      .where(eq(quotes.id, existing.quoteId))
      .limit(1);

    await tx.insert(activityLogs).values({
      id: createId("act"),
      businessId,
      inquiryId: linkedQuote?.inquiryId ?? null,
      quoteId: existing.quoteId,
      actorUserId: userId,
      type: "job.deleted",
      summary: `Job "${existing.title}" deleted.`,
      metadata: {
        jobId,
        quoteNumber: linkedQuote?.quoteNumber ?? null,
      },
      createdAt: now,
      updatedAt: now,
    });

    return { jobId: existing.id };
  });
}

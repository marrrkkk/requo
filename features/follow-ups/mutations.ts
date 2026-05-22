import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import type {
  FollowUpCreateInput,
  FollowUpEditInput,
  FollowUpReassignInput,
  FollowUpRescheduleInput,
} from "@/features/follow-ups/schemas";
import type { FollowUpRecurrence, FollowUpStatus } from "@/features/follow-ups/types";
import {
  createActivityId,
  createFollowUpId,
  formatFollowUpDate,
  getNextRecurrenceDueDate,
  parseFollowUpDueDateInput,
  shouldRecur,
} from "@/features/follow-ups/utils";
import { db } from "@/lib/db/client";
import {
  activityLogs,
  followUps,
  inquiries,
  quotes,
} from "@/lib/db/schema";

type CreateFollowUpForBusinessInput = {
  businessId: string;
  inquiryId?: string | null;
  quoteId?: string | null;
  actorUserId: string;
  assignedToUserId?: string | null;
  followUp: Omit<FollowUpCreateInput, "recurrence" | "recurrenceLimit"> & {
    recurrence?: FollowUpCreateInput["recurrence"];
    recurrenceLimit?: FollowUpCreateInput["recurrenceLimit"];
  };
};

type FollowUpMutationResult = {
  followUpId: string;
  inquiryId: string | null;
  quoteId: string | null;
  status: FollowUpStatus;
};

function getFollowUpActionMetadata(input: {
  followUpId: string;
  title: string;
  reason: string;
  channel: string;
  dueAt: Date;
}) {
  return {
    followUpId: input.followUpId,
    title: input.title,
    reason: input.reason,
    channel: input.channel,
    dueAt: input.dueAt.toISOString(),
  };
}

export async function createFollowUpForBusiness({
  businessId,
  inquiryId,
  quoteId,
  actorUserId,
  assignedToUserId,
  followUp,
}: CreateFollowUpForBusinessInput): Promise<FollowUpMutationResult | null> {
  if (!inquiryId && !quoteId) {
    return null;
  }

  const now = new Date();
  const followUpId = createFollowUpId();
  const dueAt = parseFollowUpDueDateInput(followUp.dueDate);

  return db.transaction(async (tx) => {
    let resolvedInquiryId = inquiryId ?? null;
    const resolvedQuoteId = quoteId ?? null;

    if (resolvedInquiryId) {
      const [inquiry] = await tx
        .select({ id: inquiries.id })
        .from(inquiries)
        .where(
          and(
            eq(inquiries.id, resolvedInquiryId),
            eq(inquiries.businessId, businessId),
          ),
        )
        .limit(1);

      if (!inquiry) {
        return null;
      }
    }

    if (resolvedQuoteId) {
      const [quote] = await tx
        .select({
          id: quotes.id,
          inquiryId: quotes.inquiryId,
        })
        .from(quotes)
        .where(
          and(
            eq(quotes.id, resolvedQuoteId),
            eq(quotes.businessId, businessId),
            isNull(quotes.deletedAt),
          ),
        )
        .limit(1);

      if (!quote) {
        return null;
      }

      if (resolvedInquiryId && quote.inquiryId && quote.inquiryId !== resolvedInquiryId) {
        return null;
      }

      resolvedInquiryId = resolvedInquiryId ?? quote.inquiryId;
    }

    await tx.insert(followUps).values({
      id: followUpId,
      businessId,
      inquiryId: resolvedInquiryId,
      quoteId: resolvedQuoteId,
      assignedToUserId: assignedToUserId ?? actorUserId,
      title: followUp.title,
      reason: followUp.reason,
      channel: followUp.channel,
      recurrence: followUp.recurrence ?? "none",
      recurrenceLimit: followUp.recurrenceLimit ?? null,
      recurrenceCount: 0,
      dueAt,
      status: "pending",
      createdByUserId: actorUserId,
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(activityLogs).values({
      id: createActivityId(),
      businessId,
      inquiryId: resolvedInquiryId,
      quoteId: resolvedQuoteId,
      actorUserId,
      type: "follow_up.created",
      summary: `Follow-up created for ${formatFollowUpDate(dueAt)}.`,
      metadata: getFollowUpActionMetadata({
        followUpId,
        title: followUp.title,
        reason: followUp.reason,
        channel: followUp.channel,
        dueAt,
      }),
      createdAt: now,
      updatedAt: now,
    });

    return {
      followUpId,
      inquiryId: resolvedInquiryId,
      quoteId: resolvedQuoteId,
      status: "pending",
    };
  });
}

type UpdateFollowUpRecordInput = {
  businessId: string;
  followUpId: string;
  actorUserId: string;
};

export async function completeFollowUpForBusiness({
  businessId,
  followUpId,
  actorUserId,
}: UpdateFollowUpRecordInput) {
  const now = new Date();

  return db.transaction(async (tx) => {
    const [existingFollowUp] = await tx
      .select({
        id: followUps.id,
        inquiryId: followUps.inquiryId,
        quoteId: followUps.quoteId,
        title: followUps.title,
        reason: followUps.reason,
        channel: followUps.channel,
        assignedToUserId: followUps.assignedToUserId,
        status: followUps.status,
        dueAt: followUps.dueAt,
        recurrence: followUps.recurrence,
        recurrenceCount: followUps.recurrenceCount,
        recurrenceLimit: followUps.recurrenceLimit,
      })
      .from(followUps)
      .where(
        and(
          eq(followUps.id, followUpId),
          eq(followUps.businessId, businessId),
          isNull(followUps.deletedAt),
        ),
      )
      .limit(1);

    if (!existingFollowUp) {
      return null;
    }

    if (existingFollowUp.status === "completed") {
      return {
        changed: false,
        locked: false,
        followUpId,
        inquiryId: existingFollowUp.inquiryId,
        quoteId: existingFollowUp.quoteId,
        status: existingFollowUp.status,
      } as const;
    }

    if (existingFollowUp.status !== "pending") {
      return {
        changed: false,
        locked: true,
        followUpId,
        inquiryId: existingFollowUp.inquiryId,
        quoteId: existingFollowUp.quoteId,
        status: existingFollowUp.status,
      } as const;
    }

    await tx
      .update(followUps)
      .set({
        status: "completed",
        completedAt: now,
        skippedAt: null,
        updatedAt: now,
      })
      .where(
        and(eq(followUps.id, followUpId), eq(followUps.businessId, businessId)),
      );

    await tx.insert(activityLogs).values({
      id: createActivityId(),
      businessId,
      inquiryId: existingFollowUp.inquiryId,
      quoteId: existingFollowUp.quoteId,
      actorUserId,
      type: "follow_up.completed",
      summary: "Follow-up completed.",
      metadata: {
        followUpId,
        title: existingFollowUp.title,
      },
      createdAt: now,
      updatedAt: now,
    });

    // Auto-create next recurring follow-up if applicable
    if (
      shouldRecur({
        recurrence: existingFollowUp.recurrence as FollowUpRecurrence,
        recurrenceCount: existingFollowUp.recurrenceCount,
        recurrenceLimit: existingFollowUp.recurrenceLimit,
      })
    ) {
      const nextDueAt = getNextRecurrenceDueDate(
        existingFollowUp.dueAt,
        existingFollowUp.recurrence as Exclude<FollowUpRecurrence, "none">,
      );
      const nextFollowUpId = createFollowUpId();

      await tx.insert(followUps).values({
        id: nextFollowUpId,
        businessId,
        inquiryId: existingFollowUp.inquiryId,
        quoteId: existingFollowUp.quoteId,
        assignedToUserId: existingFollowUp.assignedToUserId,
        title: existingFollowUp.title,
        reason: existingFollowUp.reason,
        channel: existingFollowUp.channel as typeof followUps.$inferInsert.channel,
        recurrence: existingFollowUp.recurrence,
        recurrenceCount: existingFollowUp.recurrenceCount + 1,
        recurrenceLimit: existingFollowUp.recurrenceLimit,
        parentFollowUpId: followUpId,
        dueAt: nextDueAt,
        status: "pending",
        createdByUserId: actorUserId,
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(activityLogs).values({
        id: createActivityId(),
        businessId,
        inquiryId: existingFollowUp.inquiryId,
        quoteId: existingFollowUp.quoteId,
        actorUserId,
        type: "follow_up.created",
        summary: `Recurring follow-up created for ${formatFollowUpDate(nextDueAt)}.`,
        metadata: {
          followUpId: nextFollowUpId,
          title: existingFollowUp.title,
          reason: existingFollowUp.reason,
          channel: existingFollowUp.channel,
          dueAt: nextDueAt.toISOString(),
          parentFollowUpId: followUpId,
        },
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      changed: true,
      locked: false,
      followUpId,
      inquiryId: existingFollowUp.inquiryId,
      quoteId: existingFollowUp.quoteId,
      status: "completed" as const,
    };
  });
}

export async function skipFollowUpForBusiness({
  businessId,
  followUpId,
  actorUserId,
}: UpdateFollowUpRecordInput) {
  const now = new Date();

  return db.transaction(async (tx) => {
    const [existingFollowUp] = await tx
      .select({
        id: followUps.id,
        inquiryId: followUps.inquiryId,
        quoteId: followUps.quoteId,
        title: followUps.title,
        status: followUps.status,
      })
      .from(followUps)
      .where(
        and(
          eq(followUps.id, followUpId),
          eq(followUps.businessId, businessId),
          isNull(followUps.deletedAt),
        ),
      )
      .limit(1);

    if (!existingFollowUp) {
      return null;
    }

    if (existingFollowUp.status === "skipped") {
      return {
        changed: false,
        locked: false,
        followUpId,
        inquiryId: existingFollowUp.inquiryId,
        quoteId: existingFollowUp.quoteId,
        status: existingFollowUp.status,
      } as const;
    }

    if (existingFollowUp.status !== "pending") {
      return {
        changed: false,
        locked: true,
        followUpId,
        inquiryId: existingFollowUp.inquiryId,
        quoteId: existingFollowUp.quoteId,
        status: existingFollowUp.status,
      } as const;
    }

    await tx
      .update(followUps)
      .set({
        status: "skipped",
        completedAt: null,
        skippedAt: now,
        updatedAt: now,
      })
      .where(
        and(eq(followUps.id, followUpId), eq(followUps.businessId, businessId)),
      );

    await tx.insert(activityLogs).values({
      id: createActivityId(),
      businessId,
      inquiryId: existingFollowUp.inquiryId,
      quoteId: existingFollowUp.quoteId,
      actorUserId,
      type: "follow_up.skipped",
      summary: "Follow-up skipped.",
      metadata: {
        followUpId,
        title: existingFollowUp.title,
      },
      createdAt: now,
      updatedAt: now,
    });

    return {
      changed: true,
      locked: false,
      followUpId,
      inquiryId: existingFollowUp.inquiryId,
      quoteId: existingFollowUp.quoteId,
      status: "skipped" as const,
    };
  });
}

export async function rescheduleFollowUpForBusiness({
  businessId,
  followUpId,
  actorUserId,
  followUp,
}: UpdateFollowUpRecordInput & {
  followUp: FollowUpRescheduleInput;
}) {
  const now = new Date();
  const dueAt = parseFollowUpDueDateInput(followUp.dueDate);

  return db.transaction(async (tx) => {
    const [existingFollowUp] = await tx
      .select({
        id: followUps.id,
        inquiryId: followUps.inquiryId,
        quoteId: followUps.quoteId,
        title: followUps.title,
        status: followUps.status,
        dueAt: followUps.dueAt,
      })
      .from(followUps)
      .where(
        and(
          eq(followUps.id, followUpId),
          eq(followUps.businessId, businessId),
          isNull(followUps.deletedAt),
        ),
      )
      .limit(1);

    if (!existingFollowUp) {
      return null;
    }

    if (existingFollowUp.status !== "pending") {
      return {
        changed: false,
        locked: true,
        followUpId,
        inquiryId: existingFollowUp.inquiryId,
        quoteId: existingFollowUp.quoteId,
        status: existingFollowUp.status,
      } as const;
    }

    await tx
      .update(followUps)
      .set({
        dueAt,
        reminderSentAt: null,
        updatedAt: now,
      })
      .where(
        and(eq(followUps.id, followUpId), eq(followUps.businessId, businessId)),
      );

    await tx.insert(activityLogs).values({
      id: createActivityId(),
      businessId,
      inquiryId: existingFollowUp.inquiryId,
      quoteId: existingFollowUp.quoteId,
      actorUserId,
      type: "follow_up.rescheduled",
      summary: `Follow-up rescheduled to ${formatFollowUpDate(dueAt)}.`,
      metadata: {
        followUpId,
        title: existingFollowUp.title,
        previousDueAt: existingFollowUp.dueAt.toISOString(),
        dueAt: dueAt.toISOString(),
      },
      createdAt: now,
      updatedAt: now,
    });

    return {
      changed: true,
      locked: false,
      followUpId,
      inquiryId: existingFollowUp.inquiryId,
      quoteId: existingFollowUp.quoteId,
      status: "pending" as const,
    };
  });
}

export async function editFollowUpForBusiness({
  businessId,
  followUpId,
  actorUserId,
  followUp,
}: UpdateFollowUpRecordInput & {
  followUp: FollowUpEditInput;
}) {
  const now = new Date();
  const dueAt = parseFollowUpDueDateInput(followUp.dueDate);

  return db.transaction(async (tx) => {
    const [existingFollowUp] = await tx
      .select({
        id: followUps.id,
        inquiryId: followUps.inquiryId,
        quoteId: followUps.quoteId,
        status: followUps.status,
        title: followUps.title,
      })
      .from(followUps)
      .where(
        and(
          eq(followUps.id, followUpId),
          eq(followUps.businessId, businessId),
          isNull(followUps.deletedAt),
        ),
      )
      .limit(1);

    if (!existingFollowUp) {
      return null;
    }

    if (existingFollowUp.status !== "pending") {
      return {
        changed: false,
        locked: true,
        followUpId,
        inquiryId: existingFollowUp.inquiryId,
        quoteId: existingFollowUp.quoteId,
        status: existingFollowUp.status,
      } as const;
    }

    await tx
      .update(followUps)
      .set({
        title: followUp.title,
        reason: followUp.reason,
        channel: followUp.channel,
        dueAt,
        recurrence: followUp.recurrence ?? "none",
        recurrenceLimit: followUp.recurrenceLimit ?? null,
        reminderSentAt: null,
        updatedAt: now,
      })
      .where(
        and(eq(followUps.id, followUpId), eq(followUps.businessId, businessId)),
      );

    await tx.insert(activityLogs).values({
      id: createActivityId(),
      businessId,
      inquiryId: existingFollowUp.inquiryId,
      quoteId: existingFollowUp.quoteId,
      actorUserId,
      type: "follow_up.edited",
      summary: `Follow-up edited: "${followUp.title}".`,
      metadata: {
        followUpId,
        title: followUp.title,
        reason: followUp.reason,
        channel: followUp.channel,
        dueAt: dueAt.toISOString(),
      },
      createdAt: now,
      updatedAt: now,
    });

    return {
      changed: true,
      locked: false,
      followUpId,
      inquiryId: existingFollowUp.inquiryId,
      quoteId: existingFollowUp.quoteId,
      status: "pending" as const,
    };
  });
}

export async function deleteFollowUpForBusiness({
  businessId,
  followUpId,
  actorUserId,
}: UpdateFollowUpRecordInput) {
  const now = new Date();

  return db.transaction(async (tx) => {
    const [existingFollowUp] = await tx
      .select({
        id: followUps.id,
        inquiryId: followUps.inquiryId,
        quoteId: followUps.quoteId,
        title: followUps.title,
        deletedAt: followUps.deletedAt,
      })
      .from(followUps)
      .where(
        and(eq(followUps.id, followUpId), eq(followUps.businessId, businessId)),
      )
      .limit(1);

    if (!existingFollowUp) {
      return null;
    }

    if (existingFollowUp.deletedAt) {
      return {
        changed: false,
        followUpId,
        inquiryId: existingFollowUp.inquiryId,
        quoteId: existingFollowUp.quoteId,
      } as const;
    }

    await tx
      .update(followUps)
      .set({
        deletedAt: now,
        deletedByUserId: actorUserId,
        updatedAt: now,
      })
      .where(
        and(eq(followUps.id, followUpId), eq(followUps.businessId, businessId)),
      );

    await tx.insert(activityLogs).values({
      id: createActivityId(),
      businessId,
      inquiryId: existingFollowUp.inquiryId,
      quoteId: existingFollowUp.quoteId,
      actorUserId,
      type: "follow_up.deleted",
      summary: `Follow-up deleted: "${existingFollowUp.title}".`,
      metadata: {
        followUpId,
        title: existingFollowUp.title,
      },
      createdAt: now,
      updatedAt: now,
    });

    return {
      changed: true,
      followUpId,
      inquiryId: existingFollowUp.inquiryId,
      quoteId: existingFollowUp.quoteId,
    };
  });
}

export async function reassignFollowUpForBusiness({
  businessId,
  followUpId,
  actorUserId,
  reassign,
}: UpdateFollowUpRecordInput & {
  reassign: FollowUpReassignInput;
}) {
  const now = new Date();

  return db.transaction(async (tx) => {
    const [existingFollowUp] = await tx
      .select({
        id: followUps.id,
        inquiryId: followUps.inquiryId,
        quoteId: followUps.quoteId,
        title: followUps.title,
        status: followUps.status,
        assignedToUserId: followUps.assignedToUserId,
      })
      .from(followUps)
      .where(
        and(
          eq(followUps.id, followUpId),
          eq(followUps.businessId, businessId),
          isNull(followUps.deletedAt),
        ),
      )
      .limit(1);

    if (!existingFollowUp) {
      return null;
    }

    if (existingFollowUp.status !== "pending") {
      return {
        changed: false,
        locked: true,
        followUpId,
        inquiryId: existingFollowUp.inquiryId,
        quoteId: existingFollowUp.quoteId,
        status: existingFollowUp.status,
      } as const;
    }

    if (existingFollowUp.assignedToUserId === reassign.assignedToUserId) {
      return {
        changed: false,
        locked: false,
        followUpId,
        inquiryId: existingFollowUp.inquiryId,
        quoteId: existingFollowUp.quoteId,
        status: existingFollowUp.status,
      } as const;
    }

    await tx
      .update(followUps)
      .set({
        assignedToUserId: reassign.assignedToUserId,
        updatedAt: now,
      })
      .where(
        and(eq(followUps.id, followUpId), eq(followUps.businessId, businessId)),
      );

    await tx.insert(activityLogs).values({
      id: createActivityId(),
      businessId,
      inquiryId: existingFollowUp.inquiryId,
      quoteId: existingFollowUp.quoteId,
      actorUserId,
      type: "follow_up.reassigned",
      summary: `Follow-up reassigned.`,
      metadata: {
        followUpId,
        title: existingFollowUp.title,
        previousAssignedToUserId: existingFollowUp.assignedToUserId,
        assignedToUserId: reassign.assignedToUserId,
      },
      createdAt: now,
      updatedAt: now,
    });

    return {
      changed: true,
      locked: false,
      followUpId,
      inquiryId: existingFollowUp.inquiryId,
      quoteId: existingFollowUp.quoteId,
      status: existingFollowUp.status,
    };
  });
}

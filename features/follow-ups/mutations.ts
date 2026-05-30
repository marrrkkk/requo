import "server-only";

import { and, eq, inArray, isNull, ne } from "drizzle-orm";

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

// ---------------------------------------------------------------------------
// Terminal status helpers
// ---------------------------------------------------------------------------

export function isTerminalInquiryStatus(status: string): boolean {
  return ["won", "lost", "archived"].includes(status);
}

export function isTerminalQuoteStatus(status: string): boolean {
  return ["accepted", "rejected", "expired", "voided"].includes(status);
}

/**
 * Determines whether a recurring follow-up should stop generating new occurrences.
 *
 * Returns `true` when:
 * - terminationCondition is "count" and recurrenceCount >= recurrenceLimit
 * - terminationCondition is "terminal_status" and the linked inquiry/quote
 *   has reached a terminal status
 */
export async function shouldTerminateRecurrence(
  followUp: {
    recurrence: string;
    recurrenceLimit: number | null;
    recurrenceCount: number;
    terminationCondition: string | null;
    inquiryId: string | null;
    quoteId: string | null;
  },
  businessId: string,
): Promise<boolean> {
  // Count-based termination
  if (
    followUp.terminationCondition === "count" &&
    followUp.recurrenceLimit !== null &&
    followUp.recurrenceCount >= followUp.recurrenceLimit
  ) {
    return true;
  }

  // Terminal status termination
  if (followUp.terminationCondition === "terminal_status") {
    if (followUp.inquiryId) {
      const inquiry = await db.query.inquiries.findFirst({
        where: and(
          eq(inquiries.id, followUp.inquiryId),
          eq(inquiries.businessId, businessId),
        ),
        columns: { status: true },
      });
      if (inquiry && isTerminalInquiryStatus(inquiry.status)) return true;
    }
    if (followUp.quoteId) {
      const quote = await db.query.quotes.findFirst({
        where: and(
          eq(quotes.id, followUp.quoteId),
          eq(quotes.businessId, businessId),
        ),
        columns: { status: true },
      });
      if (quote && isTerminalQuoteStatus(quote.status)) return true;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CreateFollowUpForBusinessInput = {
  businessId: string;
  inquiryId?: string | null;
  quoteId?: string | null;
  actorUserId: string;
  assignedToUserId?: string | null;
  followUp: Omit<FollowUpCreateInput, "recurrence" | "recurrenceLimit" | "category" | "terminationCondition"> & {
    recurrence?: FollowUpCreateInput["recurrence"];
    recurrenceLimit?: FollowUpCreateInput["recurrenceLimit"];
    category?: FollowUpCreateInput["category"];
    terminationCondition?: FollowUpCreateInput["terminationCondition"];
  };
  /** Business timezone for anchoring due date. */
  timezone?: string;
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
  timezone,
}: CreateFollowUpForBusinessInput): Promise<FollowUpMutationResult | null> {
  if (!inquiryId && !quoteId) {
    return null;
  }

  const now = new Date();
  const followUpId = createFollowUpId();
  const dueAt = parseFollowUpDueDateInput(followUp.dueDate, timezone);

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
      category: followUp.category ?? "sales",
      recurrence: followUp.recurrence ?? "none",
      recurrenceLimit: followUp.recurrenceLimit ?? null,
      terminationCondition: followUp.terminationCondition ?? null,
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
  completionNote,
}: UpdateFollowUpRecordInput & { completionNote?: string | null }) {
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
        terminationCondition: followUps.terminationCondition,
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
        completionNote: completionNote ?? null,
        skippedAt: null,
        snoozedUntil: null,
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
      summary: completionNote
        ? `Follow-up completed: ${completionNote.slice(0, 80)}`
        : "Follow-up completed.",
      metadata: {
        followUpId,
        title: existingFollowUp.title,
        ...(completionNote ? { completionNote } : {}),
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
      // Check termination conditions (terminal status requires async DB lookup)
      const shouldTerminate = await shouldTerminateRecurrence(
        {
          recurrence: existingFollowUp.recurrence,
          recurrenceLimit: existingFollowUp.recurrenceLimit,
          recurrenceCount: existingFollowUp.recurrenceCount + 1,
          terminationCondition: existingFollowUp.terminationCondition,
          inquiryId: existingFollowUp.inquiryId,
          quoteId: existingFollowUp.quoteId,
        },
        businessId,
      );

      if (!shouldTerminate) {
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
          terminationCondition: existingFollowUp.terminationCondition,
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
  timezone,
}: UpdateFollowUpRecordInput & {
  followUp: FollowUpRescheduleInput;
  timezone?: string;
}) {
  const now = new Date();
  const dueAt = parseFollowUpDueDateInput(followUp.dueDate, timezone);

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
        snoozedUntil: null,
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
  timezone,
}: UpdateFollowUpRecordInput & {
  followUp: FollowUpEditInput;
  timezone?: string;
}) {
  const now = new Date();
  const dueAt = parseFollowUpDueDateInput(followUp.dueDate, timezone);

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
        category: followUp.category ?? "sales",
        dueAt,
        recurrence: followUp.recurrence ?? "none",
        recurrenceLimit: followUp.recurrenceLimit ?? null,
        terminationCondition: followUp.terminationCondition ?? null,
        reminderSentAt: null,
        snoozedUntil: null,
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
        category: followUp.category,
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

// ---------------------------------------------------------------------------
// Snooze
// ---------------------------------------------------------------------------

export async function snoozeFollowUpForBusiness({
  businessId,
  followUpId,
  actorUserId,
  snoozedUntil,
}: UpdateFollowUpRecordInput & { snoozedUntil: Date }) {
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
        snoozedUntil,
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
      type: "follow_up.snoozed",
      summary: `Follow-up snoozed until ${formatFollowUpDate(snoozedUntil)}.`,
      metadata: {
        followUpId,
        title: existingFollowUp.title,
        snoozedUntil: snoozedUntil.toISOString(),
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

// ---------------------------------------------------------------------------
// Bulk Complete
// ---------------------------------------------------------------------------

export async function bulkCompleteFollowUpsForBusiness({
  businessId,
  followUpIds,
  actorUserId,
  completionNote,
}: {
  businessId: string;
  followUpIds: string[];
  actorUserId: string;
  completionNote?: string | null;
}): Promise<{ affected: number; inquiryIds: Set<string>; quoteIds: Set<string> }> {
  const now = new Date();
  const inquiryIds = new Set<string>();
  const quoteIds = new Set<string>();
  let affected = 0;

  // Process in a single transaction for consistency
  await db.transaction(async (tx) => {
    const pendingFollowUps = await tx
      .select({
        id: followUps.id,
        inquiryId: followUps.inquiryId,
        quoteId: followUps.quoteId,
        title: followUps.title,
      })
      .from(followUps)
      .where(
        and(
          eq(followUps.businessId, businessId),
          eq(followUps.status, "pending"),
          isNull(followUps.deletedAt),
          inArray(followUps.id, followUpIds),
        ),
      );

    for (const fup of pendingFollowUps) {
      await tx
        .update(followUps)
        .set({
          status: "completed",
          completedAt: now,
          completionNote: completionNote ?? null,
          skippedAt: null,
          snoozedUntil: null,
          updatedAt: now,
        })
        .where(eq(followUps.id, fup.id));

      await tx.insert(activityLogs).values({
        id: createActivityId(),
        businessId,
        inquiryId: fup.inquiryId,
        quoteId: fup.quoteId,
        actorUserId,
        type: "follow_up.completed",
        summary: completionNote
          ? `Follow-up completed (bulk): ${completionNote.slice(0, 60)}`
          : "Follow-up completed (bulk).",
        metadata: {
          followUpId: fup.id,
          title: fup.title,
          bulk: true,
          ...(completionNote ? { completionNote } : {}),
        },
        createdAt: now,
        updatedAt: now,
      });

      if (fup.inquiryId) inquiryIds.add(fup.inquiryId);
      if (fup.quoteId) quoteIds.add(fup.quoteId);
      affected++;
    }
  });

  return { affected, inquiryIds, quoteIds };
}

// ---------------------------------------------------------------------------
// Bulk Skip
// ---------------------------------------------------------------------------

export async function bulkSkipFollowUpsForBusiness({
  businessId,
  followUpIds,
  actorUserId,
}: {
  businessId: string;
  followUpIds: string[];
  actorUserId: string;
}): Promise<{ affected: number; inquiryIds: Set<string>; quoteIds: Set<string> }> {
  const now = new Date();
  const inquiryIds = new Set<string>();
  const quoteIds = new Set<string>();
  let affected = 0;

  await db.transaction(async (tx) => {
    const pendingFollowUps = await tx
      .select({
        id: followUps.id,
        inquiryId: followUps.inquiryId,
        quoteId: followUps.quoteId,
        title: followUps.title,
      })
      .from(followUps)
      .where(
        and(
          eq(followUps.businessId, businessId),
          eq(followUps.status, "pending"),
          isNull(followUps.deletedAt),
          inArray(followUps.id, followUpIds),
        ),
      );

    for (const fup of pendingFollowUps) {
      await tx
        .update(followUps)
        .set({
          status: "skipped",
          skippedAt: now,
          completedAt: null,
          snoozedUntil: null,
          updatedAt: now,
        })
        .where(eq(followUps.id, fup.id));

      await tx.insert(activityLogs).values({
        id: createActivityId(),
        businessId,
        inquiryId: fup.inquiryId,
        quoteId: fup.quoteId,
        actorUserId,
        type: "follow_up.skipped",
        summary: "Follow-up skipped (bulk).",
        metadata: {
          followUpId: fup.id,
          title: fup.title,
          bulk: true,
        },
        createdAt: now,
        updatedAt: now,
      });

      if (fup.inquiryId) inquiryIds.add(fup.inquiryId);
      if (fup.quoteId) quoteIds.add(fup.quoteId);
      affected++;
    }
  });

  return { affected, inquiryIds, quoteIds };
}

// ---------------------------------------------------------------------------
// Auto-close: skip pending follow-ups when a quote is accepted/rejected
// ---------------------------------------------------------------------------

export async function autoCloseFollowUpsForQuote({
  businessId,
  quoteId,
  reason,
}: {
  businessId: string;
  quoteId: string;
  reason: "quote_accepted" | "quote_rejected";
}): Promise<number> {
  const now = new Date();
  const reasonLabel = reason === "quote_accepted" ? "Quote accepted" : "Quote declined";

  const pendingFollowUps = await db
    .select({
      id: followUps.id,
      inquiryId: followUps.inquiryId,
      title: followUps.title,
    })
    .from(followUps)
    .where(
      and(
        eq(followUps.businessId, businessId),
        eq(followUps.quoteId, quoteId),
        eq(followUps.status, "pending"),
        isNull(followUps.deletedAt),
      ),
    );

  if (!pendingFollowUps.length) {
    return 0;
  }

  await db.transaction(async (tx) => {
    for (const fup of pendingFollowUps) {
      await tx
        .update(followUps)
        .set({
          status: "skipped",
          skippedAt: now,
          completionNote: `Auto-closed: ${reasonLabel}`,
          snoozedUntil: null,
          updatedAt: now,
        })
        .where(eq(followUps.id, fup.id));

      await tx.insert(activityLogs).values({
        id: createActivityId(),
        businessId,
        inquiryId: fup.inquiryId,
        quoteId,
        actorUserId: null,
        type: "follow_up.auto_closed",
        summary: `Follow-up auto-closed: ${reasonLabel}.`,
        metadata: {
          followUpId: fup.id,
          title: fup.title,
          reason,
        },
        createdAt: now,
        updatedAt: now,
      });
    }
  });

  return pendingFollowUps.length;
}

// ---------------------------------------------------------------------------
// Check and terminate recurring follow-ups when linked item reaches terminal status
// ---------------------------------------------------------------------------

/**
 * Called when an inquiry or quote status changes to a terminal status.
 * Finds all pending recurring follow-ups linked to the item with
 * `terminal_status` termination condition and skips them.
 */
export async function checkAndTerminateRecurringFollowUps({
  businessId,
  inquiryId,
  quoteId,
  newStatus,
}: {
  businessId: string;
  inquiryId?: string | null;
  quoteId?: string | null;
  newStatus: string;
}): Promise<number> {
  // Only act if the new status is actually terminal
  const isTerminal = inquiryId
    ? isTerminalInquiryStatus(newStatus)
    : quoteId
      ? isTerminalQuoteStatus(newStatus)
      : false;

  if (!isTerminal) {
    return 0;
  }

  const now = new Date();

  // Build conditions for finding relevant recurring follow-ups
  const conditions = [
    eq(followUps.businessId, businessId),
    eq(followUps.status, "pending"),
    eq(followUps.terminationCondition, "terminal_status"),
    ne(followUps.recurrence, "none"),
    isNull(followUps.deletedAt),
  ];

  if (inquiryId) {
    conditions.push(eq(followUps.inquiryId, inquiryId));
  }
  if (quoteId) {
    conditions.push(eq(followUps.quoteId, quoteId));
  }

  const pendingRecurring = await db
    .select({
      id: followUps.id,
      inquiryId: followUps.inquiryId,
      quoteId: followUps.quoteId,
      title: followUps.title,
    })
    .from(followUps)
    .where(and(...conditions));

  if (!pendingRecurring.length) {
    return 0;
  }

  const reasonLabel = inquiryId
    ? `Inquiry reached terminal status: ${newStatus}`
    : `Quote reached terminal status: ${newStatus}`;

  await db.transaction(async (tx) => {
    for (const fup of pendingRecurring) {
      await tx
        .update(followUps)
        .set({
          status: "skipped",
          skippedAt: now,
          completionNote: `Auto-terminated: ${reasonLabel}`,
          snoozedUntil: null,
          updatedAt: now,
        })
        .where(eq(followUps.id, fup.id));

      await tx.insert(activityLogs).values({
        id: createActivityId(),
        businessId,
        inquiryId: fup.inquiryId,
        quoteId: fup.quoteId,
        actorUserId: null,
        type: "follow_up.auto_closed",
        summary: `Recurring follow-up terminated: ${reasonLabel}.`,
        metadata: {
          followUpId: fup.id,
          title: fup.title,
          reason: "terminal_status",
          newStatus,
        },
        createdAt: now,
        updatedAt: now,
      });
    }
  });

  return pendingRecurring.length;
}

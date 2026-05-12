import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import type {
  FollowUpCreateInput,
  FollowUpRescheduleInput,
} from "@/features/follow-ups/schemas";
import type { FollowUpStatus } from "@/features/follow-ups/types";
import {
  createActivityId,
  createFollowUpId,
  formatFollowUpDate,
  parseFollowUpDueDateInput,
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
  followUp: FollowUpCreateInput;
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
            isNull(inquiries.deletedAt),
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
        status: followUps.status,
      })
      .from(followUps)
      .where(
        and(eq(followUps.id, followUpId), eq(followUps.businessId, businessId)),
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
        and(eq(followUps.id, followUpId), eq(followUps.businessId, businessId)),
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
        and(eq(followUps.id, followUpId), eq(followUps.businessId, businessId)),
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

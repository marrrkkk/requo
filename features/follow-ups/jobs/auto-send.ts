import "server-only";

import { and, eq, gt, isNull, lte, or } from "drizzle-orm";

import { buildFollowUpSuggestedMessage } from "@/features/follow-ups/utils";
import { sendEmailWithFallback } from "@/lib/email";
import { db } from "@/lib/db/client";
import { activityLogs, businesses, followUps, inquiries, quotes } from "@/lib/db/schema";
import { newEntityId } from "@/lib/ids";
import { isFollowUpAutoSendEmailEnabled } from "@/lib/env";

export type FollowUpAutoSendSummary = {
  processed: number;
  sent: number;
  limitReached: boolean;
};

const BATCH_SIZE = 100;
const MAX_BATCHES = 10;

export async function processAutomaticFollowUpSends(): Promise<FollowUpAutoSendSummary> {
  // Low-email deployments disable unattended customer sends via configuration
  // instead of deleting the feature. Manual reminders are unaffected.
  if (!isFollowUpAutoSendEmailEnabled) {
    return { processed: 0, sent: 0, limitReached: false };
  }

  const now = new Date();
  let processed = 0;
  let sent = 0;
  let limitReached = false;
  let lastProcessedId: string | null = null;

  for (let batch = 0; batch < MAX_BATCHES; batch++) {
    const conditions = [
      eq(followUps.status, "pending"),
      eq(followUps.sendMode, "automatic"),
      eq(followUps.channel, "email"),
      isNull(followUps.deletedAt),
      lte(followUps.dueAt, now),
      // Respect snooze: skip if snoozedUntil is in the future
      or(isNull(followUps.snoozedUntil), lte(followUps.snoozedUntil, now))!,
    ];

    if (lastProcessedId) {
      conditions.push(gt(followUps.id, lastProcessedId));
    }

    const dueFollowUps = await db
      .select({
        followUpId: followUps.id,
        followUpTitle: followUps.title,
        businessId: followUps.businessId,
        businessName: businesses.name,
        businessContactEmail: businesses.contactEmail,
        inquiryId: followUps.inquiryId,
        quoteId: followUps.quoteId,
        dueAt: followUps.dueAt,
        inquiryCustomerName: inquiries.customerName,
        inquiryCustomerEmail: inquiries.customerEmail,
        quoteCustomerName: quotes.customerName,
        quoteCustomerEmail: quotes.customerEmail,
        quoteNumber: quotes.quoteNumber,
        quoteTitle: quotes.title,
        quotePublicToken: quotes.publicToken,
        quoteViewedAt: quotes.publicViewedAt,
      })
      .from(followUps)
      .innerJoin(businesses, eq(followUps.businessId, businesses.id))
      .leftJoin(inquiries, eq(followUps.inquiryId, inquiries.id))
      .leftJoin(quotes, eq(followUps.quoteId, quotes.id))
      .where(and(...conditions))
      .orderBy(followUps.id)
      .limit(BATCH_SIZE);

    if (dueFollowUps.length === 0) {
      break;
    }

    for (const row of dueFollowUps) {
      const customerEmail = row.quoteCustomerEmail ?? row.inquiryCustomerEmail;

      // Creation guards this, but skip defensively so a stale row never blocks the batch.
      if (!customerEmail) {
        lastProcessedId = row.followUpId;
        continue;
      }

      const customerName = row.quoteCustomerName ?? row.inquiryCustomerName ?? "there";
      const isQuoteFollowUp = Boolean(row.quoteId);
      const message = buildFollowUpSuggestedMessage({
        kind: isQuoteFollowUp ? "quote" : "inquiry",
        businessName: row.businessName,
        customerName,
        quoteUrl: null,
        quoteViewedAt: row.quoteViewedAt,
      });
      const subject = isQuoteFollowUp
        ? `Following up: ${row.quoteNumber ? `Quote ${row.quoteNumber}` : (row.quoteTitle ?? "your quote")}`
        : `Following up from ${row.businessName}`;

      try {
        await db.transaction(async (tx) => {
          // Lock row to prevent concurrent workers from sending duplicates
          const [locked] = await tx
            .select({ id: followUps.id })
            .from(followUps)
            .where(
              and(
                eq(followUps.id, row.followUpId),
                eq(followUps.status, "pending"),
                eq(followUps.sendMode, "automatic"),
              ),
            )
            .for("update", { skipLocked: true });

          if (!locked) {
            // Already processed by another worker
            return;
          }

          await sendEmailWithFallback({
            to: customerEmail,
            ...(row.businessContactEmail ? { replyTo: row.businessContactEmail } : {}),
            subject,
            html: buildAutoSendEmailHtml({
              businessName: row.businessName,
              customerName,
              title: row.followUpTitle,
              message,
            }),
            emailType: "quote",
            businessId: row.businessId,
            idempotencyKey: `fup-auto-send-${row.followUpId}-${row.dueAt.toISOString().slice(0, 10)}`,
          });

          await tx
            .update(followUps)
            .set({
              status: "completed",
              completedAt: now,
              completionNote: "Sent automatically.",
              snoozedUntil: null,
              updatedAt: now,
            })
            .where(eq(followUps.id, row.followUpId));

          await tx.insert(activityLogs).values({
            id: newEntityId(),
            businessId: row.businessId,
            inquiryId: row.inquiryId,
            quoteId: row.quoteId,
            actorUserId: null,
            type: "follow_up.auto_sent",
            summary: `Follow-up automatically sent to ${customerEmail}.`,
            metadata: {
              followUpId: row.followUpId,
              title: row.followUpTitle,
              to: customerEmail,
            },
            createdAt: now,
            updatedAt: now,
          });

          sent++;
          processed++;
        });
      } catch (error) {
        console.error(
          `[follow-up-auto-send] Failed to process follow-up ${row.followUpId}`,
          error,
        );
      }

      lastProcessedId = row.followUpId;
    }

    if (dueFollowUps.length < BATCH_SIZE) {
      break;
    }

    if (batch === MAX_BATCHES - 1) {
      limitReached = true;
      console.warn(
        `[follow-up-auto-send] Reached max batch limit (${MAX_BATCHES * BATCH_SIZE} items). Some follow-ups may be processed in the next run.`,
      );
    }
  }

  return { processed, sent, limitReached };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildAutoSendEmailHtml(input: {
  businessName: string;
  customerName: string;
  title: string;
  message: string;
}) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 16px;">${escapeHtml(input.title)}</h2>
      <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
        ${escapeHtml(input.message)}
      </p>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
        Sent by ${escapeHtml(input.businessName)}.
      </p>
    </div>
  `;
}

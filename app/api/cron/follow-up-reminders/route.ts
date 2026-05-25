import { NextResponse } from "next/server";
import { and, eq, isNotNull, isNull, lt, lte } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { businesses, followUps, inquiries, quotes } from "@/lib/db/schema";
import { emitEvent } from "@/features/automations/dispatcher";
import { insertBusinessNotification } from "@/features/notifications/mutations";
import { sendEmailWithFallback } from "@/lib/email";
import { env } from "@/lib/env";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Cron job that runs daily to send follow-up reminder notifications.
 * Finds all pending follow-ups where dueAt <= now and reminderSentAt is null.
 * Sends email and/or in-app notifications based on business settings.
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");

  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  let emailsSent = 0;
  let inAppCreated = 0;
  let processed = 0;

  try {
    // Find all pending follow-ups that are due (dueAt <= now) and haven't been reminded
    const dueFollowUps = await db
      .select({
        followUpId: followUps.id,
        followUpTitle: followUps.title,
        followUpReason: followUps.reason,
        businessId: followUps.businessId,
        businessName: businesses.name,
        businessContactEmail: businesses.contactEmail,
        notifyEmail: businesses.notifyOnFollowUpReminder,
        notifyInApp: businesses.notifyInAppOnFollowUpReminder,
        inquiryId: followUps.inquiryId,
        quoteId: followUps.quoteId,
        customerName: inquiries.customerName,
        quoteCustomerName: quotes.customerName,
        quoteNumber: quotes.quoteNumber,
      })
      .from(followUps)
      .innerJoin(businesses, eq(followUps.businessId, businesses.id))
      .leftJoin(inquiries, eq(followUps.inquiryId, inquiries.id))
      .leftJoin(quotes, eq(followUps.quoteId, quotes.id))
      .where(
        and(
          eq(followUps.status, "pending"),
          isNull(followUps.deletedAt),
          isNull(followUps.reminderSentAt),
          lte(followUps.dueAt, now),
        ),
      )
      .limit(100); // Process in batches

    for (const row of dueFollowUps) {
      const customerName = row.quoteCustomerName ?? row.customerName ?? "a customer";
      const recordLabel = row.quoteNumber
        ? `Quote ${row.quoteNumber}`
        : "an inquiry";

      // Send in-app notification
      if (row.notifyInApp) {
        try {
          await db.transaction(async (tx) => {
            await insertBusinessNotification(tx, {
              businessId: row.businessId,
              inquiryId: row.inquiryId,
              quoteId: row.quoteId,
              type: "public_inquiry_submitted", // Reuse closest type until we add a dedicated one
              title: `Follow-up due: ${row.followUpTitle}`,
              summary: `Reminder to follow up with ${customerName} about ${recordLabel}.`,
            });
          });
          inAppCreated++;
        } catch (error) {
          console.error(`[cron] Failed to create in-app notification for follow-up ${row.followUpId}`, error);
        }
      }

      // Send email notification
      if (row.notifyEmail && row.businessContactEmail) {
        try {
          await sendEmailWithFallback({
            to: row.businessContactEmail,
            subject: `Follow-up due: ${row.followUpTitle}`,
            html: buildReminderEmailHtml({
              businessName: row.businessName,
              followUpTitle: row.followUpTitle,
              followUpReason: row.followUpReason,
              customerName,
              recordLabel,
            }),
            emailType: "notification",
            businessId: row.businessId,
            idempotencyKey: `fup-reminder-${row.followUpId}-${now.toISOString().slice(0, 10)}`,
          });
          emailsSent++;
        } catch (error) {
          console.error(`[cron] Failed to send reminder email for follow-up ${row.followUpId}`, error);
        }
      }

      // Emit follow_up.due automation event
      emitEvent(row.businessId, "follow_up.due", {
        followUpId: row.followUpId,
        quoteId: row.quoteId ?? undefined,
        inquiryId: row.inquiryId ?? undefined,
      });

      // Mark reminder as sent
      await db
        .update(followUps)
        .set({ reminderSentAt: now })
        .where(eq(followUps.id, row.followUpId));

      processed++;
    }

    // -----------------------------------------------------------------------
    // Overdue follow-ups: already reminded (reminderSentAt is set) but still
    // pending past their due date. Emit follow_up.overdue for automations.
    // -----------------------------------------------------------------------
    const overdueFollowUps = await db
      .select({
        followUpId: followUps.id,
        businessId: followUps.businessId,
        dueAt: followUps.dueAt,
        quoteId: followUps.quoteId,
        inquiryId: followUps.inquiryId,
      })
      .from(followUps)
      .where(
        and(
          eq(followUps.status, "pending"),
          isNull(followUps.deletedAt),
          isNotNull(followUps.reminderSentAt),
          lt(followUps.dueAt, now),
        ),
      )
      .limit(100);

    for (const overdue of overdueFollowUps) {
      const overdueBy = Math.floor(
        (now.getTime() - overdue.dueAt.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (overdueBy >= 1) {
        emitEvent(overdue.businessId, "follow_up.overdue", {
          followUpId: overdue.followUpId,
          overdueBy,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      processed,
      emailsSent,
      inAppCreated,
    });
  } catch (error) {
    console.error("[cron] Follow-up reminders failed", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

function buildReminderEmailHtml(input: {
  businessName: string;
  followUpTitle: string;
  followUpReason: string;
  customerName: string;
  recordLabel: string;
}) {
  const appUrl = env.BETTER_AUTH_URL;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 16px;">Follow-up reminder</h2>
      <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 12px;">
        <strong>${input.followUpTitle}</strong> is due for ${input.customerName} (${input.recordLabel}).
      </p>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
        ${input.followUpReason}
      </p>
      <a href="${appUrl}" style="display: inline-block; background: #111827; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">
        Open ${input.businessName}
      </a>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
        You're receiving this because follow-up reminders are enabled for ${input.businessName}.
      </p>
    </div>
  `;
}

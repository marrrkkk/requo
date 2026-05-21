import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { activityLogs, businesses, quotes } from "@/lib/db/schema";
import { sendQuoteAutoFollowUpEmail } from "@/lib/resend/client";
import { getPublicQuoteUrl } from "@/features/quotes/utils";
import { env } from "@/lib/env";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Cron job that runs periodically (e.g. every hour) to send automatic
 * follow-up emails for sent quotes that have not received a response.
 *
 * Criteria for sending:
 * - Quote status = "sent"
 * - autoFollowUpEnabled = true
 * - autoFollowUpStoppedAt is null
 * - autoFollowUpAttempts < autoFollowUpMaxAttempts
 * - publicViewedAt is null (customer hasn't viewed yet)
 * - customerRespondedAt is null
 * - deletedAt is null
 * - Enough time has passed since sentAt (or last auto follow-up)
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  let sent = 0;
  let processed = 0;
  let errors = 0;

  try {
    // Find quotes eligible for auto follow-up.
    const eligibleQuotes = await db
      .select({
        quoteId: quotes.id,
        businessId: quotes.businessId,
        businessName: businesses.name,
        businessContactEmail: businesses.contactEmail,
        defaultEmailSignature: businesses.defaultEmailSignature,
        quoteNumber: quotes.quoteNumber,
        title: quotes.title,
        customerName: quotes.customerName,
        customerEmail: quotes.customerEmail,
        publicToken: quotes.publicToken,
        sentAt: quotes.sentAt,
        autoFollowUpDelayDays: quotes.autoFollowUpDelayDays,
        autoFollowUpMaxAttempts: quotes.autoFollowUpMaxAttempts,
        autoFollowUpAttempts: quotes.autoFollowUpAttempts,
        autoFollowUpLastSentAt: quotes.autoFollowUpLastSentAt,
      })
      .from(quotes)
      .innerJoin(businesses, eq(quotes.businessId, businesses.id))
      .where(
        and(
          eq(quotes.status, "sent"),
          eq(quotes.autoFollowUpEnabled, true),
          isNull(quotes.autoFollowUpStoppedAt),
          isNull(quotes.publicViewedAt),
          isNull(quotes.customerRespondedAt),
          isNull(quotes.deletedAt),
          sql`${quotes.autoFollowUpAttempts} < ${quotes.autoFollowUpMaxAttempts}`,
        ),
      )
      .limit(50);

    for (const row of eligibleQuotes) {
      // Calculate when the next follow-up should be sent
      const referenceDate = row.autoFollowUpLastSentAt ?? row.sentAt;

      if (!referenceDate) {
        continue;
      }

      const nextSendAfter = new Date(
        referenceDate.getTime() + row.autoFollowUpDelayDays * 24 * 60 * 60 * 1000,
      );

      if (now < nextSendAfter) {
        continue; // Not time yet
      }

      if (!row.customerEmail || !row.publicToken) {
        continue; // Can't send without email or public link
      }

      const attemptNumber = row.autoFollowUpAttempts + 1;

      try {
        const publicQuoteUrl = new URL(
          getPublicQuoteUrl(row.publicToken),
          env.BETTER_AUTH_URL,
        ).toString();

        await sendQuoteAutoFollowUpEmail({
          quoteId: row.quoteId,
          businessName: row.businessName,
          customerName: row.customerName,
          customerEmail: row.customerEmail,
          quoteNumber: row.quoteNumber,
          title: row.title,
          publicQuoteUrl,
          attemptNumber,
          emailSignature: row.defaultEmailSignature,
          replyToEmail: row.businessContactEmail ?? undefined,
          businessId: row.businessId,
        });

        // Update the quote with the new attempt count and timestamp
        await db
          .update(quotes)
          .set({
            autoFollowUpAttempts: attemptNumber,
            autoFollowUpLastSentAt: now,
            updatedAt: now,
          })
          .where(eq(quotes.id, row.quoteId));

        // Record activity for the quote timeline
        await db.insert(activityLogs).values({
          id: `act_${crypto.randomUUID().replace(/-/g, "")}`,
          businessId: row.businessId,
          quoteId: row.quoteId,
          type: "quote.auto_follow_up_sent",
          summary: `Auto follow-up ${attemptNumber} of ${row.autoFollowUpMaxAttempts} sent to ${row.customerEmail}.`,
          metadata: {
            attemptNumber,
            maxAttempts: row.autoFollowUpMaxAttempts,
            delayDays: row.autoFollowUpDelayDays,
          },
          createdAt: now,
          updatedAt: now,
        });

        sent++;
      } catch (error) {
        console.error(
          `[cron] Failed to send auto follow-up for quote ${row.quoteId} (attempt ${attemptNumber})`,
          error,
        );
        errors++;
      }

      processed++;
    }

    return NextResponse.json({
      ok: true,
      processed,
      sent,
      errors,
    });
  } catch (error) {
    console.error("[cron] Auto follow-ups failed", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

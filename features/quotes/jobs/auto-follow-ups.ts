import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";

import { getPublicQuoteUrl } from "@/features/quotes/utils";
import { db } from "@/lib/db/client";
import { activityLogs, businesses, quotes } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { sendQuoteAutoFollowUpEmail } from "@/lib/resend/client";

export type AutoFollowUpsSummary = {
  processed: number;
  sent: number;
  errors: number;
};

export async function processQuoteAutoFollowUps(): Promise<AutoFollowUpsSummary> {
  const now = new Date();
  let sent = 0;
  let processed = 0;
  let errors = 0;

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
    const referenceDate = row.autoFollowUpLastSentAt ?? row.sentAt;

    if (!referenceDate) {
      continue;
    }

    const nextSendAfter = new Date(
      referenceDate.getTime() + row.autoFollowUpDelayDays * 24 * 60 * 60 * 1000,
    );

    if (now < nextSendAfter) {
      continue;
    }

    if (!row.customerEmail || !row.publicToken) {
      continue;
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

      await db
        .update(quotes)
        .set({
          autoFollowUpAttempts: attemptNumber,
          autoFollowUpLastSentAt: now,
          updatedAt: now,
        })
        .where(eq(quotes.id, row.quoteId));

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
        `[auto-follow-ups] Failed to send auto follow-up for quote ${row.quoteId} (attempt ${attemptNumber})`,
        error,
      );
      errors++;
    }

    processed++;
  }

  return { processed, sent, errors };
}

import "server-only";

import { and, eq } from "drizzle-orm";

import { getBusinessQuotePath } from "@/features/businesses/routes";
import { insertBusinessNotification } from "@/features/notifications/mutations";
import { db } from "@/lib/db/client";
import { businesses, quotes } from "@/lib/db/schema";
import { sendPushToBusinessSubscribers } from "@/lib/push/send";

/**
 * Notifies the owner when a customer views a quote on the public page.
 * Inserts an in-app notification and fires a push notification. Always-on
 * default; callers fire-and-forget.
 */
export async function notifyOwnerQuoteViewed(
  quoteId: string,
  businessId: string,
  viewedAt: Date,
): Promise<void> {
  const [quote] = await db
    .select({
      quoteNumber: quotes.quoteNumber,
      customerName: quotes.customerName,
      businessSlug: businesses.slug,
    })
    .from(quotes)
    .innerJoin(businesses, eq(quotes.businessId, businesses.id))
    .where(and(eq(quotes.id, quoteId), eq(quotes.businessId, businessId)))
    .limit(1);

  if (!quote) {
    return;
  }

  await db.transaction(async (tx) => {
    await insertBusinessNotification(tx, {
      businessId,
      quoteId,
      type: "quote_viewed",
      title: `${quote.customerName} viewed ${quote.quoteNumber}`,
      summary: `Quote ${quote.quoteNumber} was viewed by ${quote.customerName}.`,
      metadata: {
        customerName: quote.customerName,
        quoteNumber: quote.quoteNumber,
        viewedAt: viewedAt.toISOString(),
      },
      now: viewedAt,
    });
  });

  await sendPushToBusinessSubscribers(businessId, {
    title: "Quote viewed",
    body: `${quote.customerName} viewed quote ${quote.quoteNumber}.`,
    url: getBusinessQuotePath(quote.businessSlug, quoteId),
  });
}
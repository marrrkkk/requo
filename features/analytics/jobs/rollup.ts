import "server-only";

import { and, eq, gte, isNull, lt, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  analyticsDailyRollups,
  analyticsEvents,
  businesses,
  inquiries,
  quotes,
} from "@/lib/db/schema";

export type AnalyticsRollupSummary = {
  date: string;
  totalBusinesses: number;
  processed: number;
  failed: number;
  errors?: Array<{ businessId: string; error: string }>;
};

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

export async function computeDailyRollups(): Promise<AnalyticsRollupSummary> {
  const now = new Date();
  const yesterday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1),
  );
  const dayAfter = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  const targetDate = yesterday.toISOString().split("T")[0]!;

  const allBusinesses = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(isNull(businesses.deletedAt));

  let processed = 0;
  let failed = 0;
  const errors: Array<{ businessId: string; error: string }> = [];

  for (const business of allBusinesses) {
    try {
      await rollupForBusiness(business.id, targetDate, yesterday, dayAfter);
      processed++;
    } catch (error) {
      failed++;
      const message =
        error instanceof Error ? error.message : "Unknown error";
      errors.push({ businessId: business.id, error: message });
      console.error(
        `[analytics-rollup] Failed for business ${business.id}:`,
        error,
      );
    }
  }

  return {
    date: targetDate,
    totalBusinesses: allBusinesses.length,
    processed,
    failed,
    ...(errors.length > 0 ? { errors } : {}),
  };
}

async function rollupForBusiness(
  businessId: string,
  targetDate: string,
  dayStart: Date,
  dayEnd: Date,
) {
  const [formViewsResult] = await db
    .select({
      count: sql<number>`count(*)`.as("count"),
    })
    .from(
      db
        .select({
          id: sql`1`,
        })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.businessId, businessId),
            eq(analyticsEvents.eventType, "inquiry_form_viewed"),
            gte(analyticsEvents.occurredAt, dayStart),
            lt(analyticsEvents.occurredAt, dayEnd),
          ),
        )
        .groupBy(
          analyticsEvents.businessInquiryFormId,
          analyticsEvents.visitorHash,
          sql`date_trunc('second', ${analyticsEvents.occurredAt})`,
        )
        .as("deduped_form_views"),
    );

  const [uniqueVisitorsResult] = await db
    .select({
      count:
        sql<number>`count(distinct ${analyticsEvents.visitorHash})`.as("count"),
    })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.businessId, businessId),
        gte(analyticsEvents.occurredAt, dayStart),
        lt(analyticsEvents.occurredAt, dayEnd),
      ),
    );

  const [inquiryResult] = await db
    .select({
      count: sql<number>`count(*)`.as("count"),
    })
    .from(inquiries)
    .where(
      and(
        eq(inquiries.businessId, businessId),
        gte(inquiries.submittedAt, dayStart),
        lt(inquiries.submittedAt, dayEnd),
      ),
    );

  const [quotesSentResult] = await db
    .select({
      count: sql<number>`count(*)`.as("count"),
    })
    .from(quotes)
    .where(
      and(
        eq(quotes.businessId, businessId),
        gte(quotes.sentAt, dayStart),
        lt(quotes.sentAt, dayEnd),
      ),
    );

  const [quotesAcceptedResult] = await db
    .select({
      count: sql<number>`count(*)`.as("count"),
      revenue: sql<number>`coalesce(sum(${quotes.totalInCents}), 0)`.as(
        "revenue",
      ),
    })
    .from(quotes)
    .where(
      and(
        eq(quotes.businessId, businessId),
        eq(quotes.status, "accepted"),
        gte(quotes.acceptedAt, dayStart),
        lt(quotes.acceptedAt, dayEnd),
      ),
    );

  const [quotesRejectedResult] = await db
    .select({
      count: sql<number>`count(*)`.as("count"),
    })
    .from(quotes)
    .where(
      and(
        eq(quotes.businessId, businessId),
        eq(quotes.status, "rejected"),
        gte(quotes.customerRespondedAt, dayStart),
        lt(quotes.customerRespondedAt, dayEnd),
      ),
    );

  const formViews = Number(formViewsResult?.count ?? 0);
  const uniqueVisitors = Number(uniqueVisitorsResult?.count ?? 0);
  const inquirySubmissions = Number(inquiryResult?.count ?? 0);
  const quotesSent = Number(quotesSentResult?.count ?? 0);
  const quotesAccepted = Number(quotesAcceptedResult?.count ?? 0);
  const quotesRejected = Number(quotesRejectedResult?.count ?? 0);
  const revenueCents = Number(quotesAcceptedResult?.revenue ?? 0);

  await db
    .insert(analyticsDailyRollups)
    .values({
      id: createId("adr"),
      businessId,
      date: targetDate,
      formViews,
      uniqueVisitors,
      inquirySubmissions,
      quotesSent,
      quotesAccepted,
      quotesRejected,
      revenueCents,
    })
    .onConflictDoUpdate({
      target: [analyticsDailyRollups.businessId, analyticsDailyRollups.date],
      set: {
        formViews,
        uniqueVisitors,
        inquirySubmissions,
        quotesSent,
        quotesAccepted,
        quotesRejected,
        revenueCents,
        updatedAt: new Date(),
      },
    });
}

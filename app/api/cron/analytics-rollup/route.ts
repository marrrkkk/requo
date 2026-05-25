import { NextResponse } from "next/server";

import { and, eq, gte, lt, sql, isNull } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  analyticsDailyRollups,
  analyticsEvents,
  businesses,
  inquiries,
  quotes,
} from "@/lib/db/schema";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Cron job: aggregates the prior day's raw analytics events, inquiries,
 * and quotes into the `analytics_daily_rollups` table for efficient trend
 * queries. Processes per-business so one failure doesn't block others.
 *
 * Uses ON CONFLICT (business_id, date) DO UPDATE for idempotence — safe
 * to re-run without creating duplicates.
 *
 * Runs daily via Vercel Cron.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await computeDailyRollups();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron/analytics-rollup] Failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

/**
 * Determines the prior day (UTC) and aggregates metrics for each business.
 */
async function computeDailyRollups() {
  // Prior day in UTC
  const now = new Date();
  const yesterday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1),
  );
  const dayAfter = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  const targetDate = yesterday.toISOString().split("T")[0]; // YYYY-MM-DD

  // Get all active businesses
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
        `[cron/analytics-rollup] Failed for business ${business.id}:`,
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

/**
 * Aggregates raw events for a single business on the target date and
 * upserts into analytics_daily_rollups.
 */
async function rollupForBusiness(
  businessId: string,
  targetDate: string,
  dayStart: Date,
  dayEnd: Date,
) {
  // 1. Form views: count deduplicated form view events
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

  // 2. Unique visitors: distinct visitor hashes for the day
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

  // 3. Inquiry submissions: inquiries submitted on this date
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

  // 4. Quotes sent: quotes whose sentAt is on this date
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

  // 5. Quotes accepted on this date
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

  // 6. Quotes rejected on this date (customerRespondedAt with rejected status)
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

  // Upsert: ON CONFLICT (business_id, date) DO UPDATE
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

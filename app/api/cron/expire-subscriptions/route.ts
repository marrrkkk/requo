import { NextResponse } from "next/server";
import { and, eq, isNotNull, lt } from "drizzle-orm";

import { expireSubscription } from "@/lib/billing/subscription-service";
import { db } from "@/lib/db/client";
import { accountSubscriptions } from "@/lib/db/schema/subscriptions";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Cron job: flips `canceled` subscriptions whose `currentPeriodEnd` has
 * passed to `expired`, which downgrades all owned businesses to `free`
 * via `expireSubscription -> updateSubscriptionStatus -> syncOwnerBusinessPlans`.
 *
 * This converges plan state for users when the Polar webhook for the natural
 * period-end event was missed (delivery failure, signature mismatch, retries
 * exhausted, etc.). Without this sweep, canceled subs with a past period-end
 * would keep the cached `businesses.plan` column at the paid value, and
 * public read paths (public inquiry chat AI gating, branding hide-logic on
 * public quote/inquiry pages) would keep granting paid access.
 *
 * Runs daily at 02:00 UTC (configured in vercel.json).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    // Find canceled subscriptions with a past period-end. Only `canceled` is
    // safe to flip here — `active`/`past_due` should be handled by the
    // provider's renewal/dunning flow, not by this sweep.
    const stale = await db
      .select({
        id: accountSubscriptions.id,
        userId: accountSubscriptions.userId,
        currentPeriodEnd: accountSubscriptions.currentPeriodEnd,
      })
      .from(accountSubscriptions)
      .where(
        and(
          eq(accountSubscriptions.status, "canceled"),
          isNotNull(accountSubscriptions.currentPeriodEnd),
          lt(accountSubscriptions.currentPeriodEnd, now),
        ),
      );

    processed = stale.length;

    for (const row of stale) {
      try {
        await expireSubscription(row.userId);
        succeeded++;
      } catch (error) {
        failed++;
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${row.userId}: ${message}`);
        console.error(
          `[cron/expire-subscriptions] Failed to expire subscription for user ${row.userId}:`,
          error,
        );
      }
    }

    return NextResponse.json({
      ok: true,
      processed,
      succeeded,
      failed,
      ...(errors.length > 0 ? { errors: errors.slice(0, 10) } : {}),
    });
  } catch (error) {
    console.error("[cron/expire-subscriptions] Sweep failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

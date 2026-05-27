import "server-only";

import { and, eq, isNotNull, lt } from "drizzle-orm";

import { expireSubscription } from "@/lib/billing/subscription-service";
import { db } from "@/lib/db/client";
import { accountSubscriptions } from "@/lib/db/schema/subscriptions";

export type ExpireSubscriptionsSummary = {
  processed: number;
  succeeded: number;
  failed: number;
  errors?: string[];
};

export async function processExpiredSubscriptions(): Promise<ExpireSubscriptionsSummary> {
  const now = new Date();
  let succeeded = 0;
  let failed = 0;
  const errors: string[] = [];

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

  for (const row of stale) {
    try {
      await expireSubscription(row.userId);
      succeeded++;
    } catch (error) {
      failed++;
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${row.userId}: ${message}`);
      console.error(
        `[expire-subscriptions] Failed to expire subscription for user ${row.userId}:`,
        error,
      );
    }
  }

  return {
    processed: stale.length,
    succeeded,
    failed,
    ...(errors.length > 0 ? { errors: errors.slice(0, 10) } : {}),
  };
}

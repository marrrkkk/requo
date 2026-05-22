/**
 * scripts/debug-billing-events.ts
 *
 * One-shot debug print of recent billing_events + account_subscriptions
 * + payment_attempts for the most recent Polar checkout. Useful when
 * a checkout completed but the subscription didn't activate.
 *
 * Run: npx tsx scripts/debug-billing-events.ts
 */
import "dotenv/config";

import { desc } from "drizzle-orm";

import { db, dbConnection } from "../lib/db/client";
import {
  accountSubscriptions,
  billingEvents,
  paymentAttempts,
} from "../lib/db/schema/subscriptions";

async function main() {
  console.log("\n=== Most recent billing_events (last 15) ===\n");
  const events = await db
    .select()
    .from(billingEvents)
    .orderBy(desc(billingEvents.createdAt))
    .limit(15);
  for (const e of events) {
    console.log(
      `[${e.createdAt.toISOString()}] ${e.eventType.padEnd(30)} ` +
        `userId=${e.userId ?? "null"} status=${e.status} ` +
        `error=${e.errorMessage ?? "-"}`,
    );
    console.log(`   providerEventId=${e.providerEventId}`);
    if (e.eventType.startsWith("subscription.")) {
      const data = (e.payload as { data?: Record<string, unknown> })?.data;
      console.log(
        `   data.productId=${data?.productId ?? data?.product_id ?? "?"}, ` +
          `data.id=${data?.id ?? "?"}, ` +
          `customer.externalId=${
            (data as { customer?: { externalId?: unknown; external_id?: unknown } })
              ?.customer?.externalId ??
            (data as { customer?: { external_id?: unknown } })?.customer
              ?.external_id ??
            "null"
          }`,
      );
    }
    console.log();
  }

  console.log("=== account_subscriptions (last 5) ===\n");
  const subs = await db
    .select()
    .from(accountSubscriptions)
    .orderBy(desc(accountSubscriptions.updatedAt))
    .limit(5);
  for (const s of subs) {
    console.log(
      `userId=${s.userId} status=${s.status} plan=${s.plan} ` +
        `providerSubId=${s.providerSubscriptionId ?? "null"}`,
    );
  }

  console.log("\n=== payment_attempts (last 5) ===\n");
  const pays = await db
    .select()
    .from(paymentAttempts)
    .orderBy(desc(paymentAttempts.createdAt))
    .limit(5);
  for (const p of pays) {
    console.log(
      `userId=${p.userId ?? "null"} status=${p.status} amount=${p.amount} ` +
        `${p.currency} providerPaymentId=${p.providerPaymentId}`,
    );
  }

  console.log("\n=== Configured POLAR_*_PRODUCT_ID env values ===\n");
  console.log(`POLAR_PRO_PRODUCT_ID          = ${process.env.POLAR_PRO_PRODUCT_ID ?? "(unset)"}`);
  console.log(`POLAR_PRO_YEARLY_PRODUCT_ID   = ${process.env.POLAR_PRO_YEARLY_PRODUCT_ID ?? "(unset)"}`);
  console.log(`POLAR_BUSINESS_PRODUCT_ID     = ${process.env.POLAR_BUSINESS_PRODUCT_ID ?? "(unset)"}`);
  console.log(`POLAR_BUSINESS_YEARLY_PRODUCT_ID = ${process.env.POLAR_BUSINESS_YEARLY_PRODUCT_ID ?? "(unset)"}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await dbConnection.end({ timeout: 5 });
  });

/**
 * scripts/backfill-polar-subscription.ts
 *
 * One-shot recovery script for a Polar subscription whose
 * subscription.* webhook events failed (typically due to a transient
 * resolver bug). Reads a failed `subscription.*` event from
 * `billing_events` plus the corresponding paid order, then activates
 * the subscription via the canonical `subscription-service` writer.
 *
 * Run: npx tsx scripts/backfill-polar-subscription.ts <providerSubscriptionId>
 *   e.g.  npx tsx scripts/backfill-polar-subscription.ts 6a9c0413-4a36-4e92-97d4-e6b0a9ad04fe
 *
 * After running, the matching `subscription.*` webhook events should
 * also be re-replayed from the Polar dashboard so future renewals fire
 * cleanly through the canonical handler chain.
 */
import "dotenv/config";

import { and, desc, eq, like } from "drizzle-orm";

import { activateSubscription } from "../lib/billing/subscription-service";
import { db, dbConnection } from "../lib/db/client";
import { billingEvents } from "../lib/db/schema/subscriptions";
import {
  reversePolarProductId,
  getPolarProductIds,
} from "../lib/billing/polar-products";

async function main() {
  const subId = process.argv[2];
  if (!subId) {
    console.error(
      "Usage: npx tsx scripts/backfill-polar-subscription.ts <providerSubscriptionId>",
    );
    process.exit(1);
  }

  console.log(`\nBackfilling for providerSubscriptionId=${subId}\n`);

  // Find the most recent subscription.* event for this subscription id.
  const [event] = await db
    .select()
    .from(billingEvents)
    .where(
      and(
        eq(billingEvents.provider, "polar"),
        like(billingEvents.providerEventId, `subscription.%:${subId}`),
      ),
    )
    .orderBy(desc(billingEvents.createdAt))
    .limit(1);

  if (!event) {
    console.error(`No subscription.* billing_events row matched ${subId}`);
    process.exit(1);
  }

  const data = (event.payload as { data?: Record<string, unknown> })?.data ?? {};
  const productId =
    (data as { productId?: unknown }).productId ??
    (data as { product_id?: unknown }).product_id;
  const customer = (data as { customer?: Record<string, unknown> }).customer ?? {};
  const externalId =
    (customer as { externalId?: unknown }).externalId ??
    (customer as { external_id?: unknown }).external_id;
  const customerId = (customer as { id?: unknown }).id;
  const periodStart =
    (data as { currentPeriodStart?: unknown }).currentPeriodStart ??
    (data as { current_period_start?: unknown }).current_period_start;
  const periodEnd =
    (data as { currentPeriodEnd?: unknown }).currentPeriodEnd ??
    (data as { current_period_end?: unknown }).current_period_end;

  if (typeof externalId !== "string" || externalId.length === 0) {
    console.error("Payload does not carry a customer.externalId / external_id.");
    process.exit(1);
  }
  if (typeof productId !== "string" || productId.length === 0) {
    console.error("Payload does not carry a product id.");
    process.exit(1);
  }

  const mapping = reversePolarProductId(productId, getPolarProductIds());
  if (!mapping) {
    console.error(
      `Product id ${productId} is not configured in POLAR_*_PRODUCT_ID env. ` +
        "Set the env value first, then re-run.",
    );
    process.exit(1);
  }

  console.log(
    `Resolved: userId=${externalId}, plan=${mapping.plan}, interval=${mapping.interval}`,
  );
  console.log(`         customerId=${String(customerId)}, subId=${subId}`);
  console.log(
    `         period=${String(periodStart)} -> ${String(periodEnd)}\n`,
  );

  const subscription = await activateSubscription({
    userId: externalId,
    plan: mapping.plan,
    provider: "polar",
    currency: "USD",
    status: "active",
    providerCustomerId: typeof customerId === "string" ? customerId : null,
    providerSubscriptionId: subId,
    currentPeriodStart:
      typeof periodStart === "string" ? new Date(periodStart) : null,
    currentPeriodEnd:
      typeof periodEnd === "string" ? new Date(periodEnd) : null,
  });

  console.log(
    `✓ activated account_subscriptions row id=${subscription.id} ` +
      `userId=${subscription.userId} plan=${subscription.plan} ` +
      `status=${subscription.status}`,
  );

  // Mark the failed billing_events row as processed retroactively so
  // operators can see the recovery in the history.
  await db
    .update(billingEvents)
    .set({
      status: "processed",
      processedAt: new Date(),
      errorMessage: null,
      userId: externalId,
    })
    .where(eq(billingEvents.id, event.id));

  console.log("✓ marked source billing_events row as processed");
}

main()
  .catch((error) => {
    console.error("❌ Backfill failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await dbConnection.end({ timeout: 5 });
  });

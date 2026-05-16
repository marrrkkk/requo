import "server-only";

import { env } from "@/lib/env";
import type { BillingInterval, PaidPlan } from "@/lib/billing/types";

/**
 * Pure helpers for resolving Requo `(plan, interval)` pairs to Polar
 * product ids and back. The mapping is sourced from `POLAR_*_PRODUCT_ID`
 * env vars — there is no I/O and no module state beyond the env read.
 *
 * Used by both the redirect route in
 * `app/api/account/billing/checkout/route.ts` (forward lookup, picks
 * the product id to hand to the canonical `Checkout` adapter) and the
 * subscription webhook handler (reverse lookup, recovers the plan
 * from a `subscription.*` event payload).
 */

export type PolarProductIdMap = {
  proMonthly?: string;
  proYearly?: string;
  businessMonthly?: string;
  businessYearly?: string;
};

const PRODUCT_KEYS = {
  "pro:monthly": "proMonthly",
  "pro:yearly": "proYearly",
  "business:monthly": "businessMonthly",
  "business:yearly": "businessYearly",
} as const;

/**
 * Returns the product id map sourced from the current env. Reads env
 * on every call — env is parsed once at process start, so the call
 * cost is just four object property reads.
 */
export function getPolarProductIds(): PolarProductIdMap {
  return {
    proMonthly: env.POLAR_PRO_PRODUCT_ID,
    proYearly: env.POLAR_PRO_YEARLY_PRODUCT_ID,
    businessMonthly: env.POLAR_BUSINESS_PRODUCT_ID,
    businessYearly: env.POLAR_BUSINESS_YEARLY_PRODUCT_ID,
  };
}

/**
 * Resolves a `(plan, interval)` pair to the configured Polar product
 * id, or `undefined` when no product id is configured for that pair.
 */
export function getPolarProductId(
  plan: PaidPlan,
  interval: BillingInterval,
  productIds: PolarProductIdMap = getPolarProductIds(),
): string | undefined {
  const key = `${plan}:${interval}` as keyof typeof PRODUCT_KEYS;
  const productKey = PRODUCT_KEYS[key];
  return productIds[productKey];
}

/**
 * Reverse-maps a Polar product id to the Requo `(plan, interval)`
 * pair. Pure lookup over the four entries in the supplied map —
 * exported for the webhook subscription handler.
 */
export function reversePolarProductId(
  productId: string,
  productIds: PolarProductIdMap = getPolarProductIds(),
): { plan: PaidPlan; interval: BillingInterval } | undefined {
  if (!productId) return undefined;

  if (productId === productIds.proMonthly) {
    return { plan: "pro", interval: "monthly" };
  }
  if (productId === productIds.proYearly) {
    return { plan: "pro", interval: "yearly" };
  }
  if (productId === productIds.businessMonthly) {
    return { plan: "business", interval: "monthly" };
  }
  if (productId === productIds.businessYearly) {
    return { plan: "business", interval: "yearly" };
  }

  return undefined;
}

/**
 * Adaptive Currency display helpers.
 *
 * Dodo Payments handles the actual PHP conversion at checkout. This
 * module provides indicative PHP approximations for the marketing
 * pricing page, plus a disclaimer string. The exchange rate is a
 * hardcoded indicative value, not a real-time market rate.
 */

import type { BillingInterval } from "@/lib/billing/types";

/** Hardcoded indicative USD→PHP exchange rate. Update manually. */
export const USD_TO_PHP_RATE = 56.5;

/** Returns the approximate PHP amount in whole pesos for a USD cent value. */
export function getPhpApproximation(usdCents: number): number {
  if (!Number.isFinite(usdCents) || usdCents <= 0) return 0;
  const usd = usdCents / 100;
  const php = usd * USD_TO_PHP_RATE;
  return Math.round(php);
}

/** Formats a whole-peso PHP amount as "₱350". */
export function formatPhpApproximation(pesos: number): string {
  if (!Number.isFinite(pesos) || pesos <= 0) return "";
  return `₱${pesos.toLocaleString("en-PH")}`;
}

/** Builds the disclaimer line shown next to PHP approximations. */
export function getPhpDisclaimer(
  pesos: number,
  interval: BillingInterval,
): string {
  const formatted = formatPhpApproximation(pesos);
  const cadence = interval === "monthly" ? "month" : "year";
  return `Approx. ${formatted}/${cadence}. Final PHP amount shown at checkout.`;
}

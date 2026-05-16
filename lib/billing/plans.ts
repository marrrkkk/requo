/**
 * Plan pricing definitions for the billing system.
 *
 * USD is the authoritative base currency. Polar handles any
 * local-currency display natively per product at checkout.
 */

import type { BillingCurrency, BillingInterval, PaidPlan, PlanPricing } from "@/lib/billing/types";

/** Prices in smallest currency unit (USD cents). */
export const planPricing: Record<BillingInterval, Record<PaidPlan, PlanPricing>> = {
  monthly: {
    pro: { USD: 599 },
    business: { USD: 1299 },
  },
  yearly: {
    pro: { USD: 5990 },
    business: { USD: 12990 },
  },
};

/** Returns the price in smallest unit for a plan, currency and interval. */
export function getPlanPrice(
  plan: PaidPlan,
  currency: BillingCurrency,
  interval: BillingInterval = "monthly",
): number {
  const pricing = planPricing[interval][plan];
  // PHP entries are optional (display-only approximation). Fall back to
  // the USD base price when no explicit PHP entry is configured.
  return pricing[currency] ?? pricing.USD;
}

/** Formats a price for display in the given currency. */
export function formatPrice(
  amountInSmallestUnit: number,
  currency: BillingCurrency,
): string {
  if (currency === "PHP") {
    // PHP amounts are stored in centavos; display as whole pesos
    // formatted with the en-PH locale (e.g. "₱1,299"), no decimals.
    const pesos = Math.round(amountInSmallestUnit / 100);
    if (!Number.isFinite(pesos) || pesos <= 0) return "";
    return `₱${pesos.toLocaleString("en-PH")}`;
  }
  const decimal = amountInSmallestUnit / 100;
  return `$${decimal.toFixed(2)}`;
}

/** Returns the formatted price string for a plan, currency and interval. */
export function getPlanPriceLabel(
  plan: PaidPlan,
  currency: BillingCurrency,
  interval: BillingInterval = "monthly",
): string {
  const suffix = interval === "monthly" ? "/mo" : "/yr";
  return `${formatPrice(getPlanPrice(plan, currency, interval), currency)}${suffix}`;
}

/**
 * Returns the monthly equivalent label for yearly plans.
 * e.g. "$4.16/mo" for Pro yearly at USD.
 */
export function getMonthlyEquivalentLabel(
  plan: PaidPlan,
  currency: BillingCurrency,
): string {
  const yearlyPrice = getPlanPrice(plan, currency, "yearly");
  const monthlyEquivalent = Math.round(yearlyPrice / 12);
  return `${formatPrice(monthlyEquivalent, currency)}/mo`;
}

/**
 * Returns the savings percentage for yearly vs monthly billing.
 */
export function getYearlySavingsPercent(
  plan: PaidPlan,
  currency: BillingCurrency,
): number {
  const monthlyTotal = getPlanPrice(plan, currency, "monthly") * 12;
  const yearlyTotal = getPlanPrice(plan, currency, "yearly");
  return Math.round(((monthlyTotal - yearlyTotal) / monthlyTotal) * 100);
}

/** Returns the currency symbol for a billing currency. */
export function getCurrencySymbol(currency: BillingCurrency): string {
  if (currency === "PHP") return "₱";
  return "$";
}

/**
 * Plan pricing definitions for the billing system.
 *
 * Prices are intentional localized plan prices — not exchange-rate conversions.
 * PHP is shown to Philippines users, USD to everyone else.
 *
 * Yearly pricing gives ~2 months free (~17% discount).
 */

import type { BillingCurrency, BillingInterval, PaidPlan, PlanPricing } from "@/lib/billing/types";

/** Prices in smallest currency unit (centavos for PHP, cents for USD). */
export const planPricing: Record<BillingInterval, Record<PaidPlan, PlanPricing>> = {
  monthly: {
    pro: { PHP: 29900, USD: 499 },
    business: { PHP: 59900, USD: 999 },
  },
  yearly: {
    pro: { PHP: 299000, USD: 4990 },
    business: { PHP: 599000, USD: 9990 },
  },
};

/** Returns the price in smallest unit for a plan, currency and interval. */
export function getPlanPrice(
  plan: PaidPlan,
  currency: BillingCurrency,
  interval: BillingInterval = "monthly",
): number {
  return planPricing[interval][plan][currency];
}

/** Formats a price for display. */
export function formatPrice(
  amountInSmallestUnit: number,
  currency: BillingCurrency,
): string {
  const decimal = amountInSmallestUnit / 100;

  if (currency === "PHP") {
    return `₱${decimal.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

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
  return currency === "PHP" ? "₱" : "$";
}

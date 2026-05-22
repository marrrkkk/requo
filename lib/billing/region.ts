/**
 * Detect the visitor's display currency from Vercel geo headers.
 *
 * On Vercel, the `x-vercel-ip-country` header contains the ISO 3166-1
 * alpha-2 country code. When the visitor is in the Philippines we show
 * PHP display prices; everywhere else defaults to USD.
 *
 * This is display-only — Polar always bills in USD.
 */

import { headers } from "next/headers";
import type { BillingCurrency } from "@/lib/billing/types";

/**
 * Returns `"PHP"` when the visitor appears to be in the Philippines,
 * otherwise `"USD"`.
 */
export async function detectDisplayCurrency(): Promise<BillingCurrency> {
  const headerStore = await headers();
  const country = headerStore.get("x-vercel-ip-country");
  return country === "PH" ? "PHP" : "USD";
}

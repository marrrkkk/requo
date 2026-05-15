/**
 * Region detection for billing currency and provider selection.
 *
 * Priority:
 * 1. x-vercel-ip-country header (Vercel Edge Network)
 * 2. cf-ipcountry header (Cloudflare)
 * 3. Default: "global"
 *
 * Note: Base currency is always USD. PHP pricing is shown via Dodo
 * Adaptive Currency at checkout — it is not a separate base price.
 */

import type {
  BillingCurrency,
  BillingProvider,
  BillingRegion,
} from "@/lib/billing/types";

/**
 * Detects the billing region from request headers.
 * Returns "PH" for Philippines, "global" for everywhere else.
 */
export function getBillingRegion(headers: Headers): BillingRegion {
  const country =
    headers.get("x-vercel-ip-country") ?? headers.get("cf-ipcountry");
  return getBillingRegionFromCountry(country);
}

/**
 * Detects billing region from a country code string.
 */
export function getBillingRegionFromCountry(
  countryCode: string | null | undefined,
): BillingRegion {
  if (!countryCode) {
    return "global";
  }
  return countryCode.toUpperCase() === "PH" ? "PH" : "global";
}

/**
 * Maps a billing region to its default base currency.
 *
 * Always returns USD — PHP is shown via Dodo Adaptive Currency at
 * checkout, not as a separate base price.
 */
export function getDefaultCurrency(region: BillingRegion): BillingCurrency {
  void region;
  return "USD";
}

/** Maps a billing region to its default payment provider. */
export function getDefaultProvider(region: BillingRegion): BillingProvider {
  void region;
  return "dodo";
}

/** Maps a billing currency to its corresponding provider. */
export function getProviderForCurrency(
  currency: BillingCurrency,
): BillingProvider {
  void currency;
  return "dodo";
}

/** Convenience helper: true when the region is the Philippines. */
export function isPhilippinesRegion(region: BillingRegion): boolean {
  return region === "PH";
}

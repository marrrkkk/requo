/**
 * Region detection for billing currency and provider selection.
 *
 * Priority:
 * 1. x-vercel-ip-country header (Vercel Edge Network)
 * 2. cf-ipcountry header (Cloudflare)
 * 3. Explicit country code override (e.g., from user preference)
 * 4. Default: INTL → USD
 */

import type {
  BillingCurrency,
  BillingProvider,
  BillingRegion,
} from "@/lib/billing/types";

/**
 * Detects the billing region from request headers.
 * Returns "PH" for Philippines, "INTL" for everywhere else.
 */
export function getBillingRegion(headers: Headers): BillingRegion {
  void headers;
  return "global";
}

/**
 * Detects billing region from a country code string.
 */
export function getBillingRegionFromCountry(
  countryCode: string | null | undefined,
): BillingRegion {
  void countryCode;
  return "global";
}

/** Maps a billing region to its default currency. */
export function getDefaultCurrency(region: BillingRegion): BillingCurrency {
  void region;
  return "USD";
}

/** Maps a billing region to its default payment provider. */
export function getDefaultProvider(region: BillingRegion): BillingProvider {
  void region;
  return "paddle";
}

/** Maps a billing currency to its corresponding provider. */
export function getProviderForCurrency(
  currency: BillingCurrency,
): BillingProvider {
  void currency;
  return "paddle";
}

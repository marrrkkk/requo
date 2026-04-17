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
  const vercelCountry = headers.get("x-vercel-ip-country");

  if (vercelCountry) {
    return vercelCountry.toUpperCase() === "PH" ? "PH" : "INTL";
  }

  const cfCountry = headers.get("cf-ipcountry");

  if (cfCountry) {
    return cfCountry.toUpperCase() === "PH" ? "PH" : "INTL";
  }

  return "INTL";
}

/**
 * Detects billing region from a country code string.
 */
export function getBillingRegionFromCountry(
  countryCode: string | null | undefined,
): BillingRegion {
  if (!countryCode) {
    return "INTL";
  }

  return countryCode.toUpperCase() === "PH" ? "PH" : "INTL";
}

/** Maps a billing region to its default currency. */
export function getDefaultCurrency(region: BillingRegion): BillingCurrency {
  return region === "PH" ? "PHP" : "USD";
}

/** Maps a billing region to its default payment provider. */
export function getDefaultProvider(region: BillingRegion): BillingProvider {
  return region === "PH" ? "paymongo" : "paddle";
}

/** Maps a billing currency to its corresponding provider. */
export function getProviderForCurrency(
  currency: BillingCurrency,
): BillingProvider {
  return currency === "PHP" ? "paymongo" : "paddle";
}

import { redirect } from "next/navigation";

import { dashboardPath } from "@/features/businesses/routes";
import { requireSession } from "@/lib/auth/session";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type CheckoutPageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

function readParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

/**
 * Same-origin allowlist for the post-checkout return URL.
 */
function resolveReturnTo(value: string | null): string {
  if (!value) return dashboardPath;

  const trimmed = value.trim();

  if (!trimmed.startsWith("/")) return dashboardPath;
  if (trimmed.startsWith("//")) return dashboardPath;
  if (trimmed.startsWith("/api/")) return dashboardPath;

  return trimmed;
}

/**
 * Polar hosted-checkout return page.
 *
 * Polar redirects the user here after completing checkout. The webhook
 * is the source of truth for subscription state and handles cache
 * invalidation. This page simply redirects the user to their destination
 * with an upgrade flag so a toast can be shown.
 */
export default async function AccountBillingCheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  // Ensure user is authenticated before redirecting.
  await requireSession();

  const resolvedSearchParams = await searchParams;
  const returnTo = resolveReturnTo(readParam(resolvedSearchParams.returnTo));

  const url = new URL(returnTo, "http://placeholder.local");
  url.searchParams.set("upgrade", "success");

  redirect(`${url.pathname}${url.search}`);
}

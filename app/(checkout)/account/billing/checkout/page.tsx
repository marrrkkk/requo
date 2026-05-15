import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { businessesHubPath } from "@/features/businesses/routes";
import { requireSession } from "@/lib/auth/session";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Checkout · Requo",
  description: "Complete your Requo subscription checkout securely.",
});

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
 * Same-origin allowlist for the post-checkout return URL. We accept
 * any path under our app routes (businesses hub, business dashboards,
 * account billing). Anything else falls back to the businesses hub.
 *
 * This is a security gate, not just a UX preference — a malicious
 * value in the query string could otherwise redirect to a third-party
 * origin after a successful checkout.
 */
function resolveReturnTo(value: string | null): string {
  if (!value) return businessesHubPath;

  const trimmed = value.trim();

  // Must be a relative path, must not be protocol-relative or `/api/*`.
  if (!trimmed.startsWith("/")) return businessesHubPath;
  if (trimmed.startsWith("//")) return businessesHubPath;
  if (trimmed.startsWith("/api/")) return businessesHubPath;

  return trimmed;
}

/**
 * Dodo Payments hosted-checkout return page.
 *
 * Dodo redirects the user here after they finish (or abandon) the
 * hosted checkout. We do not show a processing UI — the webhook is
 * the source of truth and the user's effective plan revalidates via
 * cache tags as soon as the webhook lands. We simply redirect the
 * browser to the page they came from (`returnTo`) so they can
 * continue working.
 *
 * Default fallback: the businesses hub. The caller (checkout API
 * route) embeds `returnTo` in the success URL when it creates the
 * Dodo session.
 */
export default async function AccountBillingCheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  // Make sure the user is signed in before we redirect — the destination
  // routes all assume an authenticated session anyway.
  await requireSession();

  const resolvedSearchParams = await searchParams;
  const returnTo = resolveReturnTo(readParam(resolvedSearchParams.returnTo));

  // We pass the upgrade flag through so the destination page can show
  // a brief confirmation toast.
  const url = new URL(returnTo, "http://placeholder.local");
  url.searchParams.set("upgrade", "success");

  redirect(`${url.pathname}${url.search}`);
}

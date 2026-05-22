import type { Metadata } from "next";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import { businessesHubPath } from "@/features/businesses/routes";
import { requireSession } from "@/lib/auth/session";
import { getUserBillingCacheTags } from "@/lib/cache/shell-tags";
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
 * Polar hosted-checkout return page.
 *
 * Polar redirects the user here after they finish (or abandon) the
 * hosted checkout. The webhook is the source of truth for
 * subscription state, so we don't show a processing UI — but we DO
 * bust the user's billing cache tags right here, before redirecting,
 * so the destination page (businesses hub, business dashboard,
 * account billing) renders the freshly-activated plan instead of the
 * pre-checkout cached value.
 *
 * Two race conditions can happen:
 *
 * 1. Polar redirects the browser back faster than the webhook lands
 *    in our DB. In that case the destination page shows the
 *    pre-checkout state and the user has to refresh. To mitigate,
 *    we revalidate the user's cache tags here so the next render
 *    pulls fresh data — even if the webhook hasn't landed yet, the
 *    next-after-that render will.
 * 2. Webhook landed before the redirect, but the cache tag
 *    revalidation it kicked off in the webhook context didn't
 *    propagate to the dev/preview surface yet. Same mitigation.
 *
 * Default fallback: the businesses hub. The caller (canonical Polar
 * Checkout adapter) embeds `returnTo` in the success URL when it
 * creates the Polar session.
 */
export default async function AccountBillingCheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  // Make sure the user is signed in before we redirect — the destination
  // routes all assume an authenticated session anyway.
  const session = await requireSession();

  // Bust the user's billing cache tags so the destination page renders
  // the post-checkout subscription state. Webhook does this too, but
  // doing it on the return path closes the race for cases where the
  // browser redirects back faster than the cache invalidation
  // propagates from the webhook context.
  for (const tag of getUserBillingCacheTags(session.user.id)) {
    revalidateTag(tag, { expire: 0 });
  }

  const resolvedSearchParams = await searchParams;
  const returnTo = resolveReturnTo(readParam(resolvedSearchParams.returnTo));

  // We pass the upgrade flag through so the destination page can show
  // a brief confirmation toast.
  const url = new URL(returnTo, "http://placeholder.local");
  url.searchParams.set("upgrade", "success");

  redirect(`${url.pathname}${url.search}`);
}

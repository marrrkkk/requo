import "server-only";

import { Checkout } from "@polar-sh/nextjs";

import { env } from "@/lib/env";

/**
 * Canonical Polar checkout adapter route.
 *
 * Per `@polar-sh/nextjs`, this is a `GET` route that the user
 * navigates to with `?products=<polarProductId>` and optional
 * `customerExternalId` / `customerEmail` query params. The adapter
 * creates the Polar checkout session on the fly and 302-redirects
 * the browser to the hosted checkout URL.
 *
 * Eligibility checks (auth, existing-subscription, missing email,
 * `isPolarConfigured`, `(plan, interval) -> productId` resolution)
 * live in `app/api/account/billing/checkout/route.ts`, which is the
 * thin wrapper that callers POST to and then redirect through this
 * route.
 */
export const GET = Checkout({
  accessToken: env.POLAR_ACCESS_TOKEN ?? "",
  successUrl: `${env.NEXT_PUBLIC_APP_URL ?? ""}/account/billing/checkout`,
  server: env.POLAR_SERVER,
});

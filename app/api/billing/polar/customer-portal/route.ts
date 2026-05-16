import "server-only";

import { CustomerPortal } from "@polar-sh/nextjs";

import { requireUser } from "@/lib/auth/session";
import { getAccountSubscription } from "@/lib/billing/subscription-service";
import { env } from "@/lib/env";

/**
 * Polar Customer Portal route.
 *
 * Uses the canonical `@polar-sh/nextjs` `CustomerPortal` adapter. The
 * `getCustomerId` callback resolves the authenticated user, looks up
 * their `account_subscriptions.providerCustomerId`, and returns it. If
 * the user is unauthenticated or has no provider customer id yet, the
 * thrown error propagates up through the adapter and is surfaced as a
 * 4xx by Polar's adapter.
 *
 * UI callers are gated separately on `subscription.providerCustomerId`
 * being non-null, so this route is only reachable for users with an
 * active billing relationship.
 *
 * Usage: GET /api/billing/polar/customer-portal
 */
export const GET = CustomerPortal({
  accessToken: env.POLAR_ACCESS_TOKEN ?? "",
  server: env.POLAR_SERVER,
  getCustomerId: async () => {
    const user = await requireUser();
    const subscription = await getAccountSubscription(user.id);
    if (!subscription?.providerCustomerId) {
      throw new Error("No billing account found. Subscribe to a plan first.");
    }
    return subscription.providerCustomerId;
  },
  returnUrl: `${env.NEXT_PUBLIC_APP_URL ?? ""}/account/billing`,
});

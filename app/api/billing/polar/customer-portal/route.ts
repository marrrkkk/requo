import "server-only";

import { NextResponse } from "next/server";
import { Polar } from "@polar-sh/sdk";

import { requireUser } from "@/lib/auth/session";
import { getAccountSubscription } from "@/lib/billing/subscription-service";
import { env, isPolarConfigured } from "@/lib/env";

/**
 * Polar Customer Portal route.
 *
 * Resolves the authenticated user's `providerCustomerId` from
 * `account_subscriptions`, then creates a customer-portal session via
 * the Polar SDK and redirects the browser to the portal URL.
 *
 * UI callers are gated separately on `subscription.providerCustomerId`
 * being non-null, so this route is only reachable for users with an
 * active billing relationship.
 *
 * Usage: GET /api/billing/polar/customer-portal
 */
export async function GET(): Promise<Response> {
  if (!isPolarConfigured || !env.POLAR_ACCESS_TOKEN) {
    return NextResponse.json(
      { error: "Billing is not configured." },
      { status: 503 },
    );
  }

  const user = await requireUser();
  const subscription = await getAccountSubscription(user.id);

  if (!subscription?.providerCustomerId) {
    return NextResponse.json(
      { error: "No billing account found. Subscribe to a plan first." },
      { status: 404 },
    );
  }

  const returnUrl = `${env.NEXT_PUBLIC_APP_URL ?? ""}/account/billing`;

  const polar = new Polar({
    accessToken: env.POLAR_ACCESS_TOKEN,
    server: env.POLAR_SERVER,
  });

  try {
    const session = await polar.customerSessions.create({
      customerId: subscription.providerCustomerId,
      returnUrl,
    });

    return NextResponse.redirect(session.customerPortalUrl);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not open billing portal.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

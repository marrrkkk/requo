import "server-only";

import { NextResponse } from "next/server";
import { Polar } from "@polar-sh/sdk";

import { env, isPolarConfigured } from "@/lib/env";

/**
 * Polar checkout route.
 *
 * Accepts `?products=<polarProductId>` and optional
 * `customerExternalId`, `customerEmail`, `customerIpAddress` query
 * params. Creates the Polar checkout session on the fly and
 * 302-redirects the browser to the hosted checkout URL.
 *
 * Eligibility checks (auth, existing-subscription, missing email,
 * `isPolarConfigured`, `(plan, interval) -> productId` resolution)
 * live in `app/api/account/billing/checkout/route.ts`, which is the
 * thin wrapper that callers POST to and then redirect through this
 * route.
 */
export async function GET(request: Request): Promise<Response> {
  if (!isPolarConfigured || !env.POLAR_ACCESS_TOKEN) {
    return NextResponse.json(
      { error: "Billing is not configured." },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const productId = url.searchParams.get("products");
  const customerExternalId = url.searchParams.get("customerExternalId");
  const customerEmail = url.searchParams.get("customerEmail");
  const customerIpAddress = url.searchParams.get("customerIpAddress");

  if (!productId) {
    return NextResponse.json(
      { error: "Missing products parameter." },
      { status: 400 },
    );
  }

  const successUrl = `${env.NEXT_PUBLIC_APP_URL ?? ""}/account/billing/checkout`;

  const polar = new Polar({ accessToken: env.POLAR_ACCESS_TOKEN, server: env.POLAR_SERVER });

  try {
    const checkout = await polar.checkouts.create({
      products: [productId],
      successUrl,
      ...(customerExternalId
        ? { externalCustomerId: customerExternalId }
        : {}),
      ...(customerEmail ? { customerEmail } : {}),
      ...(customerIpAddress ? { customerIpAddress } : {}),
    });

    return NextResponse.redirect(checkout.url);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Checkout creation failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

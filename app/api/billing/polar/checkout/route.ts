import "server-only";

import { NextResponse } from "next/server";
import { Polar } from "@polar-sh/sdk";

import { env, isPolarConfigured } from "@/lib/env";

/**
 * Polar checkout route.
 *
 * Accepts `?products=<polarProductId>` plus optional
 * `customerExternalId`, `customerEmail`, `customerIpAddress`, and
 * `returnTo` query params. Creates the Polar checkout session and
 * 302-redirects the browser to the hosted checkout URL.
 *
 * `returnTo` (when present and a same-origin path) is appended to
 * the success URL Polar redirects to after a completed checkout. The
 * post-checkout page at `app/(checkout)/account/billing/checkout/page.tsx`
 * reads it back and routes the user to the right page (business
 * dashboard, businesses hub, etc).
 *
 * Eligibility checks (auth, existing-subscription, missing email,
 * `isPolarConfigured`, `(plan, interval) -> productId` resolution)
 * live in `app/api/account/billing/checkout/route.ts`, which is the
 * thin wrapper that callers POST to and then redirect through this
 * route.
 */

function sanitizeReturnTo(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("//")) return null;
  if (trimmed.startsWith("/api/")) return null;
  if (trimmed.length > 512) return null;
  return trimmed;
}

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
  const returnTo = sanitizeReturnTo(url.searchParams.get("returnTo"));

  if (!productId) {
    return NextResponse.json(
      { error: "Missing products parameter." },
      { status: 400 },
    );
  }

  const baseSuccessUrl = new URL(
    "/account/billing/checkout",
    env.NEXT_PUBLIC_APP_URL ?? url.origin,
  );
  if (returnTo) {
    baseSuccessUrl.searchParams.set("returnTo", returnTo);
  }
  const successUrl = baseSuccessUrl.toString();

  const polar = new Polar({
    accessToken: env.POLAR_ACCESS_TOKEN,
    server: env.POLAR_SERVER,
  });

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

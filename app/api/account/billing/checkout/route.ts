import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { getBillingProvider } from "@/lib/billing/providers";
import { getAccountSubscription } from "@/lib/billing/subscription-service";
import { env, isDodoConfigured } from "@/lib/env";

/**
 * Creates a Dodo Payments hosted checkout session and returns the
 * redirect URL for the client to follow. The success and cancel URLs
 * are absolute origins so Dodo can redirect users back to this app
 * after completing or abandoning checkout.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.10, 11.1, 11.9
 */

const checkoutBodySchema = z.object({
  plan: z.enum(["pro", "business"]),
  interval: z.enum(["monthly", "yearly"]),
  returnTo: z.string().trim().max(512).optional(),
});

function sanitizeReturnTo(value: string | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  if (value.startsWith("/api/")) return null;
  return value;
}

function resolveAppOrigin(): string | null {
  // For user-facing redirects (success/cancel URLs), prefer the local
  // origin (BETTER_AUTH_URL = http://localhost:3000) so the browser
  // lands on localhost after checkout. NEXT_PUBLIC_APP_URL may be the
  // ngrok tunnel used only for webhook delivery.
  const candidates = [
    env.BETTER_AUTH_URL,
    env.NEXT_PUBLIC_APP_URL,
    env.VERCEL_URL,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    const value = candidate.startsWith("http")
      ? candidate
      : `https://${candidate}`;

    try {
      return new URL(value).origin;
    } catch {
      continue;
    }
  }

  return null;
}

function isConfigurationError(message: string): boolean {
  // Heuristic: provider-side configuration problems surface as messages
  // that mention missing product configuration. Treat those as 503 so
  // the client UI can distinguish a temporary backend issue from a
  // permanent provider-side failure.
  return /no dodo product configured/i.test(message);
}

export async function POST(request: Request): Promise<Response> {
  if (!isDodoConfigured) {
    return NextResponse.json(
      { error: "Billing is not configured." },
      { status: 503 },
    );
  }

  let user: Awaited<ReturnType<typeof requireUser>>;

  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const parsed = checkoutBodySchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid plan or interval." },
      { status: 400 },
    );
  }

  const { plan, interval } = parsed.data;
  const returnTo = sanitizeReturnTo(parsed.data.returnTo);

  const existing = await getAccountSubscription(user.id);

  if (
    existing &&
    (existing.status === "active" || existing.status === "past_due") &&
    existing.plan === plan
  ) {
    return NextResponse.json(
      { error: "You're already subscribed to this plan." },
      { status: 409 },
    );
  }

  const userEmail = user.email;

  if (!userEmail) {
    return NextResponse.json(
      { error: "Account email is required to start checkout." },
      { status: 400 },
    );
  }

  const origin = resolveAppOrigin();

  if (!origin) {
    return NextResponse.json(
      { error: "Application URL is not configured." },
      { status: 503 },
    );
  }

  // Dodo redirects users back to the success URL when they finish
  // checkout. We embed `returnTo` so the success page can bounce the
  // user back to where they triggered the upgrade (e.g. the dashboard
  // they were on inside a business, or the businesses hub).
  const successUrlObj = new URL("/account/billing/checkout", origin);
  if (returnTo) {
    successUrlObj.searchParams.set("returnTo", returnTo);
  }
  const successUrl = successUrlObj.toString();
  const cancelUrl = `${origin}/pricing`;

  const provider = getBillingProvider("dodo");
  const result = await provider.createCheckoutSession({
    plan,
    interval,
    userId: user.id,
    userEmail,
    successUrl,
    cancelUrl,
  });

  if (result.type === "redirect") {
    return NextResponse.json({ checkoutUrl: result.url });
  }

  return NextResponse.json(
    { error: result.message },
    { status: isConfigurationError(result.message) ? 503 : 502 },
  );
}

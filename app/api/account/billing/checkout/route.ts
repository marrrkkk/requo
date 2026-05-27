import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { getPolarProductId } from "@/lib/billing/polar-products";
import { getBusinessSubscription } from "@/lib/billing/subscription-service";
import { env, isPolarConfigured } from "@/lib/env";
import { requireBusinessContextForUser } from "@/lib/db/business-access";

/**
 * Thin eligibility-check + redirect route in front of the canonical
 * `@polar-sh/nextjs` `Checkout` adapter at
 * `/api/billing/polar/checkout`. Runs the auth, Zod, isPolarConfigured,
 * already-subscribed and missing-email gates, resolves the
 * `(plan, interval)` pair to a configured Polar product id, then
 * returns a JSON `{ checkoutUrl }` payload pointing at the adapter
 * route so the client-side `start-checkout` flow keeps working
 * unchanged. The adapter route does the actual Polar API call and
 * issues the final redirect.
 */

const checkoutBodySchema = z.object({
  businessId: z.string().trim().min(1),
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

/**
 * Resolves the visitor's public IP from forwarded-for headers so the
 * canonical `@polar-sh/nextjs` `Checkout` adapter can pass it to
 * Polar as `customerIpAddress`. Polar uses the field to geolocate
 * currency on the hosted checkout page; without it, Polar sees the
 * server egress IP and the visitor sees the wrong currency.
 *
 * Priority: `x-forwarded-for` (first hop) → `x-real-ip` →
 * `cf-connecting-ip` → null. Loopback / private addresses are
 * filtered out so localhost dev requests don't poison the value;
 * in that case the redirect route falls back to fetching the dev
 * machine's public IP via an external echo service so the dev
 * experience matches production behavior.
 */
function isPrivateIp(candidate: string): boolean {
  if (
    candidate === "127.0.0.1" ||
    candidate === "::1" ||
    candidate.startsWith("10.") ||
    candidate.startsWith("192.168.") ||
    candidate.startsWith("169.254.")
  ) {
    return true;
  }
  // 172.16.0.0 – 172.31.255.255
  if (candidate.startsWith("172.")) {
    const second = Number.parseInt(candidate.split(".")[1] ?? "", 10);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

function resolveForwardedIp(request: Request): string | null {
  const candidates = [
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    request.headers.get("x-real-ip")?.trim(),
    request.headers.get("cf-connecting-ip")?.trim(),
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (isPrivateIp(candidate)) continue;
    return candidate;
  }

  return null;
}

/**
 * Last-resort lookup of the dev machine's egress IP. Only called when
 * the request didn't carry a forwarded-for header (typical for direct
 * `localhost:3000` requests in dev). Result is cached for one process
 * lifetime to avoid hammering the echo service on every checkout.
 */
let cachedDevPublicIp: string | null | undefined;
async function fetchDevPublicIp(): Promise<string | null> {
  if (cachedDevPublicIp !== undefined) return cachedDevPublicIp;
  try {
    const response = await fetch("https://api.ipify.org?format=json", {
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) {
      cachedDevPublicIp = null;
      return null;
    }
    const data = (await response.json()) as { ip?: unknown };
    if (typeof data.ip === "string" && data.ip.length > 0 && !isPrivateIp(data.ip)) {
      cachedDevPublicIp = data.ip;
      return data.ip;
    }
  } catch {
    // Echo service unreachable. Fall through.
  }
  cachedDevPublicIp = null;
  return null;
}

async function resolveClientIp(request: Request): Promise<string | null> {
  const fromHeaders = resolveForwardedIp(request);
  if (fromHeaders) return fromHeaders;

  if (env.NODE_ENV !== "production") {
    return fetchDevPublicIp();
  }

  return null;
}

function resolveAppOrigin(): string | null {
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

export async function POST(request: Request): Promise<Response> {
  if (!isPolarConfigured) {
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

  const { businessId, plan, interval } = parsed.data;
  const returnTo = sanitizeReturnTo(parsed.data.returnTo);

  // Ensure the actor can manage billing for this business.
  // (Owner-only today; adjust to admin roles later if needed.)
  const businessContext = await requireBusinessContextForUser(user.id, businessId);
  if (businessContext.business.id !== businessId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const existing = await getBusinessSubscription(businessId);

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

  const productId = getPolarProductId(plan, interval);

  if (!productId) {
    return NextResponse.json(
      {
        error: `No Polar product configured for ${plan} (${interval}).`,
      },
      { status: 503 },
    );
  }

  // ── Upgrade path: update the existing subscription's product ──────────
  // When the business already has an active subscription on a different plan,
  // Polar won't allow a new checkout. Instead, we update the existing
  // subscription's product via the Polar API.
  if (
    existing &&
    (existing.status === "active" || existing.status === "past_due") &&
    existing.providerSubscriptionId &&
    existing.plan !== plan
  ) {
    if (!env.POLAR_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: "Billing is not configured." },
        { status: 503 },
      );
    }

    const { Polar } = await import("@polar-sh/sdk");
    const polar = new Polar({
      accessToken: env.POLAR_ACCESS_TOKEN,
      server: env.POLAR_SERVER,
    });

    try {
      await polar.subscriptions.update({
        id: existing.providerSubscriptionId,
        subscriptionUpdate: {
          productId,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Subscription update failed.";
      console.error("[billing] Polar subscription upgrade failed:", message);
      return NextResponse.json({ error: message }, { status: 502 });
    }

    // Return a success response — the webhook will handle the plan change.
    // Redirect to the return path with upgrade flag.
    const origin = resolveAppOrigin();
    const successUrl = new URL(returnTo || "/", origin ?? request.url);
    successUrl.searchParams.set("upgrade", "success");
    successUrl.searchParams.set("plan", plan);

    return NextResponse.json({ checkoutUrl: successUrl.toString() });
  }

  const origin = resolveAppOrigin();

  if (!origin) {
    return NextResponse.json(
      { error: "Application URL is not configured." },
      { status: 503 },
    );
  }

  const redirectUrl = new URL("/api/billing/polar/checkout", origin);
  redirectUrl.searchParams.set("products", productId);
  // Important: business-scoped billing identifies Polar customers by business id.
  redirectUrl.searchParams.set("customerExternalId", businessId);
  redirectUrl.searchParams.set("customerEmail", userEmail);

  // Forward the visitor's IP so Polar's hosted checkout localizes
  // currency to the customer's region rather than the server egress IP.
  const clientIp = await resolveClientIp(request);
  if (clientIp) {
    redirectUrl.searchParams.set("customerIpAddress", clientIp);
  }

  if (returnTo) {
    redirectUrl.searchParams.set("returnTo", returnTo);
  }

  return NextResponse.json({ checkoutUrl: redirectUrl.toString() });
}

import { NextResponse } from "next/server";

import { getOptionalSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { businesses } from "@/lib/db/schema/businesses";
import { accountSubscriptions } from "@/lib/db/schema/subscriptions";
import { eq } from "drizzle-orm";

/**
 * Dev-only route that returns current user context for the dev panel.
 * Blocked in production.
 */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Dev-only endpoint" },
      { status: 403 },
    );
  }

  const session = await getOptionalSession();

  if (!session) {
    return NextResponse.json({
      authenticated: false,
      user: null,
      subscription: null,
      businesses: [],
    });
  }

  const userId = session.user.id;

  const [subscription] = await db
    .select()
    .from(accountSubscriptions)
    .where(eq(accountSubscriptions.userId, userId))
    .limit(1);

  const userBusinesses = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      slug: businesses.slug,
      plan: businesses.plan,
    })
    .from(businesses)
    .where(eq(businesses.ownerUserId, userId));

  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    },
    subscription: subscription
      ? {
          plan: subscription.plan,
          status: subscription.status,
          canceledAt: subscription.canceledAt,
        }
      : null,
    businesses: userBusinesses,
  });
}

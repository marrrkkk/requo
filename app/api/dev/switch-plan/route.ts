import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { businesses } from "@/lib/db/schema/businesses";
import { accountSubscriptions } from "@/lib/db/schema/subscriptions";
import { businessPlans } from "@/lib/plans/plans";
import { getUserBillingCacheTags } from "@/lib/cache/shell-tags";
import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

const schema = z.object({
  plan: z.enum(businessPlans),
});

/**
 * Dev-only route to instantly switch the current user's plan.
 * Blocked in production.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Dev-only endpoint" },
      { status: 403 },
    );
  }

  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid plan", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { plan } = parsed.data;
  const userId = session.user.id;

  if (plan === "free") {
    // Delete subscription row — user becomes implicitly free
    await db
      .delete(accountSubscriptions)
      .where(eq(accountSubscriptions.userId, userId));
  } else {
    // Upsert subscription row with active status
    const now = new Date();
    const existingSub = await db
      .select()
      .from(accountSubscriptions)
      .where(eq(accountSubscriptions.userId, userId))
      .limit(1);

    if (existingSub.length > 0) {
      await db
        .update(accountSubscriptions)
        .set({
          plan,
          status: "active",
          canceledAt: null,
          updatedAt: now,
        })
        .where(eq(accountSubscriptions.userId, userId));
    } else {
      await db.insert(accountSubscriptions).values({
        id: generateId("sub"),
        userId,
        plan,
        status: "active",
        billingProvider: "polar",
        billingCurrency: "USD",
        providerSubscriptionId: `dev_${Date.now()}`,
        currentPeriodStart: now,
        currentPeriodEnd: new Date(
          now.getTime() + 30 * 24 * 60 * 60 * 1000,
        ),
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  // Sync businesses.plan for all businesses owned by this user
  await db
    .update(businesses)
    .set({ plan })
    .where(eq(businesses.ownerUserId, userId));

  // Invalidate billing cache
  for (const tag of getUserBillingCacheTags(userId)) {
    revalidateTag(tag, "max");
  }

  return NextResponse.json({ success: true, plan });
}

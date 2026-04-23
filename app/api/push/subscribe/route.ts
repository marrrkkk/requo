import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { pushSubscriptions } from "@/lib/db/schema/push-subscriptions";
import { businessMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isPushConfigured } from "@/lib/env";

const subscribeSchema = z.object({
  businessId: z.string().min(1),
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
});

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

export async function POST(request: Request) {
  if (!isPushConfigured) {
    return NextResponse.json(
      { error: "Push notifications are not configured." },
      { status: 503 },
    );
  }

  const user = await requireUser();

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const result = subscribeSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid subscription data." },
      { status: 400 },
    );
  }

  const { businessId, subscription } = result.data;

  // Verify the user is a member of this business
  const [membership] = await db
    .select({ id: businessMembers.id })
    .from(businessMembers)
    .where(
      and(
        eq(businessMembers.businessId, businessId),
        eq(businessMembers.userId, user.id),
      ),
    )
    .limit(1);

  if (!membership) {
    return NextResponse.json(
      { error: "Not a member of this business." },
      { status: 403 },
    );
  }

  try {
    await db
      .insert(pushSubscriptions)
      .values({
        id: createId("psub"),
        userId: user.id,
        businessId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      })
      .onConflictDoUpdate({
        target: [pushSubscriptions.userId, pushSubscriptions.endpoint],
        set: {
          businessId,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to save push subscription.", error);

    return NextResponse.json(
      { error: "Failed to save subscription." },
      { status: 500 },
    );
  }
}

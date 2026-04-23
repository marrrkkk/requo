import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";

import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { pushSubscriptions } from "@/lib/db/schema/push-subscriptions";

const unsubscribeSchema = z.object({
  businessId: z.string().min(1),
  endpoint: z.string().url(),
});

export async function DELETE(request: Request) {
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

  const result = unsubscribeSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid request data." },
      { status: 400 },
    );
  }

  try {
    await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, user.id),
          eq(pushSubscriptions.endpoint, result.data.endpoint),
        ),
      );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to remove push subscription.", error);

    return NextResponse.json(
      { error: "Failed to remove subscription." },
      { status: 500 },
    );
  }
}

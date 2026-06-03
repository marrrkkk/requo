import { NextResponse } from "next/server";

import { processExpiredSubscriptions } from "@/lib/billing/jobs/expire-subscriptions";

export const maxDuration = 30;

/**
 * Vercel Cron: Expire canceled subscriptions past their period end.
 * Runs daily at 02:00 UTC. Replaces the Inngest `cron-expire-subscriptions` function.
 *
 * Simple UPDATE query — no Inngest step functions, no retry logic, completes in <5s.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processExpiredSubscriptions();

  return NextResponse.json({
    success: true,
    ...result,
  });
}

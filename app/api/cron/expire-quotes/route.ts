import { NextResponse } from "next/server";

import { syncExpiredQuotesGlobal } from "@/features/quotes/mutations";

export const maxDuration = 30;

/**
 * Vercel Cron: Expire stale quotes whose validity date has passed.
 * Runs daily at 01:00 UTC. Replaces the Inngest `cron-expire-quotes` function.
 *
 * Simple UPDATE query — no Inngest step functions, no retry logic, completes in <10s.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncExpiredQuotesGlobal();

  return NextResponse.json({
    success: true,
    ...result,
  });
}

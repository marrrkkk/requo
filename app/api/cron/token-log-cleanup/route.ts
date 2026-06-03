import { NextResponse } from "next/server";

import { cleanupTokenLogs } from "@/features/ai/inngest/token-log-cleanup";

export const maxDuration = 30;

/**
 * Vercel Cron: Clean up AI token logs older than 90 days.
 * Runs daily at 03:00 UTC. Replaces the Inngest `cron-token-log-cleanup` function.
 *
 * Simple DELETE query — no Inngest step functions, no retry logic, completes in <10s.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await cleanupTokenLogs();

  return NextResponse.json({
    success: true,
    ...result,
  });
}

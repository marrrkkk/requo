import { NextResponse } from "next/server";

import { cleanupTokenLogs } from "@/lib/ai/token-log-cleanup";
import { isAuthorizedCronRequest } from "@/lib/security/cron";

export const maxDuration = 30;

/**
 * Vercel Cron: Clean up AI token logs older than 90 days.
 * Runs daily at 03:00 UTC. Replaces the Inngest `cron-token-log-cleanup` function.
 *
 * Simple DELETE query — no Inngest step functions, no retry logic, completes in <10s.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await cleanupTokenLogs();

  return NextResponse.json({
    success: true,
    ...result,
  });
}

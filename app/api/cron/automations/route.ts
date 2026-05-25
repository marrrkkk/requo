import { NextResponse } from "next/server";

import {
  cleanupExpiredLogs,
  processScheduledJobs,
} from "@/features/automations/processor";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Cron endpoint for processing scheduled automation jobs.
 * Triggered every 5 minutes by Vercel Cron.
 *
 * Validates: Requirements 3.1, 9.5
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await processScheduledJobs();

    // Requirement 9.5: Run log retention cleanup as low-priority task after job processing
    const cleanup = await cleanupExpiredLogs();

    return NextResponse.json({
      ok: true,
      ...summary,
      logsCleanedUp: cleanup.deleted,
    });
  } catch (error) {
    console.error("[cron] Automation processor failed", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

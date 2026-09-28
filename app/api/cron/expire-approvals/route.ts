import { NextResponse } from "next/server";

import { expirePendingApprovals } from "@/features/approvals/mutations";
import { sendApprovalReminders } from "@/features/approvals/jobs";
import { isAuthorizedCronRequest } from "@/lib/security/cron";

export const maxDuration = 60;

/**
 * Vercel Cron: expire stale approval versions (exact-row targeting, never a
 * newer version) and send per-recipe reminders. Runs daily at 04:00 UTC.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [expiry, reminders] = await Promise.all([
    expirePendingApprovals(),
    sendApprovalReminders(),
  ]);

  return NextResponse.json({
    success: true,
    expiry,
    reminders,
  });
}

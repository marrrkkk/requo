import { NextResponse } from "next/server";

import { syncExpiredQuotesGlobal } from "@/features/quotes/mutations";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Cron job: sweeps every business for sent quotes whose validity date has
 * passed and flips them to expired, writing activity logs and emitting
 * the `quote.expired` automation event for each.
 *
 * Runs daily so automations bound to `quote.expired` (e.g. archive,
 * follow-up reminders, win-back emails) fire on time even when nobody
 * opens the quote list. Per-business reconciliation on read paths still
 * runs as a fast secondary check.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncExpiredQuotesGlobal();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron/expire-quotes] Sweep failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

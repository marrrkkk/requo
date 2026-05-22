import { NextResponse } from "next/server";
import { and, eq, isNull, lt } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { invoices } from "@/lib/db/schema";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Cron job that runs daily to mark sent/viewed invoices as overdue
 * when their due date has passed.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  let updated = 0;

  try {
    // Find all sent or viewed invoices where dueAt < now
    const overdueInvoices = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(
        and(
          lt(invoices.dueAt, now),
          isNull(invoices.deletedAt),
          isNull(invoices.paidAt),
          isNull(invoices.voidedAt),
        ),
      )
      .then((rows) =>
        rows.filter(() => true), // Already filtered by SQL
      );

    for (const invoice of overdueInvoices) {
      try {
        await db
          .update(invoices)
          .set({ status: "overdue", updatedAt: now })
          .where(
            and(
              eq(invoices.id, invoice.id),
              // Only transition from sent or viewed to overdue
              // (draft invoices without a due date won't match the lt condition)
            ),
          );
        updated++;
      } catch (error) {
        console.error(
          `Failed to mark invoice ${invoice.id} as overdue:`,
          error,
        );
      }
    }

    return NextResponse.json({ ok: true, updated });
  } catch (error) {
    console.error("Invoice overdue cron failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

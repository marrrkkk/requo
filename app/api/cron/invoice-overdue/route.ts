import { NextResponse } from "next/server";
import { and, eq, isNull, lt } from "drizzle-orm";

import { emitEvent } from "@/features/automations/dispatcher";
import { db } from "@/lib/db/client";
import { invoices } from "@/lib/db/schema";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Cron job that runs daily to mark sent/viewed invoices as overdue
 * when their due date has passed and emits the matching automation event
 * so business-scoped automations can react (send reminder, escalate, etc).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  let updated = 0;

  try {
    // Find invoices currently in sent/viewed status with a due date in the past.
    const overdueInvoices = await db
      .select({
        id: invoices.id,
        businessId: invoices.businessId,
        jobId: invoices.jobId,
        dueAt: invoices.dueAt,
        totalInCents: invoices.totalInCents,
        status: invoices.status,
      })
      .from(invoices)
      .where(
        and(
          lt(invoices.dueAt, now),
          isNull(invoices.deletedAt),
          isNull(invoices.paidAt),
          isNull(invoices.voidedAt),
        ),
      );

    for (const invoice of overdueInvoices) {
      // Skip rows that are already marked overdue or in a terminal state we
      // do not want to flip (draft is filtered out by dueAt presence already).
      if (invoice.status === "overdue") continue;

      try {
        await db
          .update(invoices)
          .set({ status: "overdue", updatedAt: now })
          .where(eq(invoices.id, invoice.id));
        updated++;

        // Emit automation event so rules with trigger "invoice.overdue" run.
        emitEvent(invoice.businessId, "invoice.overdue", {
          invoiceId: invoice.id,
          dueDate: invoice.dueAt
            ? invoice.dueAt.toISOString()
            : new Date().toISOString(),
          amount: invoice.totalInCents,
        });
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

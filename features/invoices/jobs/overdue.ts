import "server-only";

import { and, eq, isNull, lt } from "drizzle-orm";

import { emitEvent } from "@/features/automations/dispatcher";
import { db } from "@/lib/db/client";
import { invoices } from "@/lib/db/schema";

export type InvoiceOverdueSummary = {
  updated: number;
};

export async function processOverdueInvoices(): Promise<InvoiceOverdueSummary> {
  const now = new Date();
  let updated = 0;

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
    if (invoice.status === "overdue") continue;

    try {
      await db
        .update(invoices)
        .set({ status: "overdue", updatedAt: now })
        .where(eq(invoices.id, invoice.id));
      updated++;

      emitEvent(invoice.businessId, "invoice.overdue", {
        invoiceId: invoice.id,
        dueDate: invoice.dueAt
          ? invoice.dueAt.toISOString()
          : new Date().toISOString(),
        amount: invoice.totalInCents,
      });
    } catch (error) {
      console.error(
        `[invoice-overdue] Failed to mark invoice ${invoice.id} as overdue:`,
        error,
      );
    }
  }

  return { updated };
}

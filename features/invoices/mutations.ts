import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  invoiceItems,
  invoices,
  jobItems,
  jobs,
  quoteItems,
  quotes,
} from "@/lib/db/schema";
import type { InvoiceStatus } from "@/features/invoices/types";

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function getNextInvoiceNumberFromSequence(sequence: number | null | undefined) {
  const safeSequence =
    typeof sequence === "number" && Number.isFinite(sequence) && sequence > 0
      ? Math.trunc(sequence)
      : 0;

  return `INV-${String(safeSequence + 1).padStart(4, "0")}`;
}

/**
 * Generate an invoice from a completed job.
 * Copies job items (which may differ from quote if work changed).
 */
export async function createInvoiceFromJobForBusiness({
  businessId,
  jobId,
  userId: _userId,
}: {
  businessId: string;
  jobId: string;
  userId: string;
}) {
  return db.transaction(async (tx) => {
    const [job] = await tx
      .select({
        id: jobs.id,
        quoteId: jobs.quoteId,
        title: jobs.title,
        customerName: jobs.customerName,
        customerEmail: jobs.customerEmail,
        customerContactMethod: jobs.customerContactMethod,
        customerContactHandle: jobs.customerContactHandle,
        currency: jobs.currency,
        totalInCents: jobs.totalInCents,
        status: jobs.status,
      })
      .from(jobs)
      .where(
        and(
          eq(jobs.id, jobId),
          eq(jobs.businessId, businessId),
          eq(jobs.status, "done"),
          isNull(jobs.deletedAt),
        ),
      )
      .limit(1);

    if (!job) {
      return { error: "Job not found or not completed." };
    }

    // Check if invoice already exists for this job
    const [existingInvoice] = await tx
      .select({ id: invoices.id })
      .from(invoices)
      .where(and(eq(invoices.jobId, jobId), isNull(invoices.deletedAt)))
      .limit(1);

    if (existingInvoice) {
      return { error: "An invoice already exists for this job.", invoiceId: existingInvoice.id };
    }

    const items = await tx
      .select({
        description: jobItems.description,
        quantity: jobItems.quantity,
        unitPriceInCents: jobItems.unitPriceInCents,
        lineTotalInCents: jobItems.lineTotalInCents,
        position: jobItems.position,
      })
      .from(jobItems)
      .where(eq(jobItems.jobId, jobId))
      .orderBy(jobItems.position);

    // Get next invoice number
    const [maxInvoice] = await tx
      .select({
        maxNum: sql<number>`coalesce(
          max(cast(substring(${invoices.invoiceNumber} from 5) as integer)),
          0
        )`,
      })
      .from(invoices)
      .where(eq(invoices.businessId, businessId));

    const invoiceNumber = getNextInvoiceNumberFromSequence(maxInvoice?.maxNum);
    const invoiceId = createId("inv");
    const now = new Date();

    const subtotalInCents = items.reduce((sum, i) => sum + i.lineTotalInCents, 0);

    // Get discount and tax from the original quote
    const [linkedQuote] = await tx
      .select({
        discountInCents: quotes.discountInCents,
        taxInCents: quotes.taxInCents,
        taxLabel: quotes.taxLabel,
        notes: quotes.notes,
        terms: quotes.terms,
      })
      .from(quotes)
      .where(eq(quotes.id, job.quoteId))
      .limit(1);

    const discountInCents = linkedQuote?.discountInCents ?? 0;
    const taxInCents = linkedQuote?.taxInCents ?? 0;
    const totalInCents = subtotalInCents - discountInCents + taxInCents;

    await tx.insert(invoices).values({
      id: invoiceId,
      businessId,
      jobId,
      quoteId: job.quoteId,
      invoiceNumber,
      title: job.title,
      customerName: job.customerName,
      customerEmail: job.customerEmail,
      customerContactMethod: job.customerContactMethod,
      customerContactHandle: job.customerContactHandle,
      status: "draft",
      currency: job.currency,
      subtotalInCents,
      discountInCents,
      taxInCents,
      taxLabel: linkedQuote?.taxLabel ?? null,
      totalInCents,
      notes: linkedQuote?.notes ?? null,
      terms: linkedQuote?.terms ?? null,
      issuedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    if (items.length > 0) {
      await tx.insert(invoiceItems).values(
        items.map((item) => ({
          id: createId("iit"),
          businessId,
          invoiceId,
          description: item.description,
          quantity: item.quantity,
          unitPriceInCents: item.unitPriceInCents,
          lineTotalInCents: item.lineTotalInCents,
          position: item.position,
          createdAt: now,
          updatedAt: now,
        })),
      );
    }

    return { invoiceId, invoiceNumber };
  });
}

/**
 * Generate an invoice directly from an accepted quote (skipping jobs).
 */
export async function createInvoiceFromQuoteForBusiness({
  businessId,
  quoteId,
  userId: _userId,
}: {
  businessId: string;
  quoteId: string;
  userId: string;
}) {
  return db.transaction(async (tx) => {
    const [quote] = await tx
      .select({
        id: quotes.id,
        title: quotes.title,
        customerName: quotes.customerName,
        customerEmail: quotes.customerEmail,
        customerContactMethod: quotes.customerContactMethod,
        customerContactHandle: quotes.customerContactHandle,
        currency: quotes.currency,
        subtotalInCents: quotes.subtotalInCents,
        discountInCents: quotes.discountInCents,
        taxInCents: quotes.taxInCents,
        taxLabel: quotes.taxLabel,
        totalInCents: quotes.totalInCents,
        status: quotes.status,
        notes: quotes.notes,
        terms: quotes.terms,
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.id, quoteId),
          eq(quotes.businessId, businessId),
          eq(quotes.status, "accepted"),
          isNull(quotes.deletedAt),
        ),
      )
      .limit(1);

    if (!quote) {
      return { error: "Quote not found or not accepted." };
    }

    // Check if invoice already exists for this quote (without a job)
    const [existingInvoice] = await tx
      .select({ id: invoices.id })
      .from(invoices)
      .where(
        and(
          eq(invoices.quoteId, quoteId),
          isNull(invoices.deletedAt),
        ),
      )
      .limit(1);

    if (existingInvoice) {
      return { error: "An invoice already exists for this quote.", invoiceId: existingInvoice.id };
    }

    const items = await tx
      .select({
        description: quoteItems.description,
        quantity: quoteItems.quantity,
        unitPriceInCents: quoteItems.unitPriceInCents,
        lineTotalInCents: quoteItems.lineTotalInCents,
        position: quoteItems.position,
      })
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, quoteId))
      .orderBy(quoteItems.position);

    // Get next invoice number
    const [maxInvoice] = await tx
      .select({
        maxNum: sql<number>`coalesce(
          max(cast(substring(${invoices.invoiceNumber} from 5) as integer)),
          0
        )`,
      })
      .from(invoices)
      .where(eq(invoices.businessId, businessId));

    const invoiceNumber = getNextInvoiceNumberFromSequence(maxInvoice?.maxNum);
    const invoiceId = createId("inv");
    const now = new Date();

    await tx.insert(invoices).values({
      id: invoiceId,
      businessId,
      jobId: null,
      quoteId,
      invoiceNumber,
      title: quote.title,
      customerName: quote.customerName,
      customerEmail: quote.customerEmail,
      customerContactMethod: quote.customerContactMethod,
      customerContactHandle: quote.customerContactHandle,
      status: "draft",
      currency: quote.currency,
      notes: quote.notes,
      terms: quote.terms,
      subtotalInCents: quote.subtotalInCents,
      discountInCents: quote.discountInCents,
      taxInCents: quote.taxInCents,
      taxLabel: quote.taxLabel,
      totalInCents: quote.totalInCents,
      issuedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    if (items.length > 0) {
      await tx.insert(invoiceItems).values(
        items.map((item) => ({
          id: createId("iit"),
          businessId,
          invoiceId,
          description: item.description,
          quantity: item.quantity,
          unitPriceInCents: item.unitPriceInCents,
          lineTotalInCents: item.lineTotalInCents,
          position: item.position,
          createdAt: now,
          updatedAt: now,
        })),
      );
    }

    return { invoiceId, invoiceNumber };
  });
}

/**
 * Update invoice status (send, mark paid, void, etc.)
 */
export async function updateInvoiceStatusForBusiness({
  businessId,
  invoiceId,
  status,
  userId,
}: {
  businessId: string;
  invoiceId: string;
  status: InvoiceStatus;
  userId: string;
}) {
  const now = new Date();
  const updates: Record<string, unknown> = { status, updatedAt: now };

  switch (status) {
    case "sent":
      updates.sentAt = now;
      break;
    case "paid":
      updates.paidAt = now;
      updates.paidBy = userId;
      break;
    case "voided":
      updates.voidedAt = now;
      updates.voidedBy = userId;
      break;
  }

  const [updated] = await db
    .update(invoices)
    .set(updates)
    .where(
      and(
        eq(invoices.id, invoiceId),
        eq(invoices.businessId, businessId),
        isNull(invoices.deletedAt),
      ),
    )
    .returning({ id: invoices.id });

  if (!updated) {
    return { error: "Invoice not found." };
  }

  return { invoiceId: updated.id };
}

/**
 * Soft-delete an invoice.
 */
export async function deleteInvoiceForBusiness({
  businessId,
  invoiceId,
  userId,
}: {
  businessId: string;
  invoiceId: string;
  userId: string;
}) {
  const now = new Date();

  const [deleted] = await db
    .update(invoices)
    .set({ deletedAt: now, deletedBy: userId, updatedAt: now })
    .where(
      and(
        eq(invoices.id, invoiceId),
        eq(invoices.businessId, businessId),
        isNull(invoices.deletedAt),
      ),
    )
    .returning({ id: invoices.id });

  if (!deleted) {
    return { error: "Invoice not found." };
  }

  return { invoiceId: deleted.id };
}

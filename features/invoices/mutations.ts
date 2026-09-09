import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";

import { writeAuditLog } from "@/features/audit/mutations";
import { insertBusinessNotification } from "@/features/notifications/mutations";
import { db } from "@/lib/db/client";
import {
  activityLogs,
  invoiceLineItems,
  invoices,
  payments,
  quoteItems,
  quotes,
} from "@/lib/db/schema";
import type { PaymentMethod } from "@/lib/db/schema/invoices";
import { getTodayUtcDateString } from "@/features/quotes/utils";
import { calculateInvoicePaymentState } from "@/features/invoices/utils";

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function nextInvoiceNumber(sequence: number | null | undefined) {
  const safe = typeof sequence === "number" && Number.isFinite(sequence) ? Math.max(0, Math.trunc(sequence)) : 0;
  return `INV-${String(safe + 1).padStart(6, "0")}`;
}

function isUniqueInvoiceConflict(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505" &&
    ("constraint_name" in error && (error.constraint_name === "invoices_business_invoice_number_unique" || error.constraint_name === "invoices_business_quote_active_unique"));
}

function calculateTotals(items: Array<{ description: string; quantity: number; unitPriceInCents: number }>, discountInCents: number, taxInCents: number) {
  const snapshotItems = items.map((item, position) => ({
    id: createId("ilit"),
    description: item.description.trim(),
    quantity: item.quantity,
    unitPriceInCents: item.unitPriceInCents,
    lineTotalInCents: item.quantity * item.unitPriceInCents,
    position,
  }));
  const subtotalInCents = snapshotItems.reduce((sum, item) => sum + item.lineTotalInCents, 0);
  return {
    items: snapshotItems,
    subtotalInCents,
    discountInCents,
    taxInCents,
    totalInCents: subtotalInCents - discountInCents + taxInCents,
  };
}

async function insertInvoiceActivity(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: { businessId: string; invoiceId: string; actorUserId?: string | null; type: string; summary: string; metadata?: Record<string, unknown> },
) {
  const now = new Date();
  await tx.insert(activityLogs).values({
    id: createId("act"),
    businessId: input.businessId,
    actorUserId: input.actorUserId ?? null,
    type: input.type,
    summary: input.summary,
    metadata: { invoiceId: input.invoiceId, ...(input.metadata ?? {}) },
    createdAt: now,
    updatedAt: now,
  });
}

type CreateInvoiceInput = {
  businessId: string;
  actorUserId: string;
  quoteId?: string | null;
  title: string;
  customerName: string;
  customerEmail?: string | null;
  customerContactMethod: string;
  customerContactHandle: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  notes?: string | null;
  paymentTerms?: string | null;
  discountInCents: number;
  taxInCents: number;
  taxLabel?: string | null;
  items: Array<{ description: string; quantity: number; unitPriceInCents: number }>;
};

export async function createInvoiceForBusiness(input: CreateInvoiceInput) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const result = await db.transaction(async (tx) => {
        let sourceQuote: typeof quotes.$inferSelect | null = null;
        let sourceItems: Array<typeof quoteItems.$inferSelect> = [];

        if (input.quoteId) {
          const [quote] = await tx.select().from(quotes).where(and(eq(quotes.id, input.quoteId), eq(quotes.businessId, input.businessId), isNull(quotes.deletedAt))).limit(1);
          if (!quote || quote.status !== "accepted") return { error: "Only accepted quotes can be converted into invoices." } as const;
          sourceQuote = quote;

          const existing = await tx.select({ id: invoices.id, invoiceNumber: invoices.invoiceNumber }).from(invoices).where(and(eq(invoices.businessId, input.businessId), eq(invoices.quoteId, input.quoteId), isNull(invoices.deletedAt), sql`${invoices.status} <> 'voided'`)).limit(1);
          if (existing[0]) return { id: existing[0].id, invoiceNumber: existing[0].invoiceNumber, existing: true } as const;

          sourceItems = await tx.select().from(quoteItems).where(and(eq(quoteItems.businessId, input.businessId), eq(quoteItems.quoteId, input.quoteId))).orderBy(quoteItems.position);
        }

        const items = input.quoteId && sourceQuote
          ? sourceItems.map((item) => ({ description: item.description, quantity: item.quantity, unitPriceInCents: item.unitPriceInCents }))
          : input.items;
        const discountInCents = input.quoteId && sourceQuote ? sourceQuote.discountInCents : input.discountInCents;
        const taxInCents = input.quoteId && sourceQuote ? sourceQuote.taxInCents : input.taxInCents;
        const totals = calculateTotals(items, discountInCents, taxInCents);
        const [latest] = await tx.select({ latest: sql<number>`coalesce(max((nullif(substring(${invoices.invoiceNumber} from '[0-9]+$'), ''))::integer), 0)` }).from(invoices).where(eq(invoices.businessId, input.businessId));
        const invoiceNumber = nextInvoiceNumber(latest?.latest);
        const id = createId("inv");
        const now = new Date();

        await tx.insert(invoices).values({
          id,
          businessId: input.businessId,
          quoteId: input.quoteId ?? null,
          invoiceNumber,
          title: input.title,
          customerName: input.customerName,
          customerEmail: input.customerEmail ?? null,
          customerContactMethod: input.customerContactMethod,
          customerContactHandle: input.customerContactHandle,
          currency: input.currency,
          issueDate: input.issueDate,
          dueDate: input.dueDate,
          status: "draft",
          notes: input.notes ?? null,
          paymentTerms: input.paymentTerms ?? null,
          subtotalInCents: totals.subtotalInCents,
          discountInCents: totals.discountInCents,
          taxInCents: totals.taxInCents,
          taxLabel: input.taxLabel ?? null,
          totalInCents: totals.totalInCents,
          createdBy: input.actorUserId,
          createdAt: now,
          updatedAt: now,
        });
        await tx.insert(invoiceLineItems).values(totals.items.map((item) => ({ ...item, businessId: input.businessId, invoiceId: id, createdAt: now, updatedAt: now })));
        await insertInvoiceActivity(tx, { businessId: input.businessId, invoiceId: id, actorUserId: input.actorUserId, type: "invoice.created", summary: `Draft invoice ${invoiceNumber} created.`, metadata: { invoiceNumber, quoteId: input.quoteId ?? null } });
        await writeAuditLog(tx, { businessId: input.businessId, actorUserId: input.actorUserId, entityType: "invoice", entityId: id, action: "invoice.created", metadata: { invoiceNumber, quoteId: input.quoteId ?? null, customerName: input.customerName } });
        return { id, invoiceNumber, existing: false } as const;
      });

      if ("error" in result) return result;
      return result;
    } catch (error) {
      if (attempt < 4 && isUniqueInvoiceConflict(error)) continue;
      throw error;
    }
  }
  throw new Error("Failed to allocate a unique invoice number.");
}

export async function markInvoiceSentForBusiness({ businessId, invoiceId, actorUserId }: { businessId: string; invoiceId: string; actorUserId: string }) {
  return db.transaction(async (tx) => {
    const [invoice] = await tx.select().from(invoices).where(and(eq(invoices.id, invoiceId), eq(invoices.businessId, businessId), isNull(invoices.deletedAt))).for("update");
    if (!invoice) return null;
    if (invoice.status === "voided") return { changed: false, status: "voided" as const };
    if (invoice.status !== "draft") return { changed: false, status: invoice.status };
    const now = new Date();
    await tx.update(invoices).set({ status: "sent", sentAt: now, updatedAt: now }).where(and(eq(invoices.id, invoiceId), eq(invoices.businessId, businessId)));
    await insertInvoiceActivity(tx, { businessId, invoiceId, actorUserId, type: "invoice.sent", summary: `Invoice ${invoice.invoiceNumber} marked as sent.`, metadata: { invoiceNumber: invoice.invoiceNumber } });
    await writeAuditLog(tx, { businessId, actorUserId, entityType: "invoice", entityId: invoiceId, action: "invoice.sent", metadata: { invoiceNumber: invoice.invoiceNumber }, createdAt: now });
    return { changed: true, status: "sent" as const };
  });
}

export async function recordPaymentForBusiness({ businessId, invoiceId, actorUserId, amountInCents, paymentDate, method, reference, notes }: { businessId: string; invoiceId: string; actorUserId: string; amountInCents: number; paymentDate: string; method: PaymentMethod; reference?: string | null; notes?: string | null }) {
  return db.transaction(async (tx) => {
    const [invoice] = await tx.select().from(invoices).where(and(eq(invoices.id, invoiceId), eq(invoices.businessId, businessId), isNull(invoices.deletedAt))).for("update");
    if (!invoice) return { error: "Invoice not found." } as const;
    if (invoice.status === "draft") return { error: "Mark the invoice as sent before recording a payment." } as const;
    if (invoice.status === "voided") return { error: "Void invoices cannot receive payments." } as const;
    if (paymentDate > getTodayUtcDateString()) return { error: "Payment date cannot be in the future." } as const;

    const [paid] = await tx.select({ total: sql<number>`coalesce(sum(${payments.amountInCents}), 0)` }).from(payments).where(and(eq(payments.invoiceId, invoiceId), eq(payments.businessId, businessId), isNull(payments.voidedAt)));
    const current = calculateInvoicePaymentState({ totalInCents: invoice.totalInCents, paidInCents: Number(paid?.total ?? 0), dueDate: invoice.dueDate, lifecycleStatus: invoice.status });
    if (amountInCents > current.balanceInCents) return { error: "Payment amount cannot exceed the remaining balance." } as const;

    const now = new Date();
    const paymentId = createId("pay");
    await tx.insert(payments).values({ id: paymentId, businessId, invoiceId, amountInCents, paymentDate, method, reference: reference ?? null, notes: notes ?? null, createdBy: actorUserId, createdAt: now, updatedAt: now });
    const next = calculateInvoicePaymentState({ totalInCents: invoice.totalInCents, paidInCents: current.paidInCents + amountInCents, dueDate: invoice.dueDate, lifecycleStatus: invoice.status });
    await tx.update(invoices).set({ status: next.status, updatedAt: now }).where(and(eq(invoices.id, invoiceId), eq(invoices.businessId, businessId)));
    await insertInvoiceActivity(tx, { businessId, invoiceId, actorUserId, type: "invoice.payment_recorded", summary: `Payment recorded on ${invoice.invoiceNumber}.`, metadata: { paymentId, amountInCents, method, status: next.status } });
    if (next.status === "paid") {
      await insertInvoiceActivity(tx, { businessId, invoiceId, actorUserId, type: "invoice.paid", summary: `Invoice ${invoice.invoiceNumber} is paid in full.`, metadata: { invoiceNumber: invoice.invoiceNumber } });
      await insertBusinessNotification(tx, {
        businessId,
        invoiceId,
        type: "invoice_paid",
        title: `Invoice ${invoice.invoiceNumber} is paid`,
        summary: `${invoice.customerName} paid ${invoice.invoiceNumber} in full.`,
        metadata: {
          invoiceId,
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customerName,
          amountInCents: invoice.totalInCents,
        },
        now,
      });
    }
    await writeAuditLog(tx, { businessId, actorUserId, entityType: "payment", entityId: paymentId, action: "payment.recorded", metadata: { invoiceId, invoiceNumber: invoice.invoiceNumber, amountInCents, method }, createdAt: now });
    if (next.status === "paid") await writeAuditLog(tx, { businessId, actorUserId, entityType: "invoice", entityId: invoiceId, action: "invoice.paid", metadata: { invoiceNumber: invoice.invoiceNumber }, createdAt: now });
    return { paymentId, status: next.status, paidInCents: next.paidInCents, balanceInCents: next.balanceInCents } as const;
  });
}

export async function voidPaymentForBusiness({ businessId, paymentId, actorUserId, reason }: { businessId: string; paymentId: string; actorUserId: string; reason?: string | null }) {
  return db.transaction(async (tx) => {
    const [payment] = await tx.select().from(payments).where(and(eq(payments.id, paymentId), eq(payments.businessId, businessId), isNull(payments.voidedAt))).for("update");
    if (!payment) return null;
    const [invoice] = await tx.select().from(invoices).where(and(eq(invoices.id, payment.invoiceId), eq(invoices.businessId, businessId), isNull(invoices.deletedAt))).for("update");
    if (!invoice || invoice.status === "voided") return null;
    const now = new Date();
    await tx.update(payments).set({ voidedAt: now, voidedBy: actorUserId, voidReason: reason?.trim() || null, updatedAt: now }).where(and(eq(payments.id, paymentId), eq(payments.businessId, businessId)));
    const [paid] = await tx.select({ total: sql<number>`coalesce(sum(${payments.amountInCents}), 0)` }).from(payments).where(and(eq(payments.invoiceId, invoice.id), eq(payments.businessId, businessId), isNull(payments.voidedAt)));
    const next = calculateInvoicePaymentState({ totalInCents: invoice.totalInCents, paidInCents: Number(paid?.total ?? 0), dueDate: invoice.dueDate, lifecycleStatus: invoice.status });
    await tx.update(invoices).set({ status: next.status, updatedAt: now }).where(and(eq(invoices.id, invoice.id), eq(invoices.businessId, businessId)));
    await insertInvoiceActivity(tx, { businessId, invoiceId: invoice.id, actorUserId, type: "payment.voided", summary: `Payment voided on ${invoice.invoiceNumber}.`, metadata: { paymentId, reason: reason?.trim() || null } });
    await writeAuditLog(tx, { businessId, actorUserId, entityType: "payment", entityId: paymentId, action: "payment.voided", metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, reason: reason?.trim() || null }, createdAt: now });
    return { status: next.status } as const;
  });
}

export async function voidInvoiceForBusiness({ businessId, invoiceId, actorUserId, reason }: { businessId: string; invoiceId: string; actorUserId: string; reason?: string | null }) {
  return db.transaction(async (tx) => {
    const [invoice] = await tx.select().from(invoices).where(and(eq(invoices.id, invoiceId), eq(invoices.businessId, businessId), isNull(invoices.deletedAt))).for("update");
    if (!invoice || invoice.status === "voided") return null;
    const [paid] = await tx.select({ total: sql<number>`coalesce(sum(${payments.amountInCents}), 0)` }).from(payments).where(and(eq(payments.invoiceId, invoiceId), eq(payments.businessId, businessId), isNull(payments.voidedAt)));
    if (Number(paid?.total ?? 0) > 0) return { error: "Void all recorded payments before voiding this invoice." } as const;
    const now = new Date();
    await tx.update(invoices).set({ status: "voided", voidedAt: now, voidedBy: actorUserId, voidReason: reason?.trim() || null, updatedAt: now }).where(and(eq(invoices.id, invoiceId), eq(invoices.businessId, businessId)));
    await insertInvoiceActivity(tx, { businessId, invoiceId, actorUserId, type: "invoice.voided", summary: `Invoice ${invoice.invoiceNumber} voided.`, metadata: { reason: reason?.trim() || null } });
    await writeAuditLog(tx, { businessId, actorUserId, entityType: "invoice", entityId: invoiceId, action: "invoice.voided", metadata: { invoiceNumber: invoice.invoiceNumber, reason: reason?.trim() || null }, createdAt: now });
    return { changed: true } as const;
  });
}

type UpdateInvoiceDraftInput = {
  businessId: string;
  invoiceId: string;
  actorUserId: string;
  title: string;
  customerName: string;
  customerEmail?: string | null;
  issueDate: string;
  dueDate: string;
  notes?: string | null;
  paymentTerms?: string | null;
  discountInCents: number;
  taxInCents: number;
  taxLabel?: string | null;
  items: Array<{ description: string; quantity: number; unitPriceInCents: number }>;
};

export async function updateInvoiceDraftForBusiness(input: UpdateInvoiceDraftInput) {
  return db.transaction(async (tx) => {
    const [invoice] = await tx
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, input.invoiceId), eq(invoices.businessId, input.businessId), isNull(invoices.deletedAt)))
      .for("update");
    if (!invoice) return null;
    if (invoice.status !== "draft") return { error: "Only draft invoices can be edited." } as const;

    const now = new Date();
    if (invoice.quoteId) {
      await tx
        .update(invoices)
        .set({
          title: input.title,
          customerName: input.customerName,
          customerEmail: input.customerEmail ?? null,
          issueDate: input.issueDate,
          dueDate: input.dueDate,
          notes: input.notes ?? null,
          paymentTerms: input.paymentTerms ?? null,
          updatedAt: now,
        })
        .where(and(eq(invoices.id, input.invoiceId), eq(invoices.businessId, input.businessId)));
    } else {
      const totals = calculateTotals(input.items, input.discountInCents, input.taxInCents);
      await tx
        .update(invoices)
        .set({
          title: input.title,
          customerName: input.customerName,
          customerEmail: input.customerEmail ?? null,
          issueDate: input.issueDate,
          dueDate: input.dueDate,
          notes: input.notes ?? null,
          paymentTerms: input.paymentTerms ?? null,
          subtotalInCents: totals.subtotalInCents,
          discountInCents: totals.discountInCents,
          taxInCents: totals.taxInCents,
          taxLabel: input.taxLabel ?? null,
          totalInCents: totals.totalInCents,
          updatedAt: now,
        })
        .where(and(eq(invoices.id, input.invoiceId), eq(invoices.businessId, input.businessId)));
      await tx.delete(invoiceLineItems).where(and(eq(invoiceLineItems.invoiceId, input.invoiceId), eq(invoiceLineItems.businessId, input.businessId)));
      await tx.insert(invoiceLineItems).values(
        totals.items.map((item) => ({ ...item, businessId: input.businessId, invoiceId: input.invoiceId, createdAt: now, updatedAt: now })),
      );
    }
    await insertInvoiceActivity(tx, {
      businessId: input.businessId,
      invoiceId: input.invoiceId,
      actorUserId: input.actorUserId,
      type: "invoice.updated",
      summary: `Draft invoice ${invoice.invoiceNumber} updated.`,
      metadata: { invoiceNumber: invoice.invoiceNumber },
    });
    await writeAuditLog(tx, {
      businessId: input.businessId,
      actorUserId: input.actorUserId,
      entityType: "invoice",
      entityId: input.invoiceId,
      action: "invoice.updated",
      metadata: { invoiceNumber: invoice.invoiceNumber, customerName: input.customerName },
      createdAt: now,
    });
    return { changed: true, invoiceNumber: invoice.invoiceNumber } as const;
  });
}

import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { invoices, invoiceItems, businesses } from "@/lib/db/schema";
import { renderInvoiceEmail } from "@/emails/templates/invoice-email";
import { isEmailConfigured } from "@/lib/env";
import { sendEmailWithFallback } from "@/lib/email/send-email";
import { getEmailSender } from "@/lib/email/senders";
import { emitEvent } from "@/features/automations/dispatcher";

/**
 * Send an invoice email to the customer and mark it as "sent".
 */
export async function sendInvoiceEmailForBusiness({
  businessId,
  invoiceId,
}: {
  businessId: string;
  invoiceId: string;
}) {
  if (!isEmailConfigured) {
    return { error: "Email is not configured." };
  }

  const [invoice] = await db
    .select({
      id: invoices.id,
      jobId: invoices.jobId,
      invoiceNumber: invoices.invoiceNumber,
      title: invoices.title,
      customerName: invoices.customerName,
      customerEmail: invoices.customerEmail,
      currency: invoices.currency,
      subtotalInCents: invoices.subtotalInCents,
      discountInCents: invoices.discountInCents,
      taxInCents: invoices.taxInCents,
      taxLabel: invoices.taxLabel,
      totalInCents: invoices.totalInCents,
      dueAt: invoices.dueAt,
      notes: invoices.notes,
      status: invoices.status,
      sentAt: invoices.sentAt,
      businessName: businesses.name,
      businessContactEmail: businesses.contactEmail,
      defaultEmailSignature: businesses.defaultEmailSignature,
    })
    .from(invoices)
    .innerJoin(businesses, eq(invoices.businessId, businesses.id))
    .where(
      and(
        eq(invoices.id, invoiceId),
        eq(invoices.businessId, businessId),
        isNull(invoices.deletedAt),
      ),
    )
    .limit(1);

  if (!invoice) {
    return { error: "Invoice not found." };
  }

  if (!invoice.customerEmail) {
    return { error: "No customer email address on this invoice." };
  }

  if (invoice.status !== "draft" && invoice.status !== "sent") {
    return { error: "Invoice cannot be sent in its current state." };
  }

  const items = await db
    .select({
      description: invoiceItems.description,
      quantity: invoiceItems.quantity,
      unitPriceInCents: invoiceItems.unitPriceInCents,
      lineTotalInCents: invoiceItems.lineTotalInCents,
    })
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoiceId))
    .orderBy(invoiceItems.position);

  // Stash the current sentAt before triggering the outbound email. Network
  // retries within the same logical send all read the same value so they
  // hit the existing outbox row and dedup. Once this send commits and
  // bumps sentAt, the next *user-initiated* re-send reads a different
  // value and produces a fresh key, allowing intentional resends without
  // losing dedup for retries.
  const idempotencyToken = invoice.sentAt
    ? `resend:${invoice.sentAt.toISOString()}`
    : "initial";
  const idempotencyKey = `invoice:send:${invoiceId}:${idempotencyToken}`;

  const { subject, html, text } = renderInvoiceEmail({
    businessName: invoice.businessName,
    customerName: invoice.customerName,
    invoiceNumber: invoice.invoiceNumber,
    title: invoice.title,
    currency: invoice.currency,
    subtotalInCents: invoice.subtotalInCents,
    discountInCents: invoice.discountInCents,
    taxInCents: invoice.taxInCents,
    taxLabel: invoice.taxLabel,
    totalInCents: invoice.totalInCents,
    dueAt: invoice.dueAt?.toISOString() ?? null,
    notes: invoice.notes,
    emailSignature: invoice.defaultEmailSignature,
    items,
  });

  await sendEmailWithFallback({
    emailType: "notification",
    from: getEmailSender("notification"),
    to: invoice.customerEmail,
    replyTo: invoice.businessContactEmail ?? undefined,
    subject,
    html,
    text,
    idempotencyKey,
    businessId,
    metadata: {
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
    },
    tags: {
      type: "invoice",
      event: "invoice_sent",
    },
  });

  // Mark as sent
  const now = new Date();
  const wasFirstSend = invoice.status !== "sent";

  await db
    .update(invoices)
    .set({ status: "sent", sentAt: now, updatedAt: now })
    .where(eq(invoices.id, invoiceId));

  // Emit invoice.sent only on the first transition into sent. Re-sends
  // (status was already sent) update sentAt for tracking but do not
  // re-fire automation rules tied to the sent event — those rules are
  // typically meant to run once per invoice lifecycle.
  if (wasFirstSend) {
    emitEvent(businessId, "invoice.sent", {
      invoiceId,
      jobId: invoice.jobId ?? "",
      amount: invoice.totalInCents,
      recipientEmail: invoice.customerEmail,
    });
  }

  return { success: true, resend: !wasFirstSend };
}

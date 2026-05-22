import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { invoices, invoiceItems, businesses } from "@/lib/db/schema";
import { renderInvoiceEmail } from "@/emails/templates/invoice-email";
import { isEmailConfigured } from "@/lib/env";
import { sendEmailWithFallback } from "@/lib/email/send-email";
import { getEmailSender } from "@/lib/email/senders";

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
    idempotencyKey: `invoice:send:${invoiceId}`,
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
  await db
    .update(invoices)
    .set({ status: "sent", sentAt: now, updatedAt: now })
    .where(eq(invoices.id, invoiceId));

  return { success: true };
}
